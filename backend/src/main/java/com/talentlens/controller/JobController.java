package com.talentlens.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.Candidate;
import com.talentlens.model.Job;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.repository.JobRepository;
import com.talentlens.service.GeminiService;
import com.talentlens.service.ScoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/jobs")
public class JobController {

    private final JobRepository jobRepo;
    private final CandidateRepository candidateRepo;
    private final JobApplicationRepository appRepo;
    private final GeminiService gemini;
    private final ScoringService scoring;
    private final ObjectMapper mapper = new ObjectMapper();

    public JobController(JobRepository jobRepo, CandidateRepository candidateRepo,
                         JobApplicationRepository appRepo, GeminiService gemini, ScoringService scoring) {
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.appRepo = appRepo;
        this.gemini = gemini;
        this.scoring = scoring;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, String> body) throws Exception {
        String title = body.get("title");
        String description = body.getOrDefault("description", "");

        List<Double> embedding = gemini.embed(description);
        Job job = new Job();
        job.setTitle(title);
        job.setDescription(description);
        job.setEmbedding(mapper.writeValueAsString(embedding));
        jobRepo.save(job);

        // Re-score all existing candidates against this new job
        rescoreAll(job, embedding);

        return buildJobMap(job);
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return jobRepo.findAll().stream()
            .sorted(Comparator.comparing(Job::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::buildJobMap)
            .toList();
    }

    @PostMapping("/{id}/rescore")
    public ResponseEntity<?> rescore(@PathVariable UUID id) {
        return jobRepo.findById(id).map(job -> {
            try {
                List<Double> jobEmb = scoring.parseEmbedding(job.getEmbedding());
                rescoreAll(job, jobEmb);
                return ResponseEntity.ok(Map.of("ok", true));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    private void rescoreAll(Job job, List<Double> jobEmbedding) {
        for (Candidate cand : candidateRepo.findAll()) {
            List<Double> candEmb = scoring.parseEmbedding(cand.getEmbedding());
            int matchSc = scoring.matchScore(candEmb, jobEmbedding);
            int credSc = cand.getCredibilityScore() != null ? cand.getCredibilityScore() : 0;

            Optional<JobApplication> existing = appRepo.findByCandidateIdAndJobId(cand.getId(), job.getId());
            if (existing.isPresent()) {
                JobApplication app = existing.get();
                app.setMatchScore(matchSc);
                app.setOverallScore(scoring.calculateOverallScore(matchSc, credSc, app.getInterviewScore()));
                appRepo.save(app);
            } else {
                JobApplication app = new JobApplication();
                app.setCandidateId(cand.getId());
                app.setJobId(job.getId());
                app.setMatchScore(matchSc);
                app.setCredibilityScore(credSc);
                app.setOverallScore(scoring.calculateOverallScore(matchSc, credSc, 0));
                app.setStatus("inbox");
                appRepo.save(app);
            }
        }
    }

    Map<String, Object> buildJobMap(Job j) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", j.getId().toString());
        m.put("title", j.getTitle());
        m.put("description", j.getDescription());
        m.put("created_at", j.getCreatedAt() != null ? j.getCreatedAt().toString() : null);
        return m;
    }
}
