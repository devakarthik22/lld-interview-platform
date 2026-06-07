import {
  Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked,
  signal, computed, ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import {
  SessionResponse, FeedbackResponse, ChatMessage,
  ClassNodeDto, PHASE_NAMES, SubmitAnswerRequest, PhaseAdvanceResponse
} from '../../core/models/models';
import { HtmlNewlinesPipe, ModelAnswerHtmlPipe } from '../shared/pipes';

type FeedbackTab = 'scores' | 'model' | 'diagram' | 'followups';

@Component({
  selector: 'app-interview',
  standalone: true,
  imports: [CommonModule, FormsModule, HtmlNewlinesPipe, ModelAnswerHtmlPipe],
  template: `
    <div class="interview-wrapper">

      <!-- Top bar -->
      <header class="int-header">
        <div class="int-header-inner">
          <div class="int-title-row">
            <button class="btn btn-ghost btn-sm" (click)="confirmExit()">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div>
              <span class="int-topic">{{ session()?.topicName }}</span>
              <span class="tag" style="margin-left:8px">{{ session()?.level }}</span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" (click)="endAndScore()">
            <span class="material-icons-round">flag</span> End & Score
          </button>
        </div>

        <!-- Phase strip -->
        <div class="phase-strip">
          @for (phase of phaseNames; track phase; let i = $index) {
            <div class="phase-item"
                 [class.done]="i < currentPhase()"
                 [class.active]="i === currentPhase()">
              @if (i < currentPhase()) {
                <span class="material-icons-round" style="font-size:14px">check</span>
              }
              {{ phase }}
            </div>
          }
        </div>

        <!-- Progress bar -->
        <div class="progress-bar" style="border-radius:0; height:3px">
          <div class="progress-fill" [style.width.%]="progressPct()"></div>
        </div>
      </header>

      <!-- Main layout -->
      <div class="int-body">
        <div class="int-layout">

          <!-- Left: Chat -->
          <div class="int-panel">
            <div class="panel-header">
              <div class="flex items-center gap-8">
                <span class="material-icons-round" style="color:var(--green)">smart_toy</span>
                <h3>AI Interviewer</h3>
              </div>
              <span class="text-muted" style="font-size:12px">Phase {{ currentPhase() + 1 }} of 5</span>
            </div>
            <div class="chat-area" #chatArea>
              @for (msg of messages(); track msg.timestamp) {
                <div class="chat-message fade-in" [class.ai]="msg.role === 'ai'" [class.user]="msg.role === 'user'">
                  <div class="msg-label" [class.right]="msg.role === 'user'">
                    {{ msg.role === 'ai' ? 'AI Interviewer' : 'You' }}
                  </div>
                  <div class="msg-bubble" [class.ai-bubble]="msg.role === 'ai'" [class.user-bubble]="msg.role === 'user'"
                       [innerHTML]="msg.text | htmlNewlines"></div>
                </div>
              }
              @if (aiTyping()) {
                <div class="chat-message ai fade-in">
                  <div class="msg-label">AI Interviewer</div>
                  <div class="typing-indicator"><span></span><span></span><span></span></div>
                </div>
              }
            </div>
          </div>

          <!-- Right: Answer -->
          <div class="int-right">
            <div class="int-panel" style="height:100%">
              <div class="panel-header">
                <div class="flex items-center gap-8">
                  <span class="material-icons-round" style="color:var(--green)">edit_note</span>
                  <h3>Your Answer</h3>
                </div>
                <div class="editor-mode-bar">
                  <button class="mode-btn" [class.active]="!codeMode()" (click)="setCodeMode(false)"
                          [disabled]="submitting()">
                    <span class="material-icons-round" style="font-size:14px">notes</span> Text
                  </button>
                  <button class="mode-btn" [class.active]="codeMode()" (click)="setCodeMode(true)"
                          [disabled]="submitting()">
                    <span class="material-icons-round" style="font-size:14px">code</span> Code
                  </button>
                  @if (codeMode()) {
                    <select class="lang-select" [(ngModel)]="codeLanguage" (change)="onLanguageChange()"
                            [disabled]="submitting()">
                      <option value="java">Java</option>
                      <option value="python">Python</option>
                      <option value="typescript">TypeScript</option>
                      <option value="csharp">C#</option>
                      <option value="plaintext">Plain Text</option>
                    </select>
                  }
                  <span class="text-muted mono" style="font-size:10px; margin-left:auto">{{ answerLength() }} chars</span>
                </div>
              </div>

              <div class="answer-area-wrap">
                <!-- Text mode textarea -->
                <textarea class="answer-textarea mono"
                          [style.display]="codeMode() ? 'none' : 'block'"
                          placeholder="Write your answer here...

Tips:
• Name concrete classes / interfaces
• Mention design patterns by name
• Discuss trade-offs between approaches
• Consider thread safety & edge cases"
                          [(ngModel)]="answer"
                          (ngModelChange)="onAnswerChange($event)"
                          [disabled]="submitting()">
                </textarea>
                <!-- Code mode: Monaco editor container (always in DOM) -->
                <div #monacoContainer class="monaco-container"
                     [style.display]="codeMode() ? 'block' : 'none'">
                </div>
              </div>

              <div class="action-row">
                <button class="btn btn-outline btn-sm" (click)="getHint()" [disabled]="submitting() || hintLoading()">
                  @if (hintLoading()) { <span class="spinner"></span> }
                  @else { <span class="material-icons-round">lightbulb</span> }
                  Hint
                </button>
                <button class="btn btn-primary flex-1" (click)="submitAnswer()"
                        [disabled]="!answer.trim() || submitting()">
                  @if (submitting()) { <span class="spinner"></span> Evaluating... }
                  @else { <span class="material-icons-round">send</span> Submit Answer }
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback panel -->
        @if (feedback()) {
          <div class="feedback-panel fade-in" #feedbackPanel>
            <div class="fb-tabs">
              @for (tab of fbTabs; track tab.key) {
                <button class="fb-tab" [class.active]="activeTab() === tab.key"
                        (click)="activeTab.set(tab.key)">
                  <span class="material-icons-round">{{ tab.icon }}</span>
                  {{ tab.label }}
                </button>
              }
            </div>

            <div class="fb-body">

              <!-- Scores tab -->
              @if (activeTab() === 'scores') {
                <div class="fade-in">
                  <div class="score-grid">
                    @for (score of scoreItems(); track score.label) {
                      <div class="score-card">
                        <div class="score-label">{{ score.label }}</div>
                        <div class="score-value" [class]="score.colorClass">{{ score.value }}</div>
                        <div class="score-bar">
                          <div class="score-bar-fill" [class]="score.colorClass" [style.width.%]="score.value"></div>
                        </div>
                      </div>
                    }
                  </div>
                  <p class="fb-text" [innerHTML]="feedback()!.feedbackText | htmlNewlines"></p>
                </div>
              }

              <!-- Model answer tab -->
              @if (activeTab() === 'model') {
                <div class="fade-in">
                  <div class="model-block">
                    <h4 class="model-title">
                      <span class="material-icons-round">stars</span>
                      Model Answer — {{ feedback()!.phaseName }}
                    </h4>
                    <div class="model-content" [innerHTML]="feedback()!.modelAnswer | modelAnswerHtml"></div>
                  </div>
                </div>
              }

              <!-- Class diagram tab -->
              @if (activeTab() === 'diagram') {
                <div class="fade-in">
                  @if (feedback()!.classDiagram?.length) {
                    <div class="diagram-scroll">
                      <div class="diagram-classes">
                        @for (cls of feedback()!.classDiagram; track cls.name) {
                          <div class="uml-box" [class]="'uml-' + cls.type">
                            <div class="uml-header">
                              <div class="uml-stereotype">&#171;{{ cls.type }}&#187;</div>
                              <div class="uml-classname">{{ cls.name }}</div>
                            </div>
                            <div class="uml-divider"></div>
                            <div class="uml-members">
                              @for (member of cls.members; track member) {
                                <div class="uml-member" [class.uml-pub]="member.startsWith('+')"
                                     [class.uml-priv]="member.startsWith('-')"
                                     [class.uml-prot]="member.startsWith('#')">{{ member }}</div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                    @if (feedback()!.relationships?.length) {
                      <div class="rel-section">
                        <h4 class="rel-title">
                          <span class="material-icons-round">device_hub</span>
                          Relationships
                        </h4>
                        <div class="rel-list">
                          @for (rel of feedback()!.relationships; track rel) {
                            <div class="rel-row">
                              <span class="rel-arrow">&#8594;</span>
                              <span class="rel-text">{{ rel }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  } @else {
                    <p class="text-muted" style="padding: 16px 0">No class structure generated for this phase.</p>
                  }
                </div>
              }

              <!-- Follow-ups tab -->
              @if (activeTab() === 'followups') {
                <div class="fade-in">
                  <p class="text-muted" style="margin-bottom:12px; font-size:13px">
                    Click a question to use it as your next answer:
                  </p>
                  <div class="followup-list">
                    @for (q of feedback()!.followUpQuestions; track q) {
                      <button class="followup-item" (click)="useFollowup(q)">
                        <span class="material-icons-round" style="font-size:16px;color:var(--green);flex-shrink:0">chevron_right</span>
                        {{ q }}
                      </button>
                    }
                  </div>
                </div>
              }

            </div>

            <!-- Move to Next Phase action -->
            <div class="fb-advance-row">
              @if (!sessionDone()) {
                <button class="btn btn-primary advance-btn" (click)="advancePhase()"
                        [disabled]="advancingPhase()">
                  @if (advancingPhase()) {
                    <span class="spinner"></span> Loading next phase...
                  } @else {
                    <span class="material-icons-round">arrow_forward</span>
                    {{ isLastPhase() ? 'Complete Interview' : 'Move to Next Phase' }}
                  }
                </button>
              } @else {
                <button class="btn btn-primary advance-btn" (click)="endAndScore()">
                  <span class="material-icons-round">emoji_events</span>
                  View Full Results
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .interview-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }

    /* Header */
    .int-header {
      background: var(--surface); border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 10;
    }
    .int-header-inner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px;
    }
    .int-title-row { display: flex; align-items: center; gap: 10px; }
    .int-topic { font-size: 15px; font-weight: 600; }

    /* Body — scrolls vertically when feedback panel appears below grid */
    .int-body {
      flex: 1; max-width: 1200px; margin: 0 auto; width: 100%;
      padding: 20px 24px; overflow-y: auto; min-height: 0;
      display: flex; flex-direction: column; box-sizing: border-box;
    }

    /* Layout — fixed viewport height so panels never grow the page */
    .int-layout {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
      height: calc(100vh - 148px); min-height: 420px; flex-shrink: 0;
    }

    /* Panel */
    .int-panel {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-lg); overflow: hidden; display: flex;
      flex-direction: column; height: 100%; min-height: 0;
    }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);
      flex-wrap: wrap; gap: 8px; flex-shrink: 0;
    }

    /* Chat — fills remaining panel height, scrolls internally */
    .chat-area {
      flex: 1; min-height: 0; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }

    /* Editor mode toggle */
    .editor-mode-bar {
      display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
    }
    .mode-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: var(--r-sm); font-size: 12px; font-weight: 500;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--text-2);
      cursor: pointer; font-family: var(--font-sans); transition: all 0.12s;
      .material-icons-round { font-size: 14px; }
      &.active { background: var(--green); color: #fff; border-color: var(--green); }
      &:hover:not(.active):not(:disabled) { border-color: var(--green); color: var(--text-1); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .lang-select {
      padding: 4px 8px; border-radius: var(--r-sm); border: 1px solid var(--border);
      background: var(--surface); color: var(--text-2); font-size: 12px;
      font-family: var(--font-sans); cursor: pointer;
      &:focus { outline: none; border-color: var(--green); }
    }

    /* Answer */
    .int-right { display: flex; flex-direction: column; }
    .answer-area-wrap {
      flex: 1; min-height: 0; padding: 0 16px 8px;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .answer-textarea {
      flex: 1; min-height: 0; width: 100%; resize: none; outline: none;
      border: 1px solid var(--border); border-radius: var(--r-md);
      padding: 12px; font-size: 12px; line-height: 1.75;
      background: var(--surface); color: var(--text-1);
      margin: 12px 0; font-family: var(--font-mono);
      box-sizing: border-box; overflow-y: auto;
      &:focus { border-color: var(--green); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .monaco-container {
      flex: 1; min-height: 0; width: 100%; border-radius: var(--r-md);
      overflow: hidden; margin: 12px 0; border: 1px solid var(--border);
      &:focus-within { border-color: var(--green); }
    }
    .action-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); flex-shrink: 0; }

    /* Feedback panel */
    .feedback-panel {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-lg); overflow: hidden; margin-top: 4px;
    }
    .fb-tabs { display: flex; border-bottom: 1px solid var(--border); }
    .fb-tab {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 8px; font-size: 12px; font-weight: 500; font-family: var(--font-sans);
      color: var(--text-2); background: var(--surface-2); border: none; cursor: pointer;
      border-right: 1px solid var(--border); transition: all 0.12s;
      .material-icons-round { font-size: 16px; }
      &:last-child { border-right: none; }
      &.active { background: var(--surface); color: var(--text-1); }
      &:hover:not(.active) { background: var(--border); }
    }
    .fb-body { padding: 16px; }
    .fb-text { font-size: 13px; line-height: 1.75; color: var(--text-1); margin-top: 8px; }

    /* Score grid */
    .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .score-card { background: var(--surface-2); border-radius: var(--r-md); padding: 12px; }
    .score-label { font-size: 11px; color: var(--text-2); text-transform: capitalize; margin-bottom: 4px; }
    .score-value { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .score-value.high, .score-bar-fill.high { color: var(--green); background: var(--green); }
    .score-value.medium, .score-bar-fill.medium { color: var(--amber); background: var(--amber); }
    .score-value.low, .score-bar-fill.low { color: var(--red); background: var(--red); }

    /* Model answer */
    .model-block { background: var(--surface-2); border-radius: var(--r-md); padding: 16px; }
    .model-title {
      display: flex; align-items: center; gap: 6px; margin-bottom: 12px;
      color: var(--text-2); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;
      .material-icons-round { font-size: 16px; color: var(--green); }
    }
    .model-content { font-size: 13px; line-height: 1.8; }

    /* UML Class Diagram */
    .diagram-scroll { overflow-x: auto; padding-bottom: 8px; }
    .diagram-classes { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; min-width: min-content; }

    .uml-box {
      min-width: 180px; max-width: 260px; border-radius: var(--r-md);
      overflow: hidden; border: 2px solid var(--border);
      font-family: var(--font-mono); box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .uml-header { padding: 10px 12px 8px; text-align: center; }
    .uml-stereotype { font-size: 10px; font-style: italic; opacity: 0.8; margin-bottom: 2px; letter-spacing: 0.02em; }
    .uml-classname { font-size: 13px; font-weight: 700; letter-spacing: 0.01em; }
    .uml-divider { height: 2px; }
    .uml-members { padding: 8px 0; background: var(--surface); }
    .uml-member { font-size: 11px; padding: 2px 12px; line-height: 1.7; color: var(--text-2); }
    .uml-pub  { color: #4ade80; }
    .uml-priv { color: #f87171; }
    .uml-prot { color: #fb923c; }

    /* UML type colors */
    .uml-class    .uml-header { background: #1e3a5f; color: #93c5fd; border-bottom: 2px solid #3b82f6; }
    .uml-class    .uml-divider { background: #3b82f6; }
    .uml-interface .uml-header { background: #1e3d2f; color: #6ee7b7; border-bottom: 2px solid #10b981; }
    .uml-interface .uml-divider { background: #10b981; }
    .uml-abstract .uml-header { background: #3d2a00; color: #fbbf24; border-bottom: 2px solid #f59e0b; }
    .uml-abstract .uml-divider { background: #f59e0b; }
    .uml-enum     .uml-header { background: #3d1a2e; color: #f9a8d4; border-bottom: 2px solid #ec4899; }
    .uml-enum     .uml-divider { background: #ec4899; }

    /* Relationships */
    .rel-section { margin-top: 4px; }
    .rel-title {
      display: flex; align-items: center; gap: 6px; font-size: 12px;
      color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em;
      margin-bottom: 10px;
      .material-icons-round { font-size: 16px; color: var(--green); }
    }
    .rel-list { display: flex; flex-direction: column; gap: 6px; }
    .rel-row {
      display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px;
      background: var(--surface-2); border-radius: var(--r-sm);
      border-left: 3px solid var(--green); font-size: 13px;
    }
    .rel-arrow { color: var(--green); font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .rel-text { color: var(--text-1); line-height: 1.5; }

    /* Follow-ups */
    .followup-list { display: flex; flex-direction: column; gap: 8px; }
    .followup-item {
      display: flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left;
      padding: 10px 14px; border-radius: var(--r-md); font-size: 13px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--text-1); cursor: pointer; font-family: var(--font-sans);
      transition: all 0.12s; line-height: 1.5;
      &:hover { border-color: var(--green); background: var(--green-light); }
    }

    /* Advance phase button */
    .fb-advance-row {
      display: flex; justify-content: flex-end; padding: 14px 16px;
      border-top: 1px solid var(--border); background: var(--surface-2);
    }
    .advance-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 24px; font-size: 14px; font-weight: 600;
      background: var(--green); color: #fff; border: none;
      border-radius: var(--r-md); cursor: pointer; transition: all 0.15s;
      font-family: var(--font-sans);
      .material-icons-round { font-size: 18px; }
      &:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
      &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    }

    @media (max-width: 900px) {
      .int-layout { grid-template-columns: 1fr; }
      .score-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class InterviewComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatArea')      chatAreaRef!: ElementRef;
  @ViewChild('feedbackPanel') feedbackPanelRef!: ElementRef;
  @ViewChild('monacoContainer') monacoContainerRef!: ElementRef;

  session       = signal<SessionResponse | null>(null);
  messages      = signal<ChatMessage[]>([]);
  feedback      = signal<FeedbackResponse | null>(null);
  aiTyping      = signal(false);
  submitting    = signal(false);
  hintLoading   = signal(false);
  advancingPhase = signal(false);
  activeTab     = signal<FeedbackTab>('scores');
  codeMode      = signal(false);
  sessionDone   = signal(false);

  answer = '';
  answerLength  = signal(0);
  currentPhase  = signal(0);
  codeLanguage  = 'java';
  sessionId     = '';
  currentQuestion = '';

  phaseNames = PHASE_NAMES;
  progressPct = computed(() => ((this.currentPhase() + 0.5) / 5) * 100);
  isLastPhase = computed(() => this.currentPhase() >= 4);

  fbTabs = [
    { key: 'scores'    as FeedbackTab, label: 'Scores',       icon: 'bar_chart'    },
    { key: 'model'     as FeedbackTab, label: 'Model Answer',  icon: 'task_alt'     },
    { key: 'diagram'   as FeedbackTab, label: 'Class Diagram', icon: 'account_tree' },
    { key: 'followups' as FeedbackTab, label: 'Follow-ups',    icon: 'forum'        },
  ];

  scoreItems = computed(() => {
    const s = this.feedback()?.scores;
    if (!s) return [];
    return [
      { label: 'Clarity',    value: s.clarity,   colorClass: this.scoreClass(s.clarity)   },
      { label: 'OOP Design', value: s.oopDesign,  colorClass: this.scoreClass(s.oopDesign) },
      { label: 'Patterns',   value: s.patterns,   colorClass: this.scoreClass(s.patterns)  },
      { label: 'Edge Cases', value: s.edgeCases,  colorClass: this.scoreClass(s.edgeCases) },
    ];
  });

  private shouldScroll = false;
  private monacoEditor: any = null;
  private typingIntervals: ReturnType<typeof setInterval>[] = [];

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    const state = history.state as { session?: SessionResponse };
    if (state?.session) {
      this.session.set(state.session);
      this.currentQuestion = state.session.firstQuestion;
      this.typewriterAdd(state.session.firstQuestion);
    } else {
      this.router.navigate(['/']);
    }
  }

  ngAfterViewInit() {
    this.tryInitMonaco(0);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollChat();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.typingIntervals.forEach(id => clearInterval(id));
    this.monacoEditor?.dispose();
  }

  // ── Monaco Editor ──────────────────────────────────────────────────────────

  private tryInitMonaco(attempts: number) {
    const win = window as any;
    if (win.monaco) {
      this.createMonacoEditor();
    } else if (win.require && attempts === 0) {
      win.require(['vs/editor/editor.main'], () => {
        this.ngZone.run(() => this.createMonacoEditor());
      });
    } else if (attempts < 60) {
      setTimeout(() => this.tryInitMonaco(attempts + 1), 150);
    }
  }

  private createMonacoEditor() {
    const monaco = (window as any).monaco;
    if (!monaco || !this.monacoContainerRef?.nativeElement || this.monacoEditor) return;
    this.monacoEditor = monaco.editor.create(this.monacoContainerRef.nativeElement, {
      value: this.answer,
      language: this.codeLanguage,
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 13,
      lineHeight: 20,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      padding: { top: 10, bottom: 10 },
      overviewRulerBorder: false,
      scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
    });
    this.monacoEditor.onDidChangeModelContent(() => {
      this.ngZone.run(() => {
        this.answer = this.monacoEditor.getValue();
        this.answerLength.set(this.answer.length);
      });
    });
  }

  setCodeMode(enabled: boolean) {
    this.codeMode.set(enabled);
    if (enabled) {
      setTimeout(() => {
        if (!this.monacoEditor) {
          this.tryInitMonaco(0);
        } else {
          this.monacoEditor.setValue(this.answer);
          this.monacoEditor.layout();
        }
      }, 50);
    }
  }

  onLanguageChange() {
    const monaco = (window as any).monaco;
    if (monaco && this.monacoEditor) {
      monaco.editor.setModelLanguage(this.monacoEditor.getModel(), this.codeLanguage);
    }
  }

  // ── Chat & Typewriter ──────────────────────────────────────────────────────

  onAnswerChange(val: string) { this.answerLength.set(val.length); }

  addMessage(role: 'ai' | 'user', text: string) {
    this.messages.update(msgs => [...msgs, { role, text, timestamp: new Date() }]);
    this.shouldScroll = true;
  }

  private typewriterAdd(text: string, onDone?: () => void) {
    const idx = this.messages().length;
    this.messages.update(msgs => [...msgs, { role: 'ai', text: '', timestamp: new Date() }]);
    this.shouldScroll = true;

    let i = 0;
    const CHUNK = 6;
    const id = setInterval(() => {
      i += CHUNK;
      this.messages.update(msgs => {
        const updated = [...msgs];
        updated[idx] = { ...updated[idx], text: text.slice(0, Math.min(i, text.length)) };
        return updated;
      });
      this.shouldScroll = true;
      if (i >= text.length) {
        clearInterval(id);
        this.typingIntervals.splice(this.typingIntervals.indexOf(id), 1);
        onDone?.();
      }
    }, 18);
    this.typingIntervals.push(id);
  }

  scrollChat() {
    try {
      const el = this.chatAreaRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ── Submit Answer ──────────────────────────────────────────────────────────

  submitAnswer() {
    const ans = this.answer.trim();
    if (!ans || this.submitting()) return;

    this.submitting.set(true);
    this.addMessage('user', ans);
    this.feedback.set(null);

    const req: SubmitAnswerRequest = {
      sessionId: this.sessionId,
      answer: ans,
      phaseIndex: this.currentPhase(),
      question: this.currentQuestion
    };

    this.answer = '';
    this.answerLength.set(0);
    if (this.monacoEditor) this.monacoEditor.setValue('');
    this.aiTyping.set(true);

    this.api.submitAnswer(req).subscribe({
      next: fb => {
        this.aiTyping.set(false);
        this.submitting.set(false);

        // Stream AI reply into chat with typewriter effect
        const reply = fb.aiReply || 'I\'ve reviewed your answer. Please see the detailed feedback below.';
        this.typewriterAdd(reply, () => {
          // Show feedback panel after reply finishes typing
          this.feedback.set(fb);
          this.activeTab.set('scores');
          setTimeout(() => {
            try {
              this.feedbackPanelRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch {}
          }, 150);
        });
      },
      error: () => {
        this.aiTyping.set(false);
        this.submitting.set(false);
        this.addMessage('ai', 'Sorry, I had trouble evaluating that answer. Please try again.');
      }
    });
  }

  // ── Advance Phase ──────────────────────────────────────────────────────────

  advancePhase() {
    if (this.advancingPhase()) return;
    this.advancingPhase.set(true);
    this.feedback.set(null);

    this.api.advancePhase(this.sessionId).subscribe({
      next: res => {
        this.advancingPhase.set(false);
        this.currentPhase.set(res.newPhaseIndex);

        if (res.sessionComplete) {
          this.sessionDone.set(true);
          this.typewriterAdd(res.openingQuestion);
        } else {
          this.currentQuestion = res.openingQuestion;
          this.typewriterAdd(res.openingQuestion);
        }

        // Scroll to top of chat to see new question
        setTimeout(() => this.scrollChat(), 100);
      },
      error: () => {
        this.advancingPhase.set(false);
        this.addMessage('ai', 'Error advancing to the next phase. Please try again.');
      }
    });
  }

  // ── Hint ───────────────────────────────────────────────────────────────────

  getHint() {
    this.hintLoading.set(true);
    this.api.getHint(this.sessionId, this.currentPhase(), this.currentQuestion).subscribe({
      next: res => {
        this.addMessage('ai', '💡 Hint:\n' + res.hint);
        this.hintLoading.set(false);
      },
      error: () => this.hintLoading.set(false)
    });
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  useFollowup(q: string) {
    this.answer = q;
    this.answerLength.set(q.length);
    if (this.monacoEditor) this.monacoEditor.setValue(q);
  }

  endAndScore()  { this.router.navigate(['/results', this.sessionId]); }

  confirmExit() {
    if (confirm('Exit interview? Progress will be saved.')) {
      this.api.abandonSession(this.sessionId).subscribe();
      this.router.navigate(['/']);
    }
  }

  scoreClass(v: number): string {
    return v >= 70 ? 'high' : v >= 45 ? 'medium' : 'low';
  }
}
