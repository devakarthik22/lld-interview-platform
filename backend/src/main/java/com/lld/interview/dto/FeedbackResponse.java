package com.lld.interview.dto;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FeedbackResponse {
    private String sessionId;
    private int phaseIndex;
    private String phaseName;
    private ScoreDto scores;
    private String aiReply;
    private String feedbackText;
    private String modelAnswer;
    private List<ClassNodeDto> classDiagram;
    private List<String> relationships;
    private List<String> followUpQuestions;
    private String nextPhaseQuestion;
    private boolean sessionComplete;
}
