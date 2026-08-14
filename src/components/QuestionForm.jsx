import { useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyForm = {
  subject: '',
  question: '',
  image_url: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  option_e: '',
  answer_key: 'A'
}

export default function QuestionForm({ teacherId, onSaved, editingQuestion, onCancelEdit }) {
  const [form, setForm] = useState(editingQuestion || emptyForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const fileName = `${teacherId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(fileName, file)

    if (uploadError) {
      setError('Gagal upload gambar: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('question-images').getPublicUrl(fileName)
    update('image_url', data.publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.question || !form.option_a || !form.option_b || !form.answer_key) {
      setError('Pertanyaan, minimal pilihan A & B, dan kunci jawaban wajib diisi.')
      return
    }

    setSaving(true)

    const payload = {
      teacher_id: teacherId,
      subject: form.subject || 'Umum',
      question: form.question,
      image_url: form.image_url || null,
      option_a: form.option_a,
      option_b: form.option_b,
      option_c: form.option_c || null,
      option_d: form.option_d || null,
      option_e: form.option_e || null,
      answer_key: form.answer_key
    }

    let result
    if (editingQuestion?.id) {
      result = await supabase.from('questions').update(payload).eq('id', editingQuestion.id)
    } else {
      result = await supabase.from('questions').insert(payload)
    }

    setSaving(false)

    if (result.error) {
      setError('Gagal menyimpan: ' + result.error.message)
      return
    }

    setForm(emptyForm)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="font-semibold text-slate-800">
        {editingQuestion ? 'Edit Soal' : 'Tambah Soal Baru'}
      </h3>

      <div>
        <label className="label-field">Mata Pelajaran</label>
        <input
          className="input-field"
          placeholder="mis. Sistem Starter"
          value={form.subject}
          onChange={(e) => update('subject', e.target.value)}
        />
      </div>

      <div>
        <label className="label-field">Pertanyaan</label>
        <textarea
          className="input-field"
          rows={3}
          value={form.question}
          onChange={(e) => update('question', e.target.value)}
        />
      </div>

      <div>
        <label className="label-field">Gambar Soal (opsional)</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
        {uploading && <p className="text-xs text-slate-400 mt-1">Mengunggah gambar...</p>}
        {form.image_url && (
          <img
            src={form.image_url}
            alt="preview soal"
            className="mt-2 max-h-40 rounded-lg border border-slate-200"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['a', 'b', 'c', 'd', 'e'].map((letter) => (
          <div key={letter}>
            <label className="label-field">
              Pilihan {letter.toUpperCase()} {letter === 'e' && '(opsional)'}
            </label>
            <input
              className="input-field"
              value={form[`option_${letter}`]}
              onChange={(e) => update(`option_${letter}`, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="label-field">Kunci Jawaban</label>
        <select
          className="input-field"
          value={form.answer_key}
          onChange={(e) => update('answer_key', e.target.value)}
        >
          {['A', 'B', 'C', 'D', 'E'].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Menyimpan...' : editingQuestion ? 'Simpan Perubahan' : 'Tambah Soal'}
        </button>
        {editingQuestion && (
          <button type="button" onClick={onCancelEdit} className="btn-secondary">
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
