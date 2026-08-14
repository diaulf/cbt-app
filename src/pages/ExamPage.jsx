import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Timer from '../components/Timer.jsx'
import { gradeAttempt } from '../utils/grading.js'

const LOCAL_KEY_PREFIX = 'cbt_answers_'

export default function ExamPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [exam, setExam] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submittedRef = useRef(false)
  const saveTimeoutRef = useRef(null)

  const localKey = `${LOCAL_KEY_PREFIX}${attemptId}`

  // Load attempt data
  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from('attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single()

      if (fetchError || !data) {
        setError('Data ujian tidak ditemukan. Kemungkinan link tidak valid.')
        setLoading(false)
        return
      }

      if (data.status === 'submitted' || data.status === 'timeout') {
        setError('Ujian ini sudah pernah disubmit.')
        setLoading(false)
        return
      }

      setAttempt(data)
      setExam(data.exams)

      // Gabungkan jawaban dari server + localStorage (jaga-jaga koneksi terputus saat autosave terakhir)
      const localRaw = localStorage.getItem(localKey)
      const localAnswers = localRaw ? JSON.parse(localRaw) : {}
      setAnswers({ ...data.answers, ...localAnswers })

      // Hitung sisa waktu berdasarkan started_at, supaya refresh halaman tidak reset timer
      const startedAt = new Date(data.started_at).getTime()
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(data.time_limit_seconds - elapsedSec, 0)
      setSecondsLeft(remaining)

      setLoading(false)
    }

    load()
  }, [attemptId])

  // Autosave jawaban ke localStorage (instan) dan Supabase (debounced)
  const persistAnswers = useCallback(
    (newAnswers) => {
      localStorage.setItem(localKey, JSON.stringify(newAnswers))

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(async () => {
        await supabase.from('attempts').update({ answers: newAnswers }).eq('id', attemptId)
      }, 800)
    },
    [attemptId, localKey]
  )

  function selectAnswer(questionId, letter) {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: letter }
      persistAnswers(updated)
      return updated
    })
  }

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !attempt || !exam) return
      submittedRef.current = true
      setSubmitting(true)

      const { correct, wrong, total, score } = gradeAttempt(attempt.questions, answers)

      await supabase
        .from('attempts')
        .update({
          answers,
          status: auto ? 'timeout' : 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', attemptId)

      const { data: student } = await supabase
        .from('students')
        .select('name, class')
        .eq('id', attempt.student_id)
        .single()

      const { data: result, error: resultError } = await supabase
        .from('results')
        .insert({
          attempt_id: attemptId,
          student_id: attempt.student_id,
          exam_id: exam.id,
          student_name: student?.name ?? '-',
          student_class: student?.class ?? '-',
          exam_title: exam.title,
          score,
          correct,
          wrong,
          total_questions: total
        })
        .select()
        .single()

      localStorage.removeItem(localKey)
      setSubmitting(false)

      if (resultError || !result) {
        setError('Gagal menyimpan nilai. Coba lagi atau hubungi guru.')
        return
      }

      navigate(`/hasil/${result.id}`, { replace: true })
    },
    [attempt, exam, answers, attemptId, navigate, localKey]
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Menyiapkan ujian...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-sm text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  const questions = attempt.questions
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm sm:text-base">{exam.title}</p>
            <p className="text-xs text-slate-500">
              Soal {currentIndex + 1} / {questions.length} &middot; Terjawab {answeredCount}/{questions.length}
            </p>
          </div>
          <Timer
            secondsLeft={secondsLeft}
            onTick={setSecondsLeft}
            onExpire={() => handleSubmit(true)}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Indikator nomor soal */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                idx === currentIndex
                  ? 'bg-brand-600 text-white border-brand-600'
                  : answers[q.id]
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Soal */}
        <div className="card">
          <p className="text-base font-medium text-slate-800 whitespace-pre-wrap">
            {currentIndex + 1}. {currentQuestion.question}
          </p>

          {currentQuestion.image_url && (
            <img
              src={currentQuestion.image_url}
              alt="ilustrasi soal"
              className="mt-3 max-h-72 rounded-xl border border-slate-200 mx-auto"
            />
          )}

          <div className="mt-4 space-y-2">
            {['A', 'B', 'C', 'D', 'E'].map((letter) => {
              const text = currentQuestion.options[letter]
              if (!text) return null
              const selected = answers[currentQuestion.id] === letter
              return (
                <button
                  key={letter}
                  onClick={() => selectAnswer(currentQuestion.id, letter)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    selected
                      ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-sm font-semibold ${
                      selected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'text-slate-500 border-slate-300'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm text-slate-700 pt-0.5">{text}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigasi */}
        <div className="flex items-center justify-between gap-3">
          <button
            className="btn-secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          >
            &larr; Sebelumnya
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              className="btn-primary"
              disabled={submitting}
              onClick={() => {
                if (confirm(`Kamu sudah menjawab ${answeredCount}/${questions.length} soal. Submit sekarang?`)) {
                  handleSubmit(false)
                }
              }}
            >
              {submitting ? 'Mengirim...' : 'Selesai & Submit'}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))}
            >
              Berikutnya &rarr;
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
