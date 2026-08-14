import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function PackageBuilder({ exam, teacherId, onBack }) {
  const [packages, setPackages] = useState([])
  const [bank, setBank] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPackageName, setNewPackageName] = useState('')
  const [activePackage, setActivePackage] = useState(null)
  const [assigned, setAssigned] = useState([])

  async function loadData() {
    setLoading(true)
    const [{ data: pkgs }, { data: qs }] = await Promise.all([
      supabase.from('exam_packages').select('*').eq('exam_id', exam.id).order('created_at'),
      supabase
        .from('questions')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('subject', exam.subject)
    ])
    setPackages(pkgs || [])
    setBank(qs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [exam.id])

  async function loadAssigned(pkg) {
    const { data } = await supabase
      .from('package_questions')
      .select('question_id')
      .eq('package_id', pkg.id)
    setAssigned((data || []).map((r) => r.question_id))
    setActivePackage(pkg)
  }

  async function createPackage() {
    if (!newPackageName.trim()) return
    await supabase.from('exam_packages').insert({ exam_id: exam.id, name: newPackageName.trim() })
    setNewPackageName('')
    loadData()
  }

  async function deletePackage(id) {
    if (!confirm('Hapus paket ini?')) return
    await supabase.from('exam_packages').delete().eq('id', id)
    if (activePackage?.id === id) setActivePackage(null)
    loadData()
  }

  async function toggleQuestion(questionId) {
    if (assigned.includes(questionId)) {
      await supabase
        .from('package_questions')
        .delete()
        .eq('package_id', activePackage.id)
        .eq('question_id', questionId)
      setAssigned((a) => a.filter((id) => id !== questionId))
    } else {
      if (assigned.length >= exam.total_questions) {
        alert(`Paket ini sudah mencapai jumlah soal maksimal (${exam.total_questions}).`)
        return
      }
      await supabase
        .from('package_questions')
        .insert({ package_id: activePackage.id, question_id: questionId, position: assigned.length })
      setAssigned((a) => [...a, questionId])
    }
  }

  return (
    <div className="space-y-5">
      <button className="text-sm text-brand-600 hover:underline" onClick={onBack}>
        &larr; Kembali ke Daftar Ujian
      </button>

      <div>
        <h2 className="text-lg font-bold text-slate-800">Paket Soal: {exam.title}</h2>
        <p className="text-sm text-slate-500">
          Setiap paket harus berisi tepat {exam.total_questions} soal dari mapel {exam.subject}.
        </p>
      </div>

      <div className="card">
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="Nama paket, mis. Paket A"
            value={newPackageName}
            onChange={(e) => setNewPackageName(e.target.value)}
          />
          <button className="btn-primary shrink-0" onClick={createPackage}>
            Tambah Paket
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Memuat...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 text-sm">Daftar Paket</h3>
            {packages.length === 0 && (
              <p className="text-sm text-slate-400">Belum ada paket. Buat paket dulu di atas.</p>
            )}
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`card cursor-pointer flex justify-between items-center ${
                  activePackage?.id === pkg.id ? 'ring-2 ring-brand-500' : ''
                }`}
                onClick={() => loadAssigned(pkg)}
              >
                <span className="text-sm font-medium">{pkg.name}</span>
                <button
                  className="text-xs text-red-500 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePackage(pkg.id)
                  }}
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <div className="md:col-span-2">
            {!activePackage ? (
              <p className="text-sm text-slate-400">Pilih paket untuk mengatur soalnya.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  {activePackage.name} &middot; {assigned.length}/{exam.total_questions} soal dipilih
                </p>
                <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                  {bank.map((q, idx) => (
                    <label
                      key={q.id}
                      className={`card flex items-start gap-3 cursor-pointer ${
                        assigned.includes(q.id) ? 'border-brand-400 bg-brand-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={assigned.includes(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                      />
                      <span className="text-sm text-slate-700">
                        {idx + 1}. {q.question}
                      </span>
                    </label>
                  ))}
                  {bank.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Belum ada soal untuk mapel {exam.subject}. Tambahkan di Bank Soal dulu.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
