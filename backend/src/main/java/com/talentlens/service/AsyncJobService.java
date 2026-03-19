package com.talentlens.service;

import com.talentlens.model.Candidate;
import com.talentlens.model.Job;
import com.talentlens.model.JobApplication;
import com.talentlens.repository.CandidateRepository;
import com.talentlens.repository.JobApplicationRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AsyncJobService {

    private final CandidateRepository candidateRepo;
    private final JobApplicationRepository appRepo;
    private final GeminiService gemini;
    private final ScoringService scoring;

    public AsyncJobService(CandidateRepository candidateRepo, JobApplicationRepository appRepo,
                           GeminiService gemini, ScoringService scoring) {
        this.candidateRepo = candidateRepo;
        this.appRepo = appRepo;
        this.gemini = gemini;
        this.scoring = scoring;
    }

    @Async
    public void rescoreAllAsync(Job job) {
        for (Candidate cand : candidateRepo.findAll()) {
            int matchSc;
            try {
                matchSc = scoring.aiMatchScore(job.getTitle(), job.getDescription(), job.getRequirements(), cand.getRawText(), gemini);
            } catch (Exception e) {
                matchSc = scoring.keywordMatchScore(job.getTitle(), job.getDescription(), cand.getRawText());
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
}
