package com.lld.interview.controller;

import com.lld.interview.dto.*;
import com.lld.interview.model.InterviewSession;
import com.lld.interview.model.Topic;
import com.lld.interview.service.impl.InterviewService;
import com.lld.interview.service.impl.TopicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class InterviewController {

    private final InterviewService interviewService;
    private final TopicService topicService;

    // ─── Topics ──────────────────────────────────────────────────────────────

    @GetMapping("/topics")
    public ResponseEntity<List<Topic>> getAllTopics(
            @RequestParam(required = false) String category) {
        List<Topic> topics = topicService.getAllTopics();
        if (category != null && !category.isBlank()) {
            topics = topics.stream().filter(t -> t.getCategory().equalsIgnoreCase(category)).toList();
        }
        return ResponseEntity.ok(topics);
    }

    @GetMapping("/topics/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(topicService.getCategories());
    }

    @GetMapping("/topics/{id}")
    public ResponseEntity<Topic> getTopic(@PathVariable String id) {
        return topicService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── Session Management ───────────────────────────────────────────────────

    @PostMapping("/sessions/start")
    public ResponseEntity<SessionResponse> startSession(@Valid @RequestBody StartSessionRequest request) {
        log.info("Starting session: topic={}, level={}", request.getTopicId(), request.getLevel());
        SessionResponse response = interviewService.startSession(request.getTopicId(), request.getLevel());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sessions/answer")
    public ResponseEntity<FeedbackResponse> submitAnswer(@Valid @RequestBody SubmitAnswerRequest request) {
        log.info("Submitting answer: session={}, phase={}", request.getSessionId(), request.getPhaseIndex());
        FeedbackResponse feedback = interviewService.submitAnswer(
                request.getSessionId(),
                request.getQuestion(),
                request.getAnswer(),
                request.getPhaseIndex()
        );
        return ResponseEntity.ok(feedback);
    }

    @GetMapping("/sessions/{sessionId}/hint")
    public ResponseEntity<Map<String, String>> getHint(
            @PathVariable String sessionId,
            @RequestParam int phaseIndex,
            @RequestParam String question) {
        String hint = interviewService.getHint(sessionId, phaseIndex, question);
        return ResponseEntity.ok(Map.of("hint", hint));
    }

    @GetMapping("/sessions/{sessionId}/results")
    public ResponseEntity<SessionResultDto> getResults(@PathVariable String sessionId) {
        return ResponseEntity.ok(interviewService.getResults(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/advance")
    public ResponseEntity<PhaseAdvanceResponse> advancePhase(@PathVariable String sessionId) {
        log.info("Advancing phase for session={}", sessionId);
        return ResponseEntity.ok(interviewService.advancePhase(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/abandon")
    public ResponseEntity<Void> abandonSession(@PathVariable String sessionId) {
        interviewService.abandonSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    // ─── Health ───────────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "LLD Interview Platform"));
    }
}
