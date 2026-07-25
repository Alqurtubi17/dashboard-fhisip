# Academic Management Platform (AMP) — Login, Role & Menu/Permission CRUD

Modul awal sesuai brief: **halaman Login + role**, dan **CRUD Manajemen Menu & Role/Permission**.

## Fitur yang sudah jadi

- **Login** (`/login`) — JWT access token (15m, httpOnly cookie) + refresh token (7d), audit log setiap login.
- **Middleware RBAC** (`middleware.ts`) — melindungi semua route, redirect ke `/login` jika belum auth, dan membatasi
  `/roles`, `/menus` hanya untuk role `superadmin`.
- **Sidebar dinamis** — menu yang tampil difilter otomatis sesuai `permissionKey` yang dimiliki role user (server-side,
  lihat `app/(dashboard)/layout.tsx` + `lib/permissions.ts`).
- **CRUD Role** (`/roles`) — tambah, hapus (role sistem "Super Admin" tidak bisa dihapus / diubah permission-nya).
- **Assign Permission per Role** (`/roles/[id]/permissions`) — checklist module × action (view/create/edit/delete/
  approve/export), simpan sekaligus.
- **CRUD Menu** (`/menus`) — tambah/edit/hapus menu induk & submenu, pilih icon, url, `permissionKey`, urutan.
- **Seed data** — 5 role default (Super Admin, Kaprodi, Akademik, Kemahasiswaan, Dekanat), permission lengkap, struktur
  menu sesuai brief, dan 1 user superadmin siap pakai.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env       # isi DATABASE_URL PostgreSQL Anda
npx prisma db push         # buat schema di database
npm run db:seed            # isi role, permission, menu, & user default
npm run dev
```

Login default:

```
email:    admin@kampus.ac.id
password: Admin123!
```

## Struktur penting

```
prisma/schema.prisma        # User, Role, Permission, RolePermission, Menu, RoleMenu, AuditLog
prisma/seed.ts               # seed 5 role + permission + menu + superadmin

lib/auth.ts                  # sign/verify JWT (access & refresh)
lib/permissions.ts           # getRolePermissionKeys, filterMenuByPermissions
middleware.ts                # proteksi route + guard superadmin

app/login/page.tsx
app/api/auth/{login,logout,me}/route.ts

app/(dashboard)/layout.tsx           # sidebar & header, filter menu per permission
app/(dashboard)/roles/page.tsx       # list + create + delete role
app/(dashboard)/roles/[id]/permissions/page.tsx   # checklist permission per role
app/(dashboard)/menus/page.tsx       # CRUD menu (induk & submenu)

app/api/roles/route.ts               # GET, POST
app/api/roles/[id]/route.ts          # GET, PUT, DELETE
app/api/roles/[id]/permissions/route.ts  # GET (grouped), PUT (replace all)
app/api/menus/route.ts               # GET, POST
app/api/menus/[id]/route.ts          # PUT, DELETE
```

## Catatan desain permission

- Permission disimpan sebagai kombinasi `module` + `action` (mis. `mahasiswa.view`), digenerate otomatis untuk semua
  module di seed.
- `Role.isSystem = true` (Super Admin) otomatis dianggap punya SEMUA permission tanpa perlu baris di `role_permissions`
  — lebih murah & tidak bisa "kelupaan" saat ada module baru.
- Menu punya field `permissionKey` opsional. Kalau kosong, menu selalu tampil (mis. grup menu murni navigasi); kalau
  diisi, menu hanya tampil untuk role yang punya permission tersebut.

## Modul selanjutnya (belum dibuat, sesuai urutan prioritas Anda)

- CRUD User + assign role
- Modul Mahasiswa / Akademik / Kemahasiswaan (data asli + sinkronisasi API kampus)
- Dashboard analytics (grafik, statistik real data)
- Audit log viewer
