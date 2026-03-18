package com.talentlens.repository;

import com.talentlens.model.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {
    List<JobApplication> findByCandidateId(UUID candidateId);
    List<JobApplication> findByJobId(UUID jobId);
    Optional<JobApplication> findByCandidateIdAndJobId(UUID candidateId, UUID jobId);
}
