package com.lld.interview.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PhaseResultDto {
    private int phaseIndex;
    private String phaseName;
    private String question;
    private String candidateAnswer;
    private ScoreDto scores;
    private String feedbackText;
}
