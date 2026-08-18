import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'

export default function Recap({ teacherId }) {
  const [results, setResults] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('Semua')
  const [examFilter, setExamFilter] = useState('Semua')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  async function loadData() {
    setLoading(true)
    const { data: examData } = await supabase.from('exams').select('id, title').eq('teacher_id', teacherId)
    setExams(examData || [])

    const examIds = (examData || []).map((e) => e.id)
    if (examIds.length > 0) {
      const { data } = await supabase
        .from('results')
        .select('*')
        .in('exam_id', examIds)
        .order('created_at', { ascending: false })
      setResults(data || [])
    } else {
      setResults([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [teacherId])

  const classes = useMemo(
    () => ['Semua', ...Array.from(new Set(results.map((r) => r.student_class)))],
    [results]
  )

  const filtered = results.filter((r) => {
    const matchSearch = r.student_name.toLowerCase().includes(search.toLowerCase())
    const matchClass = classFilter === 'Semua' || r.student_class === classFilter
    const matchExam = examFilter === 'Semua' || r.exam_id === examFilter
    return matchSearch && matchClass && matchExam
  })

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortBy]
    let valB = b[sortBy]

    if (sortBy === 'student_name' || sortBy === 'student_class' || sortBy === 'exam_title') {
      valA = (valA || '').toLowerCase()
      valB = (valB || '').toLowerCase()
      const cmp = valA.localeCompare(valB, 'id')
      return sortDir === 'asc' ? cmp : -cmp
    }

    if (sortBy === 'created_at') {
      valA = new Date(valA).getTime()
      valB = new Date(valB).getTime()
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      // Default: nama/kelas/ujian A-Z dulu, sedangkan nilai/benar/salah/tanggal besar ke kecil dulu
      setSortDir(['student_name', 'student_class', 'exam_title'].includes(column) ? 'asc' : 'desc')
    }
  }

  function SortIcon({ column }) {
    if (sortBy !== column) {
      return <span className="text-slate-300 ml-1">↕</span>
    }
    return <span className="text-brand-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function exportExcel() {
    const rows = sorted.map((r) => ({
      Nama: r.student_name,
      Kelas: r.student_class,
      Ujian: r.exam_title,
      Nilai: r.score,
      Benar: r.correct,
      Salah: r.wrong,
      'Jumlah Soal': r.total_questions,
      Tanggal: new Date(r.created_at).toLocaleString('id-ID')
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai')
    XLSX.writeFile(wb, `rekap-nilai-${Date.now()}.xlsx`)
  }

  async function handleDelete(id) {
    if (!confirm('Hapus data nilai ini?')) return
    await supabase.from('results').delete().eq('id', id)
    loadData()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">Rekap Nilai ({sorted.length})</h2>
        <button className="btn-primary" onClick={exportExcel} disabled={sorted.length === 0}>
          Export Excel
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-field"
          placeholder="Cari nama siswa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input-field" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="input-field" value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
          <option value="Semua">Semua Ujian</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Memuat...</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-400 text-sm">Belum ada data nilai.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('student_name')}
                >
                  Nama <SortIcon column="student_name" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('student_class')}
                >
                  Kelas <SortIcon column="student_class" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('exam_title')}
                >
                  Ujian <SortIcon column="exam_title" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('score')}
                >
                  Nilai <SortIcon column="score" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('correct')}
                >
                  Benar <SortIcon column="correct" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('wrong')}
                >
                  Salah <SortIcon column="wrong" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800"
                  onClick={() => handleSort('created_at')}
                >
                  Tanggal <SortIcon column="created_at" />
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.student_name}</td>
                  <td className="px-4 py-3">{r.student_class}</td>
                  <td className="px-4 py-3">{r.exam_title}</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">{r.score}</td>
                  <td className="px-4 py-3 text-green-600">{r.correct}</td>
                  <td className="px-4 py-3 text-red-500">{r.wrong}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(r.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => handleDelete(r.id)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
