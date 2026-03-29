const UNSPLASH_PARAMS = 'auto=format&fit=crop&w=240&q=80'

export const CANDIDATE_AVATARS: Record<string, string> = {
  // Original 10 candidates
  'mock-c-1': `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?${UNSPLASH_PARAMS}`, // Marcus Chen
  'mock-c-2': `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?${UNSPLASH_PARAMS}`, // Sarah O'Brien
  'mock-c-3': `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?${UNSPLASH_PARAMS}`, // James Whitfield
  'mock-c-4': `https://images.unsplash.com/photo-1544005313-94ddf0286df2?${UNSPLASH_PARAMS}`, // Priya Nair
  'mock-c-5': `https://images.unsplash.com/photo-1494790108377-be9c29b29330?${UNSPLASH_PARAMS}`, // Elena Vasquez
  'mock-c-6': `https://images.unsplash.com/photo-1504593811423-6dd665756598?${UNSPLASH_PARAMS}`, // Tom Nakamura
  'mock-c-7': `https://images.unsplash.com/photo-1517841905240-472988babdf9?${UNSPLASH_PARAMS}`, // Aisha Johnson
  'mock-c-8': `https://images.unsplash.com/photo-1502685104226-ee32379fefbe?${UNSPLASH_PARAMS}`, // David Park
  'mock-c-9': `https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?${UNSPLASH_PARAMS}`, // Lena Fischer
  'mock-c-10': `https://images.unsplash.com/photo-1504257432389-52343af06ae3?${UNSPLASH_PARAMS}`, // Raj Patel

  // New candidates (non-inbox statuses)
  'mock-c-11': `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?${UNSPLASH_PARAMS}`, // Kevin Liu
  'mock-c-12': `https://images.unsplash.com/photo-1534528741775-53994a69daeb?${UNSPLASH_PARAMS}`, // Sofia Martinez
  'mock-c-13': `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?${UNSPLASH_PARAMS}`, // Nathan Brooks
  'mock-c-14': `https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?${UNSPLASH_PARAMS}`, // Maya Patel
  'mock-c-15': `https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?${UNSPLASH_PARAMS}`, // Alex Thompson
  'mock-c-16': `https://images.unsplash.com/photo-1580489944761-15a19d654956?${UNSPLASH_PARAMS}`, // Jennifer Wu
  'mock-c-17': `https://images.unsplash.com/photo-1560250097-0b93528c311a?${UNSPLASH_PARAMS}`, // Omar Hassan
  'mock-c-18': `https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?${UNSPLASH_PARAMS}`, // Claire Dubois
}

// Avatar URLs for imported candidates (keyed by email since IDs are dynamic)
export const IMPORTED_CANDIDATE_AVATARS: Record<string, string> = {
  'sarah.m@example.com': `https://images.unsplash.com/photo-1548142813-c348350df52b?${UNSPLASH_PARAMS}`, // Sarah Mitchell
  'j.rodriguez@example.com': `https://images.unsplash.com/photo-1563237023-b1e970526dcb?${UNSPLASH_PARAMS}`, // James Rodriguez
  'emily.zhang@example.com': `https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?${UNSPLASH_PARAMS}`, // Emily Zhang
  'm.okonkwo@example.com': `https://images.unsplash.com/photo-1531384441138-2736e62e0919?${UNSPLASH_PARAMS}`, // Michael Okonkwo
  'anna.k@example.com': `https://images.unsplash.com/photo-1557862921-37829c790f19?${UNSPLASH_PARAMS}`, // Anna Kowalski
  'd.chen@example.com': `https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?${UNSPLASH_PARAMS}`, // David Chen
  'r.kim@example.com': `https://images.unsplash.com/photo-1544717305-2782549b5136?${UNSPLASH_PARAMS}`, // Rachel Kim
  't.muller@example.com': `https://images.unsplash.com/photo-1545167622-3a6ac756afa4?${UNSPLASH_PARAMS}`, // Thomas Müller
}

export function getCandidateAvatarUrl(candidateId?: string | null, email?: string | null) {
  if (!candidateId) return undefined
  // First check static candidate IDs
  if (CANDIDATE_AVATARS[candidateId]) {
    return CANDIDATE_AVATARS[candidateId]
  }
  // Then check imported candidates by email
  if (email && IMPORTED_CANDIDATE_AVATARS[email]) {
    return IMPORTED_CANDIDATE_AVATARS[email]
  }
  return undefined
}
