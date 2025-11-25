#!/bin/bash

# --- Fungsi untuk pesan kesalahan ---
log_error() {
    echo -e "\e[31mERROR: $1\e[0m" >&2
    exit 1
}

# --- Fungsi untuk pesan informasi ---
log_info() {
    echo -e "\e[32mINFO: $1\e[0m"
}

# --- Fungsi untuk pesan peringatan ---
log_warn() {
    echo -e "\e[33mWARNING: $1\e[0m"
}

# --- Cek hak akses root ---
if [[ $EUID -ne 0 ]]; then
   log_error "Script ini harus dijalankan sebagai root (gunakan sudo)."
fi

# --- Langkah 1: Perbarui Sistem ---
log_info "Memperbarui daftar paket sistem..."
apt update || log_error "Gagal memperbarui daftar paket."
log_info "Mengupgrade paket-paket yang ada..."
apt upgrade -y || log_error "Gagal mengupgrade paket."

# --- Langkah 2: Instal Prasyarat (OpenSSL Dev) ---
log_info "Menginstal paket pengembangan OpenSSL (libssl-dev)..."
apt install -y libssl-dev || log_error "Gagal menginstal libssl-dev."

# --- Langkah 3: Tambahkan Repositori LLVM dan Instal LLVM 14 ---
LLVM_VERSION="14"
log_info "Menambahkan repositori LLVM untuk versi ${LLVM_VERSION}..."


log_info "Menginstal komponen LLVM spesifik (jika belum terinstal)..."
apt install -y \
    clang-${LLVM_VERSION} \
    lld-${LLVM_VERSION} \
    llvm-${LLVM_VERSION} \
    llvm-${LLVM_VERSION}-dev \
    llvm-${LLVM_VERSION}-tools \
    libc++-${LLVM_VERSION}-dev \
    libc++abi-${LLVM_VERSION}-dev \
    libclang-${LLVM_VERSION}-dev \
    libomp-${LLVM_VERSION}-dev || log_warn "Beberapa paket LLVM spesifik mungkin tidak ada, melanjutkan..."

# --- Langkah 4: Konfigurasi update-alternatives untuk Clang, LLD, dan Alat LLVM ---
log_info "Mengatur update-alternatives untuk Clang, LLD, dan alat-alat LLVM..."

# Daftar tool LLVM yang umum digunakan
LLVM_TOOLS=(
    "clang"
    "clang++"
    "lld"
    "llvm-ar"
    "llvm-objdump"
    "llvm-objcopy"
    "llvm-nm"
    "llvm-readelf"
)

for tool in "${LLVM_TOOLS[@]}"; do
    TOOL_PATH="/usr/bin/${tool}-${LLVM_VERSION}"
    if [ -f "$TOOL_PATH" ]; then
        log_info "Menambahkan ${tool} (${TOOL_PATH}) ke update-alternatives..."
        update-alternatives --install "/usr/bin/${tool}" "${tool}" "${TOOL_PATH}" 140
        update-alternatives --set "${tool}" "${TOOL_PATH}" || log_warn "Gagal mengatur ${tool} sebagai default melalui update-alternatives. Mungkin sudah diatur secara manual atau ada konflik."
    else
        log_warn "Biner ${TOOL_PATH} tidak ditemukan, melompati konfigurasi untuk ${tool}."
    fi
done

# Khusus untuk linker 'ld', kita buat symlink ke lld
if [ -f "/usr/bin/lld-${LLVM_VERSION}" ]; then
    log_info "Mengatur /usr/bin/ld agar menunjuk ke lld-${LLVM_VERSION}..."
    if [ -f "/usr/bin/ld" ] && [ ! -L "/usr/bin/ld" ]; then
        log_warn "/usr/bin/ld bukan symlink. Memindahkan ke /usr/bin/ld.bak."
        mv /usr/bin/ld /usr/bin/ld.bak
    fi
    ln -sf "/usr/bin/lld-${LLVM_VERSION}" "/usr/bin/ld" || log_warn "Gagal membuat symlink /usr/bin/ld ke lld-${LLVM_VERSION}."
else
    log_warn "lld-${LLVM_VERSION} tidak ditemukan, /usr/bin/ld tidak akan diubah ke lld."
fi

# --- Langkah 5: Verifikasi Instalasi ---
log_info "Memverifikasi instalasi..."

log_info "Versi Clang:"
clang --version || log_warn "Clang tidak ditemukan atau gagal. Pastikan symlink sudah benar."

log_info "Versi LLD (ld.lld):"
ld.lld --version || log_warn "ld.lld tidak ditemukan atau gagal. Pastikan symlink sudah benar."

log_info "Versi llvm-ar:"
llvm-ar --version || log_warn "llvm-ar tidak ditemukan atau gagal. Pastikan symlink sudah benar."

log_info "Versi llvm-objdump:"
llvm-objdump --version || log_warn "llvm-objdump tidak ditemukan atau gagal. Pastikan symlink sudah benar."

log_info "Versi ld (yang seharusnya menunjuk ke lld):"
ld --version || log_warn "ld tidak ditemukan atau gagal. Pastikan symlink sudah benar."


log_info "Instalasi dan konfigurasi LLVM 14 selesai!"
log_info "Anda mungkin perlu membuka terminal baru atau menjalankan 'source ~/.bashrc' (atau ~/.zshrc) jika Anda mengatur variabel lingkungan secara manual."
