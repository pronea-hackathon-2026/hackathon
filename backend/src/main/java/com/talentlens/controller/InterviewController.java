package com.talentlens.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.JobApplicationRepository;
import com.talentlens.repository.JobRepository;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.service.GeminiService;
import com.talentlens.service.ScoringService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileInputStream;
import java.nio.file.*;
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

                // Get job description and requirements for analysis context
                String jobDescription = "";
                String jobRequirements = null;
                if (app.getJobId() != null) {
                    var jobOpt = jobRepo.findById(app.getJobId());
                    if (jobOpt.isPresent()) {
                        jobDescription = jobOpt.get().getDescription() != null ? jobOpt.get().getDescription() : "";
                        jobRequirements = jobOpt.get().getRequirements();
                    }
                }

                // Get candidate's custom answers
                String customAnswers = app.getCustomAnswers();

                int attentionScore = scoring.calculateAttentionScore(attentionEvents);
                Map<String, Object> analysis;
                try {
                    analysis = scoring.analyzeInterview(transcript, jobDescription, customAnswers, jobRequirements);
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
                app.setQuestions(mapper.writeValueAsString(questions));
                app.setCurrentQuestionIndex(0);
                appRepo.save(app);
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
                try {
                    app.setQuestions(mapper.writeValueAsString(fallback));
                    app.setCurrentQuestionIndex(0);
                    appRepo.save(app);
                } catch (Exception ignored) {}
                return ResponseEntity.ok(Map.of("questions", fallback));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Get the live session state (questions + current index) — polled by candidate view. */
    @GetMapping("/session/{applicationId}")
    public ResponseEntity<?> getSession(@PathVariable UUID applicationId) {
        return appRepo.findById(applicationId).map(app -> {
            try {
                List<Object> questions = app.getQuestions() != null
                    ? mapper.readValue(app.getQuestions(), List.class)
                    : List.of();
                int index = app.getCurrentQuestionIndex() != null ? app.getCurrentQuestionIndex() : 0;
                return ResponseEntity.ok(Map.of("questions", questions, "current_index", index));
            } catch (Exception e) {
                return ResponseEntity.ok(Map.of("questions", List.of(), "current_index", 0));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** HR advances the current question — candidate view polls this. */
    @PutMapping("/session/{applicationId}/question")
    public ResponseEntity<?> setCurrentQuestion(@PathVariable UUID applicationId, @RequestBody Map<String, Object> body) {
        return appRepo.findById(applicationId).map(app -> {
            int index = body.get("current_index") instanceof Number n ? n.intValue() : 0;
            app.setCurrentQuestionIndex(index);
            appRepo.save(app);
            return ResponseEntity.ok(Map.of("current_index", index));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Receive video recording — saves files immediately and returns 200.
     * Transcription + analysis run in a background thread so the candidate
     * hits /thank-you without waiting for Gemini.
     */
    @PostMapping(value = "/recording/{applicationId}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadRecording(
            @PathVariable UUID applicationId,
            @RequestParam("video") MultipartFile videoFile,
            @RequestParam(value = "audio", required = false) MultipartFile audioFile) {

        var appOpt = appRepo.findById(applicationId);
        if (appOpt.isEmpty()) return ResponseEntity.notFound().build();
        var app = appOpt.get();

        try {
            // ── 1. Save files to disk immediately ─────────────────────────
            Path videosDir = Path.of("./data/videos");
            Files.createDirectories(videosDir);

            String ext = (videoFile.getOriginalFilename() != null && videoFile.getOriginalFilename().endsWith(".mp4")) ? ".mp4" : ".webm";
            String filename = applicationId + ext;
            byte[] videoBytes = videoFile.getBytes();
            Files.write(videosDir.resolve(filename), videoBytes);

            byte[] audioBytes = (audioFile != null && !audioFile.isEmpty()) ? audioFile.getBytes() : null;
            String audioMime  = (audioFile != null) ? audioFile.getContentType() : "audio/webm";

            app.setVideoUrl("/interviews/videos/" + filename);
            app.setStatus("interview_done");
            appRepo.save(app);

            // ── 2. Kick off background analysis — don't block the response ─
            final UUID appId = applicationId;
            final byte[] finalAudioBytes = audioBytes;
            final String finalAudioMime  = audioMime != null ? audioMime : "audio/webm";

            new Thread(() -> analyzeInBackground(appId, finalAudioBytes, videoBytes, finalAudioMime)).start();

            return ResponseEntity.ok(Map.of("status", "processing"));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private void analyzeInBackground(UUID applicationId, byte[] audioBytes, byte[] videoBytes, String audioMime) {
        try {
            var app = appRepo.findById(applicationId).orElseThrow();

            // ── Load questions ─────────────────────────────────────────────
            List<String> questions = List.of();
            if (app.getQuestions() != null) {
                questions = mapper.readValue(app.getQuestions(), new TypeReference<List<String>>() {});
            }

            // ── Transcribe (audio file preferred; fall back to video bytes) ─
            byte[] sourceBytes = (audioBytes != null) ? audioBytes : videoBytes;
            String transcript;
            try {
                transcript = gemini.transcribeInterviewAudio(sourceBytes, audioMime, questions);
            } catch (Exception e) {
                System.err.println("[TalentLens] Transcription failed: " + e.getMessage());
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < questions.size(); i++) {
                    sb.append("Q").append(i + 1).append(": ").append(questions.get(i))
                      .append("\nA: [Transcription unavailable]\n\n");
                }
                transcript = sb.toString();
            }

            // ── Analyze ────────────────────────────────────────────────────
            String jobDescription = app.getJobId() != null
                ? jobRepo.findById(app.getJobId()).map(j -> j.getDescription()).orElse("") : "";

            Map<String, Object> analysis;
            try {
                analysis = scoring.analyzeInterview(transcript, jobDescription);
            } catch (Exception e) {
                analysis = new java.util.LinkedHashMap<>();
                analysis.put("answer_quality_score", 60);
                analysis.put("communication_score", 60);
                analysis.put("summary", "Interview recorded. AI analysis unavailable — manual review recommended.");
                analysis.put("strengths", List.of("Completed the self-recorded interview"));
                analysis.put("concerns", List.of("Automated analysis failed — please review manually"));
                analysis.put("per_question", List.of());
            }

            int answerQuality  = toInt(analysis.get("answer_quality_score"));
            int communication  = toInt(analysis.get("communication_score"));
            int interviewScore = (answerQuality + communication) / 2;
            int credScore      = app.getCredibilityScore() != null ? app.getCredibilityScore() : 0;
            int overallScore   = scoring.calculateOverallScore(app.getMatchScore(), credScore, interviewScore);

            analysis.put("attention_score", 100);
            analysis.put("interview_score", interviewScore);

            app.setTranscript(transcript);
            app.setAnalysis(mapper.writeValueAsString(analysis));
            app.setInterviewScore(interviewScore);
            app.setOverallScore(overallScore);
            appRepo.save(app);

            System.out.println("[TalentLens] Analysis complete for " + applicationId);
        } catch (Exception e) {
            System.err.println("[TalentLens] Background analysis failed for " + applicationId + ": " + e.getMessage());
        }
    }

    /** Serve recorded interview video files. */
    @GetMapping("/videos/{filename}")
    public ResponseEntity<InputStreamResource> serveVideo(@PathVariable String filename) {
        try {
            // Sanitize — only allow alphanumeric, hyphens, dots
            if (!filename.matches("[\\w\\-]+\\.(webm|mp4)")) {
                return ResponseEntity.badRequest().build();
            }
            Path videoPath = Path.of("./data/videos").resolve(filename);
            if (!Files.exists(videoPath)) return ResponseEntity.notFound().build();

            String mimeType = filename.endsWith(".mp4") ? "video/mp4" : "video/webm";
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .contentLength(Files.size(videoPath))
                .body(new InputStreamResource(new FileInputStream(videoPath.toFile())));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private int toInt(Object val) {
        if (val instanceof Number n) return n.intValue();
        return 0;
    }
}
