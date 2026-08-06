import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

const PRODI_MAP: Record<string, { code: string; name: string }> = {
  FSIH: { code: 'HKUM', name: 'S1 Ilmu Hukum' },
  FSIK: { code: 'IKOM', name: 'S1 Ilmu Komunikasi' },
  FSAB: { code: 'ADBI', name: 'S1 Administrasi Bisnis' },
  FSAP: { code: 'ADPU', name: 'S1 Administrasi Publik' },
  FSPE: { code: 'IPEM', name: 'S1 Ilmu Pemerintahan' },
  FSSI: { code: 'SING', name: 'S1 Sastra Inggris' },
  FSSO: { code: 'SOSI', name: 'S1 Sosiologi' },
  FSIP: { code: 'PUS', name: 'S1 Ilmu Perpustakaan' },
  FSSP: { code: 'PAJAK', name: 'S1 Perpajakan' },
  HKUM: { code: 'HKUM', name: 'S1 Ilmu Hukum' },
  IKOM: { code: 'IKOM', name: 'S1 Ilmu Komunikasi' },
  ADBI: { code: 'ADBI', name: 'S1 Administrasi Bisnis' },
  ADPU: { code: 'ADPU', name: 'S1 Administrasi Publik' },
  IPEM: { code: 'IPEM', name: 'S1 Ilmu Pemerintahan' },
  SING: { code: 'SING', name: 'S1 Sastra Inggris' },
  SOSI: { code: 'SOSI', name: 'S1 Sosiologi' },
  PUS: { code: 'PUS', name: 'S1 Ilmu Perpustakaan' },
  PAJAK: { code: 'PAJAK', name: 'S1 Perpajakan' },
}

function resolveProdi(kodeMatkul: string, prodiCodeRaw?: string, prodiNameRaw?: string) {
  const prefix4 = kodeMatkul.substring(0, 4).toUpperCase()
  if (PRODI_MAP[prefix4]) return PRODI_MAP[prefix4]

  const rawCode = (prodiCodeRaw || '').toUpperCase()
  if (PRODI_MAP[rawCode]) return PRODI_MAP[rawCode]

  return { code: 'FHISIP', name: prodiNameRaw || 'FHISIP Universitas Terbuka' }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const masaInput = (formData.get('masa') as string | null) || '20262'
    const masa = masaInput.replace(/[^0-9]/g, '') || '20262'

    if (!file) {
      return NextResponse.json({ error: 'File Excel (.xlsx / .xls) wajib diunggah' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong atau format tidak sesuai' }, { status: 400 })
    }

    const parsedItems: any[] = []

    for (const row of rawRows) {
      // Flexible column key lookup
      const keys = Object.keys(row)
      const findVal = (patterns: string[]) => {
        const matchingKey = keys.find((k) =>
          patterns.some((p) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase()))
        )
        return matchingKey ? row[matchingKey] : null
      }

      const kodeMatkulRaw =
        findVal(['kodematakuliah', 'kodematkul', 'kode_matakuliah', 'kode_matkul', 'kodemk']) || ''
      const kodeMatkul = String(kodeMatkulRaw).trim().toUpperCase()

      if (!kodeMatkul || kodeMatkul.length < 5) continue

      const namaMatkul = String(
        findVal(['namamatakuliah', 'namamatkul', 'nama_matakuliah', 'nama_matkul', 'namamk']) || 'Mata Kuliah FHISIP'
      ).trim()

      const sks = parseInt(String(findVal(['sks', 'sksmatkul']) || '3'), 10) || 3
      const prodiCodeRaw = String(findVal(['kodeprogramstudi', 'kodeprodi', 'prodi']) || '')
      const prodiNameRaw = String(findVal(['namaprogramstudi', 'namaprodi']) || '')
      const prodi = resolveProdi(kodeMatkul, prodiCodeRaw, prodiNameRaw)

      const sipasNonTtm = parseInt(String(findVal(['sipasnonttm', 'sipas_non_ttm']) || '0'), 10) || 0
      const nonSipas = parseInt(String(findVal(['nonsipas', 'non_sipas']) || '0'), 10) || 0
      const tutonSipas = parseInt(String(findVal(['tutonsipas', 'tuton_sipas', 'tutonsipassemi']) || '0'), 10) || 0

      let totalMahasiswa = parseInt(
        String(
          findVal([
            'jumlahtuton',
            'totalpesertatuton',
            'totalmahasiswa',
            'total_mahasiswa',
            'prediksipeserta',
            'pesertatuton',
            'totalpeserta',
          ]) || '0'
        ),
        10
      )

      if (!totalMahasiswa) {
        totalMahasiswa = sipasNonTtm + nonSipas + tutonSipas
      }

      const kebutuhanKelas = Math.ceil(totalMahasiswa / 50)
      const kebutuhanTutorMin = Math.ceil(kebutuhanKelas / 4)

      parsedItems.push({
        masa,
        kodeMatkul,
        namaMatkul,
        sks,
        prodiCode: prodi.code,
        prodiName: prodi.name,
        sipasNonTtm,
        nonSipas,
        ttmSipas: 0,
        tutonSipas,
        jumlahTTM: 0,
        jumlahTuton: totalMahasiswa,
        totalMahasiswa,
        kebutuhanKelas,
        kebutuhanTutorMin,
      })
    }

    if (parsedItems.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada baris data mata kuliah yang valid ditemukan di file Excel' },
        { status: 400 }
      )
    }

    // Save/Upsert into PostgreSQL Database
    for (const item of parsedItems) {
      await (prisma as any).prediksiKelas.upsert({
        where: { masa_kodeMatkul: { masa, kodeMatkul: item.kodeMatkul } },
        update: item,
        create: item,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${parsedItems.length} data prediksi mata kuliah untuk Masa ${masa.substring(
        0,
        4
      )}.${masa.substring(4) || '1'}`,
      count: parsedItems.length,
      masa,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses file Excel' }, { status: 500 })
  }
}
