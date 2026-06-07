package com.lld.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitAnswerRequest {
    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotBlank(message = "Answer is required")
    private String answer;

    @NotNull(message = "Phase index is required")
    private Integer phaseIndex;

    @NotBlank(message = "Question is required")
    private String question;
}
