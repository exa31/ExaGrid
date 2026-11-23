# ⚡ ExaGrid — Modern & Lightweight Desktop Database Manager

ExaGrid adalah aplikasi desktop database management lintas platform (**macOS** & **Windows**) berkinerja tinggi, modern, dan ultra-ringan (tanpa beban Java JVM seperti DBeaver tradisional). Dibangun menggunakan **Tauri v2**, **Rust Core Engine** (diadaptasi dari arsitektur backend Rust `@exa31/create-stack`), dan **React 19 + TypeScript + Tailwind CSS**.

---

## 🚀 Fitur Unggulan

- **Multi-Engine Database Support**:
  - 🐘 **PostgreSQL**: Introspeksi schema & eksekusi query raw dinamis.
  - 🐬 **MySQL**: Dukungan MariaDB & MySQL dengan query optimization.
  - 🪶 **SQLite**: Eksplorasi langsung file database `.db` / `.sqlite` lokal.
  - 🍃 **MongoDB**: Dukungan NoSQL (list databases, collections, filter query JSON).
- **In-Process Tauri IPC**: Komunikasi UI dan database engine langsung melalui in-process command tanpa membuka port HTTP lokal, aman dari firewall alert Windows/macOS.
- **Connection Profile Manager**: Simpan profil koneksi dengan proteksi password terenkripsi **AES-256-GCM** di `~/.exagrid/connections.json`.
- **Interactive Object Explorer**: Hirarki pohon `Server` ➔ `Database` ➔ `Tables / Collections` ➔ `Columns` (tipe data & Primary Key indicator).
- **Multi-Tab Workspace**: Buka banyak tab SQL Console dan Table Data Viewers secara bersamaan.
- **Interactive Query Console**:
  - Shortcut eksekusi instan: `Cmd+Enter` (macOS) atau `Ctrl+Enter` (Windows).
  - Indikator latensi eksekusi (ms) dan jumlah baris terpengaruh (*affected rows*).
  - Fitur format query dan riwayat query (*query history*).
- **High-Performance Data Grid**:
  - Virtual & smooth scrolling untuk ribuan baris data.
  - Sorting per kolom (ASC/DESC).
  - Quick text filter & pagination (25, 50, 100, 200 baris).
  - **Cell Inspector Modal**: Klik sel JSON/teks panjang untuk inspeksi mendalam dan 1-click copy.
  - **Export Data**: Ekspor instan ke format **CSV** dan **JSON**.

---

## 🛠️ Persyaratan Sistem & Tools

- **Rust**: `rustc` & `cargo` (v1.75+)
- **Node.js**: v18+ (disarankan v20+)
- **Package Manager**: `npm`

---

## 💻 Panduan Menjalankan

### Mode Pengembangan (Live Reload)

```bash
# 1. Jalankan development desktop app (Tauri + React live reload)
npm run tauri dev
```

*Atau untuk preview UI langsung di browser web:*
```bash
npm run dev
# Buka http://localhost:1420
```

### Menjalankan Unit Tests (Rust)

```bash
cd src-tauri
cargo test
```

### Kompilasi Release Native (macOS / Windows)

```bash
# macOS / Linux
./scripts/build-desktop.sh

# Windows
scripts\build-desktop.bat
```

Installer native (`.dmg`/`.app` di macOS, `.exe`/`.msi` di Windows) akan otomatis dibuat di folder `src-tauri/target/release/bundle/`.

---

## 📂 Struktur Proyek

```text
ExaGrid/
├── src/                               # Frontend Desktop UI (React 19 + TypeScript + Tailwind)
│   ├── components/                    # UI Components
│   │   ├── CellInspectorModal.tsx     # Modal inspeksi sel JSON/teks
│   │   ├── ConnectionModal.tsx        # Dialog tambah/edit profil koneksi
│   │   ├── DataGrid.tsx               # Spreadsheet data viewer dengan pagination & export
│   │   ├── ObjectExplorer.tsx         # Tree navigator database, tabel, & kolom
│   │   ├── QueryConsole.tsx           # SQL / MQL query runner & history
│   │   ├── Sidebar.tsx                # Daftar koneksi & status koneksi
│   │   └── WorkspaceTabs.tsx          # Sistem tab dinamis (queries & tables)
│   ├── services/
│   │   └── tauriBridge.ts             # IPC bridge ke core Rust dengan web-preview fallback
│   ├── types/
│   │   └── database.ts                # TypeScript interface data models
│   ├── App.tsx                        # Main application layout
│   └── main.tsx                       # React entrypoint
├── src-tauri/                          # Rust Core Desktop Engine
│   ├── src/
│   │   ├── commands/                  # Tauri IPC commands (connect, query, export, etc.)
│   │   ├── config/                    # Connection storage & AES-256 persistence
│   │   ├── drivers/                   # Database drivers (Postgres, MySQL, SQLite, MongoDB)
│   │   ├── pkg/                       # Centralized AppError & AES-256 Crypto
│   │   ├── lib.rs                     # Tauri app builder & command registration
│   │   └── main.rs                    # Native executable entrypoint
│   ├── tests/                         # Rust integration & unit tests
│   ├── tauri.conf.json                # Cross-platform window & bundle configuration
│   └── Cargo.toml                     # Rust dependencies (sqlx, mongodb, tokio, tauri)
├── .github/workflows/
│   └── release.yml                    # CI/CD otomatis untuk build macOS & Windows binaries
├── scripts/                           # Build scripts untuk Mac & Windows
└── package.json
```
