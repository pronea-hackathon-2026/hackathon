import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import JobsPage from '@/pages/JobsPage'
import JobCandidatesPage from '@/pages/JobCandidatesPage'
import CandidateDetail from '@/pages/CandidateDetail'
import InterviewRoom from '@/pages/InterviewRoom'
import CandidateInterviewView from '@/pages/CandidateInterviewView'
import VideoReview from '@/pages/VideoReview'
import ThankYou from '@/pages/ThankYou'
import ApplyPage from '@/pages/ApplyPage'
import ExtensionShowcase from '@/pages/ExtensionShowcase'
import ProfileMockup from '@/pages/ProfileMockup'
import { AIProgressProvider } from '@/lib/ai-progress'
import AIProgressBar from '@/components/AIProgressBar'

export default function App() {
  return (
    <AIProgressProvider>
      <AIProgressBar />
      <Routes>
        {/* Public routes (no sidebar) */}
        <Route path="/" element={<ProfileMockup />} />
        <Route path="/extension-demo" element={<ExtensionShowcase />} />
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
                <Route path="/" element={<Navigate to="/jobs" replace />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:jobId/candidates" element={<JobCandidatesPage />} />
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
