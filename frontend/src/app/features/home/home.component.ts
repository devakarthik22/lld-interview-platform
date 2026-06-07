import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Topic, ExperienceLevel, StartSessionRequest } from '../../core/models/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-wrapper">
      <!-- Header -->
      <header class="home-header">
        <div class="header-inner">
          <div class="brand">
            <span class="material-icons-round brand-icon">code</span>
            <div>
              <h1>LLD Interview Practice</h1>
              <p class="text-muted">22 topics · 5-phase structured flow · Google Gemini feedback</p>
            </div>
          </div>
        </div>
      </header>

      <main class="home-main">
        <!-- Level selector -->
        <section class="section">
          <h2 class="section-title">Your experience level</h2>
          <div class="level-grid">
            @for (lvl of levels; track lvl.value) {
              <button class="level-card" [class.active]="selectedLevel() === lvl.value"
                      (click)="selectedLevel.set(lvl.value)">
                <span class="material-icons-round level-icon">{{ lvl.icon }}</span>
                <span class="level-name">{{ lvl.label }}</span>
                <span class="level-desc text-muted">{{ lvl.desc }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Category filter -->
        <section class="section">
          <div class="section-top">
            <h2 class="section-title">Choose a topic</h2>
            <span class="topic-count text-muted">{{ filteredTopics().length }} topics</span>
          </div>

          <div class="cat-pills">
            <button class="cat-pill" [class.active]="selectedCat() === 'All'"
                    (click)="selectedCat.set('All')">All</button>
            @for (cat of categories(); track cat) {
              <button class="cat-pill" [class.active]="selectedCat() === cat"
                      (click)="selectedCat.set(cat)">{{ cat }}</button>
            }
          </div>

          <!-- Loading skeleton -->
          @if (loading()) {
            <div class="topic-grid">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="topic-skeleton"></div>
              }
            </div>
          }

          <!-- Topics grid -->
          @if (!loading()) {
            <div class="topic-grid">
              @for (topic of filteredTopics(); track topic.id) {
                <div class="topic-card" [class.selected]="selectedTopicId() === topic.id"
                     (click)="selectTopic(topic.id)">
                  <div class="topic-card-top">
                    <span class="material-icons-round topic-icon">{{ topic.icon }}</span>
                    <span class="badge" [class]="topic.difficulty">{{ topic.difficulty }}</span>
                  </div>
                  <h3 class="topic-name">{{ topic.name }}</h3>
                  <p class="topic-desc text-muted">{{ topic.description }}</p>
                  <div class="topic-tags">
                    @for (tag of topic.tags.slice(0, 3); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Start bar -->
        <div class="start-bar" [class.visible]="selectedTopicId()">
          <div class="start-bar-inner">
            @if (selectedTopic()) {
              <div class="selected-info">
                <span class="material-icons-round" style="color: var(--green)">check_circle</span>
                <div>
                  <strong>{{ selectedTopic()!.name }}</strong>
                  <span class="text-muted" style="margin-left: 8px">{{ levelLabel() }} · {{ selectedTopic()!.difficulty }}</span>
                </div>
              </div>
            }
            <button class="btn btn-primary btn-lg"
                    [disabled]="!selectedTopicId() || starting()"
                    (click)="startInterview()">
              @if (starting()) {
                <span class="spinner"></span> Starting...
              } @else {
                <span class="material-icons-round">play_arrow</span>
                Start Interview
              }
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .home-wrapper { min-height: 100vh; display: flex; flex-direction: column; }

    /* Header */
    .home-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 20px 0;
      position: sticky; top: 0; z-index: 10;
    }
    .header-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon { font-size: 32px; color: var(--green); }
    .brand h1 { font-size: 22px; margin-bottom: 2px; }

    /* Main */
    .home-main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 120px; width: 100%; }

    /* Section */
    .section { margin-bottom: 40px; }
    .section-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
    .section-title { margin-bottom: 16px; }
    .topic-count { font-size: 13px; }

    /* Level grid */
    .level-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .level-card {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 20px 16px; border-radius: var(--r-lg);
      border: 2px solid var(--border); background: var(--surface);
      cursor: pointer; transition: all 0.15s; font-family: var(--font-sans);
    }
    .level-card:hover { border-color: var(--border-2); background: var(--surface-2); }
    .level-card.active { border-color: var(--green); background: var(--green-light); }
    .level-icon { font-size: 28px; color: var(--text-3); }
    .level-card.active .level-icon { color: var(--green); }
    .level-name { font-size: 14px; font-weight: 600; }
    .level-desc { font-size: 12px; }

    /* Category pills */
    .cat-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .cat-pill {
      padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 500;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--text-2); cursor: pointer; font-family: var(--font-sans);
      transition: all 0.12s;
    }
    .cat-pill:hover { background: var(--surface-2); }
    .cat-pill.active { background: var(--green); color: #fff; border-color: var(--green); }

    /* Topic grid */
    .topic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }

    .topic-card {
      padding: 16px; border-radius: var(--r-lg); cursor: pointer;
      border: 1.5px solid var(--border); background: var(--surface);
      transition: all 0.15s; display: flex; flex-direction: column; gap: 8px;
    }
    .topic-card:hover { border-color: var(--border-2); box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .topic-card.selected { border-color: var(--green); background: var(--green-light); }

    .topic-card-top { display: flex; align-items: center; justify-content: space-between; }
    .topic-icon { font-size: 24px; color: var(--text-3); }
    .topic-card.selected .topic-icon { color: var(--green); }
    .topic-name { font-size: 14px; font-weight: 600; }
    .topic-desc { font-size: 12px; line-height: 1.5; }
    .topic-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

    /* Skeleton */
    .topic-skeleton {
      height: 140px; border-radius: var(--r-lg);
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Start bar */
    .start-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: var(--surface); border-top: 1px solid var(--border);
      padding: 16px 24px; transform: translateY(100%); transition: transform 0.25s ease;
      box-shadow: 0 -4px 12px rgba(0,0,0,0.06);
    }
    .start-bar.visible { transform: translateY(0); }
    .start-bar-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .selected-info { display: flex; align-items: center; gap: 10px; font-size: 14px; }

    @media (max-width: 768px) {
      .level-grid { grid-template-columns: repeat(3, 1fr); }
      .topic-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
      .start-bar-inner { flex-direction: column; gap: 12px; }
      .btn-lg { width: 100%; }
    }
  `]
})
export class HomeComponent implements OnInit {
  topics = signal<Topic[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);
  starting = signal(false);

  selectedTopicId = signal<string>('');
  selectedCat = signal<string>('All');
  selectedLevel = signal<ExperienceLevel>('MID');

  selectedTopic = computed(() => this.topics().find(t => t.id === this.selectedTopicId()));
  filteredTopics = computed(() => {
    const cat = this.selectedCat();
    return cat === 'All' ? this.topics() : this.topics().filter(t => t.category === cat);
  });

  levels = [
    { value: 'JUNIOR' as ExperienceLevel, label: 'Junior', desc: '0–2 years', icon: 'school' },
    { value: 'MID'    as ExperienceLevel, label: 'Mid-level', desc: '2–5 years', icon: 'work' },
    { value: 'SENIOR' as ExperienceLevel, label: 'Senior', desc: '5+ years', icon: 'military_tech' },
  ];

  levelLabel = computed(() => this.levels.find(l => l.value === this.selectedLevel())?.label ?? '');

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getTopics().subscribe({
      next: topics => { this.topics.set(topics); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.api.getCategories().subscribe(cats => this.categories.set(cats));
  }

  selectTopic(id: string) {
    this.selectedTopicId.set(this.selectedTopicId() === id ? '' : id);
  }

  startInterview() {
    if (!this.selectedTopicId()) return;
    this.starting.set(true);
    const req: StartSessionRequest = { topicId: this.selectedTopicId(), level: this.selectedLevel() };
    this.api.startSession(req).subscribe({
      next: session => {
        this.router.navigate(['/interview', session.sessionId], { state: { session } });
      },
      error: () => this.starting.set(false)
    });
  }
}
