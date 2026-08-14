import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ResultPage() {
  const { resultId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from('results')
        .select('*')
        .eq('id', resultId)
        .single()

      if (fetchError || !data) {
        setError('Data nilai tidak ditemukan.')
      } else {
        setResult(data)
      }
      setLoading(false)
    }
    load()
  }, [resultId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat hasil...</div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const scoreColor =
    result.score >= 75 ? 'text-green-600' : result.score >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="card text-center space-y-4">
          <p className="text-sm text-slate-500">Ujian selesai</p>
          <h1 className="font-bold text-slate-800">{result.exam_title}</h1>

          <div className={`text-5xl font-extrabold ${scoreColor}`}>{result.score}</div>
          <p className="text-sm text-slate-500">Nilai Akhir</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-green-50 rounded-xl py-3">
              <p className="text-xl font-bold text-green-600">{result.correct}</p>
              <p className="text-xs text-green-700">Benar</p>
            </div>
            <div className="bg-red-50 rounded-xl py-3">
              <p className="text-xl font-bold text-red-500">{result.wrong}</p>
              <p className="text-xs text-red-600">Salah</p>
            </div>
          </div>

          <div className="text-left text-sm text-slate-600 border-t border-slate-100 pt-4 space-y-1">
            <p>
              <span className="text-slate-400">Nama:</span> {result.student_name}
            </p>
            <p>
              <span className="text-slate-400">Kelas:</span> {result.student_class}
            </p>
            <p>
              <span className="text-slate-400">Jumlah Soal:</span> {result.total_questions}
            </p>
          </div>

          <Link to="/" className="btn-primary w-full inline-block mt-2">
            Kembali ke Halaman Awal
          </Link>
        </div>
      </div>
    </div>
  )
}
