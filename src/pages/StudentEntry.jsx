import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { pickRandomQuestions, shuffleArray, shuffleOptions } from '../utils/shuffle'

const ACTIVE_ATTEMPT_KEY = 'cbt_active_attempt'

export default function StudentEntry() {
  const [name, setName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingResume, setCheckingResume] = useState(true)
  const navigate = useNavigate()

  // Cek apakah device ini masih punya ujian yang sedang berlangsung
  // (misal karena aplikasi/browser sempat reload di tengah ujian).
  // Kalau ada dan waktunya belum habis, langsung lempar ke halaman ujian
  // tanpa siswa perlu isi ulang nama/kelas/kode dari awal.
  useEffect(() => {
    async function checkResume() {
      const raw = localStorage.getItem(ACTIVE_ATTEMPT_KEY)
      if (!raw) {
        setCheckingResume(false)
        return
      }

      try {
        const { attemptId } = JSON.parse(raw)
        const { data: attempt } = await supabase
          .from('attempts')
          .select('id, status, started_at, time_limit_seconds')
          .eq('id', attemptId)
          .maybeSingle()

        if (!attempt || attempt.status !== 'in_progress') {
          localStorage.removeItem(ACTIVE_ATTEMPT_KEY)
          setCheckingResume(false)
          return
        }

        const elapsedSec = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
        const remaining = attempt.time_limit_seconds - elapsedSec

        if (remaining <= 0) {
          // Waktu sudah habis, biarkan halaman ujian yang menangani auto-submit
          navigate(`/ujian/${attempt.id}`, { replace: true })
          return
        }

        navigate(`/ujian/${attempt.id}`, { replace: true })
      } catch {
        localStorage.removeItem(ACTIVE_ATTEMPT_KEY)
        setCheckingResume(false)
      }
    }

    checkResume()
  }, [navigate])

  async function handleStart(e) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !studentClass.trim() || !accessCode.trim()) {
      setError('Nama, kelas, dan kode ujian wajib diisi.')
      return
    }

    setLoading(true)

    // 1. Cari ujian berdasarkan kode akses
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('access_code', accessCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (examError || !exam) {
      setError('Kode ujian tidak ditemukan atau ujian belum/tidak aktif. Cek kembali dengan gurumu.')
      setLoading(false)
      return
    }

    // 2. Susun soal untuk siswa ini (snapshot, supaya konsisten walau bank soal berubah)
    let questionSet = []

    if (exam.mode === 'acak') {
      const { data: bank, error: bankError } = await supabase
        .from('questions')
        .select('*')
        .eq('teacher_id', exam.teacher_id)
        .eq('subject', exam.subject)

      if (bankError || !bank || bank.length === 0) {
        setError('Soal untuk ujian ini belum tersedia. Hubungi gurumu.')
        setLoading(false)
        return
      }

      questionSet = pickRandomQuestions(bank, exam.total_questions)
    } else {
      // mode 'paket': ambil paket secara acak dari paket yang tersedia
      const { data: packages } = await supabase
        .from('exam_packages')
        .select('id, name')
        .eq('exam_id', exam.id)

      if (!packages || packages.length === 0) {
        setError('Paket soal untuk ujian ini belum disiapkan. Hubungi gurumu.')
        setLoading(false)
        return
      }

      const chosenPackage = packages[Math.floor(Math.random() * packages.length)]

      const { data: pkgQuestions } = await supabase
        .from('package_questions')
        .select('question_id, position, questions(*)')
        .eq('package_id', chosenPackage.id)
        .order('position')

      questionSet = (pkgQuestions || []).map((pq) => pq.questions)
    }

    if (questionSet.length === 0) {
      setError('Soal ujian belum tersedia. Hubungi gurumu.')
      setLoading(false)
      return
    }

    // 3. Acak urutan soal, dan acak pilihan jika diaktifkan guru
    const orderedQuestions = shuffleArray(questionSet).map((q) => {
      if (exam.shuffle_options) {
        const { options, answer_key } = shuffleOptions(q)
        return {
          id: q.id,
          question: q.question,
          image_url: q.image_url,
          options,
          answer_key
        }
      }
      return {
        id: q.id,
        question: q.question,
        image_url: q.image_url,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d,
          E: q.option_e
        },
        answer_key: q.answer_key
      }
    })

    // 4. Buat data siswa
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({ name: name.trim(), class: studentClass.trim() })
      .select()
      .single()

    if (studentError) {
      setError('Gagal menyimpan data siswa: ' + studentError.message)
      setLoading(false)
      return
    }

    // 5. Buat attempt (snapshot ujian untuk siswa ini)
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        exam_id: exam.id,
        student_id: student.id,
        questions: orderedQuestions,
        answers: {},
        time_limit_seconds: exam.duration_minutes * 60
      })
      .select()
      .single()

    setLoading(false)

    if (attemptError) {
      setError('Gagal memulai ujian: ' + attemptError.message)
      return
    }

    localStorage.setItem(ACTIVE_ATTEMPT_KEY, JSON.stringify({ attemptId: attempt.id }))
    navigate(`/ujian/${attempt.id}`)
  }

  if (checkingResume) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Memeriksa sesi ujian...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Logo CBT"
            className="w-16 h-16 rounded-2xl mx-auto shadow-lg shadow-brand-600/30 object-cover"
          />
          <h1 className="text-xl font-bold mt-4 text-slate-800">Ujian Online</h1>
          <p className="text-sm text-slate-500 mt-1">Isi data dirimu untuk memulai ujian</p>
        </div>

        <form onSubmit={handleStart} className="card space-y-4">
          <div>
            <label className="label-field">Nama Lengkap</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />
          </div>
          <div>
            <label className="label-field">Kelas</label>
            <input
              className="input-field"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              placeholder="mis. XI TKR A"
            />
          </div>
          <div>
            <label className="label-field">Kode Ujian</label>
            <input
              className="input-field uppercase tracking-widest font-mono"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="mis. AB12CD"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Menyiapkan ujian...' : 'Mulai Ujian'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/guru/login" className="hover:underline">
            Login sebagai guru &rarr;
          </Link>
        </p>
      </div>
    </div>
  )
}
