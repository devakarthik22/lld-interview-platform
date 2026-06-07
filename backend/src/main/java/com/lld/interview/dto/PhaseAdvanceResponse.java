package com.lld.interview.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PhaseAdvanceResponse {
    private String sessionId;
    private int newPhaseIndex;
    private String newPhaseName;
    private String openingQuestion;
    private boolean sessionComplete;
}
