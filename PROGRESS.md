# Sigma CLI — Progress Tracker

**Versi terakhir:** 0.5.0
**Repository:** https://github.com/dillafadil/sigma-cli

---

## Milestone Selesai

### v0.2.x — Core Stabilization
- [x] Smart edit (patch-based)
- [x] `--all` flag
- [x] Hot-fix sprint (Bug #1, #2, #3)

### v0.3.0 — Safety Milestone
- [x] Auto-backup sebelum write (`.sigma/backup/`)
- [x] `sigma undo <file>` — restore dari backup
- [x] `--preview` flag — diff tanpa simpan

### v0.4.0 — Batch Edit
- [x] Glob pattern support (`sigma edit "src/**/*.js"`)
- [x] Multi-file edit dengan konfirmasi
- [x] Batch summary report

### v0.4.1 — AI Review
- [x] `sigma review <file> [focus]` — read-only review
- [x] Formatted sections: Bugs, Quality, Suggestions

### v0.4.1-stabilisasi — Bug Fix Sprint
- [x] Fix duplicate `const response` (edit crash)
- [x] Sinkronisasi versi (package.json, sigma.js → 0.4.1)
- [x] Tambah 5 command missing (fix, explain, context, history, config)
- [x] Buat `lib/history.js`
- [x] Timeout 60s pada Ollama request
- [x] Null check response Ollama
- [x] Hapus double fence-cleaning
- [x] Default model → qwen2.5:3b

### v0.5.0 — Docs · Tests · Logging · CI · Review Enhancement
- [x] Per-command help text + contoh penggunaan
- [x] README.md rewrite
- [x] Setup Jest — 69 tests passing
- [x] Unit test: filesystem (33), config (7), history (6), ollama (7)
- [x] Structured logging ke `.sigma/sigma.log`
- [x] Log level: debug, info, warn, error
- [x] `sigma config set log_level debug`
- [x] GitHub Actions CI (Node 18 + 20)
- [x] Repository: `dillafadil/sigma-cli`
- [x] Review enhancement: severity rating (🔴 critical, 🟡 warning, 🟢 info)
- [x] Review enhancement: line numbers
- [x] Review enhancement: `--format json` output
- [x] Unit test: review parsing (16)

---

## Test Summary

| Suite | Tests |
|-------|-------|
| filesystem.test.js | 33 |
| config.test.js | 7 |
| history.test.js | 6 |
| ollama.test.js | 7 |
| logger.test.js | 16 |
| review.test.js | 16 |
| **Total** | **85** |

---

## Backlog (v0.6+)

| Fitur | Deskripsi |
|-------|-----------|
| Backup management | Cleanup old backups, retention policy |
| Batch edit UI | Granular control per file |
| Diff command | `sigma diff <file>` sebelum apply |
| Plugin system | Custom command loader |
| Editor GUI | File explorer + diff viewer |

---

## Catatan Teknis

| Item | Detail |
|------|--------|
| Runtime | Node.js >= 18 |
| AI Backend | Ollama (local) |
| Default Model | qwen2.5:3b |
| Arg Parser | Commander.js |
| Color Output | Chalk 4 |
| File Pattern | glob 7 |
| Interactive | readline-sync |
| Test Runner | Jest 29 |
| CI | GitHub Actions |
| Logging | .sigma/sigma.log |