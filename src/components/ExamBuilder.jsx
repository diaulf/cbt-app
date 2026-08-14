import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import PackageBuilder from './PackageBuilder.jsx'

function randomAccessCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function ExamBuilder({ teacherId }) {
  const [questions, setQuestions] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [managingExam, setManagingExam] = useState(null)

  const [form, setForm] = useState({
    title: '',
    subject: '',
    class: '',
    duration_minutes: 30,
    total_questions: 20,
    mode: 'acak',
    shuffle_options: true
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    const [{ data: qData }, { data: eData }] = await Promise.all([
      supabase.from('questions').select('id, subject').eq('teacher_id', teacherId),
      supabase
        .from('exams')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
    ])
    setQuestions(qData || [])
    setExams(eData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [teacherId])

  const subjects = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.subject)))
  }, [questions])

  const availableCount = useMemo(() => {
    return questions.filter((q) => q.subject === form.subject).length
  }, [questions, form.subject])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!form.title || !form.subject || !form.class) {
      setError('Nama ujian, mata pelajaran, dan kelas wajib diisi.')
      return
    }

    if (form.mode === 'acak' && availableCount < form.total_questions) {
      setError(
        `Soal untuk mapel "${form.subject}" hanya ada ${availableCount}, kurang dari jumlah soal yang diminta (${form.total_questions}).`
      )
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase.from('exams').insert({
      teacher_id: teacherId,
      title: form.title,
      subject: form.subject,
      class: form.class,
      duration_minutes: Number(form.duration_minutes),
      total_questions: Number(form.total_questions),
      mode: form.mode,
      shuffle_options: form.shuffle_options,
      access_code: randomAccessCode()
    })

    setSaving(false)

    if (insertError) {
      setError('Gagal membuat ujian: ' + insertError.message)
      return
    }

    setForm({
      title: '',
      subject: '',
      class: '',
      duration_minutes: 30,
      total_questions: 20,
      mode: 'acak',
      shuffle_options: true
    })
    loadData()
  }

  async function toggleActive(exam) {
    await supabase.from('exams').update({ is_active: !exam.is_active }).eq('id', exam.id)
    loadData()
  }

  async function deleteExam(id) {
    if (!confirm('Hapus ujian ini beserta paket soalnya? Rekap nilai yang sudah ada tetap tersimpan.'))
      return
    await supabase.from('exams').delete().eq('id', id)
    loadData()
  }

  if (managingExam) {
    return (
      <PackageBuilder
        exam={managingExam}
        teacherId={teacherId}
        onBack={() => {
          setManagingExam(null)
          loadData()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800">Buat Ujian</h2>

      <form onSubmit={handleCreate} className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-field">Nama Ujian</label>
            <input
              className="input-field"
              placeholder="mis. Ulangan Harian Sistem Starter"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Mata Pelajaran</label>
            <input
              className="input-field"
              list="subject-list"
              placeholder="mis. Sistem Starter"
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
            />
            <datalist id="subject-list">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {form.subject && (
              <p className="text-xs text-slate-400 mt-1">
                {availableCount} soal tersedia untuk mapel ini
              </p>
            )}
          </div>
          <div>
            <label className="label-field">Kelas</label>
            <input
              className="input-field"
              placeholder="mis. XI TKR A"
              value={form.class}
              onChange={(e) => update('class', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Durasi (menit)</label>
            <input
              type="number"
              min={1}
              className="input-field"
              value={form.duration_minutes}
              onChange={(e) => update('duration_minutes', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Jumlah Soal Ditampilkan</label>
            <input
              type="number"
              min={1}
              className="input-field"
              value={form.total_questions}
              onChange={(e) => update('total_questions', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Mode Soal</label>
            <select
              className="input-field"
              value={form.mode}
              onChange={(e) => update('mode', e.target.value)}
            >
              <option value="acak">Acak Otomatis dari Bank Soal</option>
              <option value="paket">Paket Tetap (A/B/C/D)</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.shuffle_options}
            onChange={(e) => update('shuffle_options', e.target.checked)}
          />
          Acak urutan pilihan jawaban (A/B/C/D/E) untuk tiap siswa
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Menyimpan...' : 'Buat Ujian'}
        </button>
      </form>

      <h3 className="font-semibold text-slate-800">Daftar Ujian</h3>
      {loading ? (
        <p className="text-slate-400 text-sm">Memuat...</p>
      ) : exams.length === 0 ? (
        <p className="text-slate-400 text-sm">Belum ada ujian dibuat.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{exam.title}</p>
                <p className="text-sm text-slate-500">
                  {exam.subject} &middot; Kelas {exam.class} &middot; {exam.duration_minutes} menit &middot;{' '}
                  {exam.total_questions} soal &middot; {exam.mode === 'acak' ? 'Acak' : 'Paket Tetap'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Kode akses siswa:{' '}
                  <span className="font-mono font-semibold text-brand-700">{exam.access_code}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {exam.mode === 'paket' && (
                  <button className="btn-secondary text-xs" onClick={() => setManagingExam(exam)}>
                    Kelola Paket
                  </button>
                )}
                <button
                  className={
                    exam.is_active
                      ? 'btn-secondary text-xs'
                      : 'btn-primary text-xs px-3 py-1.5'
                  }
                  onClick={() => toggleActive(exam)}
                >
                  {exam.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button className="btn-danger text-xs" onClick={() => deleteExam(exam.id)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
