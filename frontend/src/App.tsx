import { Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import CandidateDetail from '@/pages/CandidateDetail'
import InterviewRoom from '@/pages/InterviewRoom'
import VideoReview from '@/pages/VideoReview'
import ThankYou from '@/pages/ThankYou'

export default function App() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/candidate/:id" element={<CandidateDetail />} />
          <Route path="/interview/:applicationId" element={<InterviewRoom />} />
          <Route path="/review/:applicationId" element={<VideoReview />} />
          <Route path="/thank-you" element={<ThankYou />} />
        </Routes>
      </main>
    </div>
  )
}
