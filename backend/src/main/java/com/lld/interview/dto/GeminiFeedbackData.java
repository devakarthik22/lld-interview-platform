package com.lld.interview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Structured output record — Spring AI deserialises the Gemini response directly into this type
 * via BeanOutputConverter, eliminating manual JSON parsing.
 */
public record GeminiFeedbackData(

        @JsonProperty("ai_reply")
        String aiReply,

        Scores scores,
        String feedback,

        @JsonProperty("model_answer")
        String modelAnswer,

        @JsonProperty("class_diagram")
        List<ClassNode> classDiagram,

        List<String> relationships,

        @JsonProperty("follow_up_questions")
        List<String> followUpQuestions

) {
    public record Scores(
            int clarity,
            @JsonProperty("oop_design") int oopDesign,
            int patterns,
            @JsonProperty("edge_cases") int edgeCases
    ) {}

    public record ClassNode(
            String name,
            String type,
            List<String> members
    ) {}
}
