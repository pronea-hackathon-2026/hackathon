import { Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import CandidatesPage from '@/pages/CandidatesPage'
import JobsPage from '@/pages/JobsPage'
import CandidateDetail from '@/pages/CandidateDetail'
import InterviewRoom from '@/pages/InterviewRoom'
import CandidateInterviewView from '@/pages/CandidateInterviewView'
import VideoReview from '@/pages/VideoReview'
import ThankYou from '@/pages/ThankYou'
import ApplyPage from '@/pages/ApplyPage'
import { AIProgressProvider } from '@/lib/ai-progress'
import AIProgressBar from '@/components/AIProgressBar'

export default function App() {
  return (
    <AIProgressProvider>
      <AIProgressBar />
      <Routes>
        {/* Public routes (no sidebar) */}
        <Route path="/apply/:jobId" element={<ApplyPage />} />
        <Route path="/interview/:applicationId" element={<InterviewRoom />} />
        <Route path="/join/:applicationId" element={<CandidateInterviewView />} />
        <Route path="/thank-you" element={<ThankYou />} />

        {/* HR routes (with sidebar) */}
        <Route path="*" element={
          <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/candidates" element={<CandidatesPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/candidate/:id" element={<CandidateDetail />} />
                <Route path="/review/:applicationId" element={<VideoReview />} />
              </Routes>
            </main>
          </div>
        } />
      </Routes>
    </AIProgressProvider>
  )
}
