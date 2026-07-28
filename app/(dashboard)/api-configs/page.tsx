'use client'

import { useEffect, useState } from 'react'
import {
  KeyRound,
  Link2,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  Code2,
  ShieldCheck,
  AlertCircle,
  Database,
  Info,
  HelpCircle,
  Check,
} from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type Provider = {
  id: string
  name: string
  loginUrl: string
  authPayloadJson: string
  tokenResponseKey: string
  contentType: string
  graphqlQuery?: string | null
  headerName: string
  headerPrefix: string
  cachedToken: string | null
  tokenExpiresAt: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  _count?: { apiConfigs: number }
}

type ApiConfig = {
  id: string
  code: string
  name: string
  targetUrl: string
  method: string
  graphqlQuery: string | null
  providerId: string | null
  status: 'ACTIVE' | 'INACTIVE'
  provider?: Provider | null
  createdAt: string
}

type ToastState = {
  message: string
  type: 'success' | 'error' | 'info'
} | null

type ConfirmState = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
}

export default function ApiConfigsPage() {
  const [activeTab, setActiveTab] = useState<'configs' | 'providers'>('configs')
  const [providers, setProviders] = useState<Provider[]>([])
  const [configs, setConfigs] = useState<ApiConfig[]>([])
  const [loading, setLoading] = useState(true)

  // Custom UI Notifications
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Modals state
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [providerForm, setProviderForm] = useState({
    name: '',
    loginUrl: '',
    authPayloadJson: '{\n  "email": "user_fhisip@ut.ac.id",\n  "password": "your_password"\n}',
    tokenResponseKey: 'token',
    contentType: 'application/x-www-form-urlencoded',
    graphqlQuery: '',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  })

  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null)
  const [configForm, setConfigForm] = useState({
    code: '',
    name: '',
    targetUrl: '',
    method: 'POST',
    graphqlQuery: '',
    providerId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  })

  // Test modal state
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testTitle, setTestTitle] = useState('')
  const [testedProvider, setTestedProvider] = useState<Provider | null>(null)
  const [testedConfig, setTestedConfig] = useState<ApiConfig | null>(null)
  const [testVariables, setTestVariables] = useState<string>('{\n}')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // Pagination states
  const [provPage, setProvPage] = useState(1)
  const [provPageSize, setProvPageSize] = useState(10)

  const [confPage, setConfPage] = useState(1)
  const [confPageSize, setConfPageSize] = useState(10)

  const loadData = async () => {
    setLoading(true)
    const [resP, resC] = await Promise.all([fetch('/api/auth-providers'), fetch('/api/api-configs')])
    if (resP.ok) setProviders(await resP.json())
    if (resC.ok) setConfigs(await resC.json())
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Provider CRUD Handlers
  const openCreateProvider = () => {
    setEditingProvider(null)
    setProviderForm({
      name: '',
      loginUrl: 'https://api-mahasiswa-srs.ut.ac.id/api-srs-mahasiswa/v1/auth',
      authPayloadJson: '{\n  "email": "api-fhisip@ut.ac.id",\n  "password": "your_password"\n}',
      tokenResponseKey: 'token',
      contentType: 'application/x-www-form-urlencoded',
      graphqlQuery: '',
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
      status: 'ACTIVE',
    })
    setProviderModalOpen(true)
  }

  const openEditProvider = (p: Provider) => {
    setEditingProvider(p)
    setProviderForm({
      name: p.name,
      loginUrl: p.loginUrl,
      authPayloadJson: p.authPayloadJson,
      tokenResponseKey: p.tokenResponseKey,
      contentType: p.contentType || 'application/x-www-form-urlencoded',
      graphqlQuery: p.graphqlQuery || '',
      headerName: p.headerName,
      headerPrefix: p.headerPrefix,
      status: p.status,
    })
    setProviderModalOpen(true)
  }

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingProvider ? `/api/auth-providers/${editingProvider.id}` : '/api/auth-providers'
    const method = editingProvider ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(providerForm),
    })

    if (res.ok) {
      setProviderModalOpen(false)
      showToast(
        editingProvider ? 'Akun penyedia API berhasil diperbarui' : 'Akun penyedia API berhasil ditambahkan',
        'success'
      )
      loadData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Gagal menyimpan penyedia API', 'error')
    }
  }

  const handleDeleteProvider = (id: string, name: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Akun Penyedia API',
      message: `Apakah Anda yakin ingin menghapus akun penyedia "${name}"?`,
      confirmText: 'Ya, Hapus Akun',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }))
        const res = await fetch(`/api/auth-providers/${id}`, { method: 'DELETE' })
        if (res.ok) {
          showToast('Akun penyedia API berhasil dihapus', 'success')
          loadData()
        } else {
          showToast('Gagal menghapus penyedia API', 'error')
        }
      },
    })
  }

  const handleTestLogin = async (provider: Provider) => {
    setTestTitle(`Uji Login Ke Penyedia: ${provider.name}`)
    setTestedProvider(provider)
    setTestedConfig(null)
    setTestModalOpen(true)
    setTesting(true)
    setTestResult(null)

    const res = await fetch(`/api/auth-providers/${provider.id}/test-login`, { method: 'POST' })
    const json = await res.json()
    setTestResult(json)
    setTesting(false)
    loadData()
  }

  // Config CRUD Handlers
  const openCreateConfig = () => {
    setEditingConfig(null)
    setConfigForm({
      code: '',
      name: '',
      targetUrl: 'https://api.ut.ac.id/graphql',
      method: 'POST',
      graphqlQuery: '',
      providerId: providers[0]?.id || '',
      status: 'ACTIVE',
    })
    setConfigModalOpen(true)
  }

  const openEditConfig = (c: ApiConfig) => {
    setEditingConfig(c)
    setConfigForm({
      code: c.code,
      name: c.name,
      targetUrl: c.targetUrl,
      method: c.method,
      graphqlQuery: c.graphqlQuery || '',
      providerId: c.providerId || '',
      status: c.status,
    })
    setConfigModalOpen(true)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingConfig ? `/api/api-configs/${editingConfig.id}` : '/api/api-configs'
    const method = editingConfig ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configForm),
    })

    if (res.ok) {
      setConfigModalOpen(false)
      showToast(
        editingConfig ? 'Konfigurasi API berhasil diperbarui' : 'Konfigurasi API berhasil ditambahkan',
        'success'
      )
      loadData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Gagal menyimpan konfigurasi API', 'error')
    }
  }

  const handleDeleteConfig = (id: string, name: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Link API Data',
      message: `Apakah Anda yakin ingin menghapus konfigurasi API "${name}"?`,
      confirmText: 'Ya, Hapus API',
      danger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }))
        const res = await fetch(`/api/api-configs/${id}`, { method: 'DELETE' })
        if (res.ok) {
          showToast('Konfigurasi API berhasil dihapus', 'success')
          loadData()
        } else {
          showToast('Gagal menghapus konfigurasi API', 'error')
        }
      },
    })
  }

  const executeProxyTest = async (config: ApiConfig, customVarsStr?: string) => {
    setTesting(true)
    setTestResult(null)

    let parsedVars = {}
    try {
      parsedVars = JSON.parse(customVarsStr ?? testVariables)
    } catch {
      parsedVars = {}
    }

    const res = await fetch(`/api/proxy/${config.code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables: parsedVars }),
    })
    const json = await res.json()
    setTestResult(json)
    setTesting(false)
  }

  const handleTestProxy = async (config: ApiConfig) => {
    setTestTitle(`Uji Tarik Data (Proxy): ${config.name} [${config.code}]`)
    setTestedProvider(config.provider || null)
    setTestedConfig(config)

    // Automatically parse all GraphQL variables ($var1, $var2, etc.) from query
    let defaultVarsStr = '{\n}'
    if (config.graphqlQuery) {
      const varMatches = [...config.graphqlQuery.matchAll(/\$([a-zA-Z0-9_]+)/g)]
      if (varMatches.length > 0) {
        const varsObj: Record<string, any> = {}
        const varNames = [...new Set(varMatches.map((m) => m[1]))]
        for (const name of varNames) {
          if (name === 'nim') varsObj[name] = '012345678'
          else if (name === 'tanggal_sk' || name.includes('tanggal')) varsObj[name] = '2024-01-01T00:00:00Z'
          else if (name === 'masa') varsObj[name] = '20261'
          else if (name === 'limit') varsObj[name] = 10
          else if (name === 'page') varsObj[name] = 1
          else varsObj[name] = ''
        }
        defaultVarsStr = JSON.stringify(varsObj, null, 2)
      }
    }

    setTestVariables(defaultVarsStr)
    setTestModalOpen(true)
    await executeProxyTest(config, defaultVarsStr)
  }

  const [importing, setImporting] = useState(false)

  const handleImportGithub = () => {
    setConfirmModal({
      open: true,
      title: 'Sinkronkan Repo fhisiper/api',
      message: 'Apakah Anda ingin menyinkronkan/mengimpor semua 48 Kueri API & GraphQL dari repository github.com/fhisiper/api ke database?',
      confirmText: 'Ya, Impor Semua API',
      danger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }))
        setImporting(true)
        const res = await fetch('/api/api-configs/import-github', { method: 'POST' })
        const json = await res.json()
        setImporting(false)
        if (res.ok) {
          showToast(`Sukses! Berhasil mengimpor ${json.importedCount} API dari repo fhisiper/api`, 'success')
          loadData()
        } else {
          showToast(json.error || 'Gagal mengimpor API dari GitHub', 'error')
        }
      },
    })
  }

  const paginatedProviders = providers.slice((provPage - 1) * provPageSize, provPage * provPageSize)
  const paginatedConfigs = configs.slice((confPage - 1) * confPageSize, confPage * confPageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30'
                : toast.type === 'error'
                ? 'bg-slate-900/95 text-rose-400 border-rose-500/30'
                : 'bg-slate-900/95 text-sky-400 border-sky-500/30'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 stroke-[2.5]" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Integrasi API & Login Penyedia</h1>
          <p className="text-slate-500 text-sm">
            Kelola otentikasi login penyedia API eksternal dan 48 tautan proxy kueri GraphQL / REST UT
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportGithub}
            disabled={importing}
            className="btn-secondary text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800 border-slate-800 shadow-sm hover:shadow-md transition-all"
          >
            <Database className={`w-4 h-4 text-amber-400 ${importing ? 'animate-spin' : ''}`} />
            <span>{importing ? 'Mengimpor...' : 'Impor fhisiper/api'}</span>
          </button>
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs sm:text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('configs')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'configs'
              ? 'border-ut-navy text-ut-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Daftar Link API Data ({configs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'providers'
              ? 'border-ut-navy text-ut-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Akun Login Penyedia ({providers.length})</span>
        </button>
      </div>

      {/* TAB 1: PROVIDERS */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Sistem akan login otomatis ke URL penyedia di bawah ini dan menyimpan token secara aman.
            </p>
            <button onClick={openCreateProvider} className="btn-primary">
              <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
              <span>Tambah Akun Penyedia</span>
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nama Penyedia</th>
                    <th className="px-5 py-3 font-medium">URL Login</th>
                    <th className="px-5 py-3 font-medium">Content-Type</th>
                    <th className="px-5 py-3 font-medium">Field Token</th>
                    <th className="px-5 py-3 font-medium">Status Token</th>
                    <th className="px-5 py-3 font-medium">Uji Login</th>
                    <th className="px-5 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-slate-400">
                        Memuat data penyedia API...
                      </td>
                    </tr>
                  )}
                  {!loading && providers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-slate-400">
                        Belum ada akun login penyedia API eksternal yang dikonfigurasi.
                      </td>
                    </tr>
                  )}
                  {paginatedProviders.map((p) => {
                    const isTokenActive =
                      p.cachedToken && p.tokenExpiresAt && new Date(p.tokenExpiresAt) > new Date()
                    return (
                      <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-ut-blue shrink-0" />
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600 max-w-xs truncate" title={p.loginUrl}>
                          {p.loginUrl}
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                          {p.contentType?.includes('form-urlencoded') ? 'x-www-form-urlencoded' : 'application/json'}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{p.tokenResponseKey}</td>
                        <td className="px-5 py-3">
                          {isTokenActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Token Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Belum / Expired
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleTestLogin(p)}
                            className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                            <span>Tes Login</span>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditProvider(p)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                              title="Edit Provider"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProvider(p.id, p.name)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                              title="Hapus Provider"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!loading && (
              <Pagination
                currentPage={provPage}
                totalItems={providers.length}
                pageSize={provPageSize}
                onPageChange={setProvPage}
                onPageSizeChange={setProvPageSize}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: API CONFIGS */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Daftar link data eksternal / GraphQL yang otomatis menyuntikkan token dari Akun Penyedia.
            </p>
            <button onClick={openCreateConfig} className="btn-primary">
              <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
              <span>Tambah Link API Data</span>
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Kode Proxy</th>
                    <th className="px-5 py-3 font-medium">Nama API Data</th>
                    <th className="px-5 py-3 font-medium">Target URL</th>
                    <th className="px-5 py-3 font-medium">Penyedia Login</th>
                    <th className="px-5 py-3 font-medium">Uji Data</th>
                    <th className="px-5 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                        Memuat daftar API data...
                      </td>
                    </tr>
                  )}
                  {!loading && configs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                        Belum ada tautan link API data eksternal.
                      </td>
                    </tr>
                  )}
                  {paginatedConfigs.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ut-navy/10 text-ut-navy border border-ut-navy/20">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 max-w-xs truncate" title={c.targetUrl}>
                        {c.targetUrl}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {c.provider ? (
                          <span className="font-semibold text-slate-700">{c.provider.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Tanpa Auth</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleTestProxy(c)}
                          className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                          <span>Uji Proxy</span>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditConfig(c)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="Edit API Config"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(c.id, c.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                            title="Hapus API Config"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && (
              <Pagination
                currentPage={confPage}
                totalItems={configs.length}
                pageSize={confPageSize}
                onPageChange={setConfPage}
                onPageSizeChange={setConfPageSize}
              />
            )}
          </div>
        </div>
      )}

      {/* MODERN CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.danger ? 'bg-rose-100 text-rose-600' : 'bg-ut-navy/10 text-ut-navy'
                }`}
              >
                {confirmModal.danger ? <AlertCircle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{confirmModal.message}</p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="btn-secondary text-xs py-2 px-4"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`btn-primary text-xs py-2 px-4 ${
                  confirmModal.danger ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''
                }`}
              >
                {confirmModal.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROVIDER FORM */}
      {providerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProvider ? 'Edit Akun Login Penyedia' : 'Tambah Akun Login Penyedia API'}
              </h3>
              <button onClick={() => setProviderModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Penyedia API</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Server GraphQL UT Utama"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Endpoint Login</label>
                <input
                  type="url"
                  required
                  placeholder="https://api-ut.ac.id/v1/auth/login"
                  value={providerForm.loginUrl}
                  onChange={(e) => setProviderForm({ ...providerForm, loginUrl: e.target.value })}
                  className="input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payload Login (JSON Kredensial)</label>
                <textarea
                  rows={4}
                  required
                  value={providerForm.authPayloadJson}
                  onChange={(e) => setProviderForm({ ...providerForm, authPayloadJson: e.target.value })}
                  className="input text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Format JSON kredensial login (username/password atau email/password).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kueri GraphQL Mutation Login (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="mutation loginUser($user: LoginPayload!) {\n  loginUser(user: $user)\n}"
                  value={providerForm.graphqlQuery}
                  onChange={(e) => setProviderForm({ ...providerForm, graphqlQuery: e.target.value })}
                  className="input text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Isi jika endpoint login menggunakan GraphQL Mutation (seperti server api-srs.ut.ac.id).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Field Respon Token</label>
                  <input
                    type="text"
                    required
                    placeholder="token"
                    value={providerForm.tokenResponseKey}
                    onChange={(e) => setProviderForm({ ...providerForm, tokenResponseKey: e.target.value })}
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Content-Type Request Login</label>
                  <select
                    value={providerForm.contentType}
                    onChange={(e) => setProviderForm({ ...providerForm, contentType: e.target.value })}
                    className="input text-xs font-mono"
                  >
                    <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                    <option value="application/json">application/json</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Header Authorization</label>
                  <input
                    type="text"
                    required
                    placeholder="Authorization"
                    value={providerForm.headerName}
                    onChange={(e) => setProviderForm({ ...providerForm, headerName: e.target.value })}
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix Header Token</label>
                  <input
                    type="text"
                    placeholder="Bearer "
                    value={providerForm.headerPrefix}
                    onChange={(e) => setProviderForm({ ...providerForm, headerPrefix: e.target.value })}
                    className="input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setProviderModalOpen(false)} className="btn-secondary text-xs py-2">
                  Batal
                </button>
                <button type="submit" className="btn-primary text-xs py-2">
                  Simpan Akun Penyedia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: API CONFIG FORM */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingConfig ? 'Edit Link API Data' : 'Tambah Link API Data / GraphQL'}
              </h3>
              <button onClick={() => setConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Unik Proxy</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingConfig}
                    placeholder="MISAL: VALIDASI_DP"
                    value={configForm.code}
                    onChange={(e) => setConfigForm({ ...configForm, code: e.target.value.toUpperCase() })}
                    className="input text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Integrasi API</label>
                  <input
                    type="text"
                    required
                    placeholder="Validasi Data Pribadi Mahasiswa"
                    value={configForm.name}
                    onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.ut.ac.id/graphql"
                  value={configForm.targetUrl}
                  onChange={(e) => setConfigForm({ ...configForm, targetUrl: e.target.value })}
                  className="input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Akun Login Penyedia</label>
                <select
                  value={configForm.providerId}
                  onChange={(e) => setConfigForm({ ...configForm, providerId: e.target.value })}
                  className="input text-xs"
                >
                  <option value="">-- Tanpa Auth (Publik) --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.loginUrl})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kueri GraphQL (Opsional)</label>
                <textarea
                  rows={5}
                  placeholder={`query getDataPribadiValid($limit: Int) {\n  getDataPribadiValid(limit: $limit) {\n    data { id namaMahasiswa }\n  }\n}`}
                  value={configForm.graphqlQuery}
                  onChange={(e) => setConfigForm({ ...configForm, graphqlQuery: e.target.value })}
                  className="input text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setConfigModalOpen(false)} className="btn-secondary text-xs py-2">
                  Batal
                </button>
                <button type="submit" className="btn-primary text-xs py-2">
                  Simpan Link API Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TEST RESULTS */}
      {testModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-ut-blue" />
                <span>{testTitle}</span>
              </h3>
              <button onClick={() => setTestModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            {testing && (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-ut-navy animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Menghubungkan ke server penyedia API...</p>
              </div>
            )}

            {!testing && testResult && (
              <div className="space-y-3 text-xs">
                {testedConfig && testedConfig.graphqlQuery && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-ut-navy" />
                        <span>Variabel Parameter GraphQL (JSON):</span>
                      </label>
                      <button
                        onClick={() => testedConfig && executeProxyTest(testedConfig)}
                        className="btn-primary py-1 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                      >
                        <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>Jalankan Ulang Tes</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={testVariables}
                      onChange={(e) => setTestVariables(e.target.value)}
                      placeholder='{\n  "nim": "012345678"\n}'
                      className="input font-mono text-xs bg-white"
                    />
                    <p className="text-[11px] text-slate-500">
                      Ubah nilai variabel di atas (misal <code className="bg-slate-200/80 px-1 rounded text-slate-800">nim</code>) lalu klik **Jalankan Ulang Tes** untuk menguji data langsung.
                    </p>
                  </div>
                )}

                {testResult.success !== false ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Otentikasi & Proxy Panggilan API Berhasil!</p>
                      {testResult.expiresAt && (
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Token aktif hingga: {new Date(testResult.expiresAt).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">Gagal Menghubungkan Ke Server Penyedia</p>
                        <p className="text-xs font-mono text-rose-700 mt-1">{testResult.error}</p>
                      </div>
                    </div>

                    {testedProvider?.loginUrl.includes('api-provider.ac.id') && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-800">Petunjuk Konfigurasi URL Login:</p>
                          <p className="mt-0.5 leading-relaxed text-[11px] text-amber-900">
                            URL Login saat ini masih URL contoh (<code className="bg-white/80 px-1 py-0.5 rounded font-mono">api-provider.ac.id</code>).
                            Silakan klik tab **Akun Login Penyedia** → pilih tombol **Edit** pada akun penyedia, lalu masukkan **URL Endpoint Login & Kredensial akun UT** yang sebenarnya.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {testResult.errors && Array.isArray(testResult.errors) && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Catatan Penanganan Server Target (GraphQL):</span>
                    </div>
                    {JSON.stringify(testResult.errors).includes('invalid signature') && (
                      <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                        Pesan <code className="bg-amber-100 px-1 rounded font-mono">invalid signature</code> menandakan bahwa target URL GraphQL (<code className="bg-amber-100 px-1 rounded font-mono">{testedConfig?.targetUrl}</code>) memerlukan token yang diterbitkan oleh server penyedia yang sama, atau menggunakan secret key JWT yang berbeda dari akun penyedia yang dipilih saat ini.
                      </p>
                    )}
                    {JSON.stringify(testResult.errors).includes('Silahkan login') && (
                      <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                        Server target memerlukan token otentikasi. Silakan pastikan Anda memilih **Akun Login Penyedia** yang sesuai pada link API ini.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hasil Respon Server (JSON):</label>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] max-h-72 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setTestModalOpen(false)} className="btn-secondary text-xs py-2 px-4">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
