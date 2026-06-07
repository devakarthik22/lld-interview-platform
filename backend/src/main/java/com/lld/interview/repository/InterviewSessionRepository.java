package com.lld.interview.repository;

import com.lld.interview.model.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, String> {

    List<InterviewSession> findByTopicIdOrderByStartedAtDesc(String topicId);

    List<InterviewSession> findByStatusOrderByStartedAtDesc(InterviewSession.SessionStatus status);

    @Query("SELECT s FROM InterviewSession s ORDER BY s.startedAt DESC")
    List<InterviewSession> findRecentSessions(org.springframework.data.domain.Pageable pageable);
}
