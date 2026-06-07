package com.lld.interview.dto;

import com.lld.interview.model.InterviewSession;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartSessionRequest {
    @NotBlank(message = "Topic ID is required")
    private String topicId;

    @NotNull(message = "Experience level is required")
    private InterviewSession.ExperienceLevel level;
}
