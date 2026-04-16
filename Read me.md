# Sigma CLI - Deskripsi Aplikasi

## 📋 **Overview**
**Sigma CLI** adalah aplikasi Command Line Interface (CLI) berbasis AI yang menggunakan Ollama sebagai backend untuk memberikan asisten coding cerdas. Aplikasi ini memungkinkan pengguna untuk berinteraksi dengan AI untuk berbagai tugas pemrograman langsung dari terminal.

## 🏗️ **Arsitektur & Stack Teknologi**

### **Core Technologies**
- **Runtime**: Node.js v24.14.1
- **CLI Framework**: Commander.js untuk parsing command
- **Styling**: Chalk v4 untuk output berwarna
- **User Input**: readline-sync untuk input interaktif
- **AI Backend**: Ollama (support local & remote)
- **Model Aktif**: qwen2.5:3b

## Prasyarat

- **Node.js** >= 18.0.0
- **Ollama** berjalan di `localhost:11434`
- Model sudah di-download (default: `qwen2.5:3b`)

## Instalasi

```bash
git clone <repo-url> sigma-cli
cd sigma-cli
npm install
npm link

### **Struktur Direktori**
```
sigma-cli/
├── bin/
│   └── sigma.js          # Entry point CLI
├── lib/
│   ├── ollama.js         # Koneksi ke Ollama API
│   ├── filesystem.js     # Operasi file & patch parsing
│   ├── config.js         # Manajemen konfigurasi
│   ├── history.js        # Riwayat percakapan
│   ├── chat.js           # Logic chat
│   └── commands.js       # Command handlers
├── .sigma/
│   └── config.json       # Konfigurasi user
└── package.json          # Dependencies & metadata
```

## 🚀 **Fitur Utama**

### **1. Chat & Interaksi AI**
- `sigma chat "<prompt>"` - Chat langsung dengan AI
- Mode interaktif untuk percakapan berkelanjutan
- History management untuk konteks percakapan

### **2. File Operations**
- `sigma read <file>` - Baca dan jelaskan file
- `sigma edit <file> "<instruksi>"` - Edit file dengan AI (patch-based)
- `sigma context <file1> <file2> -p "<prompt>"` - Multi-file context

### **3. Smart Edit System**
- **Patch-based editing** dengan format FIND/REPLACE
- **Safety first**: Default hanya replace kemunculan pertama
- **--all flag**: Opsional replace semua kemunculan
- **Preview system**: Tampilkan perubahan sebelum apply
- **Confirmation prompt**: User approval sebelum menyimpan

### **4. Command Shortcuts**
- `sigma fix <file>` - Debug & fix bug otomatis
- `sigma explain <file>` - Jelaskan kode
- `sigma history` - Lihat riwayat percakapan

### **5. Configuration Management**
- Config file di `.sigma/config.json`
- Support local dan remote Ollama
- Customizable model dan parameters

## 🔧 **Konfigurasi Default**
```json
{
  "mode": "local",
  "model": "qwen2.5:3b",
  "base_url": "http://localhost:11434",
  "context_limit": 3,
  "max_lines_per_file": 100
}
```

## 🎯 **Keunggulan Teknis**

### **Smart Patch Parser**
- State machine line-by-line parsing
- Toleran terhadap format output AI yang bervariasi
- Handle multiple patches dalam single response
- Robust error handling untuk edge cases

### **Safety Mechanisms**
- File size limits (max 100 baris)
- Context limits (max 3 file)
- Preview sebelum apply changes
- Confirmation prompts
- Detailed error reporting

### **Integration Design**
- Modular architecture dengan separation of concerns
- Clean API antara modules
- Extensible command system
- Configuration-driven behavior

## 🔍 **Analisis Kode**

### **Strengths**
- **Clean Architecture**: Pemisahan yang baik antara CLI, AI layer, dan file operations
- **Robust Error Handling**: Comprehensive error messages dan validation
- **User Experience**: Interactive prompts, colored output, preview system
- **Safety First**: Multiple confirmation layers dan backup mechanisms

### **Technical Implementation**
- **Async/Await Pattern**: Proper handling untuk AI API calls
- **State Management**: Efficient patch parsing dengan state machine
- **File Operations**: Safe file handling dengan path resolution
- **Configuration**: Flexible config system dengan auto-create

Sigma CLI adalah aplikasi CLI yang matang dengan arsitektur solid, fitur lengkap, dan implementasi yang robust untuk asisten coding berbasis AI di command line.