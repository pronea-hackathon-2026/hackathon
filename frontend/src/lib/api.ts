const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Mutable override store — tracks status/analysis changes during demo session
const _appOverrides = new Map<string, Partial<Application>>()

// Per-job demo timers — scoring animation
const _demoStartTimes = new Map<string, number>()

// ─── Interview Analyses ────────────────────────────────────────────────────────

const ANALYSIS_MARCUS: InterviewAnalysis = {
  answer_quality_score: 92,
  communication_score: 88,
  attention_score: 91,
  interview_score: 90,
  summary: 'Marcus demonstrated exceptional depth in system design and distributed architecture. His experience shipping at scale at Stripe was evident throughout — every answer came with concrete numbers, architectural tradeoffs, and lessons learned from production. Communication was clear, structured, and concise. One minor attention flag during Q3 but otherwise highly focused.',
  strengths: [
    'Deep expertise in distributed systems and event-sourcing patterns',
    'Excellent communication — concrete examples with real metrics',
    'Strong React & TypeScript fundamentals, proven at scale',
    'Collaborative mindset — proactive about knowledge sharing and tech debt',
  ],
  concerns: [
    'May be over-qualified for initial scope; could get bored quickly',
    'Strong preference for TypeScript-only stacks may create friction in polyglot environments',
  ],
  per_question: [
    { question: "Walk me through a complex system you've built from scratch at scale.", score: 95, notes: 'Excellent — described Stripe reconciliation pipeline with Kafka, idempotency, Redis dedup cache, and concrete impact (97% error reduction). Highly specific.' },
    { question: 'How do you approach API design and versioning?', score: 90, notes: 'Contract-first design, URL vs header versioning tradeoffs, additive-only principle. Mentioned Airbnb compatibility shim layer — impressive real-world depth.' },
    { question: 'Describe a production incident you owned end-to-end.', score: 88, notes: 'Race condition in PostgreSQL under load, 0.002% duplicate charges. Coordinated 48h war room, hotfix, backfill, post-mortem that drove company-wide policy change.' },
    { question: 'How do you ensure code quality in a fast-moving team?', score: 91, notes: 'PR templates, ADRs, contract tests, 20% tech debt Fridays. Emphasized pairing over reviews — shows mature engineering leadership mindset.' },
    { question: 'What does great frontend architecture look like to you?', score: 94, notes: 'Feature-based folders, server state (React Query), strangler fig for migrations. Crisp, opinionated, and practical — exactly what a senior should sound like.' },
  ],
}

const TRANSCRIPT_MARCUS = `Q1: Walk me through a complex system you've built from scratch at scale.
A: At Stripe, I led the rebuild of our payment reconciliation pipeline — it processed around 2 million transactions daily. I designed the event-sourcing layer using Kafka, built a React-based dashboard for the finance team with real-time updates via WebSockets, and wrote the Node.js services connecting them. The main challenge was idempotency — ensuring retried events didn't double-count. We used PostgreSQL advisory locks combined with a Redis-based dedup cache keyed on event ID and processing window. After six months of development and a staged rollout, we cut reconciliation errors by 97% and reduced finance team manual review time by 12 hours per week.

Q2: How do you approach API design and versioning?
A: I strongly prefer contract-first design — writing the OpenAPI spec before any implementation. For versioning, I like URL versioning for public APIs because it's explicit and easy to proxy. Internally I prefer header-based versioning to keep URLs clean. I'm also a strong advocate for additive-only APIs — never removing or changing field semantics, only deprecating with sunset headers. At Airbnb we built a compatibility shim layer that transparently translated v1 calls to v2 semantics, which let mobile clients migrate on their own schedule without a hard cutover deadline.

Q3: Describe a production incident you owned end-to-end.
A: We had a silent data corruption bug that only appeared under a specific race condition in our PostgreSQL connection pool at high load. It was causing duplicate charge records for about 0.002% of transactions. I discovered it through an anomaly in our nightly reconciliation report. I coordinated a 48-hour war room with three engineers, identified the root cause — a missing transaction isolation level on a read-modify-write path — deployed a hotfix, ran a backfill script to correct affected records, and wrote a post-mortem that led to a company-wide policy of explicit transaction isolation on all financial writes.

Q4: How do you ensure code quality in a fast-moving team?
A: A few things I've found essential. First, PR templates that require engineers to describe the 'why' not just the 'what'. Second, Architecture Decision Records for anything affecting more than one service. Third, contract tests at service boundaries rather than just unit tests — because mocks lie about behavior. Fourth, I run 'tech debt Fridays' where we allocate 20% of sprint capacity to cleanup. I've also found pairing on hard problems is more effective than code review alone — reviews catch bugs, pairing prevents wrong abstractions from forming in the first place.

Q5: What does great frontend architecture look like to you?
A: Great frontend architecture is boring — predictable and local. I favour feature-based folder structure over layer-based, because you rarely change 'all models' at once but you often change 'everything about the checkout flow.' State should live as close to where it's used as possible — global state is a last resort. I'm a strong advocate for server state tools like React Query over Redux for remote data. And I believe in the strangler fig pattern for legacy migrations — never a big-bang rewrite, always a parallel track you can gradually cut over to with feature flags.`

const ANALYSIS_SARAH: InterviewAnalysis = {
  answer_quality_score: 78,
  communication_score: 80,
  attention_score: 82,
  interview_score: 76,
  summary: 'Sarah showed solid full-stack fundamentals with strong Shopify context. She communicates clearly and handles frontend well, but showed hesitation on distributed systems and lacked specific metrics in several answers. Good mid-level candidate who may need support in senior-level architecture discussions.',
  strengths: [
    'Solid React and Node.js fundamentals, proven in production',
    'Good collaboration instincts and team communication',
    'Delivered production features independently at Shopify',
    'Reflective and honest about areas for growth',
  ],
  concerns: [
    'Limited distributed systems experience — answers stayed surface-level',
    'System design depth below senior expectations',
    'Most answers lacked specific metrics or concrete outcomes',
  ],
  per_question: [
    { question: "Walk me through a complex system you've built from scratch at scale.", score: 82, notes: 'Described a Shopify checkout A/B testing framework. Good scope but no scale numbers mentioned. Solid fundamentals.' },
    { question: 'How do you approach API design and versioning?', score: 78, notes: 'Covered REST principles and semantic versioning but missed key tradeoffs. No mention of backward compatibility strategies.' },
    { question: 'Describe a production incident you owned end-to-end.', score: 75, notes: 'Described a caching bug. Process was good but response lacked post-mortem depth or systemic follow-through.' },
    { question: 'How do you ensure code quality in a fast-moving team?', score: 80, notes: 'Mentioned PR reviews, linting, and test coverage thresholds. Practical but not distinctive.' },
    { question: 'What does great frontend architecture look like to you?', score: 76, notes: 'Component reuse and separation of concerns mentioned. Lacked opinions on state management or team-scale patterns.' },
  ],
}

const TRANSCRIPT_SARAH = `Q1: Walk me through a complex system you've built from scratch at scale.
A: At Shopify I built an A/B testing framework for the checkout flow. It needed to work across different storefronts and handle edge cases around currency and shipping. I designed the experiment configuration layer, wrote the frontend split logic in React, and built the analytics pipeline that aggregated results. The main challenge was ensuring consistent user assignment across sessions even if cookies were cleared. We used a hashed combination of user ID and experiment ID. It shipped to all Shopify Plus merchants and ran dozens of concurrent experiments.

Q2: How do you approach API design and versioning?
A: I generally follow REST conventions — clear resource naming, consistent use of HTTP verbs. For versioning I've used date-based versioning in the URL, like /api/2024-01. It makes deprecation timelines clear to consumers. I always try to make sure endpoints are documented and that we're not breaking existing consumers when we make changes. Working with the frontend team closely helps catch issues early.

Q3: Describe a production incident you owned end-to-end.
A: We had a caching issue where product prices were being served stale after a pricing update. It affected customers for about 20 minutes. I identified it through monitoring alerts, traced it to a Redis cache key that wasn't being invalidated on price updates, and pushed a fix. We also added a cache invalidation event to the pricing service so it would never happen again. I wrote up a brief incident report and shared it with the team.

Q4: How do you ensure code quality in a fast-moving team?
A: We had mandatory PR reviews — at least one approval before merge. We used ESLint with a strict config and enforced 80% test coverage on new code. I also tried to leave thorough PR comments explaining my reasoning, especially for non-obvious decisions. And we did weekly retrospectives where we'd catch process issues before they became bigger problems.

Q5: What does great frontend architecture look like to you?
A: I think it's about clear component boundaries and reusability. I like keeping components small and focused, with good separation between container and presentation logic. Shared component libraries help keep UI consistent across the app. I'm also a fan of keeping business logic out of components and into custom hooks. It makes testing easier and keeps things maintainable as the app grows.`

const ANALYSIS_ELENA: InterviewAnalysis = {
  answer_quality_score: 91,
  communication_score: 93,
  attention_score: 88,
  interview_score: 87,
  summary: "Elena's portfolio thinking and systems-level approach to design set her apart immediately. Her experience building design infrastructure at Figma gives her rare credibility — she understands both the tools and the underlying design process deeply. Communication was exceptional: articulate, structured, and confident. Minor attention flag near the end but maintained high engagement throughout.",
  strengths: [
    'Deep design systems expertise — built and owned at Figma scale',
    'Exceptional articulation of design rationale and decision-making process',
    'Strong cross-functional collaboration, especially with engineering',
    'Rigorous research and validation methodology with quantified outcomes',
  ],
  concerns: [
    'Limited B2B enterprise design experience — mostly consumer and developer tooling',
    'Salary expectations may exceed current band based on Figma background',
  ],
  per_question: [
    { question: "Walk me through a design decision you're proud of and the process behind it.", score: 93, notes: "Redesigned Figma's component property panel — 6 rounds of usability testing, 68% discoverability improvement, 40% reduction in support tickets. Exceptional process rigour." },
    { question: 'How do you handle stakeholder pushback on your design choices?', score: 90, notes: 'Led with data — usability test clips, task completion rates. Great instinct to understand the real concern behind pushback, not just the surface objection.' },
    { question: "Describe how you've contributed to or built a design system.", score: 95, notes: 'Owned the variable token system at Figma — 4,000+ components, governance process, Tokens Studio integration. Best answer of the interview.' },
    { question: 'How do you prioritize user research vs. fast iteration?', score: 88, notes: 'Good framing: research for directional questions, fast iteration for refinement. Concrete sprint cadence described. Practical and pragmatic.' },
    { question: 'What does good design collaboration with engineers look like?', score: 87, notes: 'Design tokens via Tokens Studio, spec reviews in Notion, async feedback loops. Shows strong systems thinking beyond just Figma files.' },
  ],
}

const TRANSCRIPT_ELENA = `Q1: Walk me through a design decision you're proud of and the process behind it.
A: The redesign of Figma's component property panel is the one I'm most proud of. The original panel had grown organically and was confusing for new users — they couldn't find how to expose component properties to their team. I started with a week of diary studies to understand how designers were actually building components, then synthesized the findings into three distinct mental models users had. I ran six rounds of usability testing across prototype iterations, each time narrowing the design space. The final design increased property discoverability by 68% in usability tests and reduced support tickets about components by 40% in the first quarter after launch.

Q2: How do you handle stakeholder pushback on your design choices?
A: First I try to understand what's actually driving the pushback — it's rarely about the design itself, it's usually about a risk the stakeholder is worried about. Once I understand the real concern, I can either show data that addresses it or adjust the design to make the mitigation more visible. I've found usability test clips are the most persuasive tool — showing someone a video of a real user struggling for 3 minutes is much more convincing than any slide deck. If stakeholders see the user pain directly, the conversation shifts from opinion to evidence.

Q3: Describe how you've contributed to or built a design system.
A: At Figma I owned the variable token system — our internal design system that powers the product itself. It includes over 4,000 components, a full semantic token layer for theming, and a governance process for how new patterns get added. The hard part was adoption, not creation. I built a token migration workflow with engineering so existing components could be systematically updated without breaking anything. I also created an internal Notion documentation hub with living examples and a change log. Within 18 months we went from about 30% token adoption to over 90% across the product.

Q4: How do you prioritize user research vs. fast iteration?
A: I think of them as tools for different questions. Research is for directional decisions — 'what problem should we solve?' Fast iteration is for refinement — 'which version of this solution works better?' I run a two-week sprint cadence: the first sprint is discovery-heavy with at least two user sessions per week, the second sprint is execution with quick prototype testing at the end. This prevents the trap of iterating confidently in the wrong direction, which I've seen kill projects.

Q5: What does good design collaboration with engineers look like?
A: The best collaboration I've had starts before any mockups. Engineers joining research sessions changes the dynamic — when they see user pain directly, they're invested in solving it. For handoff, I use Tokens Studio to sync design tokens directly into the codebase, which eliminates a whole class of visual regression bugs. We do weekly spec reviews in Notion — not Figma — because Notion allows threaded comments that track decisions over time. And I'm a big believer in async feedback loops: a Loom walkthrough of a complex interaction is more effective than a 30-minute meeting.`

const ANALYSIS_LENA: InterviewAnalysis = {
  answer_quality_score: 74,
  communication_score: 76,
  attention_score: 79,
  interview_score: 72,
  summary: "Lena has solid ML fundamentals and good production experience at Aleph Alpha. Her LLM fine-tuning work is directly relevant, though she struggled with scaling and infrastructure questions beyond her current team's scope. Communicates clearly but answers sometimes lack depth on tradeoffs. A strong hire for individual contributor ML work, with growth potential in platform engineering.",
  strengths: [
    'Strong PyTorch and MLOps background, proven in production',
    'Hands-on LLM fine-tuning experience (LoRA, instruction tuning)',
    'Good deployment and monitoring practices — described concrete observability setup',
    'Honest about limitations and gaps, shows good self-awareness',
  ],
  concerns: [
    'Limited experience with very large-scale pipelines (10B+ records)',
    'Slower under pressure on system design and infrastructure questions',
    'Could develop stronger ability to explain architectural tradeoffs clearly',
  ],
  per_question: [
    { question: 'How do you approach productionizing a new ML model?', score: 76, notes: 'Good coverage of model validation, A/B testing, and rollback strategy. Mentioned FastAPI serving and Prometheus metrics. Lacked detail on canary deployment patterns.' },
    { question: 'Describe your experience with LLMs and prompt engineering.', score: 74, notes: 'LoRA fine-tuning on instruction datasets at Aleph Alpha. Solid but limited to smaller model scales. No mention of RLHF or alignment techniques.' },
    { question: 'How do you debug a model that performs well offline but poorly in production?', score: 74, notes: 'Distribution shift mentioned — good instinct. Described feature drift monitoring but response was somewhat generic.' },
    { question: "Walk me through a data pipeline you've built at scale.", score: 71, notes: 'Described 50M record pipeline at Bosch. Good fundamentals (Airflow, Parquet) but hesitated on fault tolerance and backpressure handling.' },
    { question: 'How do you stay current with the rapidly evolving ML landscape?', score: 70, notes: 'Mentioned arXiv, Hugging Face blog, Twitter ML community. Practical answer but no evidence of applying new research to current work recently.' },
  ],
}

const TRANSCRIPT_LENA = `Q1: How do you approach productionizing a new ML model?
A: I start with offline evaluation — making sure the model hits our quality thresholds on held-out test data that mirrors production distribution as closely as possible. Then I package it with FastAPI, add Prometheus metrics for latency, throughput, and prediction distribution, and deploy behind a feature flag. We always do shadow mode first — serving predictions but not using them — to catch distribution issues early. Then a gradual rollout with automatic rollback if key metrics degrade. I keep the previous model warm so we can switch back within seconds if needed.

Q2: Describe your experience with LLMs and prompt engineering.
A: At Aleph Alpha I worked on instruction fine-tuning for our Luminous models using LoRA adapters. We built a data curation pipeline for instruction-response pairs, trained on roughly 2 million examples, and evaluated on a combination of internal benchmarks and MMLU. For prompt engineering I've built structured prompt templates with few-shot examples for classification and extraction tasks. I've also experimented with chain-of-thought prompting for reasoning tasks. Most of my work was at the 7B to 40B parameter scale.

Q3: How do you debug a model that performs well offline but poorly in production?
A: Distribution shift is the first thing I check — comparing feature distributions between training data and production traffic using KL divergence or simple histograms. I use Evidently to monitor feature drift on a rolling basis. If features look similar, I look at edge cases — inputs the model hasn't seen or has low confidence on. Sometimes the issue is temporal: models trained on older data degrade as patterns change. I also look at which subpopulations are performing worst, because aggregate metrics can hide significant problems in specific segments.

Q4: Walk me through a data pipeline you've built at scale.
A: At Bosch I built a sensor telemetry pipeline that processed around 50 million records per day from factory equipment. We used Airflow for orchestration with hourly batch jobs, Parquet for storage on S3, and dbt for transformation logic. The main challenge was handling upstream data quality issues — sensors would occasionally send corrupted readings. I implemented a validation layer that flagged anomalies and quarantined bad records for manual review. We kept 99.6% data completeness over 18 months of operation.

Q5: How do you stay current with the rapidly evolving ML landscape?
A: I read arXiv papers most mornings — I follow the cs.LG and cs.CL sections. I rely on the Hugging Face blog and Papers with Code for curated highlights. I also follow several ML researchers on Twitter who do good paper breakdowns. Within my team we have a weekly ML reading group where someone presents a recent paper and we discuss implications for our work. I try to reproduce key results from interesting papers when time allows — it's the best way to really understand what's novel versus what's incremental.`

// ─── Interview Questions per Job ───────────────────────────────────────────────

const QUESTIONS_FSE = [
  "Walk me through a complex system you've built from scratch at scale.",
  'How do you approach API design and versioning?',
  'Describe a production incident you owned end-to-end.',
  'How do you ensure code quality in a fast-moving team?',
  'What does great frontend architecture look like to you?',
]

const QUESTIONS_DESIGNER = [
  "Walk me through a design decision you're proud of and the process behind it.",
  'How do you handle stakeholder pushback on your design choices?',
  "Describe how you've contributed to or built a design system.",
  'How do you prioritize user research vs. fast iteration?',
  'What does good design collaboration with engineers look like?',
]

const QUESTIONS_ML = [
  'How do you approach productionizing a new ML model?',
  'Describe your experience with LLMs and prompt engineering.',
  'How do you debug a model that performs well offline but poorly in production?',
  "Walk me through a data pipeline you've built at scale.",
  'How do you stay current with the rapidly evolving ML landscape?',
]

// ─── Mock Jobs ────────────────────────────────────────────────────────────────

const MOCK_JOBS: Job[] = [
  {
    id: 'mock-job-1',
    title: 'Senior Full-Stack Engineer',
    description: "Build scalable web applications across our entire product surface — from customer-facing React UIs to backend services and data pipelines. You'll own features end-to-end and help shape our engineering culture as we scale.",
    requirements: {
      required_skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
      nice_to_have_skills: ['GraphQL', 'Redis', 'Docker', 'AWS', 'Python'],
      min_years_experience: 5,
      max_years_experience: 10,
      seniority: 'senior',
      location_type: 'hybrid',
      employment_type: 'full_time',
      education: 'bachelor',
      languages: ['English'],
      responsibilities: [
        'Design and implement full-stack features end-to-end',
        'Own reliability, performance, and observability of your services',
        'Mentor junior engineers and contribute to technical culture',
        'Collaborate with product and design on feature specs',
      ],
      success_description: "Within 3 months you've shipped a major feature end-to-end and are actively improving system reliability.",
      dealbreakers: ['No production TypeScript experience', 'No experience with relational databases'],
      green_flags: ['Open source contributions', 'Experience at high-growth startups', 'System design depth'],
      scoring_weights: { technical_skills: 35, experience_years: 25, domain_background: 20, education: 10, career_trajectory: 10 },
    },
    embedding: null,
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'mock-job-2',
    title: 'Product Designer',
    description: "Shape the experience of our SaaS platform used by thousands of teams worldwide. You'll work closely with product and engineering to design intuitive, elegant interfaces that make complex workflows feel simple.",
    requirements: {
      required_skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
      nice_to_have_skills: ['Motion Design', 'HTML/CSS', 'Framer', 'Tokens Studio'],
      min_years_experience: 3,
      max_years_experience: 8,
      seniority: 'mid',
      location_type: 'remote',
      employment_type: 'full_time',
      education: 'bachelor',
      languages: ['English'],
      responsibilities: [
        'Design end-to-end user flows for new product features',
        'Conduct user research and synthesize insights into design decisions',
        'Maintain and extend our design system',
        'Work closely with engineers during implementation',
      ],
      success_description: "Within 3 months you've shipped a major design project and contributed meaningful improvements to the design system.",
      dealbreakers: ['No Figma proficiency', 'No user research experience'],
      green_flags: ['Design system ownership', 'Engineering collaboration', 'Quantitative impact metrics'],
      scoring_weights: { technical_skills: 30, experience_years: 20, domain_background: 25, education: 10, career_trajectory: 15 },
    },
    embedding: null,
    created_at: '2025-02-03T09:00:00Z',
  },
  {
    id: 'mock-job-3',
    title: 'ML Engineer',
    description: "Build and own our machine learning infrastructure — from data pipelines to model serving to evaluation frameworks. You'll work on LLM-powered features that are central to our product roadmap.",
    requirements: {
      required_skills: ['Python', 'PyTorch', 'MLOps', 'LLMs', 'Data Pipelines'],
      nice_to_have_skills: ['Kubernetes', 'Spark', 'Ray', 'vLLM', 'RLHF'],
      min_years_experience: 4,
      max_years_experience: 9,
      seniority: 'senior',
      location_type: 'hybrid',
      employment_type: 'full_time',
      education: 'master',
      languages: ['English'],
      responsibilities: [
        'Design and maintain scalable ML training and inference pipelines',
        'Fine-tune and evaluate LLMs for product use cases',
        'Build monitoring and observability for ML systems in production',
        'Collaborate with product and backend teams on AI feature development',
      ],
      success_description: "Within 3 months you've improved an existing ML pipeline and shipped one LLM-powered feature to production.",
      dealbreakers: ['No production ML deployment experience', 'No Python proficiency'],
      green_flags: ['LLM fine-tuning experience', 'Kubernetes/distributed training', 'Research publication record'],
      scoring_weights: { technical_skills: 40, experience_years: 20, domain_background: 20, education: 15, career_trajectory: 5 },
    },
    embedding: null,
    created_at: '2025-02-20T14:00:00Z',
  },
]

// ─── Mock Candidates ───────────────────────────────────────────────────────────

const _candidates: Candidate[] = [
  {
    id: 'mock-c-1', name: 'Marcus Chen', email: 'marcus.chen@gmail.com', source: 'linkedin',
    raw_text: null, credibility_score: 91, embedding: null, created_at: '2025-01-20T09:00:00Z',
    applications: [],
    parsed: {
      name: 'Marcus Chen', email: 'marcus.chen@gmail.com', phone: '+1 415 555 0182',
      linkedin_url: 'https://linkedin.com/in/marcus-chen',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL', 'Redis', 'Docker', 'AWS', 'Kafka', 'Python'],
      languages: ['English', 'Mandarin'],
      education: [{ degree: 'B.S. Computer Science', institution: 'UC Berkeley', year: '2016' }],
      experience: [
        { company: 'Stripe', role: 'Senior Software Engineer', start_date: '2021-03', end_date: null, duration_months: 27, description: 'Led rebuild of payment reconciliation pipeline (2M tx/day). Event-sourcing with Kafka, React dashboard, Node.js services. 97% error reduction.' },
        { company: 'Airbnb', role: 'Software Engineer', start_date: '2018-04', end_date: '2021-02', duration_months: 34, description: 'Core booking flow team. Built API versioning compatibility layer, reduced booking errors by 23%.' },
        { company: 'Uber', role: 'Junior Software Engineer', start_date: '2016-07', end_date: '2018-03', duration_months: 20, description: 'Driver earnings dashboard and real-time payout tracking features.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-2', name: "Sarah O'Brien", email: 'sarah.obrien@gmail.com', source: 'upload',
    raw_text: null, credibility_score: 82, embedding: null, created_at: '2025-01-25T10:00:00Z',
    applications: [],
    parsed: {
      name: "Sarah O'Brien", email: 'sarah.obrien@gmail.com', phone: '+1 647 555 0234',
      linkedin_url: 'https://linkedin.com/in/sarah-obrien-dev',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs', 'Redis', 'Jest', 'GraphQL'],
      languages: ['English'],
      education: [{ degree: 'B.Sc. Software Engineering', institution: 'University of Waterloo', year: '2018' }],
      experience: [
        { company: 'Shopify', role: 'Software Engineer', start_date: '2020-06', end_date: null, duration_months: 30, description: 'Checkout A/B testing framework serving all Shopify Plus merchants. React, Node.js, PostgreSQL analytics pipeline.' },
        { company: 'HubSpot', role: 'Junior Software Engineer', start_date: '2018-08', end_date: '2020-05', duration_months: 21, description: 'CRM pipeline automation features. Built email sequence builder with React.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-3', name: 'James Whitfield', email: 'james.whitfield@outlook.com', source: 'upload',
    raw_text: null, credibility_score: 75, embedding: null, created_at: '2025-02-01T11:00:00Z',
    applications: [],
    parsed: {
      name: 'James Whitfield', email: 'james.whitfield@outlook.com', phone: '+44 7700 900182',
      linkedin_url: null,
      skills: ['React', 'JavaScript', 'Node.js', 'MongoDB', 'REST APIs', 'Express.js'],
      languages: ['English'],
      education: [{ degree: 'B.Sc. Computer Science', institution: 'University of Manchester', year: '2019' }],
      experience: [
        { company: 'Accenture', role: 'Software Engineer', start_date: '2019-09', end_date: '2023-05', duration_months: 44, description: 'Enterprise web applications for financial services clients. React, Node.js, MongoDB.' },
        { company: 'Freelance', role: 'Full-Stack Developer', start_date: '2023-10', end_date: null, duration_months: 15, description: 'Independent client projects — e-commerce, dashboards, APIs.' },
      ],
      gaps: [{ start_date: '2023-06', end_date: '2023-09', duration_months: 4 }],
      red_flags: ['4-month unexplained gap between Accenture and freelance work'],
    },
  },
  {
    id: 'mock-c-4', name: 'Priya Nair', email: 'priya.nair@gmail.com', source: 'linkedin',
    raw_text: null, credibility_score: 68, embedding: null, created_at: '2025-02-05T14:00:00Z',
    applications: [],
    parsed: {
      name: 'Priya Nair', email: 'priya.nair@gmail.com', phone: '+91 98765 43210',
      linkedin_url: 'https://linkedin.com/in/priya-nair-dev',
      skills: ['React', 'JavaScript', 'Python', 'Django', 'PostgreSQL', 'REST APIs'],
      languages: ['English', 'Hindi', 'Malayalam'],
      education: [{ degree: 'B.Tech Computer Science', institution: 'IIT Bombay', year: '2018' }],
      experience: [
        { company: 'Infosys', role: 'Software Engineer', start_date: '2020-01', end_date: '2023-12', duration_months: 47, description: 'Internal tooling for banking clients. React frontends, Django backends, PostgreSQL.' },
        { company: 'TCS', role: 'Junior Developer', start_date: '2018-07', end_date: '2019-12', duration_months: 17, description: 'Backend API development for telecom clients.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-5', name: 'Elena Vasquez', email: 'elena.vasquez@me.com', source: 'referral',
    raw_text: null, credibility_score: 88, embedding: null, created_at: '2025-02-10T09:00:00Z',
    applications: [],
    parsed: {
      name: 'Elena Vasquez', email: 'elena.vasquez@me.com', phone: '+1 212 555 0197',
      linkedin_url: 'https://linkedin.com/in/elena-vasquez-design',
      skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Motion Design', 'Framer', 'HTML/CSS', 'Tokens Studio'],
      languages: ['English', 'Spanish'],
      education: [{ degree: 'BFA Graphic Design', institution: 'Rhode Island School of Design', year: '2017' }],
      experience: [
        { company: 'Figma', role: 'Senior Product Designer', start_date: '2021-02', end_date: null, duration_months: 26, description: 'Owned component properties panel redesign and variable token system (4,000+ components). Increased property discoverability by 68%.' },
        { company: 'Figma', role: 'Product Designer', start_date: '2019-03', end_date: '2021-01', duration_months: 22, description: 'Core editor experience, community features, plugin ecosystem UI.' },
        { company: 'Adobe', role: 'UX Designer', start_date: '2017-07', end_date: '2019-02', duration_months: 19, description: 'XD and Photoshop feature design. Conducted usability studies and shipped multiple production features.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-6', name: 'Tom Nakamura', email: 'tom.nakamura@gmail.com', source: 'linkedin',
    raw_text: null, credibility_score: 74, embedding: null, created_at: '2025-02-12T10:00:00Z',
    applications: [],
    parsed: {
      name: 'Tom Nakamura', email: 'tom.nakamura@gmail.com', phone: '+61 2 5550 1234',
      linkedin_url: 'https://linkedin.com/in/tom-nakamura-ux',
      skills: ['Figma', 'User Research', 'Prototyping', 'Sketch', 'InVision', 'Accessibility', 'Design Systems'],
      languages: ['English', 'Japanese'],
      education: [{ degree: 'B.Des Interaction Design', institution: 'RMIT University', year: '2018' }],
      experience: [
        { company: 'Atlassian', role: 'Product Designer', start_date: '2020-03', end_date: null, duration_months: 30, description: 'Jira and Confluence design. Led accessibility audit and redesign of core issue view. WCAG 2.1 AA compliance achieved across all core flows.' },
        { company: 'Zendesk', role: 'UX Designer', start_date: '2018-06', end_date: '2020-02', duration_months: 20, description: 'Help center and ticketing interface design. Ran 40+ usability sessions.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-7', name: 'Aisha Johnson', email: 'aisha.johnson@gmail.com', source: 'upload',
    raw_text: null, credibility_score: 60, embedding: null, created_at: '2025-02-15T13:00:00Z',
    applications: [],
    parsed: {
      name: 'Aisha Johnson', email: 'aisha.johnson@gmail.com', phone: '+1 202 555 0143',
      linkedin_url: 'https://linkedin.com/in/aisha-johnson-design',
      skills: ['Figma', 'Sketch', 'User Research', 'Adobe XD', 'Prototyping'],
      languages: ['English'],
      education: [{ degree: 'B.A. Visual Communication', institution: 'Howard University', year: '2021' }],
      experience: [
        { company: 'Ogilvy', role: 'UX Designer', start_date: '2021-08', end_date: '2022-01', duration_months: 5, description: 'Client website and app design projects. Agency environment with fast turnaround.' },
        { company: 'Freelance', role: 'Product Designer', start_date: '2022-09', end_date: null, duration_months: 16, description: 'Independent design work for startups and small businesses.' },
      ],
      gaps: [{ start_date: '2022-02', end_date: '2022-08', duration_months: 6 }],
      red_flags: ['6-month gap between agency role and freelance work — reason unclear'],
    },
  },
  {
    id: 'mock-c-8', name: 'David Park', email: 'david.park@cornell.edu', source: 'linkedin',
    raw_text: null, credibility_score: 85, embedding: null, created_at: '2025-02-18T09:00:00Z',
    applications: [],
    parsed: {
      name: 'David Park', email: 'david.park@cornell.edu', phone: '+1 607 555 0199',
      linkedin_url: 'https://linkedin.com/in/david-park-ml',
      skills: ['Python', 'PyTorch', 'TensorFlow', 'MLOps', 'Kubernetes', 'LLMs', 'Data Pipelines', 'Spark', 'Ray', 'RLHF'],
      languages: ['English', 'Korean'],
      education: [{ degree: 'Ph.D. Computer Science (Machine Learning)', institution: 'Cornell University', year: '2019' }],
      experience: [
        { company: 'Google DeepMind', role: 'Research Engineer', start_date: '2022-01', end_date: null, duration_months: 26, description: 'LLM pretraining infrastructure and RLHF pipelines. Co-authored 2 papers on alignment techniques.' },
        { company: 'Meta AI', role: 'ML Engineer', start_date: '2019-06', end_date: '2021-12', duration_months: 30, description: 'Recommendation system ML pipelines at billion-user scale. PyTorch, Spark, Kubernetes.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-9', name: 'Lena Fischer', email: 'lena.fischer@aleph-alpha.de', source: 'linkedin',
    raw_text: null, credibility_score: 79, embedding: null, created_at: '2025-02-20T11:00:00Z',
    applications: [],
    parsed: {
      name: 'Lena Fischer', email: 'lena.fischer@aleph-alpha.de', phone: '+49 711 555 0267',
      linkedin_url: 'https://linkedin.com/in/lena-fischer-ml',
      skills: ['Python', 'PyTorch', 'MLOps', 'LLMs', 'FastAPI', 'Docker', 'Airflow', 'LoRA', 'Instruction Tuning'],
      languages: ['English', 'German'],
      education: [{ degree: 'M.Sc. Data Science', institution: 'TU Munich', year: '2019' }],
      experience: [
        { company: 'Aleph Alpha', role: 'ML Engineer', start_date: '2021-03', end_date: null, duration_months: 27, description: 'LLM fine-tuning (LoRA, instruction tuning) on Luminous model family. FastAPI serving, Prometheus monitoring, evaluation pipelines.' },
        { company: 'Bosch AI', role: 'Data Scientist', start_date: '2019-09', end_date: '2021-02', duration_months: 17, description: 'Sensor telemetry pipeline (50M records/day). Airflow, Parquet on S3, dbt transformations. 99.6% data completeness.' },
      ],
      gaps: [], red_flags: [],
    },
  },
  {
    id: 'mock-c-10', name: 'Raj Patel', email: 'raj.patel@hotmail.com', source: 'upload',
    raw_text: null, credibility_score: 52, embedding: null, created_at: '2025-02-22T15:00:00Z',
    applications: [],
    parsed: {
      name: 'Raj Patel', email: 'raj.patel@hotmail.com', phone: '+91 99887 65432',
      linkedin_url: null,
      skills: ['Python', 'TensorFlow', 'Scikit-learn', 'SQL', 'Jupyter', 'Pandas', 'NumPy'],
      languages: ['English', 'Gujarati', 'Hindi'],
      education: [{ degree: 'B.Tech Information Technology', institution: 'Gujarat Technological University', year: '2019' }],
      experience: [
        { company: 'Wipro', role: 'Data Analyst', start_date: '2021-01', end_date: '2024-02', duration_months: 37, description: 'Analytics dashboards and reporting for retail clients. Python, SQL, Tableau.' },
        { company: 'Infosys', role: 'Junior Data Scientist', start_date: '2019-07', end_date: '2020-12', duration_months: 17, description: 'Fraud detection model using Scikit-learn. 78% precision on test set.' },
      ],
      gaps: [{ start_date: '2024-03', end_date: '2024-08', duration_months: 5 }],
      red_flags: ['No MLOps or production model deployment experience', 'No LLM experience — significant gap for this role', '5-month recent gap with no explanation'],
    },
  },
]

const _candidateMap = new Map(_candidates.map((c) => [c.id, c]))

// ─── Mock Applications ─────────────────────────────────────────────────────────

const _applications: Application[] = [
  // Senior Full-Stack Engineer
  { id: 'mock-a-1', candidate_id: 'mock-c-1', job_id: 'mock-job-1', match_score: 94, credibility_score: 91, interview_score: 90, overall_score: 91, status: 'final_round', interview_date: '2025-03-01T14:00:00Z', interview_room_url: 'http://localhost:5173/join/mock-a-1', video_url: null, transcript: TRANSCRIPT_MARCUS, analysis: ANALYSIS_MARCUS, attention_events: [{ type: 'tab_switch', timestamp: 187 }], custom_answers: null, created_at: '2025-01-22T10:00:00Z', candidates: _candidateMap.get('mock-c-1') },
  { id: 'mock-a-2', candidate_id: 'mock-c-2', job_id: 'mock-job-1', match_score: 87, credibility_score: 82, interview_score: 76, overall_score: 80, status: 'interview_done', interview_date: '2025-03-05T11:00:00Z', interview_room_url: 'http://localhost:5173/join/mock-a-2', video_url: null, transcript: TRANSCRIPT_SARAH, analysis: ANALYSIS_SARAH, attention_events: [{ type: 'gaze_away', timestamp: 95 }, { type: 'tab_switch', timestamp: 280 }], custom_answers: null, created_at: '2025-01-26T09:00:00Z', candidates: _candidateMap.get('mock-c-2') },
  { id: 'mock-a-3', candidate_id: 'mock-c-3', job_id: 'mock-job-1', match_score: 71, credibility_score: 75, interview_score: 0, overall_score: 71, status: 'shortlisted', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-02T11:00:00Z', candidates: _candidateMap.get('mock-c-3') },
  { id: 'mock-a-4', candidate_id: 'mock-c-4', job_id: 'mock-job-1', match_score: 62, credibility_score: 68, interview_score: 0, overall_score: 62, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-06T14:00:00Z', candidates: _candidateMap.get('mock-c-4') },
  // Product Designer
  { id: 'mock-a-5', candidate_id: 'mock-c-5', job_id: 'mock-job-2', match_score: 91, credibility_score: 88, interview_score: 87, overall_score: 89, status: 'final_round', interview_date: '2025-03-08T10:00:00Z', interview_room_url: 'http://localhost:5173/join/mock-a-5', video_url: null, transcript: TRANSCRIPT_ELENA, analysis: ANALYSIS_ELENA, attention_events: [{ type: 'gaze_away', timestamp: 412 }], custom_answers: null, created_at: '2025-02-11T09:00:00Z', candidates: _candidateMap.get('mock-c-5') },
  { id: 'mock-a-6', candidate_id: 'mock-c-6', job_id: 'mock-job-2', match_score: 79, credibility_score: 74, interview_score: 71, overall_score: 74, status: 'interview_done', interview_date: '2025-03-10T14:00:00Z', interview_room_url: 'http://localhost:5173/join/mock-a-6', video_url: null, transcript: null, analysis: { answer_quality_score: 71, communication_score: 74, attention_score: 80, interview_score: 71, summary: "Tom demonstrated solid UX fundamentals and a thoughtful approach to accessibility. Communication was clear though occasionally meandering. Good candidate for a mid-level role, may need mentoring to reach senior expectations.", strengths: ['Strong accessibility expertise', 'Good user research process', 'Solid Figma and design system knowledge'], concerns: ['Limited design system ownership at scale', 'Answers lacked quantitative impact metrics', 'May need senior mentorship to grow quickly'], per_question: [{ question: "Walk me through a design decision you're proud of and the process behind it.", score: 74, notes: 'Described Jira accessibility redesign. Good process but outcome metrics were vague.' }, { question: 'How do you handle stakeholder pushback on your design choices?', score: 70, notes: 'Reasonable approach but relied more on persuasion than data.' }, { question: "Describe how you've contributed to or built a design system.", score: 68, notes: "Contributed to Atlassian Design System but didn't own core components." }, { question: 'How do you prioritize user research vs. fast iteration?', score: 72, notes: 'Good instincts. Cadence described was reasonable.' }, { question: 'What does good design collaboration with engineers look like?', score: 75, notes: 'Practical answer — shared Figma, spec reviews, async feedback. Solid but not distinctive.' }] }, attention_events: [{ type: 'tab_switch', timestamp: 145 }, { type: 'phone_detected', timestamp: 387 }], custom_answers: null, created_at: '2025-02-13T10:00:00Z', candidates: _candidateMap.get('mock-c-6') },
  { id: 'mock-a-7', candidate_id: 'mock-c-7', job_id: 'mock-job-2', match_score: 65, credibility_score: 60, interview_score: 0, overall_score: 65, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-16T13:00:00Z', candidates: _candidateMap.get('mock-c-7') },
  // ML Engineer
  { id: 'mock-a-8', candidate_id: 'mock-c-8', job_id: 'mock-job-3', match_score: 88, credibility_score: 85, interview_score: 0, overall_score: 88, status: 'shortlisted', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-19T09:00:00Z', candidates: _candidateMap.get('mock-c-8') },
  { id: 'mock-a-9', candidate_id: 'mock-c-9', job_id: 'mock-job-3', match_score: 76, credibility_score: 79, interview_score: 72, overall_score: 75, status: 'interview_done', interview_date: '2025-03-12T13:00:00Z', interview_room_url: 'http://localhost:5173/join/mock-a-9', video_url: null, transcript: TRANSCRIPT_LENA, analysis: ANALYSIS_LENA, attention_events: [{ type: 'gaze_away', timestamp: 238 }, { type: 'tab_switch', timestamp: 501 }], custom_answers: null, created_at: '2025-02-21T11:00:00Z', candidates: _candidateMap.get('mock-c-9') },
  { id: 'mock-a-10', candidate_id: 'mock-c-10', job_id: 'mock-job-3', match_score: 59, credibility_score: 52, interview_score: 0, overall_score: 59, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-23T15:00:00Z', candidates: _candidateMap.get('mock-c-10') },

  // ── Cross-job applications — all 10 candidates visible in every position ──────
  // Marcus Chen across Designer & ML
  { id: 'mock-a-11', candidate_id: 'mock-c-1', job_id: 'mock-job-2', match_score: 31, credibility_score: 91, interview_score: 0, overall_score: 31, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-01-22T10:00:00Z', candidates: _candidateMap.get('mock-c-1') },
  { id: 'mock-a-12', candidate_id: 'mock-c-1', job_id: 'mock-job-3', match_score: 58, credibility_score: 91, interview_score: 0, overall_score: 58, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-01-22T10:00:00Z', candidates: _candidateMap.get('mock-c-1') },
  // Sarah O'Brien across Designer & ML
  { id: 'mock-a-13', candidate_id: 'mock-c-2', job_id: 'mock-job-2', match_score: 28, credibility_score: 82, interview_score: 0, overall_score: 28, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-01-26T09:00:00Z', candidates: _candidateMap.get('mock-c-2') },
  { id: 'mock-a-14', candidate_id: 'mock-c-2', job_id: 'mock-job-3', match_score: 44, credibility_score: 82, interview_score: 0, overall_score: 44, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-01-26T09:00:00Z', candidates: _candidateMap.get('mock-c-2') },
  // James Whitfield across Designer & ML
  { id: 'mock-a-15', candidate_id: 'mock-c-3', job_id: 'mock-job-2', match_score: 22, credibility_score: 75, interview_score: 0, overall_score: 22, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-02T11:00:00Z', candidates: _candidateMap.get('mock-c-3') },
  { id: 'mock-a-16', candidate_id: 'mock-c-3', job_id: 'mock-job-3', match_score: 38, credibility_score: 75, interview_score: 0, overall_score: 38, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-02T11:00:00Z', candidates: _candidateMap.get('mock-c-3') },
  // Priya Nair across Designer & ML
  { id: 'mock-a-17', candidate_id: 'mock-c-4', job_id: 'mock-job-2', match_score: 19, credibility_score: 68, interview_score: 0, overall_score: 19, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-06T14:00:00Z', candidates: _candidateMap.get('mock-c-4') },
  { id: 'mock-a-18', candidate_id: 'mock-c-4', job_id: 'mock-job-3', match_score: 52, credibility_score: 68, interview_score: 0, overall_score: 52, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-06T14:00:00Z', candidates: _candidateMap.get('mock-c-4') },
  // Elena Vasquez across FSE & ML
  { id: 'mock-a-19', candidate_id: 'mock-c-5', job_id: 'mock-job-1', match_score: 24, credibility_score: 88, interview_score: 0, overall_score: 24, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-11T09:00:00Z', candidates: _candidateMap.get('mock-c-5') },
  { id: 'mock-a-20', candidate_id: 'mock-c-5', job_id: 'mock-job-3', match_score: 15, credibility_score: 88, interview_score: 0, overall_score: 15, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-11T09:00:00Z', candidates: _candidateMap.get('mock-c-5') },
  // Tom Nakamura across FSE & ML
  { id: 'mock-a-21', candidate_id: 'mock-c-6', job_id: 'mock-job-1', match_score: 21, credibility_score: 74, interview_score: 0, overall_score: 21, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-13T10:00:00Z', candidates: _candidateMap.get('mock-c-6') },
  { id: 'mock-a-22', candidate_id: 'mock-c-6', job_id: 'mock-job-3', match_score: 12, credibility_score: 74, interview_score: 0, overall_score: 12, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-13T10:00:00Z', candidates: _candidateMap.get('mock-c-6') },
  // Aisha Johnson across FSE & ML
  { id: 'mock-a-23', candidate_id: 'mock-c-7', job_id: 'mock-job-1', match_score: 18, credibility_score: 60, interview_score: 0, overall_score: 18, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-16T13:00:00Z', candidates: _candidateMap.get('mock-c-7') },
  { id: 'mock-a-24', candidate_id: 'mock-c-7', job_id: 'mock-job-3', match_score: 10, credibility_score: 60, interview_score: 0, overall_score: 10, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-16T13:00:00Z', candidates: _candidateMap.get('mock-c-7') },
  // David Park across FSE & Designer
  { id: 'mock-a-25', candidate_id: 'mock-c-8', job_id: 'mock-job-1', match_score: 52, credibility_score: 85, interview_score: 0, overall_score: 52, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-19T09:00:00Z', candidates: _candidateMap.get('mock-c-8') },
  { id: 'mock-a-26', candidate_id: 'mock-c-8', job_id: 'mock-job-2', match_score: 8, credibility_score: 85, interview_score: 0, overall_score: 8, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-19T09:00:00Z', candidates: _candidateMap.get('mock-c-8') },
  // Lena Fischer across FSE & Designer
  { id: 'mock-a-27', candidate_id: 'mock-c-9', job_id: 'mock-job-1', match_score: 41, credibility_score: 79, interview_score: 0, overall_score: 41, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-21T11:00:00Z', candidates: _candidateMap.get('mock-c-9') },
  { id: 'mock-a-28', candidate_id: 'mock-c-9', job_id: 'mock-job-2', match_score: 12, credibility_score: 79, interview_score: 0, overall_score: 12, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-21T11:00:00Z', candidates: _candidateMap.get('mock-c-9') },
  // Raj Patel across FSE & Designer
  { id: 'mock-a-29', candidate_id: 'mock-c-10', job_id: 'mock-job-1', match_score: 33, credibility_score: 52, interview_score: 0, overall_score: 33, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-23T15:00:00Z', candidates: _candidateMap.get('mock-c-10') },
  { id: 'mock-a-30', candidate_id: 'mock-c-10', job_id: 'mock-job-2', match_score: 11, credibility_score: 52, interview_score: 0, overall_score: 11, status: 'inbox', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, custom_answers: null, created_at: '2025-02-23T15:00:00Z', candidates: _candidateMap.get('mock-c-10') },
]

// Backlink applications onto candidates
for (const app of _applications) {
  const c = _candidateMap.get(app.candidate_id)
  if (c) c.applications!.push(app)
}

const MOCK_CANDIDATES = _candidates
const _appMap = new Map(_applications.map((a) => [a.id, a]))

// Merge base application with any in-session overrides
function getApp(id: string): Application | undefined {
  const base = _appMap.get(id)
  if (!base) return undefined
  const overrides = _appOverrides.get(id)
  return overrides ? { ...base, ...overrides, candidates: base.candidates } : base
}

// Return candidate with up-to-date application statuses
function getCandidateWithApps(id: string): Candidate | undefined {
  const c = _candidateMap.get(id)
  if (!c) return undefined
  return { ...c, applications: (c.applications || []).map((a) => getApp(a.id) ?? a) }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  candidates: {
    upload: async (file: File) => {
      await delay(1500)
      return {
        id: `mock-c-new-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        email: null, source: 'upload', raw_text: null, parsed: null,
        credibility_score: 74, embedding: null, created_at: new Date().toISOString(), applications: [],
      } as Candidate
    },
    create: (name: string, email: string) => Promise.resolve<Candidate>({
      id: `mock-c-new-${Date.now()}`, name, email, source: 'manual', raw_text: null,
      parsed: null, credibility_score: 0, embedding: null, created_at: new Date().toISOString(), applications: [],
    }),
    uploadCV: async (_candidateId: string, _file: File) => { await delay(800); return { status: 'parsed' } },
    list: () => Promise.resolve(MOCK_CANDIDATES),
    get: (id: string) => Promise.resolve(getCandidateWithApps(id) ?? MOCK_CANDIDATES[0]),
    search: (query: string) => {
      const q = query.toLowerCase()
      return Promise.resolve(
        MOCK_CANDIDATES
          .filter((c) => c.name.toLowerCase().includes(q) || (c.parsed?.skills ?? []).some((s) => s.toLowerCase().includes(q)))
          .map((c) => ({ ...c, search_score: Math.floor(70 + Math.random() * 25) }))
      )
    },
  },

  jobs: {
    list: () => Promise.resolve(MOCK_JOBS),
    get: (id: string) => Promise.resolve(MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0]),
    create: async (title: string, description: string, requirements?: JobRequirements) => {
      await delay(600)
      const j: Job = { id: `mock-job-${Date.now()}`, title, description, requirements: requirements ?? null, embedding: null, created_at: new Date().toISOString() }
      MOCK_JOBS.push(j)
      return j
    },
    delete: async (_id: string) => { await delay(300); return {} },
    update: async (id: string, data: { title?: string; description?: string; requirements?: JobRequirements }) => {
      await delay(400)
      const j = MOCK_JOBS.find((j) => j.id === id)
      if (j) Object.assign(j, data)
      return j ?? MOCK_JOBS[0]
    },
    rescore: async () => { await delay(300); return {} },
    getApplications: (jobId: string) =>
      Promise.resolve(
        _applications.filter((a) => a.job_id === jobId).map((a) => getApp(a.id) ?? a)
      ),
    progress: (jobId: string) => {
      if (!_demoStartTimes.has(jobId)) _demoStartTimes.set(jobId, Date.now())
      const elapsed = Date.now() - _demoStartTimes.get(jobId)!
      const all = _applications.filter((a) => a.job_id === jobId)
      const total = all.length
      const scored = Math.min(total, Math.floor(elapsed / 300))
      return Promise.resolve({ total, scored, applications: all.slice(0, scored).map((a) => getApp(a.id) ?? a) })
    },
  },

  applications: {
    create: async (candidate_id: string, job_id: string, _custom_answers?: Record<string, string>) => {
      await delay(400)
      return _applications.find((a) => a.candidate_id === candidate_id && a.job_id === job_id) ?? _applications[0]
    },
    updateStatus: (id: string, status: string) => {
      _appOverrides.set(id, { ..._appOverrides.get(id), status })
      return Promise.resolve(getApp(id) ?? _applications[0])
    },
    get: (id: string) => Promise.resolve(getApp(id) ?? _applications[0]),
  },

  interviews: {
    invite: (applicationId: string) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
      const roomUrl = `${origin}/join/${applicationId}`
      _appOverrides.set(applicationId, { ..._appOverrides.get(applicationId), status: 'interview_scheduled', interview_room_url: roomUrl })
      return Promise.resolve({ room_url: roomUrl })
    },
    analyze: (_applicationId: string, _transcript: string, _attentionEvents: AttentionEvent[]) =>
      Promise.resolve(ANALYSIS_MARCUS),
    generateQuestions: (applicationId: string) => {
      const app = getApp(applicationId) ?? _applications[0]
      const questions = app.job_id === 'mock-job-2' ? QUESTIONS_DESIGNER : app.job_id === 'mock-job-3' ? QUESTIONS_ML : QUESTIONS_FSE
      return Promise.resolve({ questions })
    },
    getSession: (applicationId: string) => {
      const app = getApp(applicationId) ?? _applications[0]
      const questions = app.job_id === 'mock-job-2' ? QUESTIONS_DESIGNER : app.job_id === 'mock-job-3' ? QUESTIONS_ML : QUESTIONS_FSE
      return Promise.resolve({ questions, current_index: 0 })
    },
    setCurrentQuestion: (_applicationId: string, index: number) =>
      Promise.resolve({ current_index: index }),
    uploadRecording: async (applicationId: string, _videoBlob: Blob, _audioBlob?: Blob | null) => {
      await delay(1800)
      const app = getApp(applicationId) ?? _applications[0]
      const analysis = app.job_id === 'mock-job-2' ? ANALYSIS_ELENA : app.job_id === 'mock-job-3' ? ANALYSIS_LENA : ANALYSIS_SARAH
      const transcript = app.job_id === 'mock-job-2' ? TRANSCRIPT_ELENA : app.job_id === 'mock-job-3' ? TRANSCRIPT_LENA : TRANSCRIPT_SARAH
      const interviewScore = analysis.interview_score
      const overallScore = Math.round(app.match_score * 0.4 + app.credibility_score * 0.2 + interviewScore * 0.4)
      _appOverrides.set(applicationId, {
        ..._appOverrides.get(applicationId),
        status: 'interview_done',
        interview_score: interviewScore,
        overall_score: overallScore,
        analysis,
        transcript,
        attention_events: [{ type: 'gaze_away', timestamp: 142 }],
      })
      return { status: 'processing', interview_score: interviewScore }
    },
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Candidate {
  id: string
  name: string
  email: string | null
  source: string
  raw_text: string | null
  parsed: ParsedCV | null
  credibility_score: number
  embedding: number[] | null
  created_at: string
  applications?: Application[]
}

export interface ParsedCV {
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  skills: string[]
  languages: string[]
  education: { degree: string; institution: string; year: string | null }[]
  experience: {
    company: string
    role: string
    start_date: string | null
    end_date: string | null
    duration_months: number | null
    description: string
  }[]
  gaps: { start_date: string; end_date: string; duration_months: number }[]
  red_flags: string[]
}

export interface ApplicationQuestion {
  id: string
  type: 'text' | 'choice'
  question: string
  options?: string[]
  required: boolean
}

export interface JobRequirements {
  required_skills: string[]
  nice_to_have_skills: string[]
  min_years_experience: number
  max_years_experience: number
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'director' | ''
  location_type: 'remote' | 'hybrid' | 'onsite' | ''
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | ''
  education: 'none' | 'bachelor' | 'master' | 'phd' | ''
  languages: string[]
  responsibilities: string[]
  success_description: string
  dealbreakers: string[]
  green_flags: string[]
  scoring_weights: {
    technical_skills: number
    experience_years: number
    domain_background: number
    education: number
    career_trajectory: number
  }
  application_questions?: ApplicationQuestion[]
}

export interface Job {
  id: string
  title: string
  description: string
  requirements: JobRequirements | null
  embedding: number[] | null
  created_at: string
}

export interface Application {
  id: string
  candidate_id: string
  job_id: string
  match_score: number
  credibility_score: number
  interview_score: number
  overall_score: number
  status: string
  interview_date: string | null
  interview_room_url: string | null
  video_url: string | null
  transcript: string | null
  analysis: InterviewAnalysis | null
  attention_events: AttentionEvent[] | null
  custom_answers: Record<string, string> | null
  created_at: string
  candidates?: Candidate
  jobs?: Job
}

export interface InterviewAnalysis {
  answer_quality_score: number
  communication_score: number
  attention_score: number
  interview_score: number
  summary: string
  strengths: string[]
  concerns: string[]
  per_question: { question: string; score: number; notes: string }[]
}

export interface AttentionEvent {
  type: 'phone_detected' | 'tab_switch' | 'window_blur' | 'gaze_away'
  timestamp: number
}
