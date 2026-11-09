/**
 * High-Availability Load Balancer for Portal Mahasiswa FHISIP Universitas Terbuka
 * 
 * Manages traffic distribution, connection pooling, health checks, circuit breakers,
 * and failover for high-concurrency student access (e.g., masa registrasi & pengajuan pengguguran).
 */

export type NodeStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN'

export type BalancingStrategy = 'STUDENT_HASH' | 'LEAST_CONNECTIONS' | 'WEIGHTED_ROUND_ROBIN'

export interface ClusterNode {
  id: string
  name: string
  region: string
  weight: number
  maxConnections: number
  activeConnections: number
  totalServed: number
  failedCount: number
  consecutiveFailures: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  averageLatencyMs: number
  latencySamples: number[]
  status: NodeStatus
  lastHealthCheck: number
}

export interface ClusterTelemetry {
  clusterName: string
  totalNodes: number
  healthyNodes: number
  activeConnections: number
  totalServedRequests: number
  activeStrategy: BalancingStrategy
  averageClusterLatencyMs: number
  nodes: Array<{
    id: string
    name: string
    region: string
    weight: number
    status: NodeStatus
    activeConnections: number
    totalServed: number
    averageLatencyMs: number
    consecutiveFailures: number
  }>
}

class StudentPortalLoadBalancer {
  private nodes: Map<string, ClusterNode> = new Map()
  private rrIndex: number = 0
  private readonly MAX_LATENCY_SAMPLES = 20
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5 // consecutive failures before marking DOWN
  private readonly RECOVERY_COOLDOWN_MS = 20000 // 20 seconds before attempting probe
  private defaultStrategy: BalancingStrategy = 'STUDENT_HASH'

  constructor() {
    this.initializeNodes()
  }

  private initializeNodes() {
    const initialNodes: Array<Omit<ClusterNode, 'activeConnections' | 'totalServed' | 'failedCount' | 'consecutiveFailures' | 'lastFailureTime' | 'lastSuccessTime' | 'averageLatencyMs' | 'latencySamples' | 'lastHealthCheck'>> = [
      {
        id: 'node-jkt-alpha',
        name: 'Node Alpha — Gateway Utama Jakarta Timur',
        region: 'id-jkt-01',
        weight: 4,
        maxConnections: 350,
        status: 'HEALTHY',
      },
      {
        id: 'node-jkt-beta',
        name: 'Node Beta — Gateway Redundan Jakarta Selatan',
        region: 'id-jkt-02',
        weight: 3,
        maxConnections: 300,
        status: 'HEALTHY',
      },
      {
        id: 'node-sby-gamma',
        name: 'Node Gamma — Gateway Regional Surabaya',
        region: 'id-sby-01',
        weight: 2,
        maxConnections: 250,
        status: 'HEALTHY',
      },
      {
        id: 'node-edge-local',
        name: 'Node Edge — Fast-Cache Micro Gateway',
        region: 'id-edge-01',
        weight: 1,
        maxConnections: 150,
        status: 'HEALTHY',
      },
    ]

    for (const node of initialNodes) {
      this.nodes.set(node.id, {
        ...node,
        activeConnections: 0,
        totalServed: 0,
        failedCount: 0,
        consecutiveFailures: 0,
        lastFailureTime: null,
        lastSuccessTime: Date.now(),
        averageLatencyMs: 12,
        latencySamples: [10, 12, 14],
        lastHealthCheck: Date.now(),
      })
    }
  }

  /**
   * Simple deterministic string hashing algorithm (djb2)
   */
  private hashKey(str: string): number {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i)
    }
    return Math.abs(hash >>> 0)
  }

  /**
   * Filter healthy and recoverable nodes
   */
  private getEligibleNodes(): ClusterNode[] {
    const now = Date.now()
    const eligible: ClusterNode[] = []

    for (const node of this.nodes.values()) {
      if (node.status === 'HEALTHY' || node.status === 'DEGRADED') {
        eligible.push(node)
      } else if (node.status === 'DOWN') {
        // Circuit breaker probe check
        if (node.lastFailureTime && now - node.lastFailureTime > this.RECOVERY_COOLDOWN_MS) {
          node.status = 'DEGRADED' // Half-open trial
          eligible.push(node)
        }
      }
    }

    if (eligible.length === 0) {
      // Emergency: If all nodes down, force reset primary node to avoid complete outage
      const primary = this.nodes.get('node-jkt-alpha')
      if (primary) {
        primary.status = 'DEGRADED'
        primary.consecutiveFailures = 0
        eligible.push(primary)
      }
    }

    return eligible
  }

  /**
   * Select the best node according to the specified or default strategy
   */
  public selectNode(key: string, strategy: BalancingStrategy = this.defaultStrategy): ClusterNode {
    const candidates = this.getEligibleNodes()
    if (candidates.length === 0) {
      // Fallback safe default
      return Array.from(this.nodes.values())[0]
    }

    if (strategy === 'STUDENT_HASH') {
      // Sticky session based on NIM / IP hash
      const hash = this.hashKey(key || 'anonymous-student')
      const index = hash % candidates.length
      const selected = candidates[index]

      // If selected node has high saturation, fall back to least connections
      if (selected.activeConnections >= selected.maxConnections) {
        return this.selectLeastConnections(candidates)
      }
      return selected
    }

    if (strategy === 'LEAST_CONNECTIONS') {
      return this.selectLeastConnections(candidates)
    }

    // Default: Weighted Round Robin
    return this.selectWeightedRoundRobin(candidates)
  }

  private selectLeastConnections(candidates: ClusterNode[]): ClusterNode {
    return candidates.reduce((best, curr) => {
      const bestRatio = best.activeConnections / (best.weight || 1)
      const currRatio = curr.activeConnections / (curr.weight || 1)
      return currRatio < bestRatio ? curr : best
    }, candidates[0])
  }

  private selectWeightedRoundRobin(candidates: ClusterNode[]): ClusterNode {
    const totalWeight = candidates.reduce((sum, n) => sum + (n.weight || 1), 0)
    let point = this.rrIndex++ % totalWeight
    if (this.rrIndex > 100000) this.rrIndex = 0

    for (const node of candidates) {
      if (point < node.weight) {
        return node
      }
      point -= node.weight
    }

    return candidates[0]
  }

  /**
   * Acquire a connection lease for a request
   */
  public acquireConnection(nodeId: string): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) return false

    // Check overload
    if (node.activeConnections >= node.maxConnections * 1.2) {
      return false
    }

    node.activeConnections += 1
    node.totalServed += 1
    return true
  }

  /**
   * Release a connection lease and record latency & status telemetry
   */
  public releaseConnection(nodeId: string, latencyMs: number = 0, success: boolean = true) {
    const node = this.nodes.get(nodeId)
    if (!node) return

    node.activeConnections = Math.max(0, node.activeConnections - 1)

    if (success) {
      node.consecutiveFailures = 0
      node.lastSuccessTime = Date.now()
      if (node.status === 'DEGRADED') {
        node.status = 'HEALTHY'
      }

      // Record latency sample
      if (latencyMs > 0) {
        node.latencySamples.push(latencyMs)
        if (node.latencySamples.length > this.MAX_LATENCY_SAMPLES) {
          node.latencySamples.shift()
        }
        const sum = node.latencySamples.reduce((a, b) => a + b, 0)
        node.averageLatencyMs = Math.round(sum / node.latencySamples.length)
      }
    } else {
      node.failedCount += 1
      node.consecutiveFailures += 1
      node.lastFailureTime = Date.now()

      if (node.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        node.status = 'DOWN'
      } else if (node.consecutiveFailures >= 2) {
        node.status = 'DEGRADED'
      }
    }
  }

  /**
   * Wrap an execution with load balanced routing, failover, and metrics tracking
   */
  public async executeRequest<T>(
    studentKey: string,
    operation: (node: ClusterNode) => Promise<T>,
    maxRetries = 2
  ): Promise<{ result: T; node: ClusterNode; latencyMs: number }> {
    let attempts = 0
    let lastError: any = null

    while (attempts <= maxRetries) {
      const node = this.selectNode(`${studentKey}:${attempts}`)
      const start = Date.now()
      this.acquireConnection(node.id)

      try {
        const result = await operation(node)
        const latency = Date.now() - start
        this.releaseConnection(node.id, latency, true)
        return { result, node, latencyMs: latency }
      } catch (err) {
        const latency = Date.now() - start
        this.releaseConnection(node.id, latency, false)
        lastError = err
        attempts++
      }
    }

    throw lastError || new Error('Semua node load balancer gagal merespons.')
  }

  /**
   * Check if global cluster capacity is within safe bounds
   */
  public isClusterOverloaded(): boolean {
    let totalActive = 0
    let totalCapacity = 0

    for (const node of this.nodes.values()) {
      totalActive += node.activeConnections
      totalCapacity += node.maxConnections
    }

    return totalCapacity > 0 && totalActive >= totalCapacity
  }

  /**
   * Return comprehensive cluster stats for dashboards and headers
   */
  public getClusterStatus(): ClusterTelemetry {
    const nodesList = Array.from(this.nodes.values())
    const healthyCount = nodesList.filter((n) => n.status === 'HEALTHY').length
    const totalActive = nodesList.reduce((sum, n) => sum + n.activeConnections, 0)
    const totalServed = nodesList.reduce((sum, n) => sum + n.totalServed, 0)

    const latencies = nodesList.map((n) => n.averageLatencyMs).filter((l) => l > 0)
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 10

    return {
      clusterName: 'FHISIP-UT-PORTAL-MAHASISWA-CLUSTER',
      totalNodes: nodesList.length,
      healthyNodes: healthyCount,
      activeConnections: totalActive,
      totalServedRequests: totalServed,
      activeStrategy: this.defaultStrategy,
      averageClusterLatencyMs: avgLatency,
      nodes: nodesList.map((n) => ({
        id: n.id,
        name: n.name,
        region: n.region,
        weight: n.weight,
        status: n.status,
        activeConnections: n.activeConnections,
        totalServed: n.totalServed,
        averageLatencyMs: n.averageLatencyMs,
        consecutiveFailures: n.consecutiveFailures,
      })),
    }
  }
}

// Global Singleton to maintain cluster state across Next.js invocations
const globalForLb = global as unknown as { studentPortalLoadBalancer?: StudentPortalLoadBalancer }

export const studentLoadBalancer = globalForLb.studentPortalLoadBalancer ?? new StudentPortalLoadBalancer()

if (process.env.NODE_ENV !== 'production') {
  globalForLb.studentPortalLoadBalancer = studentLoadBalancer
}
