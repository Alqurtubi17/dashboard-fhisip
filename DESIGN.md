# DESIGN.md

<!-- ryux-context:start -->
## RYUX project context

RYUX reads this block before any design task. These answers are the team's context and direction,
not evidence or verified facts: RYUX follows them and still backs its decisions with evidence.
Blanks stay unknown. UI direction describes character, not colors, fonts, or spacing.

- **Product**: Portal Mahasiswa FHISIP UT (Fakultas Hukum, Ilmu Sosial, dan Ilmu Politik - Universitas Terbuka)
- **Current work**: Redesain dan penyempurnaan UI/UX Portal Data Mahasiswa & Academic Monitoring Dashboard
- **Audience**: Pimpinan Fakultas, Ketua Program Studi, Dosen Wali, Staf Akademik, dan Tim Administrasi FHISIP UT
- **Market and locale**: Indonesia (id-ID, IDR / Angka Standar Indonesia: titik pemisah ribuan, koma desimal)
- **Why choose it**: Sentralisasi data 390.000+ mahasiswa dari 9 program studi FHISIP UT secara real-time dengan integrasi SRS API & PostgreSQL lokal, pencarian kilat tanpa latensi, visualisasi status registrasi, IPK, dan pemantauan kelulusan dengan hierarki informasi yang jernih.
- **Taste references**: Linear, Vercel Dashboard, Stripe Dashboard, Modern High-Density Academic Information Architecture
- **What people do in it**: 
  1. Mencari, memfilter, dan menginspeksi data mahasiswa (NIM, Nama, Prodi, Semester, Status, IPK, Kontak).
  2. Menganalisis metrik distribusi status akademik mahasiswa (Aktif, Non-Aktif, Alumni, Belum Registrasi, Adm/DO).
  3. Mengelola sinkronisasi data bertahap dari SRS API ke basis data lokal (khusus Super Admin).
- **Numbers that may be shown**: 392.064 Total Mahasiswa, 9 Program Studi, Skala IPK 0.00 - 4.00, Rentang Semester 1 - 12+, Persentase Progress Sinkronisasi.
- **Brand and design system**: Universitas Terbuka Brand Guidelines (`#002B49` UT Navy, `#005691` UT Blue, `#FFC700` UT Gold, `#F4F7FA` Slate Light BG), Tailwind CSS, Lucide React, Plus Jakarta Sans.
- **Product docs**: README.md, docs/prd.md
- **Evidence sources**: Pedoman Akademik Universitas Terbuka, Data Skema SRS UT, Observasi alur kerja staf fakultas, Standar Desain RYUX (RX-PR, RX-UI, RX-UX, RX-CD, RX-AS).
- **Constraints**: Responsive Web (Desktop primary, Tablet & Mobile full usability), Aksesibilitas WCAG 2.2 AA (kontras minimal 4.5:1 untuk teks biasa, 3:1 untuk kontrol UI), Perlindungan Data Pribadi (UU PDP: masking kontak & copy-on-click aman), PostgreSQL backend, Next.js App Router.
- **Design intent**: Memudahkan sivitas akademika memahami status mahasiswa secara instan tanpa kelelahan mata (cognitive load rendah), pemindaian data tabel yang cepat, kontrol filter yang taktil dan transparan, serta feedback aksi yang tegas.
- **UX direction**: Data-dense dashboard with instant zero-layout-shift filtering, high readability, tactile actions, resilient error recovery, and clear data provenance.
- **UI direction**: Calm, authoritative, information-rich, high-contrast, polished academic prestige (anti-slop).
- **Voice and tone**: Formal yet friendly (PUEBI), lugas, informatif, tenang, objektif. Tidak berbelit-belit, tidak ada humor pada status kritis/error.
- **Motion direction**: Subtle (150ms-200ms ease-out transitions), micro-interactions untuk konfirmasi dan perpindahan state, tidak ada animasi dekoratif lambat yang menghambat produktivitas.
<!-- ryux-context:end -->

## Users and needs
- **Pimpinan Fakultas & Dekanat**: Membutuhkan ringkasan metrik akurat (mahasiswa aktif vs non-aktif, retensi, alumni) untuk pengambilan keputusan strategis dan pelaporan akreditasi.
- **Ketua Program Studi (Kaprodi)**: Membutuhkan filter per-prodi yang presisi untuk memantau mahasiswa berprestasi (IPK ≥ 3.50) serta mahasiswa rentan drop out atau belum registrasi.
- **Dosen Wali & Pembimbing**: Memerlukan akses cepat ke kontak resmi mahasiswa (NIM, nomor telepon, alamat email) untuk konseling akademik.
- **Staf Akademik / Super Admin**: Membutuhkan alat sinkronisasi data dari SRS API yang transparan dengan indikator progres realtime, estimasi data, dan status koneksi database.

## Jobs to be done
- **Primary Job**: Ketika mengelola data ribuan mahasiswa, staf akademik ingin menemukan dan mengklasifikasikan mahasiswa berdasarkan kriteria tertentu (NIM/Nama/Prodi/Status/IPK) secara instan, sehingga dapat segera mengambil tindakan administratif.
- **Secondary Job**: Ketika terjadi pembaruan semester, admin ingin melakukan sinkronisasi data batch dari SRS UT ke PostgreSQL tanpa mengganggu performa dashboard.
- **What "Done" Looks Like**: Pengguna dapat melihat statistik global dalam 1 detik, memfilter daftar mahasiswa dengan respon real-time (< 100ms debounce), membaca informasi penting tanpa horizontal scroll berlebih, dan menyalin kontak mahasiswa dengan 1 klik.

## Design principles
1. **Kejelasan Informasi di Atas Dekorasi Visual (Clarity over Novelty)**: Dashboard akademik adalah alat kerja harian. Setiap warna, garis batas, dan ruang harus memiliki fungsi semantik yang jelas (RX-UI-12).
2. **Kepadatan Data yang Tetap Nyaman Dibaca (High-Density with Breathing Room)**: Menampilkan volume data yang kaya tanpa membuat layar terasa sesak, memanfaatkan skala tipografi berhirarki kuat dan padding modular (RX-UX-08).
3. **Status yang Jelas dan Terbaca Seketika (Unambiguous State & Feedback)**: Status aktif, cuti, alumni, maupun error harus langsung dikenali lewat kontras warna lulus WCAG 2.2 AA dan teks label eksplisit (bukan sekadar ikon atau titik warna) (RX-UI-31).
4. **Interaksi Taktil dan Aman (Tactile, Reversible, & Guarded Actions)**: Tombol aksi memiliki state hover/active yang tegas. Tindakan krusial (seperti sinkronisasi data massal) memiliki dialog konfirmasi dan progress bar interaktif (RX-IX-05).

## Evidence
- **Observed (Strong)**: Data mahasiswa FHISIP mencapai >390.000 entitas; pencarian manual tanpa indeks PostgreSQL dan filter komprehensif menyebabkan waktu tunggu staf terlalu lama.
- **Observed (Strong)**: Warna primer institusional UT (`#002B49` Deep Navy dan `#FFC700` Gold) memberikan identitas resmi dan rasa percaya tinggi jika dipadukan dengan latar belakang slate netral yang bersih.
- **Knowledge (Standard)**: Standar format mata uang & angka bahasa Indonesia (titik pemisah ribuan, contoh: `392.064 Mahasiswa`).
- **Knowledge (Standard)**: Aturan kontras WCAG 2.2 AA minimal 4.5:1 untuk teks normal dan 3.0:1 untuk teks besar/komponen UI.

## Interaction patterns
- **Multi-parameter Filtering with Active Filter Chips**: Menampilkan filter aktif dalam bentuk chip yang dapat ditutup satu per satu atau di-reset serentak, sehingga pengguna selalu sadar data apa yang sedang disajikan.
- **Debounced Instant Search**: Input pencarian dengan latensi 300ms untuk mencegah spam request API dengan ikon clear (✕) instan saat terisi.
- **Accessible Detail Drawer/Modal**: Menampilkan profil lengkap mahasiswa dalam modal terfokus dengan dukungan tombol keyboard `Escape` dan pencegahan scroll background.
- **Copy-to-Clipboard with Inline Toast**: Menyalin NIM atau email mahasiswa langsung memberikan indikator visual centang hijau ("Tersalin!") tanpa mengalihkan perhatian.
- **Live SSE Progress Feedback**: Modal sinkronisasi menampilkan progress bar kontinu dan persentase numerik langsung dari streaming event.

## Visual and motion language

```yaml
direction:
  id: fhisip-academic-prestige
  name: FHISIP UT Academic Prestige
  status: chosen
  philosophy: "Authoritative academic clarity with crisp modern utility. Clean white surfaces, subtle slate borders, and purposeful UT Navy accents."
  grammar:
    density: compact-to-comfortable
    formality: formal-professional
    temperature: cool-neutral-with-gold-accent
  colors:
    background: "#F4F7FA"
    surface: "#FFFFFF"
    surface_elevated: "#FFFFFF"
    border: "#E2E8F0"
    border_subtle: "#F1F5F9"
    text_primary: "#0F172A"
    text_secondary: "#475569"
    text_muted: "#94A3B8"
    brand_primary: "#002B49"
    brand_secondary: "#005691"
    brand_accent: "#FFC700"
    semantic:
      success_bg: "#ECFDF5"
      success_text: "#065F46"
      success_border: "#A7F3D0"
      warning_bg: "#FFFBEB"
      warning_text: "#92400E"
      warning_border: "#FDE68A"
      danger_bg: "#FEF2F2"
      danger_text: "#991B1B"
      danger_border: "#FECACA"
      info_bg: "#EFF6FF"
      info_text: "#1E40AF"
      info_border: "#BFDBFE"
  typography:
    font_family: "Plus Jakarta Sans, system-ui, sans-serif"
    font_mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    scale:
      title_page: "text-2xl font-bold tracking-tight (24px)"
      section_heading: "text-base font-semibold (16px)"
      card_label: "text-xs font-semibold text-slate-500 uppercase tracking-wider (11px/12px)"
      card_value: "text-2xl font-black text-slate-900 (24px)"
      table_header: "text-xs font-bold text-slate-600 uppercase tracking-wider (11px/12px)"
      table_body: "text-xs font-medium text-slate-800 (12px/13px)"
      badge: "text-xs font-bold (11px/12px)"
  radius:
    control: "8px"
    badge: "6px"
    card: "16px"
    modal: "20px"
  depth:
    card: "0 1px 3px 0 rgba(0, 43, 73, 0.04), 0 1px 2px -1px rgba(0, 43, 73, 0.04)"
    card_hover: "0 8px 24px -4px rgba(0, 43, 73, 0.08)"
    modal: "0 25px 50px -12px rgba(0, 43, 73, 0.25)"
  durations:
    quick: "150ms"
    standard: "200ms"
  avoid:
    - "Menambahkan shape/box/border kontainer tambahan di sekeliling logo resmi (biarkan full logo tampil langsung secara mandiri tanpa framing/squircle berlebihan)"
    - "Shape bubble / rounded-full berlebihan pada teks status (terutama status panjang seperti 'Pindah ke PT Lain atau Batal registrasi atau Pending'); gunakan bentuk kotak bersudut halus (rounded-md/rounded-lg) atau teks berhierarki bersih tanpa framing berlebihan"
    - "Tombol gradasi ungu/pink atau warna neon acak yang tidak sesuai brand UT"
    - "Glow berlebihan yang mengaburkan teks tabel"
    - "Titik status berwarna tanpa teks pendamping"
    - "Animasi lambat (>300ms) pada pemuatan data"
    - "Layout shift saat switching tab/halaman"
```

## Voice and tone
- **Karakter**: Berwibawa, lugas, presisi, dan bersahabat bagi staf akademik Indonesia.
- **Sapaan & Istilah**: Menggunakan istilah resmi Universitas Terbuka (NIM, Program Studi, Fakultas, Registrasi, IPK, Semester, Status Akademik).
- **Format Angka**: Selalu menggunakan konvensi Indonesia (`392.064` bukan `392,064`).
- **Pesan Konfirmasi & Error**: Eksplisit dan solutif (misal: "Basis data mahasiswa berhasil disinkronkan: 25.000 data diperbarui.").

## Business rules
### Decided
- Mahasiswa aktif berstatus `Aktif` atau kode `DA`.
- **Pemetaan Resmi Kode Program Studi & API Akademik (FHISIP UT)**:
  Sesuai standar integrasi API kurikulum dan basis data akademik FHISIP UT:
  | No | Program Studi | Kode Resmi API | Kode Alias / SRS | Prefix Mata Kuliah Kurikulum |
  |---|---|---|---|---|
  | 1 | S1 Ilmu Hukum / Hukum | `FSIH` | `HKUM` / `311` | `FSIH`, `HKUM` |
  | 2 | S1 Perpajakan | `FSSP` | `PAJAK` / `312` | `FSSP`, `PAJAK` |
  | 3 | S1 Administrasi Publik | `FSAP` | `ADPU` / `50` | `FSAP`, `ADPU`, `ADKA`, `ADNE`, `ADPE`, `ADPG` |
  | 4 | S1 Administrasi Bisnis | `FSAB` | `ADBI` / `51` | `FSAB`, `ADBI`, `ADNI` |
  | 5 | S1 Ilmu Komunikasi | `FSIK` | `IKOM` / `72` | `FSIK`, `IKOM`, `SKOM` |
  | 6 | S1 Ilmu Perpustakaan | `FSIP` | `PUS` / `310` | `FSIP`, `PUS`, `PUST` |
  | 7 | S1 Sosiologi | `FSSO` | `SOSI` / `70` | `FSSO`, `SOSI` |
  | 8 | S1 Sastra Inggris | `FSSI` | `SING` / `87` | `FSSI`, `SING`, `BING` |
  | 9 | S1 Ilmu Pemerintahan | `FSPE` | `IPEM` / `71` | `FSPE`, `IPEM` |
- **Aturan Mata Kuliah Umum Universitas vs Khusus Prodi**:
  - Mata Kuliah Umum Universitas (berlaku lintas program studi): `MKWU` (Wajib Universitas), `MKDU` (Dasar Umum), `ISIP` (Ilmu Sosial & Ilmu Politik Dasar).
  - `FSIP` adalah kode Program Studi **Ilmu Perpustakaan** (bukan mata kuliah umum). Mata kuliah berawalan `FSIP` (contoh: `FSIP4103 - Organisasi Informasi`, `FSIP4203 - Manajemen Perpustakaan`) HANYA boleh disajikan untuk mahasiswa Program Studi Ilmu Perpustakaan (`FSIP`), dan dilarang muncul pada prodi lain seperti Administrasi Publik (`FSAP`).
- Filter minimum IPK mencakup opsi: Semua, ≥ 3.50 (Cumlaude), ≥ 3.00, ≥ 2.75, ≥ 2.00.
- Tombol sinkronisasi massal hanya dapat diakses oleh peran `superadmin`.
- Masking nomor HP dan email bila tidak tersedia dengan tanda strip `-`.

### Not decided
- Ekspor data mahasiswa ke format Excel/CSV untuk kaprodi (direncanakan pada rilis fase berikutnya).
- Integrasi rekam jejak nilai semester per semester (KHS/Transkrip lengkap).

## How we evaluate
- **Efisiensi Navigasi**: Pengguna dapat memfilter prodi dan status dalam maksimal 2 klik.
- **Kecepatan Respons**: Filter dan pencarian merespon dalam waktu di bawah 300ms tanpa lag UI.
- **Kepatuhan Aksesibilitas**: Semua teks pada kartu metrik, tabel, badge, dan modal lulus tes kontras warna WCAG 2.2 AA.
- **Kualitas Visual Anti-Slop**: Tidak ada komponen yang melanggar hierarki brand UT, bebas dari artefak AI visual yang berantakan.

## Open questions
- Apakah fitur filter jalur masuk (RPL / Alih Kredit vs Reguler) diperlukan untuk pelaporan semester?
- Siapa yang berwenang mengekspor kontak mahasiswa untuk keperluan survei fakultas?

