package com.lld.interview.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.interview.dto.*;
import com.lld.interview.model.InterviewSession;
import com.lld.interview.model.Topic;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAiService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    private static final List<String> PHASES = List.of(
            "Requirements Gathering",
            "Class Design & Structure",
            "Design Patterns",
            "Edge Cases & Concurrency",
            "Extensibility & Trade-offs"
    );

    // ─── Opening Question ────────────────────────────────────────────────────

    public String generateOpeningQuestion(Topic topic, InterviewSession.ExperienceLevel level) {
        String prompt = """
                You are an expert LLD interviewer. Start a Low Level Design interview for: "%s" (%s).
                Candidate level: %s.

                Phase 1 — Requirements Gathering.
                Greet briefly, state the problem, ask the candidate to clarify requirements (functional & non-functional).
                Keep it under 100 words. No filler phrases like "Sure!" or "Of course!". Be direct and professional.
                """.formatted(topic.getName(), topic.getDescription(), getLevelDescription(level));

        return call(prompt);
    }

    // ─── Feedback Generation ─────────────────────────────────────────────────

    public FeedbackResponse generateFeedback(Topic topic, InterviewSession.ExperienceLevel level,
                                             int phaseIndex, String question, String answer) {

        String phase = PHASES.get(Math.min(phaseIndex, PHASES.size() - 1));

        String prompt = """
                You are an expert LLD interviewer evaluating a candidate's answer.

                Topic: "%s" — %s
                Candidate level: %s
                Current phase: "%s" (phase %d of 5)

                Question asked: "%s"
                Candidate's answer: "%s"

                Return ONLY a valid JSON object — no markdown fences, no extra text, no explanation before or after.
                Use exactly this structure:
                {
                  "ai_reply": "2-3 conversational sentences spoken directly to the candidate. Acknowledge what they said, praise good points, highlight one key gap.",
                  "scores": {
                    "clarity": <int 0-100>,
                    "oop_design": <int 0-100>,
                    "patterns": <int 0-100>,
                    "edge_cases": <int 0-100>
                  },
                  "feedback": "2-3 sentences of specific constructive feedback",
                  "model_answer": "Bullet-point model answer using • character, 4-6 points",
                  "class_diagram": [
                    { "name": "ClassName", "type": "class|interface|abstract|enum", "members": ["+method():void", "-field:Type"] }
                  ],
                  "relationships": ["ClassA implements InterfaceB", "ClassC extends ClassD"],
                  "follow_up_questions": ["question1", "question2", "question3"]
                }
                """.formatted(
                topic.getName(), topic.getDescription(),
                getLevelDescription(level),
                phase, phaseIndex + 1,
                question, answer
        );

        String raw = call(prompt);
        return parseFeedback(raw, phaseIndex, phase);
    }

    // ─── Phase Transition ────────────────────────────────────────────────────

    public String generatePhaseTransition(Topic topic, InterviewSession.ExperienceLevel level, int nextPhaseIndex) {
        if (nextPhaseIndex >= PHASES.size()) {
            return "You've completed all phases of the interview. Click \"End & Score\" to see your full results.";
        }
        String nextPhase = PHASES.get(nextPhaseIndex);
        String prompt = """
                You are an expert LLD interviewer moving to the next phase of an LLD interview on "%s".
                Candidate level: %s.

                Phase %d of 5: "%s"

                Write a brief 1-2 sentence transition into this new phase and ask the opening question.
                Be direct and professional. No filler words like "Great!" or "Excellent!".
                Return only the transition + question text, nothing else.
                """.formatted(topic.getName(), getLevelDescription(level), nextPhaseIndex + 1, nextPhase);

        return call(prompt);
    }

    // ─── Hint Generation ─────────────────────────────────────────────────────

    public String generateHint(Topic topic, InterviewSession.ExperienceLevel level, int phaseIndex, String question) {
        String phase = PHASES.get(Math.min(phaseIndex, PHASES.size() - 1));
        String prompt = """
                Give a short hint (3 bullet points using •, each under 15 words) for a %s engineer answering this LLD question about "%s" in the "%s" phase:
                "%s"
                Do NOT give the full answer — just nudge them in the right direction.
                """.formatted(getLevelDescription(level), topic.getName(), phase, question);

        return call(prompt);
    }

    // ─── Final Summary ────────────────────────────────────────────────────────

    public String generateSummary(Topic topic, InterviewSession.ExperienceLevel level,
                                  Map<String, Integer> avgScores, int overall) {
        String prompt = """
                A %s-level candidate just completed an LLD interview on "%s".
                Average scores — Clarity: %d, OOP Design: %d, Patterns: %d, Edge Cases: %d. Overall: %d/100.

                Write exactly 3 sentences:
                1. What they did well.
                2. The single biggest area to improve.
                3. One specific design pattern or concept they should study next.
                Be direct, encouraging, and actionable.
                """.formatted(
                level.name().toLowerCase(), topic.getName(),
                avgScores.getOrDefault("clarity", 0),
                avgScores.getOrDefault("oop_design", 0),
                avgScores.getOrDefault("patterns", 0),
                avgScores.getOrDefault("edge_cases", 0),
                overall
        );

        return call(prompt);
    }

    // ─── Adaptive Difficulty ──────────────────────────────────────────────────

    public String adaptQuestion(Topic topic, InterviewSession.ExperienceLevel level,
                                int phaseIndex, int lastScore, String baseQuestion) {
        if (lastScore >= 80) {
            return baseQuestion + " Now, how would you handle this at 10x scale with millions of concurrent users?";
        } else if (lastScore < 40) {
            return baseQuestion + "\n\nHint: Start by thinking about the core entities and their relationships.";
        }
        return baseQuestion;
    }

    // ─── Spring AI Call ───────────────────────────────────────────────────────

    private String call(String prompt) {
        try {
            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Gemini call failed: {}", e.getMessage());
            return "I encountered an error generating a response. Please try again.";
        }
    }

    // ─── JSON Parsing ─────────────────────────────────────────────────────────

    private FeedbackResponse parseFeedback(String raw, int phaseIndex, String phase) {
        try {
            String json = raw == null ? "" : raw.trim();
            // Strip markdown code fences if the model added them
            if (json.startsWith("```")) {
                json = json.replaceFirst("```[a-zA-Z]*\\r?\\n?", "").replaceAll("```\\s*$", "").trim();
            }
            // Locate the outermost JSON object
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start == -1 || end == -1 || end < start) {
                log.warn("No JSON object found in AI response (first 300 chars): {}",
                         json.substring(0, Math.min(300, json.length())));
                return fallbackFeedback(phaseIndex, phase);
            }
            json = json.substring(start, end + 1);
            GeminiFeedbackData data = objectMapper.readValue(json, GeminiFeedbackData.class);
            return mapToFeedbackResponse(data, phaseIndex, phase);
        } catch (Exception e) {
            log.warn("Failed to parse feedback JSON: {}", e.getMessage());
            return fallbackFeedback(phaseIndex, phase);
        }
    }

    // ─── Mapping & Fallback ───────────────────────────────────────────────────

    private FeedbackResponse mapToFeedbackResponse(GeminiFeedbackData data, int phaseIndex, String phaseName) {
        GeminiFeedbackData.Scores s = data.scores() != null
                ? data.scores()
                : new GeminiFeedbackData.Scores(65, 65, 60, 55);

        int overall = (s.clarity() + s.oopDesign() + s.patterns() + s.edgeCases()) / 4;

        List<ClassNodeDto> diagram = data.classDiagram() == null ? List.of() :
                data.classDiagram().stream()
                        .map(cn -> ClassNodeDto.builder()
                                .name(cn.name())
                                .type(cn.type() != null ? cn.type() : "class")
                                .members(cn.members() != null ? cn.members() : List.of())
                                .build())
                        .collect(Collectors.toList());

        return FeedbackResponse.builder()
                .phaseIndex(phaseIndex)
                .phaseName(phaseName)
                .scores(ScoreDto.builder()
                        .clarity(s.clarity()).oopDesign(s.oopDesign())
                        .patterns(s.patterns()).edgeCases(s.edgeCases())
                        .overall(overall).build())
                .aiReply(data.aiReply() != null ? data.aiReply() : "I've reviewed your answer.")
                .feedbackText(data.feedback() != null ? data.feedback() : "")
                .modelAnswer(data.modelAnswer() != null ? data.modelAnswer() : "")
                .classDiagram(diagram)
                .relationships(data.relationships() != null ? data.relationships() : List.of())
                .followUpQuestions(data.followUpQuestions() != null ? data.followUpQuestions() : List.of())
                .nextPhaseQuestion("")
                .sessionComplete(false)
                .build();
    }

    private FeedbackResponse fallbackFeedback(int phaseIndex, String phaseName) {
        return FeedbackResponse.builder()
                .phaseIndex(phaseIndex)
                .phaseName(phaseName)
                .scores(ScoreDto.builder().clarity(65).oopDesign(65).patterns(60).edgeCases(55).overall(61).build())
                .aiReply("I've reviewed your answer. Please see the detailed feedback below.")
                .feedbackText("Unable to generate detailed feedback. Please try again.")
                .modelAnswer("")
                .nextPhaseQuestion("")
                .followUpQuestions(List.of("Can you elaborate on your design?"))
                .classDiagram(List.of())
                .relationships(List.of())
                .sessionComplete(false)
                .build();
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
