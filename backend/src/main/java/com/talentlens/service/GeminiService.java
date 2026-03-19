package com.talentlens.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.base-url}")
    private String baseUrl;

    private final RestTemplate rest = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Generate text using Gemini 1.5 Flash.
     */
    @SuppressWarnings("unchecked")
    public String generate(String systemPrompt, String userMessage) {
        String combinedMessage = systemPrompt + "\n\n" + userMessage;
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("parts", List.of(Map.of("text", combinedMessage)))),
            "generationConfig", Map.of("temperature", 0.1, "maxOutputTokens", 4096)
        );

        String url = baseUrl + "/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map> response = rest.exchange(
            url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class
        );

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    /**
     * Generate text and return as parsed JSON (extracts first {...} block from response).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> generateJson(String systemPrompt, String userMessage) {
        String raw = generate(systemPrompt, userMessage).strip();
        int start = raw.indexOf("{");
        int end = raw.lastIndexOf("}");
        if (start != -1 && end > start) raw = raw.substring(start, end + 1);
        try {
            return mapper.readValue(raw, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Gemini returned invalid JSON: " + raw, e);
        }
    }

    /**
     * Generate a JSON array (extracts first [...] block from response).
     */
    @SuppressWarnings("unchecked")
    public List<Object> generateJsonArray(String systemPrompt, String userMessage) {
        String raw = generate(systemPrompt, userMessage).strip();
        int start = raw.indexOf("[");
        int end = raw.lastIndexOf("]");
        if (start != -1 && end > start) raw = raw.substring(start, end + 1);
        try {
            return mapper.readValue(raw, List.class);
        } catch (Exception e) {
            throw new RuntimeException("Gemini returned invalid JSON array: " + raw, e);
        }
    }

    /**
     * Transcribe interview audio using Gemini inline_data (base64).
     * Works for audio/webm files up to ~15 MB — well within a typical interview recording.
     */
    @SuppressWarnings("unchecked")
    public String transcribeInterviewAudio(byte[] audioData, String mimeType, List<String> questions) {
        // Strip codec parameters — Gemini only wants the base MIME type (e.g. "audio/webm")
        String baseMime = mimeType.contains(";") ? mimeType.split(";")[0].trim() : mimeType;

        String base64Audio = java.util.Base64.getEncoder().encodeToString(audioData);

        String questionsStr = questions.isEmpty() ? "" :
            "\n\nThe interview questions (in order) were:\n" +
            IntStream.range(0, questions.size())
                .mapToObj(i -> "Q" + (i + 1) + ": " + questions.get(i))
                .collect(Collectors.joining("\n"));

        String prompt = "This is a self-recorded job interview. Transcribe all speech from the candidate. "
            + "Format the output as question-and-answer pairs: 'Q{n}: [question text]\\nA: [candidate's answer]' for each question."
            + questionsStr
            + "\n\nProvide a complete, accurate transcription of everything the candidate said.";

        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("parts", List.of(
                Map.of("text", prompt),
                Map.of("inline_data", Map.of("mime_type", baseMime, "data", base64Audio))
            ))),
            "generationConfig", Map.of("temperature", 0.0, "maxOutputTokens", 8192)
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map> response = rest.exchange(
            url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class
        );

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    /**
     * Generate embeddings using text-embedding-004 (768 dimensions).
     */
    @SuppressWarnings("unchecked")
    public List<Double> embed(String text) {
        // Trim to avoid token limits
        String trimmed = text.length() > 8000 ? text.substring(0, 8000) : text;

        Map<String, Object> body = Map.of(
            "model", "models/text-embedding-004",
            "content", Map.of("parts", List.of(Map.of("text", trimmed)))
        );

        String url = baseUrl + "/models/text-embedding-004:embedContent?key=" + apiKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map> response = rest.exchange(
            url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class
        );

        Map<String, Object> embedding = (Map<String, Object>) response.getBody().get("embedding");
        return (List<Double>) embedding.get("values");
    }
}
