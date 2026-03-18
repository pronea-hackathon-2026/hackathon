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

    @Value("${talentlens.seed.enabled:true}")
    private boolean seedEnabled;

    private final CandidateRepository candidateRepo;
    private final JobRepository jobRepo;
    private final JobApplicationRepository appRepo;
    private final GeminiService gemini;
    private final ScoringService scoring;
    private final ObjectMapper mapper = new ObjectMapper();

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
        if (!seedEnabled || candidateRepo.count() > 0) return;
        if (gemini == null) return;

        log.info("Seeding demo data...");
        try {
            seedAll();
            log.info("Seed complete — {} candidates created", candidateRepo.count());
        } catch (Exception e) {
            log.warn("Seeding failed (GEMINI_API_KEY may not be set): {}", e.getMessage());
        }
    }

    private void seedAll() throws Exception {
        // ── Job ───────────────────────────────────────────────────────────────
        String jobTitle = "Senior Full-Stack Engineer";
        String jobDesc = "We are looking for a Senior Full-Stack Engineer to join our product team. " +
            "You will architect and build scalable web applications using React, TypeScript, and Python/FastAPI backends. " +
            "5+ years experience, strong TypeScript and Python skills, cloud infrastructure (AWS or GCP), " +
            "and ability to mentor junior engineers. Bonus: ML/AI integrations.";

        List<Double> jobEmb = gemini.embed(jobDesc);
        Job job = new Job();
        job.setTitle(jobTitle);
        job.setDescription(jobDesc);
        job.setEmbedding(mapper.writeValueAsString(jobEmb));
        jobRepo.save(job);

        // ── Candidates ────────────────────────────────────────────────────────
        record Demo(String name, String email, String source, int cred, String rawText) {}

        List<Demo> demos = List.of(
            new Demo("Alice Chen", "alice.chen@email.com", "linkedin", 88,
                "Alice Chen | Tech Lead | alice.chen@email.com | +1-555-0101\nSkills: React, TypeScript, Python, FastAPI, PostgreSQL, AWS, Docker, GraphQL, Redis, Kubernetes\nExperience:\n2021-Present: Tech Lead at PayFast (36 months)\n2019-2021: Senior Engineer at DataFlow Inc (24 months)\n2017-2019: Software Engineer at WebCraft (24 months)\nEducation: B.Sc Computer Science, MIT 2016\nLanguages: English, Mandarin"),
            new Demo("Marcus Okonkwo", "marcus.ok@protonmail.com", "startupjobs", 72,
                "Marcus Okonkwo | Backend Engineer | marcus.ok@protonmail.com | +44-7700-900123\nSkills: Vue.js, Node.js, Python, Django, MySQL, GCP, Terraform\nExperience:\n2020-Present: Backend Engineer at CloudMesh (48 months)\n2018-2020: Full-Stack Developer at AppFactory (24 months)\nEducation: B.Eng Software Engineering, University of Lagos 2018"),
            new Demo("Sofia Andersen", "sofia.andersen@outlook.com", "email", 82,
                "Sofia Andersen | Full-Stack Engineer | sofia.andersen@outlook.com | +45-20-123456\nSkills: React, Next.js, TypeScript, Go, PostgreSQL, Kubernetes, Prometheus\nExperience:\n2022-Present: Senior Engineer at ScaleNord (24 months)\n2019-2022: Frontend Lead at DesignTech (36 months)\nEducation: M.Sc Computer Science, Copenhagen University 2017\nLanguages: English, Danish, Swedish"),
            new Demo("Raj Patel", "raj.patel.dev@gmail.com", "manual", 61,
                "Raj Patel | Full-Stack Developer | raj.patel.dev@gmail.com | +91-98765-43210\nSkills: React, Angular, Python, Flask, MongoDB, Azure\nExperience:\n2023-Present: Developer at TechSolve (12 months)\n2021-2022: Frontend Developer at PixelWorks (14 months)\n2019-2021: Junior Developer at CodeBase (18 months)\nGaps: 6 months gap 2022-2023\nEducation: B.Tech IT, IIT Bombay 2019"),
            new Demo("Elena Volkov", "elena.volkov@techmail.eu", "linkedin", 79,
                "Elena Volkov | ML Engineer | elena.volkov@techmail.eu | +7-916-555-0199\nSkills: React, TypeScript, Python, FastAPI, Redis, AWS, Machine Learning, PyTorch\nExperience:\n2022-Present: ML Engineer at AILabs (24 months)\n2020-2022: Data Scientist at Analytics Corp (24 months)\nEducation: M.Sc Machine Learning, Moscow State University 2019\nLanguages: English, Russian, German"),
            new Demo("Tom Bradley", "tombradley@icloud.com", "startupjobs", 42,
                "Tom Bradley | Web Developer | tombradley@icloud.com | +1-555-0187\nSkills: JavaScript, PHP, WordPress, MySQL, Bootstrap\nExperience:\n2023-Present: Freelance Developer (12 months)\n2022-2023: Web Developer at AgencyX (8 months)\n2021-2022: Junior Developer at LocalBiz (10 months)\nRed flags: Very short tenures, vague descriptions\nEducation: Associate Degree Web Design, Community College 2021"),
            new Demo("Amara Diallo", "amara.diallo@gmail.com", "email", 85,
                "Amara Diallo | Senior Software Engineer | amara.diallo@gmail.com | +33-6-12-34-56-78\nSkills: React, TypeScript, Python, FastAPI, PostgreSQL, Docker, AWS, GraphQL\nExperience:\n2021-Present: Senior Engineer at TechParis (36 months)\n2019-2021: Software Engineer at StartupFrance (24 months)\n2018-2019: Junior Developer at WebAgence (12 months)\nEducation: M.Eng Computer Science, Ecole Polytechnique 2018\nLanguages: English, French, Arabic"),
            new Demo("James Kim", "james.kim.eng@gmail.com", "linkedin", 95,
                "James Kim | Staff Engineer | james.kim.eng@gmail.com | +1-415-555-0142\nSkills: React, TypeScript, Rust, Python, PostgreSQL, Kubernetes, AWS, Terraform, Go\nExperience:\n2020-Present: Staff Engineer at TechGiant Corp (48 months)\n2017-2020: Senior Software Engineer at CloudScale (36 months)\n2014-2017: Software Engineer at InnoSystems (36 months)\n2012-2014: Junior Engineer at DevShop (24 months)\nEducation: B.Sc Computer Science, Stanford University 2012\nLanguages: English, Korean"),
            new Demo("Priya Sharma", "priya.sharma.code@gmail.com", "manual", 67,
                "Priya Sharma | Frontend Developer | priya.sharma.code@gmail.com | +91-87654-32109\nSkills: React, Vue.js, Python, Django, PostgreSQL, AWS\nExperience:\n2022-Present: Frontend Developer at SaaSCompany (24 months)\n2020-2022: Junior Frontend at DesignStudio (20 months)\nEducation: B.Sc Computer Science, University of Delhi 2019\nLanguages: English, Hindi, Tamil")
        );

        Candidate jamesKim = null;
        JobApplication jamesApp = null;

        for (Demo d : demos) {
            log.info("  Seeding {}...", d.name());
            List<Double> emb = gemini.embed(d.rawText());
            int matchSc = scoring.matchScore(emb, jobEmb);

            Map<String, Object> parsed = Map.of(
                "name", d.name(), "email", d.email(), "phone", "N/A",
                "skills", List.of("Java", "Python", "React"),
                "languages", List.of("English"),
                "education", List.of(),
                "experience", List.of(),
                "gaps", List.of(),
                "red_flags", List.of()
            );

            Candidate c = new Candidate();
            c.setName(d.name());
            c.setEmail(d.email());
            c.setSource(d.source());
            c.setRawText(d.rawText());
            c.setParsed(mapper.writeValueAsString(parsed));
            c.setCredibilityScore(d.cred());
            c.setEmbedding(mapper.writeValueAsString(emb));
            candidateRepo.save(c);

            int overall = scoring.calculateOverallScore(matchSc, d.cred(), 0);
            JobApplication app = new JobApplication();
            app.setCandidateId(c.getId());
            app.setJobId(job.getId());
            app.setMatchScore(matchSc);
            app.setCredibilityScore(d.cred());
            app.setOverallScore(overall);
            app.setStatus("inbox");
            appRepo.save(app);

            if (d.name().equals("James Kim")) { jamesKim = c; jamesApp = app; }
        }

        // ── Pre-populate statuses for a nice board ─────────────────────────
        setStatus("Alice Chen", job.getId(), "shortlisted");
        setStatus("Amara Diallo", job.getId(), "shortlisted");
        setStatus("Sofia Andersen", job.getId(), "interview_scheduled");
        setStatus("Tom Bradley", job.getId(), "rejected");

        // ── James Kim completed interview ──────────────────────────────────
        if (jamesApp != null) {
            String transcript = """
                Interviewer: Tell me about yourself and why you're interested in this role.
                James: I'm a staff engineer with 10 years of experience building large-scale distributed systems...
                
                Interviewer: Describe a technically challenging project you've led.
                James: At TechGiant I led the migration of our monolithic payment service handling 50,000 TPS to microservices...
                
                Interviewer: How do you approach mentoring junior engineers?
                James: I pair program intentionally, give each junior a real project, and do weekly 1-on-1s focused on growth...
                
                Interviewer: What's your experience with React and TypeScript?
                James: I've been writing TypeScript since 2016. I established standards for a 40-person frontend team...
                """;

            Map<String, Object> analysis = Map.of(
                "answer_quality_score", 92,
                "communication_score", 89,
                "attention_score", 95,
                "interview_score", 90,
                "summary", "James demonstrated exceptional technical depth and clear communication. His answers were structured with concrete metrics.",
                "strengths", List.of("Exceptional distributed systems knowledge", "Clear communication with metrics", "Strong mentorship philosophy"),
                "concerns", List.of("May be overqualified", "Salary expectations likely high"),
                "per_question", List.of(
                    Map.of("question", "Tell me about yourself", "score", 90, "notes", "Clear, focused, connected to role"),
                    Map.of("question", "Technically challenging project", "score", 95, "notes", "Specific metrics, sophisticated architecture"),
                    Map.of("question", "Mentoring approach", "score", 88, "notes", "Thoughtful framework"),
                    Map.of("question", "React/TypeScript experience", "score", 92, "notes", "Deep knowledge, pragmatic mindset")
                )
            );

            jamesApp.setTranscript(transcript);
            jamesApp.setAnalysis(mapper.writeValueAsString(analysis));
            jamesApp.setAttentionEvents(mapper.writeValueAsString(List.of(
                Map.of("type", "gaze_away", "timestamp", 45),
                Map.of("type", "gaze_away", "timestamp", 180)
            )));
            jamesApp.setInterviewScore(90);
            jamesApp.setOverallScore(scoring.calculateOverallScore(jamesApp.getMatchScore(), 95, 90));
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
