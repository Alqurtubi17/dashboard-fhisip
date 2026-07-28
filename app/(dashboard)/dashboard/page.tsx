import Link from 'next/link'
import {
  Users,
  GraduationCap,
  BookOpen,
  FileBarChart,
  Globe2,
  ArrowRight,
  Award,
  CheckCircle2,
  Calendar,
  Star,
  UserCheck,
} from 'lucide-react'
import { FhisipLogo } from '@/components/ui/fhisip-logo'

export default function DashboardPage() {
  const prodiList = [
    { name: 'S1 Ilmu Hukum', code: 'HKUM', count: '4.820' },
    { name: 'S1 Ilmu Komunikasi', code: 'IKOM', count: '3.150' },
    { name: 'S1 Administrasi Publik', code: 'ADPU', count: '2.940' },
    { name: 'S1 Ilmu Pemerintahan', code: 'IPEM', count: '1.870' },
    { name: 'S1 Sosiologi', code: 'SOSI', count: '1.120' },
    { name: 'S1 Sastra Inggris', code: 'SING', count: '940' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner UT FHISIP */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001D33] via-[#002B49] to-[#005691] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        {/* Background Decorative UT Logo Image */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none hidden md:block w-48 h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ut-banner-bg.png"
            alt=""
            className="w-full h-full object-contain filter brightness-150"
          />
        </div>
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Fakultas Hukum, Ilmu Sosial dan Ilmu Politik
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Pusat kendali administrasi akademik dan pengelolaan layanan mahasiswa Pendidikan Tinggi Terbuka dan Jarak Jauh (PTTJJ) Universitas Terbuka.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <Globe2 className="w-4 h-4 text-amber-400" />
              <span>Jangkauan 39 UT Daerah</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Akreditasi Unggul & Terakreditasi International</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Academic Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Mahasiswa Terregistrasi',
            value: '14.840',
            desc: 'Registrasi Semester Ini',
            icon: GraduationCap,
            color: 'bg-ut-navy text-amber-400',
          },
          {
            title: 'Dosen & Pengajar',
            value: '842',
            desc: 'Tutor Tuton & Tuweb',
            icon: Users,
            color: 'bg-ut-blue text-white',
          },
          {
            title: 'Program Studi',
            value: '7',
            desc: 'Jenjang S1 & S2 FHISIP',
            icon: BookOpen,
            color: 'bg-emerald-700 text-white',
          },
          {
            title: 'Layanan Tutorial Aktif',
            value: '1.420',
            desc: 'Kelas Tuton & Tuweb',
            icon: UserCheck,
            color: 'bg-amber-500 text-slate-950',
          },
        ].map((item) => (
          <div key={item.title} className="card p-5 card-hover relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.title}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-2xl ${item.color} shadow-sm`}>
                <item.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{item.desc}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Program Studi & Academic Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Program Studi FHISIP */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-ut-blue" />
                  Program Studi FHISIP UT
                </h2>
                <p className="text-xs text-slate-500">Distribusi mahasiswa terdaftar per program studi</p>
              </div>
              <span className="badge-gold">T.A. 2026/2027</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prodiList.map((p) => (
                <div
                  key={p.code}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-ut-blue/40 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-ut-navy/10 text-ut-navy font-extrabold text-xs flex items-center justify-center group-hover:bg-ut-navy group-hover:text-amber-400 transition-all">
                      {p.code}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.count} Mahasiswa</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-ut-blue group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Academic Quick Actions */}
        <div className="space-y-4">
          <div className="card p-6 border-t-4 border-t-ut-navy">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-ut-navy" />
              Layanan Akademik
            </h2>
            <p className="text-xs text-slate-500 mb-4">Pintasan cepat modul operasional akademik FHISIP</p>

            <div className="space-y-2">
              <Link
                href="/mahasiswa"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-ut-blue hover:bg-ut-navy/5 text-slate-700 hover:text-ut-navy font-semibold text-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-ut-blue" />
                  <span>Data & Registrasi Mahasiswa</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/akademik/jadwal"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-ut-blue hover:bg-ut-navy/5 text-slate-700 hover:text-ut-navy font-semibold text-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Jadwal Perkuliahan</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/akademik/nilai"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-ut-blue hover:bg-ut-navy/5 text-slate-700 hover:text-ut-navy font-semibold text-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Rekap & Input Nilai</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/laporan"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-ut-blue hover:bg-ut-navy/5 text-slate-700 hover:text-ut-navy font-semibold text-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileBarChart className="w-4 h-4 text-purple-600" />
                  <span>Laporan Statistikal Akademik</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
