import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import QuestionBank from '../components/QuestionBank.jsx'
import ExamBuilder from '../components/ExamBuilder.jsx'
import Recap from '../components/Recap.jsx'

const TABS = [
  { key: 'soal', label: 'Bank Soal' },
  { key: 'ujian', label: 'Buat Ujian' },
  { key: 'rekap', label: 'Rekap Nilai' }
]

export default function TeacherDashboard() {
  const [tab, setTab] = useState('soal')
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/guru/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
              C
            </div>
            <span className="font-semibold text-slate-800">CBT Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline">{user.email}</span>
            <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
              Keluar
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'soal' && <QuestionBank teacherId={user.id} />}
        {tab === 'ujian' && <ExamBuilder teacherId={user.id} />}
        {tab === 'rekap' && <Recap teacherId={user.id} />}
      </main>
    </div>
  )
}
