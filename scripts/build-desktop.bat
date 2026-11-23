@echo off
echo ==========================================
echo  Building ExaGrid Desktop for Windows
echo ==========================================

REM 1. Install frontend dependencies
echo Installing npm packages...
call npm install

REM 2. Build Vite frontend bundle
echo Building frontend bundle...
call npm run build

REM 3. Build native Tauri desktop binary (.exe / .msi)
echo Compiling native Rust binary with Tauri...
call npm run tauri build

echo Build complete! Executables located at:
echo src-tauri\target\release\bundle\
