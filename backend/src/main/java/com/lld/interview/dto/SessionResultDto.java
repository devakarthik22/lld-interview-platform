package com.lld.interview.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SessionResultDto {
    private String sessionId;
    private String topicName;
    private String level;
    private ScoreDto averageScores;
    private String aiSummary;
    private List<PhaseResultDto> phaseResults;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
