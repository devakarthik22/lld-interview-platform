package com.lld.interview.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SessionResponse {
    private String sessionId;
    private String topicId;
    private String topicName;
    private String level;
    private int currentPhase;
    private int totalPhases;
    private String status;
    private String firstQuestion;
    private LocalDateTime startedAt;
}
