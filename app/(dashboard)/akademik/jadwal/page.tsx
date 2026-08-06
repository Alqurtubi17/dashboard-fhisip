'use client'

import React, { useState } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Clock,
  MapPin,
  X,
  CalendarCheck,
  Building2,
  List,
  Grid,
  CalendarDays,
} from 'lucide-react'

type AgendaCategory = 'ut_academic' | 'prodi'
type CalendarViewMode = 'month' | 'day' | 'list'

type AgendaItem = {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  category: AgendaCategory
  organizer: string
  location?: string
  description?: string
  targetProdi?: string
}

const CATEGORY_MAP: Record<
  AgendaCategory,
  { label: string; bg: string; border: string; text: string; dotColor: string }
> = {
  ut_academic: {
    label: 'Kalender Akademik UT',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-900',
    dotColor: 'bg-indigo-600',
  },
  prodi: {
    label: 'Agenda Dekanat & Kaprodi',
    bg: 'bg-teal-50',
    border: 'border-teal-300',
    text: 'text-teal-900',
    dotColor: 'bg-teal-600',
  },
}

// Official Kalender Akademik UT Sourced from https://www.ut.ac.id/kalender-akademik/
const INITIAL_AGENDAS: AgendaItem[] = [
  {
    id: 'ut-1',
    title: 'Pendaftaran Mahasiswa Baru UT 2026.1',
    date: '2026-07-01',
    startTime: '08:00',
    endTime: '23:59',
    category: 'ut_academic',
    organizer: 'Universitas Terbuka Pusat',
    location: 'Portal Admisi UT (admisi-sia.ut.ac.id)',
    description: 'Pendaftaran dan unggah berkas admisi mahasiswa baru jenjang Diploma & Sarjana UT.',
  },
  {
    id: 'ut-2',
    title: 'Batas Akhir Registrasi Mata Kuliah 2026.1',
    date: '2026-07-29',
    startTime: '08:00',
    endTime: '23:59',
    category: 'ut_academic',
    organizer: 'Universitas Terbuka Pusat',
    location: 'Portal Layanan Akademik UT',
    description: 'Batas akhir registrasi dan input mata kuliah semester berjalan 2026.1.',
  },
  {
    id: 'ut-3',
    title: 'Batas Pembayaran Billing SPP / Tuweb',
    date: '2026-08-05',
    startTime: '08:00',
    endTime: '23:59',
    category: 'ut_academic',
    organizer: 'Direktorat Keuangan UT',
    location: 'Bank Mitra (Mandiri, BRI, BTN, BSI)',
    description: 'Batas pembayaran LIP SPP / Tuweb / Tuton mahasiswa terregistrasi.',
  },
  {
    id: 'ut-4',
    title: 'Pelaksanaan Tutorial Online (Tuton) Sesi 1',
    date: '2026-08-10',
    startTime: '08:00',
    endTime: '23:59',
    category: 'ut_academic',
    organizer: 'LPPMP UT & Dekanat FHISIP',
    location: 'LMS E-Learning UT (elearning.ut.ac.id)',
    description: 'Pembukaan sesi 1 tutorial online bagi seluruh mahasiswa FHISIP UT.',
  },
  {
    id: 'ut-5',
    title: 'Batas Unggah Tugas 1 Tuton',
    date: '2026-08-24',
    startTime: '08:00',
    endTime: '23:59',
    category: 'ut_academic',
    organizer: 'LPPMP UT',
    location: 'LMS E-Learning UT',
    description: 'Batas akhir pengerjaan dan pengunggahan Tugas 1 pada Tuton.',
  },
  {
    id: 'ut-6',
    title: 'Pelaksanaan Ujian Akhir Semester (UAS) UT',
    date: '2026-09-12',
    startTime: '07:30',
    endTime: '16:00',
    category: 'ut_academic',
    organizer: 'Pusat Ujian UT',
    location: 'Lokasi Ujian UT Daerah & Online Supervisi',
    description: 'Pelaksanaan Ujian Akhir Semester (UAS) Tatap Muka & Online.',
  },
  {
    id: 'ut-7',
    title: 'Pengumuman Nilai Akhir Semester (KHS)',
    date: '2026-09-28',
    startTime: '10:00',
    endTime: '23:59',
    category: 'ut_academic',
    organizer: 'Universitas Terbuka Pusat',
    location: 'Portal Layanan Akademik UT',
    description: 'Pengumuman Kartu Hasil Studi (KHS) dan nilai semester mahasiswa.',
  },
]

// Hours from 07:00 to 20:00 for Google Calendar style hourly timeline
const HOURS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

export default function JadwalAkademikPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 29)) // July 29, 2026
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-07-29')
  const [agendas, setAgendas] = useState<AgendaItem[]>(INITIAL_AGENDAS)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')

  // Modals & Panels state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null)
  const [isDayTimelineModalOpen, setIsDayTimelineModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Form State
  const [form, setForm] = useState({
    title: '',
    date: '2026-07-29',
    startTime: '09:00',
    endTime: '12:00',
    category: 'prodi' as AgendaCategory,
    organizer: 'Dekanat Akademik FHISIP',
    location: '',
    description: '',
    targetProdi: 'FHISIP',
  })

  // Date Navigation Helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const setToday = () => {
    setCurrentDate(new Date(2026, 6, 29))
    setSelectedDateStr('2026-07-29')
  }

  // Calendar Grid Days Calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarCells = []

  // Prev month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const dateStr = `${month === 0 ? year - 1 : year}-${String(
      month === 0 ? 12 : month
    ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    calendarCells.push({ dayNum, dateStr, currentMonth: false })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarCells.push({ dayNum: d, dateStr, currentMonth: true })
  }

  // Next month padding days to fill grid
  const remainingCells = (calendarCells.length > 35 ? 42 : 35) - calendarCells.length
  for (let n = 1; n <= remainingCells; n++) {
    const dateStr = `${month === 11 ? year + 1 : year}-${String(
      month === 11 ? 1 : month + 2
    ).padStart(2, '0')}-${String(n).padStart(2, '0')}`
    calendarCells.push({ dayNum: n, dateStr, currentMonth: false })
  }

  // Handle Create New Agenda
  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) return

    const newAgenda: AgendaItem = {
      id: `ag-${Date.now()}`,
      title: form.title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      category: form.category,
      organizer: form.organizer,
      location: form.location,
      description: form.description,
      targetProdi: form.targetProdi,
    }

    setAgendas([newAgenda, ...agendas])
    setIsAddModalOpen(false)
    setForm({
      title: '',
      date: selectedDateStr,
      startTime: '09:00',
      endTime: '12:00',
      category: 'prodi',
      organizer: 'Dekanat Akademik FHISIP',
      location: '',
      description: '',
      targetProdi: 'FHISIP',
    })
  }

  // Filtered Agendas
  const filteredAgendas = agendas.filter((ag) => {
    if (selectedCategoryFilter !== 'ALL' && ag.category !== selectedCategoryFilter) return false
    return true
  })

  // Agendas for selected date (for Day Timeline view)
  const selectedDateAgendas = filteredAgendas.filter((a) => a.date === selectedDateStr)

  // Open day timeline modal or switch to day view
  const openDayDetail = (dateStr: string) => {
    setSelectedDateStr(dateStr)
    setIsDayTimelineModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-ut-blue" />
            Kalender Akademik UT & Agenda FHISIP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Jadwal kalender akademik resmi Universitas Terbuka & rincian agenda per jam Dekanat / Kaprodi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setForm({ ...form, date: selectedDateStr })
              setIsAddModalOpen(true)
            }}
            className="btn-primary text-xs py-2.5 px-4.5 flex items-center gap-2 rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all hover:shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Agenda</span>
          </button>
        </div>
      </div>

      {/* Category Legend Bar */}
      <div className="card p-4 bg-white/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-700">
          {Object.entries(CATEGORY_MAP).map(([key, info]) => (
            <button
              key={key}
              onClick={() =>
                setSelectedCategoryFilter(selectedCategoryFilter === key ? 'ALL' : key)
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
                selectedCategoryFilter === key ? 'bg-slate-100 ring-2 ring-ut-navy/20 font-bold' : 'hover:bg-slate-50'
              }`}
            >
              <span className={`w-3 h-3 rounded-md ${info.dotColor} shrink-0`}></span>
              <span>{info.label}</span>
            </button>
          ))}
        </div>

        {/* View Mode Selector (Bulan / Hari / Daftar) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'month' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Bulan</span>
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'day' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Detail Jam (Hari)</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'list' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Daftar Agenda</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: MONTH CALENDAR GRID */}
      {viewMode === 'month' && (
        <div className="card p-6 space-y-4">
          {/* Calendar Header Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-ut-navy" />
                {monthNames[month]} {year}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-base font-extrabold text-slate-900 tracking-tight min-w-[140px] text-center">
                29 Jul 2026
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={setToday}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs"
              >
                Hari Ini
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
                    selectedCategoryFilter !== 'ALL'
                      ? 'bg-ut-navy text-amber-400 border-ut-navy font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                  title="Filter Kategori Agenda"
                >
                  <Filter className="w-4 h-4" />
                  {selectedCategoryFilter !== 'ALL' && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-extrabold">
                      1
                    </span>
                  )}
                </button>

                {/* FILTER DROPDOWN MENU */}
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Filter Kategori Agenda
                    </div>
                    <div className="py-1 space-y-1">
                      <button
                        onClick={() => {
                          setSelectedCategoryFilter('ALL')
                          setIsFilterOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                          selectedCategoryFilter === 'ALL'
                            ? 'bg-ut-navy/10 text-ut-navy font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>🌟 Semua Kategori</span>
                        {selectedCategoryFilter === 'ALL' && <span className="text-ut-navy font-bold">✓</span>}
                      </button>

                      {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedCategoryFilter(key)
                            setIsFilterOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                            selectedCategoryFilter === key
                              ? 'bg-ut-navy/10 text-ut-navy font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${info.dotColor}`}></span>
                            <span>{info.label}</span>
                          </span>
                          {selectedCategoryFilter === key && <span className="text-ut-navy font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Days of Week Header Grid */}
          <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-bold uppercase tracking-wider py-2">
            <div className="text-rose-600">Min</div>
            <div className="text-slate-700">Sen</div>
            <div className="text-slate-700">Sel</div>
            <div className="text-slate-700">Rab</div>
            <div className="text-slate-700">Kam</div>
            <div className="text-slate-700">Jum</div>
            <div className="text-slate-700">Sab</div>
          </div>

          {/* Month Dates Grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200">
            {calendarCells.map((cell, idx) => {
              const cellAgendas = filteredAgendas.filter((a) => a.date === cell.dateStr)
              const isToday = cell.dateStr === '2026-07-29'
              const isSelected = cell.dateStr === selectedDateStr

              return (
                <div
                  key={idx}
                  onClick={() => openDayDetail(cell.dateStr)}
                  className={`min-h-[110px] sm:min-h-[135px] p-2 bg-white flex flex-col justify-start transition-all cursor-pointer group hover:bg-slate-50/80 ${
                    !cell.currentMonth ? 'bg-slate-50/50 text-slate-400' : 'text-slate-800'
                  } ${isToday ? 'ring-2 ring-amber-400 bg-amber-50/20' : ''} ${
                    isSelected ? 'ring-2 ring-ut-navy/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${
                        isToday
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : cell.currentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {cellAgendas.length > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          cellAgendas.length > 1
                            ? 'bg-ut-navy text-amber-400 font-extrabold'
                            : 'text-slate-500 bg-slate-100'
                        }`}
                      >
                        {cellAgendas.length} {cellAgendas.length > 1 ? 'Agenda' : 'Agenda'}
                      </span>
                    )}
                  </div>

                  {/* Agenda Badges in Date Cell (Fitted layout without scrollbar) */}
                  <div className="space-y-1 overflow-hidden">
                    {cellAgendas.slice(0, 1).map((item) => {
                      const catStyle = CATEGORY_MAP[item.category] || CATEGORY_MAP.ut_academic
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAgenda(item)
                          }}
                          className={`p-1.5 rounded-lg border ${catStyle.bg} ${catStyle.border} ${catStyle.text} text-[11px] font-medium leading-tight hover:shadow-xs transition relative`}
                          title={`${item.title} (${item.startTime} - ${item.endTime})`}
                        >
                          <p className="font-bold truncate">{item.title}</p>
                          <p className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>{item.startTime} - {item.endTime}</span>
                          </p>
                        </div>
                      )
                    })}

                    {/* Indicator for additional agendas when > 1 */}
                    {cellAgendas.length > 1 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          openDayDetail(cell.dateStr)
                        }}
                        className="text-[10px] font-bold text-ut-navy bg-ut-navy/10 hover:bg-ut-navy hover:text-amber-400 p-1 rounded-lg text-center border border-ut-navy/20 cursor-pointer transition"
                      >
                        + {cellAgendas.length - 1} Agenda Lain (Detail Jam ➔)
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: GOOGLE CALENDAR STYLE HOURLY TIMELINE (DAY VIEW) */}
      {viewMode === 'day' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold bg-white"
              />
              <span className="text-sm font-extrabold text-slate-900">
                Timeline Agenda Per Jam ({selectedDateStr})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">
                Total Agenda: <strong className="text-slate-900">{selectedDateAgendas.length} Kegiatan</strong>
              </span>
            </div>
          </div>

          {/* Hourly Timeline Slots (Google Calendar Style) */}
          <div className="relative border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              {HOURS.map((hour) => {
                const agendasInHour = selectedDateAgendas.filter((a) => {
                  const itemStartHour = parseInt(a.startTime.split(':')[0], 10)
                  const itemEndHour = parseInt(a.endTime.split(':')[0], 10)
                  const slotHour = parseInt(hour.split(':')[0], 10)
                  return slotHour >= itemStartHour && slotHour <= itemEndHour
                })

                return (
                  <div key={hour} className="flex items-start min-h-[64px] group hover:bg-slate-50/60 transition">
                    {/* Left Time Label */}
                    <div className="w-20 sm:w-24 px-4 py-2 border-r border-slate-200 text-xs font-extrabold text-slate-400 select-none shrink-0 group-hover:text-ut-navy">
                      {hour}
                    </div>

                    {/* Right Timeline Content Area */}
                    <div className="flex-1 p-2 relative">
                      {agendasInHour.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {agendasInHour.map((item) => {
                            const catStyle = CATEGORY_MAP[item.category] || CATEGORY_MAP.ut_academic
                            return (
                              <div
                                key={item.id}
                                onClick={() => setSelectedAgenda(item)}
                                className={`p-3 rounded-xl border ${catStyle.bg} ${catStyle.border} ${catStyle.text} text-xs font-semibold cursor-pointer hover:shadow-md transition flex items-start justify-between`}
                              >
                                <div className="space-y-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${catStyle.dotColor} shrink-0`}></span>
                                    <p className="font-extrabold text-slate-900 text-xs truncate">{item.title}</p>
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      {item.startTime} - {item.endTime} WIB
                                    </span>
                                    {item.location && (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="w-3 h-3 text-rose-500" />
                                        {item.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700 shrink-0">
                                  {item.organizer}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="h-full min-h-[32px] border-b border-dashed border-slate-100 flex items-center text-[11px] text-slate-300 italic px-2">
                          Tidak ada agenda pada jam ini
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: DAFTAR AGENDA (LIST VIEW) */}
      {viewMode === 'list' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <List className="w-5 h-5 text-ut-blue" />
              Daftar Seluruh Agenda Akademik & Kegiatan ({filteredAgendas.length})
            </h2>
          </div>

          <div className="space-y-3">
            {filteredAgendas.map((item) => {
              const catStyle = CATEGORY_MAP[item.category] || CATEGORY_MAP.ut_academic
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAgenda(item)}
                  className={`p-4 rounded-2xl border ${catStyle.bg} ${catStyle.border} hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                        {catStyle.label}
                      </span>
                      <span className="text-xs font-bold text-slate-500">Tanggal: {item.date}</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {item.startTime} - {item.endTime} WIB
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        {item.organizer}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <button className="btn-secondary py-1.5 px-3 text-xs self-start sm:self-center shrink-0">
                    Lihat Rincian
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* GOOGLE CALENDAR STYLE DAY HOURLY TIMELINE MODAL */}
      {isDayTimelineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-ut-navy/10 text-ut-navy flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Agenda Per Jam ({selectedDateStr})</h3>
                  <p className="text-xs text-slate-500">Tampilan timeline jam resmi seperti Google Calendar</p>
                </div>
              </div>
              <button
                onClick={() => setIsDayTimelineModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Timeline Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
              {HOURS.map((hour) => {
                const agendasInHour = selectedDateAgendas.filter((a) => {
                  const itemStartHour = parseInt(a.startTime.split(':')[0], 10)
                  const itemEndHour = parseInt(a.endTime.split(':')[0], 10)
                  const slotHour = parseInt(hour.split(':')[0], 10)
                  return slotHour >= itemStartHour && slotHour <= itemEndHour
                })

                return (
                  <div key={hour} className="flex items-start min-h-[56px] border-b border-slate-200/60 pb-2">
                    <div className="w-16 text-xs font-extrabold text-slate-400 pt-1 shrink-0">
                      {hour}
                    </div>
                    <div className="flex-1 pl-2">
                      {agendasInHour.length > 0 ? (
                        <div className="space-y-1.5">
                          {agendasInHour.map((item) => {
                            const catStyle = CATEGORY_MAP[item.category] || CATEGORY_MAP.ut_academic
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedAgenda(item)
                                }}
                                className={`p-2.5 rounded-xl border ${catStyle.bg} ${catStyle.border} ${catStyle.text} text-xs font-semibold cursor-pointer hover:shadow-xs transition flex items-center justify-between`}
                              >
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-slate-900 text-xs">{item.title}</p>
                                  <p className="text-[11px] text-slate-600 flex items-center gap-2">
                                    <span>⏱️ {item.startTime} - {item.endTime} WIB</span>
                                    {item.location && <span>• 📍 {item.location}</span>}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                                  {item.organizer}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300 italic pt-1 inline-block">-- Kosong --</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 flex justify-between items-center shrink-0 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsDayTimelineModalOpen(false)
                  setForm({ ...form, date: selectedDateStr })
                  setIsAddModalOpen(true)
                }}
                className="btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200 font-bold"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Tambah Agenda Pada Tanggal Ini</span>
              </button>

              <button
                onClick={() => setIsDayTimelineModalOpen(false)}
                className="btn-primary text-xs py-2 px-5 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW AGENDA MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tambah Agenda Dekanat / Kaprodi</h3>
                  <p className="text-xs text-slate-500">Input agenda kegiatan rapat, evaluasi, atau asesmen FHISIP</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgenda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Agenda / Kegiatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Rapat Koordinasi Rencana Pembelajaran Semester FHISIP"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Agenda *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as AgendaCategory })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy bg-white"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pelaksanaan *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="text"
                    placeholder="09:00"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="text"
                    placeholder="12:00"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penyelenggara / Unit</label>
                  <input
                    type="text"
                    placeholder="Dekanat FHISIP / Kaprodi Ilmu Hukum"
                    value={form.organizer}
                    onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi / Link Zoom</label>
                  <input
                    type="text"
                    placeholder="Ruang Rapat Dekanat / Hybrid Zoom"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Catatan Agenda</label>
                <textarea
                  rows={3}
                  placeholder="Tambahkan rincian agenda..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-ut-navy/20 focus:border-ut-navy"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AGENDA DETAIL MODAL */}
      {selectedAgenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${CATEGORY_MAP[selectedAgenda.category]?.bg} ${CATEGORY_MAP[selectedAgenda.category]?.text} border ${CATEGORY_MAP[selectedAgenda.category]?.border}`}>
                {CATEGORY_MAP[selectedAgenda.category]?.label}
              </span>
              <button
                onClick={() => setSelectedAgenda(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-extrabold text-slate-900">{selectedAgenda.title}</h3>

            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-ut-blue shrink-0" />
                <span>Tanggal: <strong className="text-slate-900">{selectedAgenda.date}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Waktu: <strong className="text-slate-900">{selectedAgenda.startTime} - {selectedAgenda.endTime} WIB</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Penyelenggara: <strong className="text-slate-900">{selectedAgenda.organizer}</strong></span>
              </div>

              {selectedAgenda.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Lokasi: <strong className="text-slate-900">{selectedAgenda.location}</strong></span>
                </div>
              )}
            </div>

            {selectedAgenda.description && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">Deskripsi & Catatan:</p>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                  {selectedAgenda.description}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAgenda(null)}
                className="btn-primary text-xs py-2 px-5 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
