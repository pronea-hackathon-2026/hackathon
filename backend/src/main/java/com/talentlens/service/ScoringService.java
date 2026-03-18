package com.talentlens.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ScoringService {

    private final GeminiService gemini;
    private final ObjectMapper mapper = new ObjectMapper();

    public ScoringService(GeminiService gemini) {
        this.gemini = gemini;
    }

    // ── Credibility score (0-100) ──────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public int calculateCredibility(Map<String, Object> parsed, CvParserService cvParser) {
        int score = 0;

        // +20 contact info
        if (parsed.get("email") != null && parsed.get("phone") != null) score += 20;

        // +15 education
        List<?> education = (List<?>) parsed.getOrDefault("education", List.of());
        if (!education.isEmpty()) score += 15;

        // +15 skills > 5
        List<?> skills = (List<?>) parsed.getOrDefault("skills", List.of());
        if (skills.size() > 5) score += 15;

        // +25 average tenure > 18 months
        List<Map<String, Object>> experience = (List<Map<String, Object>>) parsed.getOrDefault("experience", List.of());
        if (!experience.isEmpty()) {
            long totalMonths = experience.stream()
                .map(e -> e.get("duration_months"))
                .filter(d -> d instanceof Number)
                .mapToLong(d -> ((Number) d).longValue())
                .filter(d -> d > 0)
                .sum();
            long count = experience.stream()
                .map(e -> e.get("duration_months"))
                .filter(d -> d instanceof Number && ((Number) d).longValue() > 0)
                .count();
            if (count > 0 && (double) totalMonths / count > 18) score += 25;
        }

        // +15 upward career progression (ask Gemini)
        if (!experience.isEmpty() && experience.size() >= 2) {
            if (cvParser.checkCareerProgression(experience)) score += 15;
        }

        // -5 per employment gap
        List<?> gaps = (List<?>) parsed.getOrDefault("gaps", List.of());
        score -= 5 * gaps.size();

        // -5 per red flag
        List<?> redFlags = (List<?>) parsed.getOrDefault("red_flags", List.of());
        score -= 5 * redFlags.size();

        return Math.max(0, Math.min(100, score));
    }

    // ── Cosine similarity ──────────────────────────────────────────────────────

    public double cosineSimilarity(List<Double> a, List<Double> b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty()) return 0;
        double dot = 0, normA = 0, normB = 0;
        int len = Math.min(a.size(), b.size());
        for (int i = 0; i < len; i++) {
            dot += a.get(i) * b.get(i);
            normA += a.get(i) * a.get(i);
            normB += b.get(i) * b.get(i);
        }
        return (normA > 0 && normB > 0) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    }

    public int matchScore(List<Double> candidateEmb, List<Double> jobEmb) {
        return (int) Math.round(cosineSimilarity(candidateEmb, jobEmb) * 100);
    }

    // ── Attention score ────────────────────────────────────────────────────────

    public int calculateAttentionScore(List<Map<String, Object>> events) {
        int score = 100;
        for (Map<String, Object> event : events) {
            String type = (String) event.getOrDefault("type", "");
            switch (type) {
                case "phone_detected" -> score -= 20;
                case "tab_switch", "window_blur" -> score -= 10;
                case "gaze_away" -> score -= 5;
            }
        }
        return Math.max(0, score);
    }

    // ── Overall score (30% match + 20% cred + 50% interview) ──────────────────

    public int calculateOverallScore(int matchScore, int credScore, int interviewScore) {
        return (int) Math.round(matchScore * 0.30 + credScore * 0.20 + interviewScore * 0.50);
    }

    // ── Interview analysis ─────────────────────────────────────────────────────

    private static final String ANALYSIS_SYSTEM = """
        You are an expert interviewer. Analyse the interview transcript against the job description.
        Return ONLY valid JSON (no markdown, no explanation) with this structure:
        {
          "answer_quality_score": integer 0-100,
          "communication_score": integer 0-100,
          "summary": "2-3 sentence summary",
          "strengths": ["up to 3 strings"],
          "concerns": ["up to 3 strings"],
          "per_question": [{"question": "string", "score": integer 0-100, "notes": "string"}]
        }
        """;

    public Map<String, Object> analyzeInterview(String transcript, String jobDescription) {
        String prompt = "Job Description:\n" + jobDescription + "\n\nTranscript:\n" + transcript;
        return gemini.generateJson(ANALYSIS_SYSTEM, prompt);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public List<Double> parseEmbedding(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, new TypeReference<List<Double>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    public String serializeEmbedding(List<Double> embedding) {
        try {
            return mapper.writeValueAsString(embedding);
        } catch (Exception e) {
            return null;
        }
    }
}
