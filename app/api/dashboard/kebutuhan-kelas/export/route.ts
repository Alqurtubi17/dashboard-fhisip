import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as xlsx from 'xlsx'
import fhisipPrediksiData from '@/data/fhisip-prediksi-kelas.json'

function mapProdiNumericCode(prodiCode: string): string {
  switch (prodiCode.toUpperCase()) {
    case 'HKUM': return '311'
    case 'IKOM': return '72'
    case 'ADPU': return '50'
    case 'ADBI': return '51'
    case 'IPEM': return '71'
    case 'SOSI': return '70'
    case 'SING': return '87'
    case 'PUS': return '310'
    case 'PAJAK': return '312'
    default: return '311'
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const masa = searchParams.get('masa') || '20261'
    const prodiFilter = searchParams.get('prodi') || 'ALL'
    const query = (searchParams.get('query') || '').toLowerCase().trim()

    let items: any[] = []

    // Attempt to load from PostgreSQL table `prediksi_kelas`
    try {
      const dbItems = await (prisma as any).prediksiKelas.findMany({
        where: {
          masa,
          ...(prodiFilter !== 'ALL' ? { prodiCode: { equals: prodiFilter, mode: 'insensitive' } } : {}),
        },
        orderBy: { kodeMatkul: 'asc' },
      })
      if (dbItems && dbItems.length > 0) {
        items = dbItems
      }
    } catch {}

    // Fallback to json dataset if DB table is being populated
    if (items.length === 0) {
      items = fhisipPrediksiData
      if (prodiFilter !== 'ALL') {
        items = items.filter((i: any) => i.prodiCode.toLowerCase() === prodiFilter.toLowerCase())
      }
    }

    if (query) {
      items = items.filter(
        (i: any) =>
          i.kodeMatkul.toLowerCase().includes(query) ||
          i.namaMatkul.toLowerCase().includes(query) ||
          i.prodiName.toLowerCase().includes(query)
      )
    }

    // Format rows matching exact reference spreadsheet columns
    const exportRows = items.map((item: any) => {
      const pNumCode = mapProdiNumericCode(item.prodiCode || '')
      const concatCode = `458${item.kodeMatkul}`

      return {
        concat: concatCode,
        singkatan: 'FHISIP',
        kode_program_studi: pNumCode,
        nama_program_studi: item.prodiName,
        kode_matakuliah: item.kodeMatkul,
        nama_matakuliah: item.namaMatkul,
        sipas_non_ttm: item.sipasNonTtm || 0,
        non_sipas: item.nonSipas || 0,
        'ttm sipas semi & Penuh': item.ttmSipas || 0,
        'Tuton  sipas semi & Penuh': item.tutonSipas || 0,
        'Jumlah TTM': item.jumlahTTM || 0,
        'Jumlah Tuton': item.jumlahTuton || item.totalMahasiswa || 0,
        'Prediksi Kelas (50 mhs/kls)': item.kebutuhanKelas || Math.ceil((item.totalMahasiswa || 0) / 50),
        'Kebutuhan Minimal Tutor (max 4 kls/tutor)': item.kebutuhanTutorMin || Math.ceil((item.kebutuhanKelas || 1) / 4),
      }
    })

    // Generate Excel Sheet & Workbook
    const worksheet = xlsx.utils.json_to_sheet(exportRows)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, `Prediksi ${masa}`)

    // Auto-fit column widths for clear presentation
    const maxCols = [
      { wch: 15 }, // concat
      { wch: 10 }, // singkatan
      { wch: 20 }, // kode_program_studi
      { wch: 30 }, // nama_program_studi
      { wch: 18 }, // kode_matakuliah
      { wch: 45 }, // nama_matakuliah
      { wch: 15 }, // sipas_non_ttm
      { wch: 15 }, // non_sipas
      { wch: 24 }, // ttm sipas semi & Penuh
      { wch: 26 }, // Tuton sipas semi & Penuh
      { wch: 15 }, // Jumlah TTM
      { wch: 15 }, // Jumlah Tuton
      { wch: 26 }, // Prediksi Kelas
      { wch: 38 }, // Kebutuhan Minimal Tutor
    ]
    worksheet['!cols'] = maxCols

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const formattedMasa = masa === '20261' ? '2026.1' : masa === '20262' ? '2026.2' : masa

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Data_Prediksi_Kelas_FHISIP_UT_${formattedMasa}.xlsx"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
