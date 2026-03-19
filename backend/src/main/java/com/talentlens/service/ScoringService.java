package com.talentlens.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    // ── AI match score via Gemini text generation ─────────────────────────────

    public int aiMatchScore(String jobTitle, String jobDescription, String requirementsJson, String candidateRawText, GeminiService gemini) {
        if (candidateRawText == null || candidateRawText.isBlank()) return 0;

        StringBuilder ctx = new StringBuilder();
        ctx.append("Job Title: ").append(jobTitle).append("\n");

        if (requirementsJson != null && !requirementsJson.isBlank()) {
            try {
                Map<String, Object> req = mapper.readValue(requirementsJson, new TypeReference<Map<String, Object>>() {});
                appendIfPresent(ctx, "Seniority", req.get("seniority"));
                appendIfPresent(ctx, "Location", req.get("location_type"));
                appendIfPresent(ctx, "Employment Type", req.get("employment_type"));
                appendIfPresent(ctx, "Education Required", req.get("education"));
                Object minYears = req.get("min_years_experience");
                Object maxYears = req.get("max_years_experience");
                if (minYears != null || maxYears != null) {
                    ctx.append("Experience: ").append(minYears != null ? minYears : "0")
                       .append("-").append(maxYears != null ? maxYears : "any").append(" years\n");
                }
                appendListIfPresent(ctx, "REQUIRED SKILLS", req.get("required_skills"));
                appendListIfPresent(ctx, "NICE-TO-HAVE SKILLS", req.get("nice_to_have_skills"));
                appendListIfPresent(ctx, "LANGUAGES", req.get("languages"));
                appendListIfPresent(ctx, "KEY RESPONSIBILITIES", req.get("responsibilities"));
                appendIfPresent(ctx, "SUCCESS LOOKS LIKE", req.get("success_description"));
                appendListIfPresent(ctx, "DEAL-BREAKERS (disqualifying)", req.get("dealbreakers"));
                appendListIfPresent(ctx, "GREEN FLAGS (strong positive signals)", req.get("green_flags"));
                Object weights = req.get("scoring_weights");
                if (weights instanceof Map<?,?> wMap) {
                    ctx.append("SCORING PRIORITY: technical_skills=").append(wMap.get("technical_skills"))
                       .append("%, experience=").append(wMap.get("experience_years"))
                       .append("%, domain=").append(wMap.get("domain_background"))
                       .append("%, education=").append(wMap.get("education"))
                       .append("%, trajectory=").append(wMap.get("career_trajectory")).append("%\n");
                }
            } catch (Exception ignored) {}
        }

        if (jobDescription != null && !jobDescription.isBlank()) {
            ctx.append("\nADDITIONAL DESCRIPTION:\n").append(jobDescription).append("\n");
        }

        String prompt = "Rate how well this candidate matches the job on a scale of 0-100. Return ONLY a single integer, nothing else.\n\n"
            + ctx
            + "\nCandidate CV:\n"
            + (candidateRawText.length() > 3000 ? candidateRawText.substring(0, 3000) : candidateRawText);

        String raw = gemini.generate("You are a recruiting expert. Return only a number.", prompt).strip();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\d+").matcher(raw);
        if (m.find()) return Math.min(100, Math.max(0, Integer.parseInt(m.group())));
        return 0;
    }

    @SuppressWarnings("unchecked")
    private void appendListIfPresent(StringBuilder sb, String label, Object value) {
        if (value instanceof List<?> list && !list.isEmpty()) {
            sb.append(label).append(": ").append(String.join(", ", (List<String>)(List<?>)list)).append("\n");
        }
    }

    private void appendIfPresent(StringBuilder sb, String label, Object value) {
        if (value != null && !value.toString().isBlank()) {
            sb.append(label).append(": ").append(value).append("\n");
        }
    }

    // ── Keyword-based match (fallback when embeddings unavailable) ────────────

    public int keywordMatchScore(String jobTitle, String jobDescription, String candidateRawText) {
        if ((jobTitle == null || jobTitle.isBlank()) && (jobDescription == null || jobDescription.isBlank())) return 0;
        if (candidateRawText == null || candidateRawText.isBlank()) return 0;

        Set<String> stopWords = Set.of("and","the","for","with","you","are","this","that","have","will",
            "from","your","our","not","can","but","all","any","its","been","they","more","also","into");

        Function<String, Set<String>> tokenize = text ->
            Arrays.stream(text.toLowerCase().split("[^a-z0-9]+"))
                .filter(w -> w.length() > 3 && !stopWords.contains(w))
                .collect(Collectors.toSet());

        Set<String> jobWords = tokenize.apply((jobTitle != null ? jobTitle : "") + " " + (jobDescription != null ? jobDescription : ""));
        Set<String> candWords = tokenize.apply(candidateRawText);

        if (jobWords.isEmpty()) return 0;
        long matches = jobWords.stream().filter(candWords::contains).count();
        // Scale: full overlap = 100, but cap reasonably since CVs have more unique words
        return (int) Math.min(100, Math.round((double) matches / jobWords.size() * 150));
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
        Also consider the candidate's answers to the custom application questions when evaluating them.
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

    public Map<String, Object> analyzeInterview(String transcript, String jobDescription, String customAnswersJson, String requirementsJson) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Job Description:\n").append(jobDescription).append("\n\n");

        // Include custom application questions and answers if available
        if (customAnswersJson != null && !customAnswersJson.isBlank() && requirementsJson != null) {
            try {
                Map<String, Object> answers = mapper.readValue(customAnswersJson, new TypeReference<Map<String, Object>>() {});
                Map<String, Object> requirements = mapper.readValue(requirementsJson, new TypeReference<Map<String, Object>>() {});
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> questions = (List<Map<String, Object>>) requirements.get("application_questions");

                if (questions != null && !questions.isEmpty() && !answers.isEmpty()) {
                    prompt.append("=== CANDIDATE'S APPLICATION ANSWERS ===\n");
                    prompt.append("(The candidate answered these questions when applying. Consider their responses in your evaluation.)\n\n");
                    for (Map<String, Object> q : questions) {
                        String qId = (String) q.get("id");
                        String qText = (String) q.get("question");
                        Object answer = answers.get(qId);
                        if (qText != null && answer != null) {
                            prompt.append("Q: ").append(qText).append("\n");
                            prompt.append("A: ").append(answer).append("\n\n");
                        }
                    }
                    prompt.append("=== END OF APPLICATION ANSWERS ===\n\n");
                }
            } catch (Exception ignored) {
                // If parsing fails, continue without custom answers
            }
        }

        prompt.append("Interview Transcript:\n").append(transcript);
        return gemini.generateJson(ANALYSIS_SYSTEM, prompt.toString());
    }

    // Overload for backward compatibility
    public Map<String, Object> analyzeInterview(String transcript, String jobDescription) {
        return analyzeInterview(transcript, jobDescription, null, null);
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
