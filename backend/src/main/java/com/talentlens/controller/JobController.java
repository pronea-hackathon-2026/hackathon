package com.talentlens.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.Candidate;
import com.talentlens.model.Job;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.repository.JobRepository;
import com.talentlens.service.AsyncJobService;
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
    private final AsyncJobService asyncJobService;
    private final ObjectMapper mapper = new ObjectMapper();

    public JobController(JobRepository jobRepo, CandidateRepository candidateRepo,
                         JobApplicationRepository appRepo, GeminiService gemini, ScoringService scoring,
                         AsyncJobService asyncJobService) {
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.appRepo = appRepo;
        this.gemini = gemini;
        this.scoring = scoring;
        this.asyncJobService = asyncJobService;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) throws Exception {
        String title = (String) body.get("title");
        String description = (String) body.getOrDefault("description", "");
        Object requirementsObj = body.get("requirements");
        String requirementsJson = requirementsObj != null ? mapper.writeValueAsString(requirementsObj) : null;

        Job job = new Job();
        job.setTitle(title);
        job.setDescription(description);
        job.setRequirements(requirementsJson);
        jobRepo.save(job);

        // Fire async scoring — returns immediately, candidates appear in progress endpoint as they're scored
        asyncJobService.rescoreAllAsync(job);

        return buildJobMap(job);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return jobRepo.findById(id).map(job -> {
            try {
                if (body.containsKey("title")) {
                    job.setTitle((String) body.get("title"));
                }
                if (body.containsKey("description")) {
                    job.setDescription((String) body.get("description"));
                }
                if (body.containsKey("requirements")) {
                    Object requirementsObj = body.get("requirements");
                    String requirementsJson = requirementsObj != null ? mapper.writeValueAsString(requirementsObj) : null;
                    job.setRequirements(requirementsJson);
                }
                jobRepo.save(job);
                return ResponseEntity.ok(buildJobMap(job));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.<String, Object>of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return jobRepo.findAll().stream()
            .sorted(Comparator.comparing(Job::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::buildJobMap)
            .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable UUID id) {
        return jobRepo.findById(id)
            .map(job -> ResponseEntity.ok(buildJobMap(job)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<?> progress(@PathVariable UUID id) {
        if (!jobRepo.existsById(id)) return ResponseEntity.notFound().build();
        long total = candidateRepo.count();
        List<JobApplication> apps = appRepo.findByJobId(id);
        List<Map<String, Object>> appMaps = apps.stream().map(app -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", app.getId().toString());
            m.put("job_id", app.getJobId().toString());
            m.put("candidate_id", app.getCandidateId().toString());
            m.put("match_score", app.getMatchScore());
            m.put("credibility_score", app.getCredibilityScore());
            m.put("interview_score", app.getInterviewScore());
            m.put("overall_score", app.getOverallScore());
            m.put("status", app.getStatus());
            m.put("interview_date", app.getInterviewDate() != null ? app.getInterviewDate().toString() : null);
            m.put("interview_room_url", app.getInterviewRoomUrl());
            m.put("video_url", null);
            m.put("transcript", null);
            m.put("analysis", null);
            m.put("attention_events", null);
            m.put("created_at", app.getCreatedAt() != null ? app.getCreatedAt().toString() : null);
            candidateRepo.findById(app.getCandidateId()).ifPresent(c -> {
                Map<String, Object> cMap = new LinkedHashMap<>();
                cMap.put("id", c.getId().toString());
                cMap.put("name", c.getName());
                cMap.put("email", c.getEmail());
                cMap.put("source", c.getSource());
                cMap.put("credibility_score", c.getCredibilityScore());
                cMap.put("created_at", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
                cMap.put("parsed", null);
                cMap.put("embedding", null);
                cMap.put("applications", List.of());
                m.put("candidates", cMap);
            });
            return m;
        }).toList();
        return ResponseEntity.ok(Map.of("total", total, "scored", apps.size(), "applications", appMaps));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (!jobRepo.existsById(id)) return ResponseEntity.notFound().build();
        appRepo.deleteByJobId(id);
        jobRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
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
            int matchSc;
            if (jobEmbedding != null) {
                List<Double> candEmb = scoring.parseEmbedding(cand.getEmbedding());
                matchSc = scoring.matchScore(candEmb, jobEmbedding);
            } else {
                try {
                    matchSc = scoring.aiMatchScore(job.getTitle(), job.getDescription(), job.getRequirements(), cand.getRawText(), gemini);
                } catch (Exception e) {
                    matchSc = scoring.keywordMatchScore(job.getTitle(), job.getDescription(), cand.getRawText());
                }
            }
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
        if (j.getRequirements() != null) {
            try {
                m.put("requirements", mapper.readValue(j.getRequirements(), Object.class));
            } catch (Exception e) {
                m.put("requirements", null);
            }
        } else {
            m.put("requirements", null);
        }
        return m;
    }
}
