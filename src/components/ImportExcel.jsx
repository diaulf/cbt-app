import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

export default function ImportExcel({ teacherId, onImported }) {
  const [preview, setPreview] = useState([])
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState('')
  const [importing, setImporting] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setStatus('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      // Format kolom yang diharapkan: No | Soal | A | B | C | D | E | Kunci
      const parsed = rows
        .map((row) => ({
          question: String(row['Soal'] ?? '').trim(),
          option_a: String(row['A'] ?? '').trim(),
          option_b: String(row['B'] ?? '').trim(),
          option_c: String(row['C'] ?? '').trim(),
          option_d: String(row['D'] ?? '').trim(),
          option_e: String(row['E'] ?? '').trim(),
          answer_key: String(row['Kunci'] ?? '').trim().toUpperCase()
        }))
        .filter((r) => r.question && r.answer_key)

      setPreview(parsed)
      if (parsed.length === 0) {
        setStatus(
          'Tidak ada baris valid ditemukan. Pastikan header kolom persis: Soal, A, B, C, D, E, Kunci.'
        )
      }
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)
    setStatus('')

    const payload = preview.map((p) => ({
      teacher_id: teacherId,
      subject: subject || 'Umum',
      question: p.question,
      option_a: p.option_a,
      option_b: p.option_b,
      option_c: p.option_c || null,
      option_d: p.option_d || null,
      option_e: p.option_e || null,
      answer_key: ['A', 'B', 'C', 'D', 'E'].includes(p.answer_key) ? p.answer_key : 'A'
    }))

    const { error } = await supabase.from('questions').insert(payload)

    setImporting(false)

    if (error) {
      setStatus('Gagal import: ' + error.message)
      return
    }

    setStatus(`Berhasil import ${payload.length} soal.`)
    setPreview([])
    onImported?.()
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['No', 'Soal', 'A', 'B', 'C', 'D', 'E', 'Kunci'],
      [1, 'Contoh: Berapakah 2 + 2?', '2', '3', '4', '5', '6', 'C']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Soal')
    XLSX.writeFile(wb, 'template_soal.xlsx')
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Import Soal dari Excel</h3>
        <button className="text-xs text-brand-600 hover:underline" onClick={downloadTemplate}>
          Unduh Template
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label-field">Mata Pelajaran untuk soal yang diimpor</label>
          <input
            className="input-field"
            placeholder="mis. Sistem Starter"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">File Excel (.xlsx)</label>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="text-sm" />
        </div>
      </div>

      {preview.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">
            Ditemukan <strong>{preview.length}</strong> soal siap diimpor.
          </p>
          <button disabled={importing} onClick={handleImport} className="btn-primary">
            {importing ? 'Mengimpor...' : `Import ${preview.length} Soal`}
          </button>
        </div>
      )}

      {status && <p className="text-sm text-slate-600">{status}</p>}
    </div>
  )
}
