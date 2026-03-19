package com.talentlens.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.Candidate;
import com.talentlens.model.Job;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.repository.JobRepository;
import com.talentlens.service.ScoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/applications")
public class ApplicationController {

    private static final Set<String> VALID_STATUSES = Set.of(
        "inbox", "shortlisted", "interview_scheduled", "interview_done", "final_round", "rejected"
    );

    private final JobApplicationRepository appRepo;
    private final CandidateRepository candidateRepo;
    private final JobRepository jobRepo;
    private final ScoringService scoring;
    private final ObjectMapper mapper = new ObjectMapper();

    public ApplicationController(JobApplicationRepository appRepo, CandidateRepository candidateRepo,
                                  JobRepository jobRepo, ScoringService scoring) {
        this.appRepo = appRepo;
        this.candidateRepo = candidateRepo;
        this.jobRepo = jobRepo;
        this.scoring = scoring;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        UUID candidateId = UUID.fromString((String) body.get("candidate_id"));
        UUID jobId = UUID.fromString((String) body.get("job_id"));

        // Return existing if duplicate
        Optional<JobApplication> existing = appRepo.findByCandidateIdAndJobId(candidateId, jobId);
        if (existing.isPresent()) return ResponseEntity.ok(buildAppMap(existing.get(), true));

        Candidate cand = candidateRepo.findById(candidateId).orElseThrow();
        Job job = jobRepo.findById(jobId).orElseThrow();

        List<Double> candEmb = scoring.parseEmbedding(cand.getEmbedding());
        List<Double> jobEmb = scoring.parseEmbedding(job.getEmbedding());
        int matchSc = scoring.matchScore(candEmb, jobEmb);
        int credSc = cand.getCredibilityScore() != null ? cand.getCredibilityScore() : 0;

        JobApplication app = new JobApplication();
        app.setCandidateId(candidateId);
        app.setJobId(jobId);
        app.setMatchScore(matchSc);
        app.setCredibilityScore(credSc);
        app.setOverallScore(scoring.calculateOverallScore(matchSc, credSc, 0));
        app.setStatus("inbox");

        // Save custom question answers if provided
        Object customAnswers = body.get("custom_answers");
        if (customAnswers != null) {
            try {
                app.setCustomAnswers(mapper.writeValueAsString(customAnswers));
            } catch (Exception e) {
                // Ignore JSON serialization errors
            }
        }

        appRepo.save(app);

        return ResponseEntity.ok(buildAppMap(app, true));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (!VALID_STATUSES.contains(status))
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + status));

        return appRepo.findById(id).map(app -> {
            app.setStatus(status);
            appRepo.save(app);
            return ResponseEntity.ok(buildAppMap(app, true));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        return appRepo.findById(id)
            .map(app -> ResponseEntity.ok(buildAppMap(app, true)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    Map<String, Object> buildAppMap(JobApplication a, boolean includeNested) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId().toString());
        m.put("candidate_id", a.getCandidateId() != null ? a.getCandidateId().toString() : null);
        m.put("job_id", a.getJobId() != null ? a.getJobId().toString() : null);
        m.put("match_score", a.getMatchScore());
        m.put("credibility_score", a.getCredibilityScore());
        m.put("interview_score", a.getInterviewScore());
        m.put("overall_score", a.getOverallScore());
        m.put("status", a.getStatus());
        m.put("interview_room_url", a.getInterviewRoomUrl());
        m.put("video_url", a.getVideoUrl());
        m.put("transcript", a.getTranscript());
        m.put("interview_date", a.getInterviewDate() != null ? a.getInterviewDate().toString() : null);
        m.put("created_at", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
        // Parse JSON fields
        m.put("analysis", parseJson(a.getAnalysis()));
        m.put("attention_events", parseJsonList(a.getAttentionEvents()));
        m.put("custom_answers", parseJson(a.getCustomAnswers()));

        if (includeNested) {
            // Nested candidate
            if (a.getCandidateId() != null) {
                candidateRepo.findById(a.getCandidateId()).ifPresent(c -> {
                    Map<String, Object> cm = new LinkedHashMap<>();
                    cm.put("id", c.getId().toString());
                    cm.put("name", c.getName());
                    cm.put("email", c.getEmail());
                    cm.put("source", c.getSource());
                    cm.put("credibility_score", c.getCredibilityScore());
                    try {
                        cm.put("parsed", c.getParsed() != null
                            ? mapper.readValue(c.getParsed(), new TypeReference<Map<String, Object>>() {}) : null);
                    } catch (Exception e) { cm.put("parsed", null); }
                    m.put("candidates", cm);
                });
            }
            // Nested job
            if (a.getJobId() != null) {
                jobRepo.findById(a.getJobId()).ifPresent(j -> {
                    Map<String, Object> jm = new LinkedHashMap<>();
                    jm.put("id", j.getId().toString());
                    jm.put("title", j.getTitle());
                    jm.put("description", j.getDescription());
                    m.put("jobs", jm);
                });
            }
        }
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        if (json == null) return null;
        try { return mapper.readValue(json, Map.class); } catch (Exception e) { return null; }
    }

    @SuppressWarnings("unchecked")
    private List<Object> parseJsonList(String json) {
        if (json == null) return null;
        try { return mapper.readValue(json, List.class); } catch (Exception e) { return null; }
    }
}
