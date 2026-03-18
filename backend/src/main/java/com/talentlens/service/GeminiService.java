package com.talentlens.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

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
        Map<String, Object> body = Map.of(
            "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage)))),
            "generationConfig", Map.of("temperature", 0.1, "maxOutputTokens", 4096)
        );

        String url = baseUrl + "/models/gemini-1.5-flash:generateContent?key=" + apiKey;
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
     * Generate text and return as parsed JSON (strips markdown fences if present).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> generateJson(String systemPrompt, String userMessage) {
        String raw = generate(systemPrompt, userMessage).strip();
        // Strip markdown code fences
        if (raw.startsWith("```")) {
            String[] lines = raw.split("\n");
            StringBuilder sb = new StringBuilder();
            for (int i = 1; i < lines.length; i++) {
                if (!lines[i].equals("```")) sb.append(lines[i]).append("\n");
            }
            raw = sb.toString().strip();
        }
        try {
            return mapper.readValue(raw, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Gemini returned invalid JSON: " + raw, e);
        }
    }

    /**
     * Generate a JSON array (strips markdown fences if present).
     */
    @SuppressWarnings("unchecked")
    public List<Object> generateJsonArray(String systemPrompt, String userMessage) {
        String raw = generate(systemPrompt, userMessage).strip();
        if (raw.startsWith("```")) {
            String[] lines = raw.split("\n");
            StringBuilder sb = new StringBuilder();
            for (int i = 1; i < lines.length; i++) {
                if (!lines[i].equals("```")) sb.append(lines[i]).append("\n");
            }
            raw = sb.toString().strip();
        }
        try {
            return mapper.readValue(raw, List.class);
        } catch (Exception e) {
            throw new RuntimeException("Gemini returned invalid JSON array: " + raw, e);
        }
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
