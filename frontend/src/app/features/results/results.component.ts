import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SessionResultDto, PHASE_NAMES } from '../../core/models/models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-wrapper">

      <header class="res-header">
        <div class="res-header-inner">
          <button class="btn btn-ghost btn-sm" (click)="goHome()">
            <span class="material-icons-round">arrow_back</span> New Topic
          </button>
          <span class="brand-label">
            <span class="material-icons-round" style="color:var(--green)">code</span>
            LLD Interview Practice
          </span>
        </div>
      </header>

      <main class="res-main">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner" style="width:40px;height:40px;border-width:3px"></div>
            <p class="text-muted" style="margin-top:16px">Generating your results...</p>
          </div>
        }

        @if (!loading() && result()) {
          <div class="fade-in">

            <!-- Hero score -->
            <div class="score-hero card">
              <div class="hero-left">
                <p class="hero-topic text-muted">{{ result()!.topicName }} · {{ result()!.level }}</p>
                <h1 class="hero-title">Interview Complete</h1>
                <div class="overall-score" [class]="overallClass()">
                  {{ result()!.averageScores.overall }}<span class="score-denom">/100</span>
                </div>
                <p class="score-label text-muted">Overall Score</p>
              </div>
              <div class="hero-right">
                @for (item of scoreBreakdown(); track item.label) {
                  <div class="breakdown-row">
                    <span class="bd-label">{{ item.label }}</span>
                    <div class="bd-bar-wrap">
                      <div class="score-bar">
                        <div class="score-bar-fill" [class]="item.colorClass" [style.width.%]="item.value"></div>
                      </div>
                    </div>
                    <span class="bd-val" [class]="item.colorClass + '-text'">{{ item.value }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- AI Summary -->
            <div class="summary-card card">
              <div class="summary-header">
                <span class="material-icons-round" style="color:var(--green)">psychology</span>
                <h3>AI Feedback Summary</h3>
              </div>
              <p class="summary-text">{{ result()!.aiSummary }}</p>
            </div>

            <!-- Phase breakdown -->
            <h2 style="margin: 32px 0 16px">Phase-by-Phase Breakdown</h2>
            <div class="phases-list">
              @for (phase of result()!.phaseResults; track phase.phaseIndex) {
                <div class="phase-card card" [class.expanded]="expandedPhase() === phase.phaseIndex">
                  <div class="phase-card-header" (click)="togglePhase(phase.phaseIndex)">
                    <div class="phase-left">
                      <div class="phase-num">{{ phase.phaseIndex + 1 }}</div>
                      <div>
                        <h4>{{ phase.phaseName }}</h4>
                        <p class="text-muted" style="font-size:12px">Overall: {{ phaseOverall(phase.scores) }}/100</p>
                      </div>
                    </div>
                    <div class="phase-right">
                      <div class="mini-scores">
                        @for (sc of miniScores(phase.scores); track sc.label) {
                          <div class="mini-score-badge" [class]="sc.colorClass + '-bg'">
                            <span>{{ sc.label }}</span>
                            <strong>{{ sc.value }}</strong>
                          </div>
                        }
                      </div>
                      <span class="material-icons-round expand-icon">
                        {{ expandedPhase() === phase.phaseIndex ? 'expand_less' : 'expand_more' }}
                      </span>
                    </div>
                  </div>

                  @if (expandedPhase() === phase.phaseIndex) {
                    <div class="phase-detail fade-in">
                      <div class="detail-section">
                        <h4 class="detail-label">Question</h4>
                        <p class="detail-text">{{ phase.question }}</p>
                      </div>
                      <div class="detail-section">
                        <h4 class="detail-label">Your Answer</h4>
                        <p class="detail-text mono" style="font-size:12px">{{ phase.candidateAnswer }}</p>
                      </div>
                      <div class="detail-section">
                        <h4 class="detail-label">Feedback</h4>
                        <p class="detail-text">{{ phase.feedbackText }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Actions -->
            <div class="res-actions">
              <button class="btn btn-outline btn-lg" (click)="goHome()">
                <span class="material-icons-round">home</span> New Topic
              </button>
              <button class="btn btn-primary btn-lg" (click)="retryInterview()">
                <span class="material-icons-round">refresh</span> Retry Same Topic
              </button>
            </div>

          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .results-wrapper { min-height: 100vh; background: var(--bg); }

    /* Header */
    .res-header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 12px 0; }
    .res-header-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
    .brand-label { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; }

    /* Main */
    .res-main { max-width: 900px; margin: 0 auto; padding: 32px 24px 60px; }

    /* Loading */
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }

    /* Hero score card */
    .score-hero {
      display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
      padding: 32px; margin-bottom: 20px;
    }
    .hero-topic { font-size: 13px; margin-bottom: 6px; }
    .hero-title { font-size: 26px; margin-bottom: 16px; }
    .overall-score { font-size: 64px; font-weight: 700; line-height: 1; margin-bottom: 6px; }
    .overall-score.high { color: var(--green); }
    .overall-score.medium { color: var(--amber); }
    .overall-score.low { color: var(--red); }
    .score-denom { font-size: 24px; font-weight: 400; color: var(--text-3); }
    .score-label { font-size: 13px; }

    /* Breakdown */
    .breakdown-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .bd-label { font-size: 12px; font-weight: 500; min-width: 90px; color: var(--text-2); }
    .bd-bar-wrap { flex: 1; }
    .bd-val { font-size: 14px; font-weight: 600; min-width: 30px; text-align: right; }
    .high-text { color: var(--green); }
    .medium-text { color: var(--amber); }
    .low-text { color: var(--red); }

    /* Summary */
    .summary-card { padding: 24px; margin-bottom: 8px; }
    .summary-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .summary-text { font-size: 14px; line-height: 1.8; color: var(--text-1); }

    /* Phase list */
    .phases-list { display: flex; flex-direction: column; gap: 10px; }
    .phase-card { overflow: hidden; }
    .phase-card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; cursor: pointer;
      &:hover { background: var(--surface-2); }
    }
    .phase-left { display: flex; align-items: center; gap: 14px; }
    .phase-num {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--green-light); color: var(--green-dark);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .phase-right { display: flex; align-items: center; gap: 12px; }
    .mini-scores { display: flex; gap: 6px; flex-wrap: wrap; }
    .mini-score-badge {
      padding: 2px 8px; border-radius: 99px; font-size: 11px;
      display: flex; gap: 4px; align-items: center;
    }
    .high-bg   { background: #DCFCE7; color: #15803D; }
    .medium-bg { background: #FEF9C3; color: #A16207; }
    .low-bg    { background: #FEE2E2; color: #B91C1C; }
    .expand-icon { color: var(--text-3); font-size: 20px; }

    .phase-detail { padding: 0 20px 20px; border-top: 1px solid var(--border); margin-top: 0; }
    .detail-section { margin-top: 16px; }
    .detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); margin-bottom: 6px; }
    .detail-text { font-size: 13px; line-height: 1.75; color: var(--text-1); white-space: pre-wrap; }

    /* Actions */
    .res-actions { display: flex; gap: 12px; margin-top: 40px; justify-content: center; }

    @media (max-width: 700px) {
      .score-hero { grid-template-columns: 1fr; gap: 24px; }
      .res-actions { flex-direction: column; }
      .btn-lg { width: 100%; }
    }
  `]
})
export class ResultsComponent implements OnInit {
  result = signal<SessionResultDto | null>(null);
  loading = signal(true);
  expandedPhase = signal<number | null>(null);
  sessionId = '';
  topicId = '';

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    this.api.getResults(this.sessionId).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/']); }
    });
  }

  overallClass(): string {
    const s = this.result()?.averageScores.overall ?? 0;
    return s >= 70 ? 'high' : s >= 45 ? 'medium' : 'low';
  }

  scoreBreakdown() {
    const s = this.result()?.averageScores;
    if (!s) return [];
    return [
      { label: 'Clarity',    value: s.clarity,   colorClass: this.cls(s.clarity) },
      { label: 'OOP Design', value: s.oopDesign,  colorClass: this.cls(s.oopDesign) },
      { label: 'Patterns',   value: s.patterns,   colorClass: this.cls(s.patterns) },
      { label: 'Edge Cases', value: s.edgeCases,  colorClass: this.cls(s.edgeCases) },
    ];
  }

  miniScores(scores: any) {
    return [
      { label: 'Clarity',  value: scores.clarity,   colorClass: this.cls(scores.clarity) },
      { label: 'OOP',      value: scores.oopDesign,  colorClass: this.cls(scores.oopDesign) },
      { label: 'Patterns', value: scores.patterns,   colorClass: this.cls(scores.patterns) },
    ];
  }

  phaseOverall(scores: any): number {
    return Math.round((scores.clarity + scores.oopDesign + scores.patterns + scores.edgeCases) / 4);
  }

  togglePhase(idx: number) {
    this.expandedPhase.set(this.expandedPhase() === idx ? null : idx);
  }

  cls(v: number): string { return v >= 70 ? 'high' : v >= 45 ? 'medium' : 'low'; }

  goHome() { this.router.navigate(['/']); }

  retryInterview() {
    const result = this.result();
    if (!result) return;
    this.router.navigate(['/']);
  }
}
