package com.lld.interview.repository;

import com.lld.interview.model.QuestionResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionResponseRepository extends JpaRepository<QuestionResponse, String> {

    List<QuestionResponse> findBySessionIdOrderByPhaseIndex(String sessionId);

    long countBySessionId(String sessionId);
}
