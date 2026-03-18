import { Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import CandidatesPage from '@/pages/CandidatesPage'
import JobsPage from '@/pages/JobsPage'
import CandidateDetail from '@/pages/CandidateDetail'
import InterviewRoom from '@/pages/InterviewRoom'
import VideoReview from '@/pages/VideoReview'
import ThankYou from '@/pages/ThankYou'
import { AIProgressProvider } from '@/lib/ai-progress'
import AIProgressBar from '@/components/AIProgressBar'

export default function App() {
  return (
    <AIProgressProvider>
      <AIProgressBar />
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/candidate/:id" element={<CandidateDetail />} />
            <Route path="/interview/:applicationId" element={<InterviewRoom />} />
            <Route path="/review/:applicationId" element={<VideoReview />} />
            <Route path="/thank-you" element={<ThankYou />} />
          </Routes>
        </main>
      </div>
    </AIProgressProvider>
  )
}
