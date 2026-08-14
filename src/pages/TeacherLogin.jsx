import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function TeacherLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError('Username/email atau password salah.')
      return
    }

    navigate('/guru/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-600/30">
            C
          </div>
          <h1 className="text-xl font-bold mt-4 text-slate-800">Login Guru</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola bank soal & ujian online</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="label-field">Email / Username</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="guru@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Akun guru dibuat lewat Supabase Dashboard, bukan lewat halaman ini.
        </p>
        <p className="text-center text-xs text-slate-400 mt-1">
          <Link to="/" className="text-brand-600 hover:underline">
            Masuk sebagai siswa &rarr;
          </Link>
        </p>
      </div>
    </div>
  )
}
