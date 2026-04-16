// Intent patterns — regex untuk detect user intent
// Diorder dari most specific ke least specific (fallback: CHAT)

const PATTERNS = {
  // REVIEW — "review <file>"
  REVIEW: {
    regex: /^review\s+(.+?)(?:\s+(performance|security|bugs|quality))?$/i,
    extract: (match) => ({
      intent: 'REVIEW',
      file: match[1].trim(),
      focus: match[2] || null
    })
  },

  // EDIT — "ganti/ubah/replace <find> jadi <replace>"
  EDIT: {
    regex: /^(ganti|ubah|replace|change)\s+(.+?)\s+(jadi|to)\s+(.+)$/i,
    extract: (match) => ({
      intent: 'EDIT',
      find: match[2].trim(),
      replace: match[4].trim(),
      file: null // akan diminta user jika belum di-context
    })
  },

  // EDIT FILE — "edit <file> <instruction>"
  EDIT_FILE: {
    regex: /^edit\s+(.+?)\s+"(.+)"$/i,
    extract: (match) => ({
      intent: 'EDIT',
      file: match[1].trim(),
      instruction: match[2].trim()
    })
  },

  // EXPLAIN — "jelaskan/explain <file>"
  EXPLAIN: {
    regex: /^(jelaskan|explain|apa itu|what is)\s+(.+)$/i,
    extract: (match) => ({
      intent: 'EXPLAIN',
      file: match[2].trim()
    })
  },

  // FIX — "perbaiki/fix <file>"
  FIX: {
    regex: /^(perbaiki|fix|perbaiki bug)\s+(.+)$/i,
    extract: (match) => ({
      intent: 'FIX',
      file: match[2].trim()
    })
  },

  // UNDO — "kembalikan/undo <file>"
  UNDO: {
    regex: /^(kembalikan|undo|revert)\s+(.+)$/i,
    extract: (match) => ({
      intent: 'UNDO',
      file: match[2].trim()
    })
  },

  // HISTORY — "riwayat/history"
  HISTORY: {
    regex: /^(history|riwayat|riwayat percakapan)(?:\s+(clear|hapus))?$/i,
    extract: (match) => ({
      intent: 'HISTORY',
      action: match[2] ? 'clear' : 'list'
    })
  },

  // CONFIG — "config get/set <key> <value>"
  CONFIG: {
    regex: /^config\s+(get|set)\s+(.+?)(?:\s+(.+))?$/i,
    extract: (match) => ({
      intent: 'CONFIG',
      action: match[1].toLowerCase(),
      key: match[2].trim(),
      value: match[3] ? match[3].trim() : null
    })
  },

  // EXIT — "exit/quit/keluar"
  EXIT: {
    regex: /^(exit|quit|keluar|bye|goodbye)$/i,
    extract: (match) => ({
      intent: 'EXIT'
    })
  },

  // READ — "baca/read <file>"
  READ: {
    regex: /^(baca|read)\s+([^"]+)$(?!review|explain|fix|undo)/i,
    extract: (match) => ({
      intent: 'READ',
      file: match[2].trim()
    })
  },

  // CONTEXT — "compare/bandingkan <file1> dengan <file2>"
  CONTEXT: {
    regex: /^(compare|bandingkan|hubungan)\s+(.+?)\s+(dengan|and)\s+(.+)(?:\s+"(.+)")?$/i,
    extract: (match) => ({
      intent: 'CONTEXT',
      files: [match[2].trim(), match[4].trim()],
      prompt: match[5] || null
    })
  }
};

module.exports = { PATTERNS };
