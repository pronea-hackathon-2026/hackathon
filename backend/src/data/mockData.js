export const jobs = [
  {
    id: 'job-product-designer',
    title: 'Senior Product Designer',
    department: 'Product Design',
    location: 'Prague, CZ',
    workMode: 'Hybrid',
    status: 'open',
    description: 'Own onboarding, activation, and product discovery flows for a scaling SaaS team.',
    openings: 1,
  },
  {
    id: 'job-frontend-engineer',
    title: 'Frontend Engineer',
    department: 'Engineering',
    location: 'Brno, CZ',
    workMode: 'Remote',
    status: 'open',
    description: 'Build candidate and recruiter experiences across the hiring funnel.',
    openings: 2,
  },
]

export const candidates = [
  {
    id: 'candidate-nina-vargova',
    jobId: 'job-product-designer',
    name: 'Nina Vargova',
    headline: 'Senior Product Designer at Bloomreach',
    email: 'nina.vargova@gmail.com',
    phone: '+421 903 555 201',
    location: 'Bratislava, SK',
    score: 86,
    credibilityScore: 78,
    interviewReadiness: 91,
    status: 'shortlisted',
    source: 'linkedin',
    redFlags: [
      'Candidate left Comenius University before completing year two.',
      'LinkedIn timeline shows an 11-month consulting gap with low detail.',
    ],
    timelineGaps: [
      {
        start: '2023-05',
        end: '2024-04',
        durationMonths: 11,
        note: 'Freelance consulting mentioned, but evidence is limited.',
      },
    ],
    verifiedSources: ['CV Document', 'LinkedIn', 'Portfolio', 'Course Certificates'],
    recommendation: 'Proceed to AI first-round interview, then schedule HR follow-up.',
    experience: [
      {
        title: 'Senior Product Designer',
        company: 'Bloomreach',
        period: '2024 - present',
        detail: 'Owned onboarding redesign, activation flows, and design-to-engineering handoff quality.',
      },
      {
        title: 'Independent Consultant',
        company: 'Self-employed',
        period: '2023 - 2024',
        detail: 'Freelance product consulting with limited public artifacts.',
      },
      {
        title: 'Product Designer',
        company: 'Kiwi.com',
        period: '2020 - 2023',
        detail: 'Worked on booking flows, marketplace UX, and support tooling.',
      },
    ],
  },
  {
    id: 'candidate-lukas-svoboda',
    jobId: 'job-frontend-engineer',
    name: 'Lukas Svoboda',
    headline: 'Frontend Engineer building complex React dashboards',
    email: 'lukas.svoboda@example.com',
    phone: '+420 777 111 222',
    location: 'Brno, CZ',
    score: 81,
    credibilityScore: 84,
    interviewReadiness: 79,
    status: 'interview_scheduled',
    source: 'cv',
    redFlags: ['Recent role changes need clarification during the interview.'],
    timelineGaps: [],
    verifiedSources: ['CV Document', 'GitHub', 'Portfolio'],
    recommendation: 'Continue with technical screening and validate ownership of shipped projects.',
    experience: [
      {
        title: 'Frontend Engineer',
        company: 'Applifting',
        period: '2023 - present',
        detail: 'Builds internal dashboards and customer-facing design systems.',
      },
    ],
  },
]

export const interviews = [
  {
    id: 'application-nina-01',
    candidateId: 'candidate-nina-vargova',
    jobId: 'job-product-designer',
    stage: 'ai_screen',
    status: 'ready',
    scheduledAt: '2026-03-26T10:00:00.000Z',
    generatedQuestions: [
      'You left university before graduating. What led to that decision?',
      'What were you focused on during the 11-month gap in 2023 and 2024?',
      'Which onboarding metric improved because of your work at Bloomreach?',
      'Tell me about a conflict with engineering or product and how you resolved it.',
    ],
  },
]
