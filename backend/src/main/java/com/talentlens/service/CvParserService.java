package com.talentlens.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;

@Service
public class CvParserService {

    private final GeminiService gemini;

    public CvParserService(GeminiService gemini) {
        this.gemini = gemini;
    }

    public String extractText(byte[] fileBytes, String filename) throws IOException {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            try (PDDocument doc = Loader.loadPDF(fileBytes)) {
                return new PDFTextStripper().getText(doc);
            }
        } else if (lower.endsWith(".docx")) {
            try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(fileBytes));
                 XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
                return extractor.getText();
            }
        } else {
            throw new IllegalArgumentException("Unsupported file type: " + filename + ". Use PDF or DOCX.");
        }
    }

    private static final String PARSE_SYSTEM = """
        You are a CV parser. Extract structured data from the CV text and return ONLY valid JSON with no markdown, no explanation.
        Return exactly this structure:
        {
          "name": "string",
          "email": "string or null",
          "phone": "string or null",
          "skills": ["array of strings"],
          "languages": ["array of strings"],
          "education": [{"degree": "string", "institution": "string", "year": "string or null"}],
          "experience": [{"company": "string", "role": "string", "start_date": "YYYY-MM or null",
            "end_date": "YYYY-MM or null", "duration_months": integer or null, "description": "string"}],
          "gaps": [{"start_date": "YYYY-MM", "end_date": "YYYY-MM", "duration_months": integer}],
          "red_flags": ["array of strings describing anything suspicious"]
        }
        """;

    public Map<String, Object> parseCv(String rawText) {
        return gemini.generateJson(PARSE_SYSTEM, "Parse this CV:\n\n" + rawText);
    }

    private static final String PROGRESSION_SYSTEM = """
        You are an HR analyst. Given a list of job experience entries in JSON, determine if the career
        shows upward progression (roles getting more senior over time).
        Return ONLY: {"upward_progression": true} or {"upward_progression": false}
        """;

    public boolean checkCareerProgression(Object experience) {
        try {
            String json = experience.toString();
            Map<String, Object> result = gemini.generateJson(PROGRESSION_SYSTEM, json);
            return Boolean.TRUE.equals(result.get("upward_progression"));
        } catch (Exception e) {
            return false;
        }
    }
}
