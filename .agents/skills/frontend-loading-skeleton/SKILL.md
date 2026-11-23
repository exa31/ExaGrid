---
name: frontend-loading-skeleton
description: >-
  Mandatory loading state patterns for frontend (React & Vue). Requires skeleton loaders for API data fetching, page loads, and list/table displays, while strictly forbidding circular spinners ("loading muter") except on interactive action buttons. Use when building or modifying frontend loading states, data fetching UI, list or table views, or buttons with loading states.
---

# Frontend Loading States & Skeleton Skill Guide

Panduan standar penanganan status pemuatan (*loading states*) di seluruh aplikasi Frontend (**React** dan **Vue**).

---

## 1. Aturan Utama (Golden Rules)

### A. WAJIB Skeleton untuk Pemuatan Konten & Data (Fetch API, List, Table, Detail)
- Setiap kali komponen menunggu respon API (fetch data), render awal halaman (*initial load*), pergantian halaman/tab, atau render daftar data:
  - **WAJIB** menampilkan komponen **Skeleton Loader**.
  - Skeleton harus menyerupai struktur, proporsi, dan layout konten aslinya (misal: garis skeleton untuk teks, lingkaran untuk avatar, baris skeleton untuk baris tabel, kotak untuk card grid).
  - Skeleton mencegah terjadinya *Cumulative Layout Shift* (CLS) dan memberikan pengalaman pengguna (*user experience*) yang jauh lebih mulus.

### B. DILARANG KERAS: Circular Spinner ("Loading Muter") untuk Konten
- ❌ **DILARANG** menggunakan spinner berputar / circular loader (`ProgressSpinner`, `Spinner`, icon berputar `pi pi-spin pi-spinner`, animasi putar CSS `animate-spin`, atau spinner layar penuh / overlay modal) untuk:
  - Loading konten halaman (Page Loading).
  - Fetching API data (`GET /api/...`).
  - Loading data tabel (`DataTable`) atau list/card.
  - Loading detail profil, form view, atau metrik dashboard.
- **Alasan**: Spinner muter membuat halaman tampak kosong, tidak memberi petunjuk mengenai layout konten yang akan dimuat, dan menyebabkan layout meloncat seketika data selesai dimuat (*layout jump*).

### C. Pengecualian Resmi: HANYA untuk Tombol Interaktif ("Kecuali Button")
- ✅ Spinner / icon loading berputar **HANYA DIPERBOLEHKAN** di dalam **Button** saat tombol tersebut sedang mengeksekusi aksi mutasi/asinkron (misal: Submit Form, Simpan Data, Hapus Data, Kirim Email, Login):
  - Menggunakan prop `loading` bawaan tombol (misal: PrimeReact/PrimeVue `<Button :loading="isSubmitting" />` atau `<Button loading={isSubmitting} />`).
  - Selalu pastikan tombol otomatis dalam keadaan `disabled` saat loading untuk mencegah *double submit*.

---

## 2. Pola Implementasi di React (`template-react`)

Template React menggunakan **PrimeReact** (dengan unstyled mode / tema Aura) dan **Tailwind CSS v4**.

### A. Skeleton pada Tabel / List Data (DataTable)
Saat `isLoading` bernilai `true`, render baris skeleton yang proporsional dengan kolom tabel:

```tsx
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Skeleton } from 'primereact/skeleton';
import { useQuery } from '@/hooks'; // atau state useState/useEffect

export default function UsersPage() {
  const { data: users, isLoading } = useGetUsers();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-4">
          <Skeleton width="12rem" height="1.75rem" className="rounded" />
          <Skeleton width="6rem" height="2.25rem" className="rounded" />
        </div>
        {/* Row Skeletons */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4 py-2 border-b border-slate-100 dark:border-slate-900 last:border-0">
            <Skeleton shape="circle" size="2.5rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="40%" height="1rem" className="rounded" />
              <Skeleton width="25%" height="0.875rem" className="rounded" />
            </div>
            <Skeleton width="15%" height="1.5rem" className="rounded-full" />
            <Skeleton width="10%" height="1.5rem" className="rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <DataTable value={users} responsiveLayout="scroll">
        <Column field="name" header="Name" />
        <Column field="email" header="Email" />
        <Column field="role" header="Role" />
        <Column field="status" header="Status" />
      </DataTable>
    </div>
  );
}
```

### B. Skeleton pada Card Grid / Dashboard Widget
```tsx
import { Skeleton } from 'primereact/skeleton';

export function StatCardSkeleton() {
  return (
    <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width="50%" height="1rem" className="rounded" />
        <Skeleton shape="circle" size="2rem" />
      </div>
      <Skeleton width="70%" height="2rem" className="rounded" />
      <Skeleton width="40%" height="0.875rem" className="rounded" />
    </div>
  );
}
```

### C. Tailwind CSS v4 Fallback (`animate-pulse`)
Jika tidak menggunakan komponen PrimeReact, gunakan utilitas bawaan Tailwind:
```tsx
export function SimpleListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
    </div>
  );
}
```

### D. Tombol Aksi (Pengecualian: Boleh Menggunakan Spinner)
Spinner HANYA diizinkan di dalam elemen `<Button>`:
```tsx
import { Button } from 'primereact/button';

export function ActionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}
      
      {/* ✅ BENAR: Spinner muter di tombol aksi diizinkan */}
      <Button 
        type="submit" 
        label={isSubmitting ? 'Saving...' : 'Save Changes'} 
        icon="pi pi-check" 
        loading={isSubmitting} 
        disabled={isSubmitting} 
      />
    </form>
  );
}
```

---

## 3. Pola Implementasi di Vue 3 (`template-vue`)

Template Vue menggunakan **PrimeVue** (dengan tema Aura) dan **Tailwind CSS v4**.

### A. Skeleton pada Tabel / List Data
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Skeleton from 'primevue/skeleton'

interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
}

const isLoading = ref(true)
const users = ref<User[]>([])

onMounted(async () => {
  try {
    // Fetch data
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- ✅ Skeleton State saat fetch data -->
    <div v-if="isLoading" class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      <div class="flex justify-between items-center mb-4">
        <Skeleton width="12rem" height="1.75rem" class="rounded" />
        <Skeleton width="6rem" height="2.25rem" class="rounded" />
      </div>
      <div v-for="i in 5" :key="i" class="flex items-center space-x-4 py-2 border-b border-slate-100 dark:border-slate-900 last:border-0">
        <Skeleton shape="circle" size="2.5rem" />
        <div class="flex-1 space-y-2">
          <Skeleton width="40%" height="1rem" class="rounded" />
          <Skeleton width="25%" height="0.875rem" class="rounded" />
        </div>
        <Skeleton width="15%" height="1.5rem" class="rounded-full" />
        <Skeleton width="10%" height="1.5rem" class="rounded" />
      </div>
    </div>

    <!-- Actual Data Table -->
    <div v-else class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <DataTable :value="users" responsive-layout="scroll">
        <Column field="name" header="Name" />
        <Column field="email" header="Email" />
        <Column field="role" header="Role" />
        <Column field="status" header="Status" />
      </DataTable>
    </div>
  </div>
</template>
```

### B. Tombol Aksi di Vue (Pengecualian: Boleh Menggunakan Spinner)
```vue
<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'

const isSubmitting = ref(false)

const handleSave = async () => {
  isSubmitting.value = true
  try {
    // async action
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <!-- ✅ BENAR: Spinner muter diizinkan hanya pada Button -->
  <Button
    label="Simpan Data"
    icon="pi pi-check"
    :loading="isSubmitting"
    :disabled="isSubmitting"
    @click="handleSave"
  />
</template>
```

---

## 4. Matriks Perbandingan Anti-Pattern vs Best Practice

| Skenario | ❌ DILARANG (Anti-Pattern) | ✅ WAJIB (Best Practice) |
| :--- | :--- | :--- |
| **Fetch List / Table** | Menampilkan `<ProgressSpinner />` di tengah tabel atau layar kosong. | Menampilkan 3-5 baris `Skeleton` yang bentuknya proporsional dengan kolom tabel. |
| **Fetch Detail Page** | Full-screen overlay spinner atau spinner muter di tengah card. | Menampilkan avatar skeleton, text line skeletons, dan action skeleton. |
| **Dashboard Widgets** | Kotak putih kosong dengan spinner muter kecil di tengah. | Menampilkan card skeleton dengan `animate-pulse` atau Prime `Skeleton`. |
| **Form Action (Submit / Save / Delete)** | Tidak menampilkan feedback visual / teks statis tanpa indikator. | **Gunakan tombol dengan `:loading="true"` / `loading={true}`** (spinner muter kecil di dalam tombol diperbolehkan!). |

---

## 5. Checklist Verifikasi Frontend

Sebelum menandai fitur atau halaman frontend selesai:
1. [ ] Apakah semua state asinkron / fetch API data memiliki penanganan loading dengan **Skeleton**?
2. [ ] Apakah TIDAK ADA pemakaian spinner muter (`ProgressSpinner`, `pi-spin`, dsb.) untuk konten tabel, list, atau halaman?
3. [ ] Apakah spinner muter HANYA digunakan di dalam komponen **Button** yang sedang dieksekusi?
4. [ ] Apakah tombol dalam keadaan `disabled` saat loading berlangsung?
5. [ ] `npm run lint` dan `npm run build` berhasil tanpa error.
