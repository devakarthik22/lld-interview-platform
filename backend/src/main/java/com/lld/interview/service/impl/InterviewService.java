package com.lld.interview.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.interview.dto.*;
import java.util.List;
import com.lld.interview.model.InterviewSession;
import com.lld.interview.model.QuestionResponse;
import com.lld.interview.model.Topic;
import com.lld.interview.repository.InterviewSessionRepository;
import com.lld.interview.repository.QuestionResponseRepository;
import com.lld.interview.service.ai.GeminiAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final InterviewSessionRepository sessionRepo;
    private final QuestionResponseRepository responseRepo;
    private final GeminiAiService geminiService;
    private final TopicService topicService;
    private final ObjectMapper objectMapper;

    // ─── Start Session ───────────────────────────────────────────────────────

    @Transactional
    public SessionResponse startSession(String topicId, InterviewSession.ExperienceLevel level) {
        Topic topic = topicService.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException("Topic not found: " + topicId));

        InterviewSession session = InterviewSession.builder()
                .topicId(topicId)
                .topicName(topic.getName())
                .level(level)
                .status(InterviewSession.SessionStatus.IN_PROGRESS)
                .currentPhase(0)
                .totalPhases(5)
                .build();
        session = sessionRepo.save(session);

        String firstQuestion = geminiService.generateOpeningQuestion(topic, level);

        return SessionResponse.builder()
                .sessionId(session.getId())
                .topicId(topicId)
                .topicName(topic.getName())
                .level(level.name())
                .currentPhase(0)
                .totalPhases(5)
                .status(session.getStatus().name())
                .firstQuestion(firstQuestion)
                .startedAt(session.getStartedAt())
                .build();
    }

    // ─── Submit Answer ───────────────────────────────────────────────────────

    @Transactional
    public FeedbackResponse submitAnswer(String sessionId, String question,
                                          String answer, int phaseIndex) {
        InterviewSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        Topic topic = topicService.findById(session.getTopicId())
                .orElseThrow(() -> new IllegalArgumentException("Topic not found"));

        FeedbackResponse feedback = geminiService.generateFeedback(
                topic, session.getLevel(), phaseIndex, question, answer);

        feedback.setSessionId(sessionId);

        // Persist the response (phase NOT advanced here — user clicks "Move to Next Phase")
        QuestionResponse qr = QuestionResponse.builder()
                .session(session)
                .phaseIndex(phaseIndex)
                .phaseName(feedback.getPhaseName())
                .question(question)
                .candidateAnswer(answer)
                .feedbackText(feedback.getFeedbackText())
                .modelAnswer(feedback.getModelAnswer())
                .classDiagramJson(toJson(feedback.getClassDiagram()))
                .followUpQuestionsJson(toJson(feedback.getFollowUpQuestions()))
                .clarityScore(feedback.getScores().getClarity())
                .oopDesignScore(feedback.getScores().getOopDesign())
                .patternsScore(feedback.getScores().getPatterns())
                .edgeCasesScore(feedback.getScores().getEdgeCases())
                .build();
        responseRepo.save(qr);

        return feedback;
    }

    // ─── Advance Phase ───────────────────────────────────────────────────────

    @Transactional
    public PhaseAdvanceResponse advancePhase(String sessionId) {
        InterviewSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        int nextPhase = session.getCurrentPhase() + 1;
        int totalPhases = session.getTotalPhases();

        if (nextPhase >= totalPhases) {
            session.setCurrentPhase(nextPhase);
            session.setStatus(InterviewSession.SessionStatus.COMPLETED);
            session.setCompletedAt(LocalDateTime.now());
            updateAggregateScores(session, sessionId);
            sessionRepo.save(session);

            return PhaseAdvanceResponse.builder()
                    .sessionId(sessionId)
                    .newPhaseIndex(nextPhase)
                    .newPhaseName("Complete")
                    .openingQuestion("You've completed all 5 phases! Click \"End & Score\" for your full results and AI analysis.")
                    .sessionComplete(true)
                    .build();
        }

        Topic topic = topicService.findById(session.getTopicId())
                .orElseThrow(() -> new IllegalArgumentException("Topic not found"));

        String openingQuestion = geminiService.generatePhaseTransition(topic, session.getLevel(), nextPhase);

        session.setCurrentPhase(nextPhase);
        sessionRepo.save(session);

        List<String> phaseNames = geminiService.getPhaseNames();
        String newPhaseName = nextPhase < phaseNames.size() ? phaseNames.get(nextPhase) : "Phase " + (nextPhase + 1);

        return PhaseAdvanceResponse.builder()
                .sessionId(sessionId)
                .newPhaseIndex(nextPhase)
                .newPhaseName(newPhaseName)
                .openingQuestion(openingQuestion)
                .sessionComplete(false)
                .build();
    }

    // ─── Get Hint ─────────────────────────────────────────────────────────────

    public String getHint(String sessionId, int phaseIndex, String question) {
        InterviewSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
        Topic topic = topicService.findById(session.getTopicId()).orElseThrow();
        return geminiService.generateHint(topic, session.getLevel(), phaseIndex, question);
    }

    // ─── Get Results ─────────────────────────────────────────────────────────

    public SessionResultDto getResults(String sessionId) {
        InterviewSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));
        Topic topic = topicService.findById(session.getTopicId()).orElseThrow();

        List<QuestionResponse> responses = responseRepo.findBySessionIdOrderByPhaseIndex(sessionId);

        Map<String, Integer> avgScores = computeAverages(responses);
        int overall = avgScores.values().stream().mapToInt(Integer::intValue).sum() / avgScores.size();

        String summary = geminiService.generateSummary(topic, session.getLevel(), avgScores, overall);

        List<PhaseResultDto> phaseResults = responses.stream().map(r ->
                PhaseResultDto.builder()
                        .phaseIndex(r.getPhaseIndex())
                        .phaseName(r.getPhaseName())
                        .question(r.getQuestion())
                        .candidateAnswer(r.getCandidateAnswer())
                        .feedbackText(r.getFeedbackText())
                        .scores(ScoreDto.builder()
                                .clarity(r.getClarityScore())
                                .oopDesign(r.getOopDesignScore())
                                .patterns(r.getPatternsScore())
                                .edgeCases(r.getEdgeCasesScore())
                                .overall((r.getClarityScore() + r.getOopDesignScore() +
                                          r.getPatternsScore() + r.getEdgeCasesScore()) / 4)
                                .build())
                        .build()
        ).toList();

        return SessionResultDto.builder()
                .sessionId(sessionId)
                .topicName(session.getTopicName())
                .level(session.getLevel().name())
                .averageScores(ScoreDto.builder()
                        .clarity(avgScores.get("clarity"))
                        .oopDesign(avgScores.get("oop_design"))
                        .patterns(avgScores.get("patterns"))
                        .edgeCases(avgScores.get("edge_cases"))
                        .overall(overall).build())
                .aiSummary(summary)
                .phaseResults(phaseResults)
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .build();
    }

    // ─── Abandon Session ─────────────────────────────────────────────────────

    @Transactional
    public void abandonSession(String sessionId) {
        sessionRepo.findById(sessionId).ifPresent(s -> {
            s.setStatus(InterviewSession.SessionStatus.ABANDONED);
            sessionRepo.save(s);
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private int getLastOverallScore(String sessionId) {
        List<QuestionResponse> responses = responseRepo.findBySessionIdOrderByPhaseIndex(sessionId);
        if (responses.isEmpty()) return 70;
        QuestionResponse last = responses.get(responses.size() - 1);
        return (last.getClarityScore() + last.getOopDesignScore() +
                last.getPatternsScore() + last.getEdgeCasesScore()) / 4;
    }

    private Map<String, Integer> computeAverages(List<QuestionResponse> responses) {
        if (responses.isEmpty()) return Map.of("clarity", 0, "oop_design", 0, "patterns", 0, "edge_cases", 0);
        int n = responses.size();
        return Map.of(
                "clarity",    responses.stream().mapToInt(r -> r.getClarityScore() != null ? r.getClarityScore() : 0).sum() / n,
                "oop_design", responses.stream().mapToInt(r -> r.getOopDesignScore() != null ? r.getOopDesignScore() : 0).sum() / n,
                "patterns",   responses.stream().mapToInt(r -> r.getPatternsScore() != null ? r.getPatternsScore() : 0).sum() / n,
                "edge_cases", responses.stream().mapToInt(r -> r.getEdgeCasesScore() != null ? r.getEdgeCasesScore() : 0).sum() / n
        );
    }

    private void updateAggregateScores(InterviewSession session, String sessionId) {
        List<QuestionResponse> responses = responseRepo.findBySessionIdOrderByPhaseIndex(sessionId);
        Map<String, Integer> avgs = computeAverages(responses);
        session.setAvgClarity(avgs.get("clarity").doubleValue());
        session.setAvgOopDesign(avgs.get("oop_design").doubleValue());
        session.setAvgPatterns(avgs.get("patterns").doubleValue());
        session.setAvgEdgeCases(avgs.get("edge_cases").doubleValue());
        session.setOverallScore((double) (avgs.values().stream().mapToInt(Integer::intValue).sum() / avgs.size()));
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (JsonProcessingException e) { return "[]"; }
    }
}
