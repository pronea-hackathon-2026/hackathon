package com.talentlens.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.Candidate;
import com.talentlens.model.Job;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class SeedService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);

    // Change to a new version string to force a reseed on next startup
    private static final String SEED_VERSION = "v2-rich";

    @Value("${talentlens.seed.enabled:true}")
    private boolean seedEnabled;

    private final CandidateRepository candidateRepo;
    private final JobRepository jobRepo;
    private final JobApplicationRepository appRepo;
    private final GeminiService gemini;
    private final ScoringService scoring;
    private final ObjectMapper mapper = new ObjectMapper();

    // Single LinkedIn URL used for all demo candidates
    private static final String LINKEDIN_URL = "https://www.linkedin.com/in/demo-profile";

    public SeedService(CandidateRepository candidateRepo, JobRepository jobRepo,
                       JobApplicationRepository appRepo, GeminiService gemini, ScoringService scoring) {
        this.candidateRepo = candidateRepo;
        this.jobRepo = jobRepo;
        this.appRepo = appRepo;
        this.gemini = gemini;
        this.scoring = scoring;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled) return;

        // Check if already seeded with this version
        boolean alreadySeeded = jobRepo.findAll().stream()
            .anyMatch(j -> SEED_VERSION.equals(j.getDescription()) || j.getTitle().contains("Senior Full-Stack"));

        // Only seed if no candidates exist yet
        if (candidateRepo.count() > 0) return;

        log.info("Seeding demo data ({})...", SEED_VERSION);
        try {
            seedAll();
            log.info("Seed complete — {} candidates created", candidateRepo.count());
        } catch (Exception e) {
            log.warn("Seeding failed: {}", e.getMessage());
        }
    }

    private void seedAll() throws Exception {
        // ── Job ───────────────────────────────────────────────────────────────
        String jobTitle = "Senior Full-Stack Engineer";
        String jobDesc = "We are looking for a Senior Full-Stack Engineer to join our product team. " +
            "You will architect and build scalable web applications using React, TypeScript, and Python/FastAPI backends. " +
            "5+ years experience, strong TypeScript and Python skills, cloud infrastructure (AWS or GCP), " +
            "and ability to mentor junior engineers. Bonus: ML/AI integrations.";

        Job job = new Job();
        job.setTitle(jobTitle);
        job.setDescription(jobDesc);
        jobRepo.save(job);

        // ── Candidates ────────────────────────────────────────────────────────
        record Demo(String name, String email, String phone, String source, int cred, int match,
                    String rawText, Map<String, Object> parsed) {}

        List<Demo> demos = List.of(

            // 1. Alice Chen — strong senior candidate, LinkedIn
            new Demo(
                "Alice Chen",
                "alice.chen@gmail.com",
                "+1 (415) 823-4561",
                "linkedin", 88, 85,
                "Alice Chen | Tech Lead | alice.chen@gmail.com | +1 (415) 823-4561\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: React, TypeScript, Python, FastAPI, PostgreSQL, AWS, Docker, GraphQL, Redis, Kubernetes, CI/CD, Terraform\n" +
                "Experience:\n" +
                "2021-Present: Tech Lead at PayFast (36 months) — Led a team of 8 engineers, shipped card-tokenisation platform processing $2B/yr\n" +
                "2019-2021: Senior Engineer at DataFlow Inc (24 months) — Owned real-time analytics pipeline (Kafka + ClickHouse)\n" +
                "2017-2019: Software Engineer at WebCraft Studio (24 months) — Built React component library used across 12 products\n" +
                "Education: B.Sc Computer Science, MIT, 2013-2017\n" +
                "Languages: English (native), Mandarin (fluent)",
                Map.of(
                    "name", "Alice Chen",
                    "email", "alice.chen@gmail.com",
                    "phone", "+1 (415) 823-4561",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "AWS", "Docker", "GraphQL", "Redis", "Kubernetes", "Terraform", "CI/CD"),
                    "languages", List.of("English", "Mandarin"),
                    "education", List.of(
                        Map.of("degree", "B.Sc Computer Science", "institution", "MIT", "year", "2017")
                    ),
                    "experience", List.of(
                        Map.of("company", "PayFast", "role", "Tech Lead", "start_date", "2021-03", "end_date", "Present", "duration_months", 36,
                            "description", "Led team of 8 engineers. Shipped card-tokenisation platform processing $2B/yr. Reduced p99 latency from 420ms to 38ms."),
                        Map.of("company", "DataFlow Inc", "role", "Senior Software Engineer", "start_date", "2019-02", "end_date", "2021-02", "duration_months", 24,
                            "description", "Owned real-time analytics pipeline ingesting 40M events/day using Kafka and ClickHouse."),
                        Map.of("company", "WebCraft Studio", "role", "Software Engineer", "start_date", "2017-06", "end_date", "2019-01", "duration_months", 19,
                            "description", "Built and maintained React component library adopted across 12 internal products.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            ),

            // 2. Marcus Okonkwo — solid backend, StartupJobs
            new Demo(
                "Marcus Okonkwo",
                "marcus.okonkwo@protonmail.com",
                "+44 7700 900 123",
                "startupjobs", 72, 68,
                "Marcus Okonkwo | Backend Engineer | marcus.okonkwo@protonmail.com | +44 7700 900 123\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: Node.js, Python, Django, Vue.js, MySQL, PostgreSQL, GCP, Terraform, Redis, RabbitMQ\n" +
                "Experience:\n" +
                "2020-Present: Backend Engineer at CloudMesh (48 months) — Core infra team, built multi-tenant SaaS billing engine\n" +
                "2018-2020: Full-Stack Developer at AppFactory (24 months) — Vue.js + Django apps for 5 client products\n" +
                "Education: B.Eng Software Engineering, University of Lagos, 2014-2018\n" +
                "Languages: English (fluent), Yoruba (native)",
                Map.of(
                    "name", "Marcus Okonkwo",
                    "email", "marcus.okonkwo@protonmail.com",
                    "phone", "+44 7700 900 123",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("Node.js", "Python", "Django", "Vue.js", "MySQL", "PostgreSQL", "GCP", "Terraform", "Redis", "RabbitMQ"),
                    "languages", List.of("English", "Yoruba"),
                    "education", List.of(
                        Map.of("degree", "B.Eng Software Engineering", "institution", "University of Lagos", "year", "2018")
                    ),
                    "experience", List.of(
                        Map.of("company", "CloudMesh", "role", "Backend Engineer", "start_date", "2020-01", "end_date", "Present", "duration_months", 48,
                            "description", "Core infra team. Designed multi-tenant SaaS billing engine handling 200k subscriptions. Migrated MySQL → PostgreSQL with zero downtime."),
                        Map.of("company", "AppFactory Ltd", "role", "Full-Stack Developer", "start_date", "2018-07", "end_date", "2019-12", "duration_months", 17,
                            "description", "Built 5 client-facing SaaS products using Vue.js + Django REST API.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            ),

            // 3. Sofia Andersen — full-stack, applied via email
            new Demo(
                "Sofia Andersen",
                "sofia.andersen@outlook.com",
                "+45 20 12 34 56",
                "email", 82, 78,
                "Sofia Andersen | Senior Full-Stack Engineer | sofia.andersen@outlook.com | +45 20 12 34 56\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: React, Next.js, TypeScript, Go, PostgreSQL, Kubernetes, Prometheus, AWS, Grafana, GitHub Actions\n" +
                "Experience:\n" +
                "2022-Present: Senior Engineer at ScaleNord (30 months) — Platform team, owns customer dashboard + data pipeline infra\n" +
                "2019-2022: Frontend Lead at DesignTech (36 months) — Ran design system used by 6 product teams\n" +
                "2017-2019: Junior Developer at Aalborg Webbureau (20 months) — Client web projects\n" +
                "Education: M.Sc Computer Science, University of Copenhagen, 2015-2017\n" +
                "Languages: English (fluent), Danish (native), Swedish (conversational)",
                Map.of(
                    "name", "Sofia Andersen",
                    "email", "sofia.andersen@outlook.com",
                    "phone", "+45 20 12 34 56",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("React", "Next.js", "TypeScript", "Go", "PostgreSQL", "Kubernetes", "Prometheus", "AWS", "Grafana", "GitHub Actions"),
                    "languages", List.of("English", "Danish", "Swedish"),
                    "education", List.of(
                        Map.of("degree", "M.Sc Computer Science", "institution", "University of Copenhagen", "year", "2017")
                    ),
                    "experience", List.of(
                        Map.of("company", "ScaleNord", "role", "Senior Full-Stack Engineer", "start_date", "2022-01", "end_date", "Present", "duration_months", 30,
                            "description", "Platform team owner for customer-facing dashboard (Next.js) and internal data pipeline infra (Go + Kubernetes)."),
                        Map.of("company", "DesignTech", "role", "Frontend Lead", "start_date", "2019-03", "end_date", "2021-11", "duration_months", 32,
                            "description", "Led frontend chapter of 12 developers. Shipped React design system (60+ components) adopted by 6 product teams."),
                        Map.of("company", "Aalborg Webbureau", "role", "Junior Developer", "start_date", "2017-09", "end_date", "2019-01", "duration_months", 16,
                            "description", "Built responsive websites and e-commerce solutions for regional clients.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            ),

            // 4. Raj Patel — junior-ish, gaps, manual upload
            new Demo(
                "Raj Patel",
                "raj.patel.dev@gmail.com",
                "+91 98765 43210",
                "manual", 61, 63,
                "Raj Patel | Full-Stack Developer | raj.patel.dev@gmail.com | +91 98765 43210\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: React, Angular, Python, Flask, MongoDB, Azure, JavaScript, Bootstrap\n" +
                "Experience:\n" +
                "2023-Present: Developer at TechSolve (14 months) — Full-stack feature development on SaaS CRM product\n" +
                "2021-2022: Frontend Developer at PixelWorks (14 months) — React UI for healthcare dashboard\n" +
                "2019-2021: Junior Developer at CodeBase IT (18 months) — PHP legacy maintenance + Angular migration\n" +
                "Gap: Jan 2023 – Mar 2023 (2 months, relocation from Pune to Bangalore)\n" +
                "Gap: Dec 2022 – Jan 2023 (2 months, between jobs)\n" +
                "Education: B.Tech Information Technology, IIT Bombay, 2015-2019\n" +
                "Languages: English (professional), Hindi (native), Gujarati (native)",
                Map.of(
                    "name", "Raj Patel",
                    "email", "raj.patel.dev@gmail.com",
                    "phone", "+91 98765 43210",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("React", "Angular", "Python", "Flask", "MongoDB", "Azure", "JavaScript", "Bootstrap"),
                    "languages", List.of("English", "Hindi", "Gujarati"),
                    "education", List.of(
                        Map.of("degree", "B.Tech Information Technology", "institution", "IIT Bombay", "year", "2019")
                    ),
                    "experience", List.of(
                        Map.of("company", "TechSolve", "role", "Full-Stack Developer", "start_date", "2023-04", "end_date", "Present", "duration_months", 14,
                            "description", "Feature development on SaaS CRM: React frontend, Flask APIs, MongoDB. Delivered payment integration module."),
                        Map.of("company", "PixelWorks", "role", "Frontend Developer", "start_date", "2021-10", "end_date", "2022-11", "duration_months", 13,
                            "description", "Built React dashboard for healthcare reporting app used by 50+ hospitals across India."),
                        Map.of("company", "CodeBase IT", "role", "Junior Developer", "start_date", "2019-07", "end_date", "2021-01", "duration_months", 18,
                            "description", "Maintained PHP legacy systems and led partial Angular migration for government client portal.")
                    ),
                    "gaps", List.of(
                        Map.of("start_date", "2022-12", "end_date", "2023-03", "duration_months", 3)
                    ),
                    "red_flags", List.of()
                )
            ),

            // 5. Elena Volkov — ML engineer, LinkedIn
            new Demo(
                "Elena Volkov",
                "elena.volkov@techmail.eu",
                "+7 916 555 01 99",
                "linkedin", 79, 82,
                "Elena Volkov | ML Engineer | elena.volkov@techmail.eu | +7 916 555 01 99\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: Python, FastAPI, React, TypeScript, PyTorch, TensorFlow, scikit-learn, Redis, AWS SageMaker, MLflow, Docker\n" +
                "Experience:\n" +
                "2022-Present: ML Engineer at AILabs (28 months) — Production ML for NLP recommendation engine (10M users)\n" +
                "2020-2022: Data Scientist at Analytics Corp (24 months) — Churn prediction models, A/B testing framework\n" +
                "2018-2020: Research Assistant at MSU AI Lab (22 months) — Computer vision for medical imaging\n" +
                "Education: M.Sc Machine Learning, Moscow State University, 2016-2018\n" +
                "Languages: English (fluent), Russian (native), German (B2)",
                Map.of(
                    "name", "Elena Volkov",
                    "email", "elena.volkov@techmail.eu",
                    "phone", "+7 916 555 01 99",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("Python", "FastAPI", "React", "TypeScript", "PyTorch", "TensorFlow", "scikit-learn", "Redis", "AWS SageMaker", "MLflow", "Docker"),
                    "languages", List.of("English", "Russian", "German"),
                    "education", List.of(
                        Map.of("degree", "M.Sc Machine Learning", "institution", "Moscow State University", "year", "2018")
                    ),
                    "experience", List.of(
                        Map.of("company", "AILabs", "role", "ML Engineer", "start_date", "2022-01", "end_date", "Present", "duration_months", 28,
                            "description", "Production ML system for personalised NLP recommendation engine serving 10M users. Reduced model serving latency 60% via ONNX runtime."),
                        Map.of("company", "Analytics Corp", "role", "Data Scientist", "start_date", "2020-02", "end_date", "2021-12", "duration_months", 22,
                            "description", "Built churn prediction models (+18% retention) and internal A/B testing framework for 50+ product experiments."),
                        Map.of("company", "MSU AI Lab", "role", "Research Assistant", "start_date", "2018-09", "end_date", "2020-01", "duration_months", 16,
                            "description", "Computer vision research for tumour segmentation in MRI scans. Co-authored paper at NeurIPS 2019.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            ),

            // 6. Tom Bradley — weak candidate, red flags
            new Demo(
                "Tom Bradley",
                "tombradley@icloud.com",
                "+1 (615) 018-7654",
                "startupjobs", 42, 38,
                "Tom Bradley | Web Developer | tombradley@icloud.com | +1 (615) 018-7654\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: JavaScript, PHP, WordPress, MySQL, Bootstrap, jQuery, CSS\n" +
                "Experience:\n" +
                "2023-Present: Freelance Web Developer (14 months) — Mostly WordPress sites for local businesses\n" +
                "2022-2023: Web Developer at AgencyX (9 months) — Left due to company restructure\n" +
                "2021-2022: Junior Developer at LocalBiz Solutions (11 months) — Basic CRUD PHP apps\n" +
                "Education: Associate Degree in Web Design, Nashville Community College, 2019-2021\n" +
                "Languages: English (native)",
                Map.of(
                    "name", "Tom Bradley",
                    "email", "tombradley@icloud.com",
                    "phone", "+1 (615) 018-7654",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("JavaScript", "PHP", "WordPress", "MySQL", "Bootstrap", "jQuery", "CSS"),
                    "languages", List.of("English"),
                    "education", List.of(
                        Map.of("degree", "Associate Degree in Web Design", "institution", "Nashville Community College", "year", "2021")
                    ),
                    "experience", List.of(
                        Map.of("company", "Self-employed", "role", "Freelance Web Developer", "start_date", "2023-03", "end_date", "Present", "duration_months", 14,
                            "description", "WordPress sites and landing pages for local businesses. 4-5 projects per month."),
                        Map.of("company", "AgencyX", "role", "Web Developer", "start_date", "2022-05", "end_date", "2023-01", "duration_months", 8,
                            "description", "Maintained client websites. Left after company lost its main contract."),
                        Map.of("company", "LocalBiz Solutions", "role", "Junior Developer", "start_date", "2021-09", "end_date", "2022-04", "duration_months", 7,
                            "description", "PHP CRUD applications for SME clients. Left voluntarily after 7 months.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of(
                        "No modern framework experience (React/Vue/Angular)",
                        "All tenures under 12 months",
                        "No cloud or DevOps experience",
                        "Associate degree only — no CS fundamentals"
                    )
                )
            ),

            // 7. Amara Diallo — strong, email application
            new Demo(
                "Amara Diallo",
                "amara.diallo@gmail.com",
                "+33 6 12 34 56 78",
                "email", 85, 88,
                "Amara Diallo | Senior Software Engineer | amara.diallo@gmail.com | +33 6 12 34 56 78\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: React, TypeScript, Python, FastAPI, PostgreSQL, Docker, AWS, GraphQL, Redis, Celery, pytest\n" +
                "Experience:\n" +
                "2021-Present: Senior Engineer at TechParis (36 months) — Led payments team, built PSD2-compliant open banking API\n" +
                "2019-2021: Software Engineer at StartupFrance (24 months) — Full-stack on 0→1 HR SaaS product\n" +
                "2018-2019: Junior Developer at WebAgence (12 months) — Client e-commerce projects\n" +
                "Education: M.Eng Computer Science, Ecole Polytechnique, 2016-2018\n" +
                "Languages: English (fluent), French (native), Arabic (fluent), Wolof (native)",
                Map.of(
                    "name", "Amara Diallo",
                    "email", "amara.diallo@gmail.com",
                    "phone", "+33 6 12 34 56 78",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "GraphQL", "Redis", "Celery", "pytest"),
                    "languages", List.of("English", "French", "Arabic", "Wolof"),
                    "education", List.of(
                        Map.of("degree", "M.Eng Computer Science", "institution", "Ecole Polytechnique", "year", "2018")
                    ),
                    "experience", List.of(
                        Map.of("company", "TechParis", "role", "Senior Software Engineer", "start_date", "2021-02", "end_date", "Present", "duration_months", 36,
                            "description", "Led 4-person payments team. Built PSD2-compliant open banking API used by 80 European banks. Reduced API error rate from 2.4% to 0.08%."),
                        Map.of("company", "StartupFrance", "role", "Software Engineer", "start_date", "2019-03", "end_date", "2021-01", "duration_months", 22,
                            "description", "First full-stack hire. Built 0→1 HR SaaS product from prototype to 3,000 paying customers."),
                        Map.of("company", "WebAgence", "role", "Junior Developer", "start_date", "2018-07", "end_date", "2019-02", "duration_months", 7,
                            "description", "Shopify and custom e-commerce sites for Paris-based clients.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            ),

            // 8. James Kim — best candidate, Staff Engineer, LinkedIn
            new Demo(
                "James Kim",
                "james.kim.eng@gmail.com",
                "+1 (415) 555-0142",
                "linkedin", 95, 93,
                "James Kim | Staff Engineer | james.kim.eng@gmail.com | +1 (415) 555-0142\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: React, TypeScript, Rust, Python, PostgreSQL, Kubernetes, AWS, Terraform, Go, Distributed Systems, gRPC, Kafka\n" +
                "Experience:\n" +
                "2020-Present: Staff Engineer at TechGiant Corp (50 months) — Architect for payments infra, 50k TPS\n" +
                "2017-2020: Senior Software Engineer at CloudScale (36 months) — Led migration to microservices\n" +
                "2014-2017: Software Engineer at InnoSystems (36 months) — Core product full-stack\n" +
                "2012-2014: Junior Engineer at DevShop (24 months) — First job out of college\n" +
                "Education: B.Sc Computer Science, Stanford University, 2008-2012\n" +
                "Languages: English (native), Korean (fluent)",
                Map.of(
                    "name", "James Kim",
                    "email", "james.kim.eng@gmail.com",
                    "phone", "+1 (415) 555-0142",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("React", "TypeScript", "Rust", "Python", "PostgreSQL", "Kubernetes", "AWS", "Terraform", "Go", "Distributed Systems", "gRPC", "Kafka"),
                    "languages", List.of("English", "Korean"),
                    "education", List.of(
                        Map.of("degree", "B.Sc Computer Science", "institution", "Stanford University", "year", "2012")
                    ),
                    "experience", List.of(
                        Map.of("company", "TechGiant Corp", "role", "Staff Engineer", "start_date", "2020-02", "end_date", "Present", "duration_months", 50,
                            "description", "Architect for payments infrastructure processing 50k TPS. Led monolith→microservices migration across 14 teams. Mentored 6 senior engineers to staff level."),
                        Map.of("company", "CloudScale", "role", "Senior Software Engineer", "start_date", "2017-01", "end_date", "2020-01", "duration_months", 36,
                            "description", "Technical lead for distributed storage service (multi-region, 99.999% SLA). Grew team from 4 to 11 engineers."),
                        Map.of("company", "InnoSystems", "role", "Software Engineer", "start_date", "2014-06", "end_date", "2016-12", "duration_months", 30,
                            "description", "Full-stack on core SaaS product. Delivered real-time collaborative editing feature (1M DAU)."),
                        Map.of("company", "DevShop", "role", "Junior Engineer", "start_date", "2012-07", "end_date", "2014-05", "duration_months", 22,
                            "description", "Frontend and API work on client projects. First professional engineering role.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            ),

            // 9. Priya Sharma — mid-level frontend, manual
            new Demo(
                "Priya Sharma",
                "priya.sharma.code@gmail.com",
                "+91 87654 32109",
                "manual", 67, 65,
                "Priya Sharma | Frontend Developer | priya.sharma.code@gmail.com | +91 87654 32109\n" +
                "LinkedIn: " + LINKEDIN_URL + "\n" +
                "Skills: React, Vue.js, TypeScript, Python, Django, PostgreSQL, AWS, Figma, Storybook, Jest\n" +
                "Experience:\n" +
                "2022-Present: Frontend Developer at SaaSCompany (28 months) — Product UI for B2B analytics platform\n" +
                "2020-2022: Junior Frontend at DesignStudio (22 months) — UI implementation from Figma designs\n" +
                "Education: B.Sc Computer Science, University of Delhi, 2016-2020\n" +
                "Languages: English (professional), Hindi (native), Tamil (conversational)",
                Map.of(
                    "name", "Priya Sharma",
                    "email", "priya.sharma.code@gmail.com",
                    "phone", "+91 87654 32109",
                    "linkedin_url", LINKEDIN_URL,
                    "skills", List.of("React", "TypeScript", "Vue.js", "Python", "Django", "PostgreSQL", "AWS", "Figma", "Storybook", "Jest"),
                    "languages", List.of("English", "Hindi", "Tamil"),
                    "education", List.of(
                        Map.of("degree", "B.Sc Computer Science", "institution", "University of Delhi", "year", "2020")
                    ),
                    "experience", List.of(
                        Map.of("company", "SaaSCompany", "role", "Frontend Developer", "start_date", "2022-02", "end_date", "Present", "duration_months", 28,
                            "description", "Owns product UI for B2B analytics dashboard (React + TypeScript). Introduced Storybook and Jest test coverage from 0% to 74%."),
                        Map.of("company", "DesignStudio", "role", "Junior Frontend Developer", "start_date", "2020-07", "end_date", "2022-01", "duration_months", 18,
                            "description", "Pixel-perfect Figma-to-React implementation for 3 client products. Introduced Vue.js for internal tooling.")
                    ),
                    "gaps", List.of(),
                    "red_flags", List.of()
                )
            )
        );

        Candidate jamesKim = null;
        JobApplication jamesApp = null;

        for (Demo d : demos) {
            log.info("  Seeding {}...", d.name());

            Candidate c = new Candidate();
            c.setName(d.name());
            c.setEmail(d.email());
            c.setSource(d.source());
            c.setRawText(d.rawText());
            c.setParsed(mapper.writeValueAsString(d.parsed()));
            c.setCredibilityScore(d.cred());
            candidateRepo.save(c);

            int overall = scoring.calculateOverallScore(d.match(), d.cred(), 0);
            JobApplication app = new JobApplication();
            app.setCandidateId(c.getId());
            app.setJobId(job.getId());
            app.setMatchScore(d.match());
            app.setCredibilityScore(d.cred());
            app.setOverallScore(overall);
            app.setStatus("inbox");
            appRepo.save(app);

            if (d.name().equals("James Kim")) { jamesKim = c; jamesApp = app; }
        }

        // ── Pre-populate statuses for a nice board ─────────────────────────
        setStatus("Alice Chen",     job.getId(), "shortlisted");
        setStatus("Amara Diallo",   job.getId(), "shortlisted");
        setStatus("Sofia Andersen", job.getId(), "interview_scheduled");
        setStatus("Tom Bradley",    job.getId(), "rejected");

        // ── James Kim: completed interview with full analysis ──────────────
        if (jamesApp != null) {
            String transcript = """
                Interviewer: Tell me about yourself and why you're interested in this role.
                James: I'm a staff engineer with 12 years of experience building large-scale distributed systems. \
                At TechGiant I currently architect the payments infrastructure handling 50,000 transactions per second. \
                I'm interested in this role because I want to work closer to product again — at this stage of my career \
                I want to see the direct impact of the systems I build on end users.

                Interviewer: Describe the most technically challenging project you've led.
                James: The monolith-to-microservices migration at TechGiant. We had 14 teams, 4 million lines of code, \
                and couldn't afford downtime on a system doing $8B/yr in payments. I designed a strangler-fig pattern \
                with feature flags and shadow traffic. Took 18 months but we hit zero unplanned downtime throughout.

                Interviewer: How do you approach mentoring junior and mid-level engineers?
                James: I pair programme intentionally — not debugging together, but designing together. I give each \
                engineer a real project with real stakes. I do weekly 1:1s structured around their growth plan, not \
                just status updates. I've had 6 engineers I mentored get promoted to staff level.

                Interviewer: What's your experience with React and TypeScript at scale?
                James: I've been writing TypeScript since 2015. At TechGiant I established the frontend standards for \
                a 40-person team — we went from 0% to 94% type coverage in 6 months. I'm comfortable with both the \
                architecture side and the hands-on implementation.
                """;

            Map<String, Object> analysis = Map.of(
                "answer_quality_score", 94,
                "communication_score", 91,
                "attention_score", 97,
                "interview_score", 92,
                "summary", "James demonstrated exceptional technical depth across distributed systems, frontend architecture, and engineering leadership. Answers were consistently structured with concrete metrics and outcomes. Shows clear senior-to-staff level thinking.",
                "strengths", List.of(
                    "Concrete metrics in every answer — 50k TPS, $8B/yr, 94% type coverage",
                    "Strong engineering leadership and mentorship track record",
                    "Rare combination of deep backend + solid frontend expertise"
                ),
                "concerns", List.of(
                    "May be overqualified — could outgrow the role quickly",
                    "Salary expectations likely at top of band given Big Tech background"
                ),
                "per_question", List.of(
                    Map.of("question", "Tell me about yourself", "score", 91,
                        "notes", "Concise, well-framed. Tied motivation to concrete career stage reasoning."),
                    Map.of("question", "Most challenging project", "score", 96,
                        "notes", "Exemplary answer. Named the pattern (strangler-fig), gave timeline and business stakes. Shows senior architecture thinking."),
                    Map.of("question", "Mentoring approach", "score", 90,
                        "notes", "Thoughtful framework, tangible outcome (6 promotions). Not generic."),
                    Map.of("question", "React / TypeScript at scale", "score", 93,
                        "notes", "Deep knowledge — gave specific metric (0% to 94% coverage). Pragmatic about trade-offs.")
                )
            );

            jamesApp.setTranscript(transcript);
            jamesApp.setAnalysis(mapper.writeValueAsString(analysis));
            jamesApp.setAttentionEvents(mapper.writeValueAsString(List.of(
                Map.of("type", "gaze_away", "timestamp", 45),
                Map.of("type", "gaze_away", "timestamp", 182)
            )));
            jamesApp.setInterviewScore(92);
            jamesApp.setOverallScore(scoring.calculateOverallScore(jamesApp.getMatchScore(), 95, 92));
            jamesApp.setStatus("final_round");
            jamesApp.setInterviewRoomUrl("https://meet.jit.si/talentlens-demo");
            appRepo.save(jamesApp);
        }
    }

    private void setStatus(String name, java.util.UUID jobId, String status) {
        candidateRepo.findAll().stream()
            .filter(c -> name.equals(c.getName()))
            .findFirst()
            .flatMap(c -> appRepo.findByCandidateIdAndJobId(c.getId(), jobId))
            .ifPresent(app -> { app.setStatus(status); appRepo.save(app); });
    }
}
