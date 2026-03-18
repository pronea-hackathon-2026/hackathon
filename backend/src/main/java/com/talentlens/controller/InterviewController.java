package com.talentlens.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.repository.JobRepository;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.service.GeminiService;
import com.talentlens.service.ScoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/interviews")
public class InterviewController {

    private final JobApplicationRepository appRepo;
    private final JobRepository jobRepo;
    private final CandidateRepository candidateRepo;
    private final GeminiService gemini;
    private final ScoringService scoring;
    private final ObjectMapper mapper = new ObjectMapper();

    public InterviewController(JobApplicationRepository appRepo, JobRepository jobRepo,
                               CandidateRepository candidateRepo, GeminiService gemini, ScoringService scoring) {
        this.appRepo = appRepo;
        this.jobRepo = jobRepo;
        this.candidateRepo = candidateRepo;
        this.gemini = gemini;
        this.scoring = scoring;
    }

    /** Create a Jitsi Meet room — free, no API key needed. */
    @PostMapping("/invite/{applicationId}")
    public ResponseEntity<?> invite(@PathVariable UUID applicationId) {
        return appRepo.findById(applicationId).map(app -> {
            // Jitsi Meet is free and requires no API key
            String roomName = "talentlens-" + applicationId.toString().substring(0, 8);
            String roomUrl = "https://meet.jit.si/" + roomName;
            app.setInterviewRoomUrl(roomUrl);
            app.setStatus("interview_scheduled");
            appRepo.save(app);
            return ResponseEntity.ok(Map.of("room_url", roomUrl));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Receive transcript + attention events, score everything, store result. */
    @PostMapping("/analyze/{applicationId}")
    public ResponseEntity<?> analyze(@PathVariable UUID applicationId, @RequestBody Map<String, Object> body) {
        return appRepo.findById(applicationId).map(app -> {
            try {
                String transcript = (String) body.getOrDefault("transcript", "");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> attentionEvents =
                    (List<Map<String, Object>>) body.getOrDefault("attention_events", List.of());

                // Get job description for analysis context
                String jobDescription = app.getJobId() != null
                    ? jobRepo.findById(app.getJobId()).map(j -> j.getDescription()).orElse("")
                    : "";

                int attentionScore = scoring.calculateAttentionScore(attentionEvents);
                Map<String, Object> analysis;
                try {
                    analysis = scoring.analyzeInterview(transcript, jobDescription);
                } catch (Exception geminiEx) {
                    // Fallback analysis if Gemini fails
                    int wordCount = transcript.split("\\s+").length;
                    int baseScore = Math.min(75, 40 + wordCount / 10);
                    analysis = new java.util.LinkedHashMap<>();
                    analysis.put("answer_quality_score", baseScore);
                    analysis.put("communication_score", baseScore);
                    analysis.put("summary", "Interview completed. AI analysis unavailable — scores are estimated.");
                    analysis.put("strengths", List.of("Interview completed successfully"));
                    analysis.put("concerns", List.of("Manual review recommended"));
                    analysis.put("per_question", List.of());
                }

                int answerQuality = toInt(analysis.get("answer_quality_score"));
                int communication = toInt(analysis.get("communication_score"));
                int interviewScore = (answerQuality + communication + attentionScore) / 3;

                int credScore = app.getCredibilityScore() != null ? app.getCredibilityScore() : 0;
                int overallScore = scoring.calculateOverallScore(app.getMatchScore(), credScore, interviewScore);

                analysis.put("attention_score", attentionScore);
                analysis.put("interview_score", interviewScore);

                app.setTranscript(transcript);
                app.setAnalysis(mapper.writeValueAsString(analysis));
                app.setAttentionEvents(mapper.writeValueAsString(attentionEvents));
                app.setInterviewScore(interviewScore);
                app.setOverallScore(overallScore);
                app.setStatus("interview_done");
                appRepo.save(app);

                return ResponseEntity.ok(analysis);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Generate tailored interview questions using Gemini. */
    @PostMapping("/questions/{applicationId}")
    public ResponseEntity<?> generateQuestions(@PathVariable UUID applicationId) {
        return appRepo.findById(applicationId).map(app -> {
            try {
                String jobTitle = app.getJobId() != null
                    ? jobRepo.findById(app.getJobId()).map(j -> j.getTitle()).orElse("") : "";
                String jobDesc = app.getJobId() != null
                    ? jobRepo.findById(app.getJobId()).map(j -> j.getDescription()).orElse("") : "";

                String candidateParsed = app.getCandidateId() != null
                    ? candidateRepo.findById(app.getCandidateId()).map(c -> c.getParsed()).orElse("{}") : "{}";

                String system = """
                    You are an expert interviewer. Generate 5-7 tailored interview questions based on the
                    candidate's CV and the job. Return ONLY a JSON array of question strings.
                    """;
                String prompt = "Job: " + jobTitle + "\nDescription: " + jobDesc + "\nCandidate CV: " + candidateParsed;

                List<Object> questions = gemini.generateJsonArray(system, prompt);
                return ResponseEntity.ok(Map.of("questions", questions));
            } catch (Exception e) {
                // Fallback: return generic questions so the interview can still proceed
                List<String> fallback = List.of(
                    "Tell me about yourself and your most relevant experience.",
                    "What technical skills do you bring to this role?",
                    "Describe a challenging project you led and how you handled it.",
                    "How do you approach mentoring or collaborating with other engineers?",
                    "Where do you see yourself growing in the next 2-3 years?"
                );
                return ResponseEntity.ok(Map.of("questions", fallback));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    private int toInt(Object val) {
        if (val instanceof Number n) return n.intValue();
        return 0;
    }
}
