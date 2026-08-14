import { Routes, Route, Navigate } from 'react-router-dom'
import TeacherLogin from './pages/TeacherLogin.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import StudentEntry from './pages/StudentEntry.jsx'
import ExamPage from './pages/ExamPage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      {/* Siswa */}
      <Route path="/" element={<StudentEntry />} />
      <Route path="/ujian/:attemptId" element={<ExamPage />} />
      <Route path="/hasil/:resultId" element={<ResultPage />} />

      {/* Guru */}
      <Route path="/guru/login" element={<TeacherLogin />} />
      <Route
        path="/guru/dashboard/*"
        element={
          <ProtectedRoute>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
