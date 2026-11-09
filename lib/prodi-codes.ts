/**
 * Definisi Resmi Kode Program Studi FHISIP Universitas Terbuka
 * Sesuai arahan resmi untuk integrasi API dan kurikulum akademik:
 * - Ilmu Hukum / Hukum: FSIH
 * - Perpajakan: FSSP
 * - Administrasi Publik: FSAP
 * - Administrasi Bisnis: FSAB
 * - Ilmu Komunikasi: FSIK
 * - Ilmu Perpustakaan: FSIP
 * - Sosiologi: FSSO
 * - Sastra Inggris: FSSI
 * - Ilmu Pemerintahan: FSPE
 */

export interface ProdiDefinition {
  officialCode: string // Kode Resmi API (FSIH, FSSP, FSAP, FSAB, FSIK, FSIP, FSSO, FSSI, FSPE)
  legacyCode: string   // Kode Singkatan Lama / Alias (HKUM, PAJAK, ADPU, ADBI, IKOM, PUS, SOSI, SING, IPEM)
  srsCodes: string[]   // Kode SRS Numerik ('311', '50', dll)
  name: string         // Nama Resmi Program Studi
  prefixes: string[]   // Awalan Kode Mata Kuliah Kurikulum
}

export const OFFICIAL_PRODI_LIST: ProdiDefinition[] = [
  {
    officialCode: 'FSIH',
    legacyCode: 'HKUM',
    srsCodes: ['311', '321'],
    name: 'S1 Ilmu Hukum',
    prefixes: ['FSIH', 'HKUM'],
  },
  {
    officialCode: 'FSSP',
    legacyCode: 'PAJAK',
    srsCodes: ['312', '30'],
    name: 'S1 Perpajakan',
    prefixes: ['FSSP', 'PAJAK'],
  },
  {
    officialCode: 'FSAP',
    legacyCode: 'ADPU',
    srsCodes: ['50', '350', '52', '86'],
    name: 'S1 Administrasi Publik',
    prefixes: ['FSAP', 'ADPU', 'ADKA', 'ADNE', 'ADPE', 'ADPG'],
  },
  {
    officialCode: 'FSAB',
    legacyCode: 'ADBI',
    srsCodes: ['51', '351'],
    name: 'S1 Administrasi Bisnis',
    prefixes: ['FSAB', 'ADBI', 'ADNI'],
  },
  {
    officialCode: 'FSIK',
    legacyCode: 'IKOM',
    srsCodes: ['72', '37'],
    name: 'S1 Ilmu Komunikasi',
    prefixes: ['FSIK', 'IKOM', 'SKOM'],
  },
  {
    officialCode: 'FSIP',
    legacyCode: 'PUS',
    srsCodes: ['310', '43'],
    name: 'S1 Ilmu Perpustakaan',
    prefixes: ['FSIP', 'PUS', 'PUST'],
  },
  {
    officialCode: 'FSSO',
    legacyCode: 'SOSI',
    srsCodes: ['70'],
    name: 'S1 Sosiologi',
    prefixes: ['FSSO', 'SOSI'],
  },
  {
    officialCode: 'FSSI',
    legacyCode: 'SING',
    srsCodes: ['87', '47', '48', '49', '63', '64', '21', '25', '26'],
    name: 'S1 Sastra Inggris',
    prefixes: ['FSSI', 'SING', 'BING'],
  },
  {
    officialCode: 'FSPE',
    legacyCode: 'IPEM',
    srsCodes: ['71'],
    name: 'S1 Ilmu Pemerintahan',
    prefixes: ['FSPE', 'IPEM'],
  },
]

/**
 * Resolusi cerdas informasi Program Studi dari berbagai input:
 * - Kode resmi API (FSIH, FSAP, FSAB, FSIP, FSIK, FSSO, FSSI, FSSP, FSPE)
 * - Kode singkatan lama (HKUM, ADPU, ADBI, PUS, IKOM, SOSI, SING, PAJAK, IPEM)
 * - Kode SRS numerik ('311', '50', '51', '310', '72', '70', '87', '312', '71')
 * - Nama Program Studi ('Ilmu Administrasi Negara-S1', 'Ilmu Hukum S1', dll)
 */
export function resolveProdiInfo(input?: string | null): ProdiDefinition | null {
  if (!input) return null
  const clean = input.trim().toUpperCase()

  // 1. Cek kode resmi API
  const matchOfficial = OFFICIAL_PRODI_LIST.find((p) => p.officialCode === clean)
  if (matchOfficial) return matchOfficial

  // 2. Cek kode singkatan lama
  const matchLegacy = OFFICIAL_PRODI_LIST.find((p) => p.legacyCode === clean)
  if (matchLegacy) return matchLegacy

  // 3. Cek kode SRS numerik
  const matchSrs = OFFICIAL_PRODI_LIST.find((p) => p.srsCodes.includes(clean))
  if (matchSrs) return matchSrs

  // 4. Cek kesamaan nama langsung
  const matchName = OFFICIAL_PRODI_LIST.find((p) => {
    const pName = p.name.toUpperCase()
    return clean.includes(pName) || pName.includes(clean)
  })
  if (matchName) return matchName

  // 5. Cek kata kunci umum dalam string nama
  if (clean.includes('HUKUM')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSIH')!
  if (clean.includes('PAJAK') || clean.includes('PERPAJAKAN')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSSP')!
  if (clean.includes('PUBLIK') || clean.includes('NEGARA')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSAP')!
  if (clean.includes('BISNIS') || clean.includes('NIAGA')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSAB')!
  if (clean.includes('KOMUNIKASI')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSIK')!
  if (clean.includes('PERPUSTAKAAN')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSIP')!
  if (clean.includes('SOSIOLOGI')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSSO')!
  if (clean.includes('INGGRIS') || clean.includes('TRANSLAT')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSSI')!
  if (clean.includes('PEMERINTAH')) return OFFICIAL_PRODI_LIST.find((p) => p.officialCode === 'FSPE')!

  return null
}

/**
 * Mendapatkan kode resmi API (FSIH, FSAP, dll) dengan fallback aman
 */
export function getProdiOfficialCode(input?: string | null, fallback = 'FSIH'): string {
  const info = resolveProdiInfo(input)
  return info ? info.officialCode : fallback
}

/**
 * Cek apakah sebuah mata kuliah merupakan Mata Kuliah Universitas umum (MKWU, MKDU, ISIP)
 * PENTING: FSIP adalah kode prodi Ilmu Perpustakaan, BUKAN mata kuliah umum!
 */
export function isGeneralUniversityCourse(kodeMatkul: string): boolean {
  const upper = kodeMatkul.trim().toUpperCase()
  return upper.startsWith('MKWU') || upper.startsWith('MKDU') || upper.startsWith('ISIP')
}

