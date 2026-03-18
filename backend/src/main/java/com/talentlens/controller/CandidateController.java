package com.talentlens.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.Candidate;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.service.CvParserService;
import com.talentlens.service.GeminiService;
import com.talentlens.service.ScoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/candidates")
public class CandidateController {

    private final CandidateRepository candidateRepo;
    private final JobApplicationRepository appRepo;
    private final CvParserService cvParser;
    private final GeminiService gemini;
    private final ScoringService scoring;
    private final ObjectMapper mapper = new ObjectMapper();

    public CandidateController(CandidateRepository candidateRepo, JobApplicationRepository appRepo,
                               CvParserService cvParser, GeminiService gemini, ScoringService scoring) {
        this.candidateRepo = candidateRepo;
        this.appRepo = appRepo;
        this.cvParser = cvParser;
        this.gemini = gemini;
        this.scoring = scoring;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.getOrDefault("name", "Unknown");
            String email = (String) body.get("email");

            Candidate c = new Candidate();
            c.setName(name);
            c.setEmail(email);
            c.setSource("application");
            c.setCredibilityScore(0);

            candidateRepo.save(c);
            return ResponseEntity.ok(buildCandidateMap(c, false, List.of()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/{id}/cv", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadCv(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return candidateRepo.findById(id).map(c -> {
            try {
                byte[] bytes = file.getBytes();
                String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
                String rawText = cvParser.extractText(bytes, filename);
                Map<String, Object> parsed = cvParser.parseCv(rawText);
                int credScore = scoring.calculateCredibility(parsed, cvParser);

                c.setRawText(rawText);
                c.setParsed(mapper.writeValueAsString(parsed));
                c.setCredibilityScore(credScore);

                candidateRepo.save(c);
                return ResponseEntity.ok(buildCandidateMap(c, false, List.of()));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
            String rawText = cvParser.extractText(bytes, filename);
            Map<String, Object> parsed = cvParser.parseCv(rawText);
            int credScore = scoring.calculateCredibility(parsed, cvParser);

            Candidate c = new Candidate();
            c.setName((String) parsed.getOrDefault("name", "Unknown"));
            c.setEmail((String) parsed.get("email"));
            c.setSource("manual");
            c.setRawText(rawText);
            c.setParsed(mapper.writeValueAsString(parsed));
            c.setCredibilityScore(credScore);

            candidateRepo.save(c);
            return ResponseEntity.ok(buildCandidateMap(c, false, List.of()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return candidateRepo.findAll().stream().map(c -> {
            List<JobApplication> apps = appRepo.findByCandidateId(c.getId());
            return buildCandidateMap(c, false, apps);
        }).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        return candidateRepo.findById(id)
            .map(c -> {
                List<JobApplication> apps = appRepo.findByCandidateId(c.getId());
                return ResponseEntity.ok(buildCandidateMap(c, true, apps));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/search")
    public List<Map<String, Object>> search(@RequestBody Map<String, Object> body) {
        String query = (String) body.getOrDefault("query", "");
        if (query.isBlank()) return List.of();

        List<Double> queryEmbedding = gemini.embed(query);
        List<Candidate> all = candidateRepo.findAll();

        record Scored(Candidate c, double score) {}
        return all.stream()
            .map(c -> {
                List<Double> emb = scoring.parseEmbedding(c.getEmbedding());
                double sim = scoring.cosineSimilarity(queryEmbedding, emb);
                return new Scored(c, sim);
            })
            .sorted(Comparator.comparingDouble(Scored::score).reversed())
            .limit(20)
            .map(s -> {
                Map<String, Object> map = buildCandidateMap(s.c(), false, List.of());
                map.put("search_score", (int) Math.round(s.score() * 100));
                return map;
            })
            .toList();
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    public Map<String, Object> buildCandidateMap(Candidate c, boolean full, List<JobApplication> apps) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId().toString());
        map.put("name", c.getName());
        map.put("email", c.getEmail());
        map.put("source", c.getSource());
        map.put("credibility_score", c.getCredibilityScore());
        map.put("created_at", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        if (full) map.put("raw_text", c.getRawText());
        // Parsed CV as object (not string)
        try {
            map.put("parsed", c.getParsed() != null
                ? mapper.readValue(c.getParsed(), new TypeReference<Map<String, Object>>() {}) : null);
        } catch (Exception e) { map.put("parsed", null); }
        map.put("embedding", null); // omit from responses
        // Nested applications
        List<Map<String, Object>> appMaps = apps.stream().map(this::buildAppSummaryMap).toList();
        map.put("applications", appMaps);
        return map;
    }

    private Map<String, Object> buildAppSummaryMap(JobApplication a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId().toString());
        m.put("job_id", a.getJobId() != null ? a.getJobId().toString() : null);
        m.put("candidate_id", a.getCandidateId() != null ? a.getCandidateId().toString() : null);
        m.put("match_score", a.getMatchScore());
        m.put("credibility_score", a.getCredibilityScore());
        m.put("interview_score", a.getInterviewScore());
        m.put("overall_score", a.getOverallScore());
        m.put("status", a.getStatus());
        m.put("interview_room_url", a.getInterviewRoomUrl());
        m.put("interview_date", a.getInterviewDate() != null ? a.getInterviewDate().toString() : null);
        return m;
    }
}
