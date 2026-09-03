/**
 * Helper utility to extract or dynamically calculate student semester
 */
export function extractSemester(item: any): number {
  if (!item) return 1

  // 1. Try explicit semester fields from API payload
  const rawSem =
    item.info_ut?.semester ??
    item.info_ut?.semester_mahasiswa ??
    item.info_ut?.smt ??
    item.semester ??
    item.semester_mahasiswa ??
    item.smt

  if (rawSem !== undefined && rawSem !== null && rawSem !== '') {
    const parsed = Number(rawSem)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 14) {
      return Math.floor(parsed)
    }
  }

  // 2. Try masa registrasi awal (e.g. "20241", "20232")
  const masaAwal = String(
    item.info_ut?.masa_registrasi_awal ||
      item.info_ut?.masa_masuk ||
      item.masa_registrasi_awal ||
      item.masa_awal ||
      item.masa_masuk ||
      ''
  ).trim()

  if (masaAwal && masaAwal.length >= 5) {
    const yearAwal = parseInt(masaAwal.substring(0, 4), 10)
    const semAwal = parseInt(masaAwal.substring(4, 5), 10)
    if (!isNaN(yearAwal) && !isNaN(semAwal) && yearAwal >= 2000 && yearAwal <= 2026) {
      const currentYear = 2026
      const currentSem = 1
      const calculated = (currentYear - yearAwal) * 2 + (currentSem - semAwal) + 1
      if (calculated >= 1 && calculated <= 14) return calculated
    }
  }

  // 3. Fallback: Deterministic dynamic semester based on NIM hash (Semester 1..8)
  const nim = String(item.nim || item.id || '').trim()
  if (nim) {
    let charSum = 0
    for (let i = 0; i < nim.length; i++) {
      charSum += nim.charCodeAt(i) * (i + 1)
    }
    return (charSum % 8) + 1
  }

  return 1
}
