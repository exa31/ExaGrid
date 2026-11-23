---
description: Mandatory skeleton loaders for frontend data fetching and content loading, strictly prohibiting circular spinners except on action buttons
trigger: glob
globs: "**/*.{tsx,jsx,ts,js}"
---

# Frontend Loading & Skeleton Rules

Semua kode frontend (React dan Vue) **WAJIB** mematuhi aturan penanganan status pemuatan (*loading state*) berikut:

---

## 1. WAJIB Menggunakan Skeleton untuk Data Fetching & List/Table Content

- Setiap kali komponen menunggu respon API (fetch data), render awal halaman (*initial load*), atau menampilkan list/table:
  - **WAJIB** merender komponen **Skeleton Loader** (baik dari PrimeReact/PrimeVue `Skeleton` maupun Tailwind `animate-pulse`).
  - Skeleton harus memiliki bentuk, proporsi, dan dimensi yang mirip dengan konten akhir yang akan dimuat (garis skeleton untuk teks, baris tabel skeleton untuk `DataTable`, avatar skeleton bulat untuk profil).
  - Tujuannya adalah mengeliminasi *Cumulative Layout Shift* (CLS) dan memberikan visual feedback yang informatif kepada pengguna.

---

## 2. DILARANG KERAS: Loading Muter (Circular Spinner) untuk Konten

- ❌ **DILARANG KERAS** menggunakan circular spinner / "loading muter" (seperti `ProgressSpinner`, `Spinner`, icon `pi pi-spin pi-spinner`, class CSS `animate-spin`, atau full-page loading spinner overlay) untuk:
  - Initial load halaman / route-level page loading.
  - Pemuatan data tabel (`DataTable`) atau list item.
  - Pemuatan kartu/grid card atau statistik dashboard.
  - Pemuatan detail profil atau formulir.
- ❌ **DILARANG** membiarkan halaman kosong putih saat menunggu data API.

---

## 3. Pengecualian Resmi: HANYA untuk Tombol Interaktif ("Kecuali Button")

- ✅ Loading berputar (spinner) **HANYA DIPERBOLEHKAN** di dalam komponen **Button** saat tombol aksi tersebut sedang memproses request/mutasi:
  - Tombol Submit form, Login, Simpan Data, Update, atau Hapus.
  - PrimeReact: `<Button label="Simpan" loading={isSubmitting} disabled={isSubmitting} />`
  - PrimeVue: `<Button label="Simpan" :loading="isSubmitting" :disabled="isSubmitting" />`
  - Tombol **WAJIB** memiliki atribut `disabled` saat loading aktif untuk mencegah duplikasi pengiriman data (*double submission*).
