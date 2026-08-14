import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import QuestionForm from './QuestionForm.jsx'
import ImportExcel from './ImportExcel.jsx'

export default function QuestionBank({ teacherId }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('Semua')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function loadQuestions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (!error) setQuestions(data)
    setLoading(false)
  }

  useEffect(() => {
    loadQuestions()
  }, [teacherId])

  const subjects = useMemo(() => {
    const set = new Set(questions.map((q) => q.subject))
    return ['Semua', ...Array.from(set)]
  }, [questions])

  const filtered = questions.filter((q) => {
    const matchSearch = q.question.toLowerCase().includes(search.toLowerCase())
    const matchSubject = subjectFilter === 'Semua' || q.subject === subjectFilter
    return matchSearch && matchSubject
  })

  async function handleDelete(id) {
    if (!confirm('Hapus soal ini? Tindakan tidak dapat dibatalkan.')) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (!error) loadQuestions()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">Bank Soal ({questions.length})</h2>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              setEditingQuestion(null)
              setShowForm((s) => !s)
            }}
          >
            {showForm ? 'Tutup Form' : '+ Tambah Soal'}
          </button>
        </div>
      </div>

      <ImportExcel teacherId={teacherId} onImported={loadQuestions} />

      {showForm && (
        <QuestionForm
          teacherId={teacherId}
          editingQuestion={editingQuestion}
          onSaved={() => {
            loadQuestions()
            setShowForm(false)
            setEditingQuestion(null)
          }}
          onCancelEdit={() => {
            setShowForm(false)
            setEditingQuestion(null)
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-field sm:max-w-xs"
          placeholder="Cari soal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field sm:max-w-xs"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Memuat soal...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">Belum ada soal. Tambahkan soal atau import Excel.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => (
            <div key={q.id} className="card">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {q.subject}
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {idx + 1}. {q.question}
                  </p>
                  {q.image_url && (
                    <img
                      src={q.image_url}
                      alt="soal"
                      className="mt-2 max-h-32 rounded-lg border border-slate-200"
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 text-sm text-slate-600">
                    {['a', 'b', 'c', 'd', 'e'].map(
                      (l) =>
                        q[`option_${l}`] && (
                          <div
                            key={l}
                            className={
                              q.answer_key === l.toUpperCase()
                                ? 'font-semibold text-green-700'
                                : ''
                            }
                          >
                            {l.toUpperCase()}. {q[`option_${l}`]}
                            {q.answer_key === l.toUpperCase() && ' ✓'}
                          </div>
                        )
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    className="btn-secondary text-xs px-3 py-1.5"
                    onClick={() => {
                      setEditingQuestion(q)
                      setShowForm(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger text-xs px-3 py-1.5"
                    onClick={() => handleDelete(q.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
