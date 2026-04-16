# 🎯 Sigma CLI — Target Roadmap (Aligned with PROGRESS.md)

**Reference Source**: Master Progress Report v0.2.2  
**Current Status**: v0.2.1 RELEASED → v0.2.2 Hotfix Sprint  
**Rule**: Semua target wajib mengikuti PROGRESS.md. Jika scope berubah, PROGRESS.md harus diperbarui terlebih dahulu.

---

# 📌 TARGET UTAMA SAAT INI

```text
Fokus utama = stabilisasi core engine
```

Sebelum menambah fitur besar, target wajib adalah menyelesaikan sprint hotfix sesuai dokumen progress.

---

# 🚧 TARGET 1 — v0.2.2 HOTFIX SPRINT (PRIORITAS TERTINGGI)

## 🎯 Goal
Menjadikan `sigma edit` aman dipakai untuk real-world coding workflow.

---

## ✅ T1.1 — Fix Critical Bug #2 (CRITICAL)

### Masalah
Substring replace berbahaya.

Contoh:

```text
count
counter
discount
```

Tidak boleh menjadi:

```text
total
totaller
distotal
```

---

## 🎯 Target

```text
exact-word replacement only
```

### Success Criteria
- `count` → `total`
- `counter` tetap
- `discount` tetap
- PASS test_partial.js

---

## ✅ T1.2 — Fix Critical Bug #1

### Masalah
Default mode kadang apply semua patch.

---

## 🎯 Target

Tanpa `--all`:

```text
first occurrence only
```

Dengan `--all`:

```text
replace all occurrences
```

### Success Criteria
- PASS `test_default.js`
- PASS multi patch AI response

---

## ✅ T1.3 — Fix Critical Bug #3

### Masalah
Function call edit gagal.

---

## 🎯 Target

```text
save() -> persist()
```

### Success Criteria
- PASS `test_functions.js`
- AI response parsed correctly
- no false `NO_CHANGES`

---

## ✅ T1.4 — Large File Stress Test

### Target
Validasi file 300–500 lines.

### Success Criteria
- no parser failure
- no memory issue
- no accidental mass replace
- acceptable speed

---

# 🛡️ TARGET 2 — v0.3.0 SAFETY MILESTONE

Target ini hanya dimulai setelah v0.2.2 selesai.

---

## 🎯 T2.1 Auto Backup

Sebelum edit:

```text
.sigma/backup/
```

### Success Criteria
- backup otomatis sebelum write
- timestamp filename
- restore siap dipakai

---

## 🎯 T2.2 Undo Command

Command baru:

```bash
sigma undo <file>
```

### Success Criteria
- restore backup terakhir
- warning jika backup tidak ada

---

## 🎯 T2.3 Preview / Diff

```bash
sigma edit file.js "..." --preview
```

### Success Criteria
- tampil diff before apply
- user confirm before save

---

# 🚀 TARGET 3 — v0.4.0 PRODUCT EXPERIENCE

## 🎯 Review Mode

```bash
sigma review <file>
```

AI memberi saran tanpa mengubah file.

---

## 🎯 Batch Edit

```bash
sigma edit src/**/*.js "rename foo" --all
```

---

## 🎯 Better Help UX

Command help examples harus lengkap.

---

# 🖥️ TARGET 4 — v1.0.0 PRODUCT PHASE

## 🎯 Sigma Editor GUI

Long-term vision:

- file explorer
- AI chat panel
- diff viewer
- backup restore
- patch selector

---

# 📌 DEVELOPMENT RULE

Jika target berubah dari roadmap ini:

```text
WAJIB update PROGRESS.md terlebih dahulu
```

agar semua sprint tetap sinkron.

