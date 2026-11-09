# Daftar Kode Resmi Program Studi & Mata Kuliah FHISIP UT

Dokumentasi pemetaan Program Studi dan standarisasi kode mata kuliah kurikulum baru berawalan `FS` di lingkungan Fakultas Hukum, Ilmu Sosial, dan Ilmu Politik (FHISIP) Universitas Terbuka.

---

## 1. Standar Kode Program Studi & Awalan Mata Kuliah

| No | Nama Program Studi | Kode Resmi API | Kode Singkatan Lama / SRS | Awalan Kode MK Baru (Resmi) | Awalan Kode MK Lama |
|:--:|:-------------------|:--------------:|:-------------------------:|:---------------------------:|:-------------------:|
| 1  | S1 Ilmu Hukum | **FSIH** | HKUM / 311, 321 | `FSIH*` | `HKUM*` |
| 2  | S1 Perpajakan | **FSSP** | PAJAK / 312, 30 | `FSSP*` | `PAJAK*` |
| 3  | S1 Administrasi Publik | **FSAP** | ADPU / 50, 350, 52, 86 | `FSAP*` | `ADPU*`, `ADKA*`, `ADNE*`, `ADPE*` |
| 4  | S1 Administrasi Bisnis | **FSAB** | ADBI / 51, 351 | `FSAB*` | `ADBI*`, `ADNI*` |
| 5  | S1 Ilmu Komunikasi | **FSIK** | IKOM / 72, 37 | `FSIK*` | `IKOM*`, `SKOM*` |
| 6  | S1 Ilmu Perpustakaan | **FSIP** | PUS / 310, 43 | `FSIP*` | `PUS*`, `PUST*` |
| 7  | S1 Sosiologi | **FSSO** | SOSI / 70 | `FSSO*` | `SOSI*` |
| 8  | S1 Sastra Inggris | **FSSI** | SING / 87, 47, 48, 49, 63 | `FSSI*` | `SING*`, `BING*` |
| 9  | S1 Ilmu Pemerintahan | **FSPE** | IPEM / 71 | `FSPE*` | `IPEM*` |

---

## 2. Aturan Bisnis Pengguguran Mata Kuliah

1. **Khusus Mata Kuliah Non-Inti**:
   - Mata kuliah kategori `INTI` dikunci dan **tidak dapat diajukan** untuk digugurkan.
   - Hanya mata kuliah kategori `NON_INTI` yang dapat diajukan.

2. **Standar Kode Baru Berawalan `FS`**:
   - Seluruh daftar pilihan mata kuliah pengguguran menggunakan kode baru yang berawalan `FS` (misal: `FSAP4101`, `FSAB4102`, `FSIH4201`, dll).
   - Kode kurikulum lama (`ADBI`, `ADPU`, `HKUM`) tidak dimunculkan pada form pengajuan pengguguran.

3. **Multi-Select Mata Kuliah**:
   - Pengaju (mahasiswa maupun admin akademik) dapat memilih lebih dari 1 mata kuliah Non-Inti dalam satu pengajuan.
   - Sistem akan memproses seluruh mata kuliah yang dipilih dalam satu transaksi terpadu (`PG-YYYYS-XXXX`).

4. **Sinkronisasi Data Mahasiswa via NIM**:
   - Pengisian NIM otomatis menarik nama mahasiswa, program studi, status akademik, dan semester dari database `prisma.mahasiswa`.

