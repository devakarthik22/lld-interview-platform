// ── Topics ──────────────────────────────────────────────────
export interface Topic {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  tags: string[];
  icon: string;
}

// ── Session ──────────────────────────────────────────────────
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR';

export interface StartSessionRequest {
  topicId: string;
  level: ExperienceLevel;
}

export interface SessionResponse {
  sessionId: string;
  topicId: string;
  topicName: string;
  level: ExperienceLevel;
  currentPhase: number;
  totalPhases: number;
  status: string;
  firstQuestion: string;
  startedAt: string;
}

// ── Answer ───────────────────────────────────────────────────
export interface SubmitAnswerRequest {
  sessionId: string;
  answer: string;
  phaseIndex: number;
  question: string;
}

// ── Feedback ─────────────────────────────────────────────────
export interface ScoreDto {
  clarity: number;
  oopDesign: number;
  patterns: number;
  edgeCases: number;
  overall: number;
}

export interface ClassNodeDto {
  name: string;
  type: 'class' | 'interface' | 'abstract' | 'enum';
  members: string[];
}

export interface FeedbackResponse {
  sessionId: string;
  phaseIndex: number;
  phaseName: string;
  scores: ScoreDto;
  aiReply: string;
  feedbackText: string;
  modelAnswer: string;
  classDiagram: ClassNodeDto[];
  relationships: string[];
  followUpQuestions: string[];
  nextPhaseQuestion: string;
  sessionComplete: boolean;
}

export interface PhaseAdvanceResponse {
  sessionId: string;
  newPhaseIndex: number;
  newPhaseName: string;
  openingQuestion: string;
  sessionComplete: boolean;
}

// ── Results ──────────────────────────────────────────────────
export interface PhaseResultDto {
  phaseIndex: number;
  phaseName: string;
  question: string;
  candidateAnswer: string;
  scores: ScoreDto;
  feedbackText: string;
}

export interface SessionResultDto {
  sessionId: string;
  topicName: string;
  level: ExperienceLevel;
  averageScores: ScoreDto;
  aiSummary: string;
  phaseResults: PhaseResultDto[];
  startedAt: string;
  completedAt: string;
}

// ── UI State ─────────────────────────────────────────────────
export interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export const PHASE_NAMES = [
  'Requirements',
  'Class Design',
  'Design Patterns',
  'Edge Cases',
  'Extensibility'
];
