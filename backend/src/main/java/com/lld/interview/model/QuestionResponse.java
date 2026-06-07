package com.lld.interview.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "question_responses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    private int phaseIndex;

    @Column(nullable = false)
    private String phaseName;

    @Column(columnDefinition = "TEXT")
    private String question;

    @Column(columnDefinition = "TEXT")
    private String candidateAnswer;

    // AI Feedback
    @Column(columnDefinition = "TEXT")
    private String feedbackText;

    @Column(columnDefinition = "TEXT")
    private String modelAnswer;

    @Column(columnDefinition = "TEXT")
    private String classDiagramJson;   // JSON array of ClassNode

    @Column(columnDefinition = "TEXT")
    private String followUpQuestionsJson;  // JSON array of strings

    // Scores (0-100)
    private Integer clarityScore;
    private Integer oopDesignScore;
    private Integer patternsScore;
    private Integer edgeCasesScore;

    private LocalDateTime answeredAt;

    @PrePersist
    protected void onCreate() {
        answeredAt = LocalDateTime.now();
    }
}
