package com.lld.interview.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.interview.dto.*;
import com.lld.interview.model.InterviewSession;
import com.lld.interview.model.Topic;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAiService {

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.model}")
    private String model;

    private static final List<String> PHASES = List.of(
            "Requirements Gathering",
            "Class Design & Structure",
            "Design Patterns",
            "Edge Cases & Concurrency",
            "Extensibility & Trade-offs"
    );

    // ─── Opening Question ────────────────────────────────────────────────────

    public String generateOpeningQuestion(Topic topic, InterviewSession.ExperienceLevel level) {
        String levelDesc = getLevelDescription(level);
        String prompt = """
                You are an expert LLD interviewer. Start a Low Level Design interview for: "%s" (%s).
                Candidate level: %s.
                
                Phase 1 — Requirements Gathering.
                Greet briefly, state the problem, ask the candidate to clarify requirements (functional & non-functional).
                Keep it under 100 words. No filler phrases like "Sure!" or "Of course!". Be direct and professional.
                """.formatted(topic.getName(), topic.getDescription(), levelDesc);

        return callGemini(prompt);
    }

    // ─── Feedback Generation ────────────────────────────────────────────────

    public FeedbackResponse generateFeedback(
            Topic topic,
            InterviewSession.ExperienceLevel level,
            int phaseIndex,
            String question,
            String answer) {

        String phase = PHASES.get(Math.min(phaseIndex, PHASES.size() - 1));
        String levelDesc = getLevelDescription(level);

        String prompt = """
                You are an expert LLD interviewer evaluating a candidate's answer.

                Topic: "%s" — %s
                Candidate level: %s
                Current phase: "%s" (phase %d of 5)

                Question asked: "%s"
                Candidate's answer: "%s"

                Respond ONLY with valid JSON (no markdown, no backticks, no explanation outside JSON):
                {
                  "ai_reply": "<2-3 conversational sentences spoken directly to the candidate. Acknowledge specific points they made, praise what was good, and highlight one key gap. Sound like a real interviewer, not a rubric.>",
                  "scores": {
                    "clarity": <integer 0-100>,
                    "oop_design": <integer 0-100>,
                    "patterns": <integer 0-100>,
                    "edge_cases": <integer 0-100>
                  },
                  "feedback": "<2-3 sentences of specific, constructive feedback>",
                  "model_answer": "<bullet-point model answer using • character, 4-6 points>",
                  "class_diagram": [
                    {"name": "ClassName", "type": "class|interface|abstract|enum", "members": ["+ method(): ReturnType", "- field: Type"]}
                  ],
                  "relationships": ["ClassA implements InterfaceB", "ClassC uses ClassD", "ClassE extends ClassF"],
                  "follow_up_questions": ["<probing question 1>", "<probing question 2>", "<probing question 3>"]
                }

                Score honestly based on candidate level — a junior is not expected to know what a senior would.
                """.formatted(
                topic.getName(), topic.getDescription(),
                levelDesc,
                phase, phaseIndex + 1,
                question, answer
        );

        String raw = callGemini(prompt);
        return parseFeedback(raw, phaseIndex, phase);
    }

    // ─── Phase Transition ────────────────────────────────────────────────────

    public String generatePhaseTransition(Topic topic, InterviewSession.ExperienceLevel level, int nextPhaseIndex) {
        if (nextPhaseIndex >= PHASES.size()) {
            return "You've completed all phases of the interview. Click \"End & Score\" to see your full results.";
        }
        String nextPhase = PHASES.get(nextPhaseIndex);
        String levelDesc = getLevelDescription(level);
        String prompt = """
                You are an expert LLD interviewer. Moving to the next phase of an LLD interview on "%s".
                Candidate level: %s.

                Phase %d of 5: "%s"

                Write a brief 1-2 sentence transition into this new phase and ask the opening question.
                Be direct and professional. No filler words like "Great!" or "Excellent!".
                Return only the transition + question text, nothing else.
                """.formatted(topic.getName(), levelDesc, nextPhaseIndex + 1, nextPhase);
        return callGemini(prompt);
    }

    // ─── Hint Generation ────────────────────────────────────────────────────

    public String generateHint(Topic topic, InterviewSession.ExperienceLevel level, int phaseIndex, String question) {
        String phase = PHASES.get(Math.min(phaseIndex, PHASES.size() - 1));
        String prompt = """
                Give a short hint (3 bullet points using •, each under 15 words) for a %s engineer answering this LLD question about "%s" in the "%s" phase:
                "%s"
                Do NOT give the full answer — just nudge them in the right direction.
                """.formatted(getLevelDescription(level), topic.getName(), phase, question);
        return callGemini(prompt);
    }

    // ─── Final Summary ───────────────────────────────────────────────────────

    public String generateSummary(Topic topic, InterviewSession.ExperienceLevel level, Map<String, Integer> avgScores, int overall) {
        String prompt = """
                A %s-level candidate just completed an LLD interview on "%s".
                Average scores — Clarity: %d, OOP Design: %d, Patterns: %d, Edge Cases: %d. Overall: %d/100.
                
                Write exactly 3 sentences:
                1. What they did well.
                2. The single biggest area to improve.
                3. One specific design pattern or concept they should study next.
                Be direct, encouraging, and actionable.
                """.formatted(
                level.name().toLowerCase(),
                topic.getName(),
                avgScores.getOrDefault("clarity", 0),
                avgScores.getOrDefault("oop_design", 0),
                avgScores.getOrDefault("patterns", 0),
                avgScores.getOrDefault("edge_cases", 0),
                overall
        );
        return callGemini(prompt);
    }

    // ─── Adaptive Difficulty ────────────────────────────────────────────────

    public String adaptQuestion(Topic topic, InterviewSession.ExperienceLevel level, int phaseIndex,
                                 int lastScore, String baseQuestion) {
        if (lastScore >= 80) {
            return baseQuestion + " Now, how would you handle this at 10x scale with millions of concurrent users?";
        } else if (lastScore < 40) {
            String hint = "\n\nHint: Start by thinking about the core entities and their relationships.";
            return baseQuestion + hint;
        }
        return baseQuestion;
    }

    // ─── Gemini REST Call ────────────────────────────────────────────────────

    private String callGemini(String prompt) {
        try {
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", prompt))
                    )),
                    "generationConfig", Map.of(
                            "temperature", 0.7,
                            "maxOutputTokens", 4096,
                            "topP", 0.95
                    )
            );

            String response = geminiWebClient.post()
                    .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(15))
                            .maxBackoff(Duration.ofSeconds(45))
                            .filter(e -> e instanceof WebClientResponseException wce &&
                                    (wce.getStatusCode().value() == 429 || wce.getStatusCode().value() == 503))
                            .doBeforeRetry(s -> log.warn("Gemini returned {}, retrying (attempt {}/2)",
                                    s.failure() instanceof WebClientResponseException wce ? wce.getStatusCode().value() : "error",
                                    s.totalRetries() + 1)))
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText("");

        } catch (Exception e) {
            log.error("Gemini API call failed: {}", e.getMessage());
            return "I encountered an error generating a response. Please try again.";
        }
    }

    // ─── Parse Feedback JSON ─────────────────────────────────────────────────

    private FeedbackResponse parseFeedback(String raw, int phaseIndex, String phaseName) {
        try {
            String clean = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            // Extract JSON object if there's surrounding text
            int start = clean.indexOf('{');
            int end = clean.lastIndexOf('}');
            if (start >= 0 && end > start) clean = clean.substring(start, end + 1);

            JsonNode node = objectMapper.readTree(clean);

            JsonNode scores = node.path("scores");
            int clarity   = scores.path("clarity").asInt(65);
            int oop       = scores.path("oop_design").asInt(65);
            int patterns  = scores.path("patterns").asInt(60);
            int edgeCases = scores.path("edge_cases").asInt(55);
            int overall   = (clarity + oop + patterns + edgeCases) / 4;

            List<ClassNodeDto> classDiagram = new ArrayList<>();
            JsonNode diagramNode = node.path("class_diagram");
            if (diagramNode.isArray()) {
                for (JsonNode cls : diagramNode) {
                    List<String> members = new ArrayList<>();
                    cls.path("members").forEach(m -> members.add(m.asText()));
                    classDiagram.add(ClassNodeDto.builder()
                            .name(cls.path("name").asText(""))
                            .type(cls.path("type").asText("class"))
                            .members(members)
                            .build());
                }
            }

            List<String> relationships = new ArrayList<>();
            node.path("relationships").forEach(r -> relationships.add(r.asText()));

            List<String> followUps = new ArrayList<>();
            node.path("follow_up_questions").forEach(q -> followUps.add(q.asText()));

            return FeedbackResponse.builder()
                    .phaseIndex(phaseIndex)
                    .phaseName(phaseName)
                    .scores(ScoreDto.builder()
                            .clarity(clarity).oopDesign(oop).patterns(patterns)
                            .edgeCases(edgeCases).overall(overall).build())
                    .aiReply(node.path("ai_reply").asText("I've reviewed your answer. Here's my assessment."))
                    .feedbackText(node.path("feedback").asText(""))
                    .modelAnswer(node.path("model_answer").asText(""))
                    .classDiagram(classDiagram)
                    .relationships(relationships)
                    .followUpQuestions(followUps)
                    .nextPhaseQuestion("")
                    .sessionComplete(false)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse Gemini feedback JSON: {}", e.getMessage());
            return FeedbackResponse.builder()
                    .phaseIndex(phaseIndex)
                    .phaseName(phaseName)
                    .scores(ScoreDto.builder().clarity(65).oopDesign(65).patterns(60).edgeCases(55).overall(61).build())
                    .aiReply("I've reviewed your answer. Please see the detailed feedback below.")
                    .feedbackText(raw.length() > 500 ? raw.substring(0, 500) : raw)
                    .modelAnswer("")
                    .nextPhaseQuestion("")
                    .followUpQuestions(List.of("Can you elaborate on your design?"))
                    .classDiagram(List.of())
                    .relationships(List.of())
                    .sessionComplete(false)
                    .build();
        }
    }

    private String getLevelDescription(InterviewSession.ExperienceLevel level) {
        return switch (level) {
            case JUNIOR -> "junior engineer (0-2 years experience) — expect basic OOP knowledge";
            case MID    -> "mid-level engineer (2-5 years) — expect solid OOP and design pattern awareness";
            case SENIOR -> "senior engineer (5+ years) — expect deep design patterns, trade-offs, and production concerns";
        };
    }

    public List<String> getPhaseNames() {
        return PHASES;
    }
}
