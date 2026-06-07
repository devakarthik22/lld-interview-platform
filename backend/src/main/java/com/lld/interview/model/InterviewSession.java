package com.lld.interview.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interview_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String topicId;

    @Column(nullable = false)
    private String topicName;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ExperienceLevel level;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    private int currentPhase;   // 0-4
    private int totalPhases;

    // Aggregate scores across all phases
    private Double avgClarity;
    private Double avgOopDesign;
    private Double avgPatterns;
    private Double avgEdgeCases;
    private Double overallScore;

    @Column(updatable = false)
    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<QuestionResponse> responses = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        startedAt = LocalDateTime.now();
        if (status == null) status = SessionStatus.IN_PROGRESS;
        if (totalPhases == 0) totalPhases = 5;
    }

    public enum SessionStatus {
        IN_PROGRESS, COMPLETED, ABANDONED
    }

    public enum ExperienceLevel {
        JUNIOR, MID, SENIOR
    }
}
