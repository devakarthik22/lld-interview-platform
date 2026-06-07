import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Topic, StartSessionRequest, SessionResponse,
  SubmitAnswerRequest, FeedbackResponse, SessionResultDto, PhaseAdvanceResponse
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Topics ────────────────────────────────────────────────
  getTopics(category?: string): Observable<Topic[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<Topic[]>(`${this.base}/topics`, { params });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/topics/categories`);
  }

  // ── Sessions ──────────────────────────────────────────────
  startSession(req: StartSessionRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.base}/sessions/start`, req);
  }

  submitAnswer(req: SubmitAnswerRequest): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(`${this.base}/sessions/answer`, req);
  }

  getHint(sessionId: string, phaseIndex: number, question: string): Observable<{ hint: string }> {
    const params = new HttpParams()
      .set('phaseIndex', phaseIndex)
      .set('question', question);
    return this.http.get<{ hint: string }>(`${this.base}/sessions/${sessionId}/hint`, { params });
  }

  advancePhase(sessionId: string): Observable<PhaseAdvanceResponse> {
    return this.http.post<PhaseAdvanceResponse>(`${this.base}/sessions/${sessionId}/advance`, {});
  }

  getResults(sessionId: string): Observable<SessionResultDto> {
    return this.http.get<SessionResultDto>(`${this.base}/sessions/${sessionId}/results`);
  }

  abandonSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/sessions/${sessionId}/abandon`, {});
  }
}
