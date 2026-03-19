const UNSPLASH_PARAMS = 'auto=format&fit=crop&w=240&q=80'

export const CANDIDATE_AVATARS: Record<string, string> = {
  'mock-c-1': `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?${UNSPLASH_PARAMS}`,
  'mock-c-2': `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?${UNSPLASH_PARAMS}`,
  'mock-c-3': `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?${UNSPLASH_PARAMS}`,
  'mock-c-4': `https://images.unsplash.com/photo-1544005313-94ddf0286df2?${UNSPLASH_PARAMS}`,
  'mock-c-5': `https://images.unsplash.com/photo-1494790108377-be9c29b29330?${UNSPLASH_PARAMS}`,
  'mock-c-6': `https://images.unsplash.com/photo-1504593811423-6dd665756598?${UNSPLASH_PARAMS}`,
  'mock-c-7': `https://images.unsplash.com/photo-1517841905240-472988babdf9?${UNSPLASH_PARAMS}`,
  'mock-c-8': `https://images.unsplash.com/photo-1502685104226-ee32379fefbe?${UNSPLASH_PARAMS}`,
  'mock-c-9': `https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?${UNSPLASH_PARAMS}`,
  'mock-c-10': `https://images.unsplash.com/photo-1504257432389-52343af06ae3?${UNSPLASH_PARAMS}`,
}

export function getCandidateAvatarUrl(candidateId?: string | null) {
  if (!candidateId) return undefined
  return CANDIDATE_AVATARS[candidateId]
}
