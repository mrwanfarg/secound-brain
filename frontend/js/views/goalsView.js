import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

export function renderGoalsView(container) {
  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>High-Level Goals & Strategic Milestones</h2>
        <p>Keep your long-term compass aligned while executing daily sprints.</p>
      </div>
      <button class="btn btn-primary" id="addNewGoalBtn">+ New Strategic Goal</button>
    </div>

    <!-- STRATEGIC OVERVIEW -->
    <div class="overview-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
      <div class="stat-card">
        <div class="stat-top">Active Projects Alignment <span class="stat-icon">▦</span></div>
        <div class="stat-number" id="goalsProjCount">0</div>
        <div class="stat-caption">Projects contributing to goals</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">Weekly Habit Discipline <span class="stat-icon">✓</span></div>
        <div class="stat-number" id="goalsHabitPercent">0%</div>
        <div class="stat-caption">Execution consistency this week</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">Completed Deliverables <span class="stat-icon">⚡</span></div>
        <div class="stat-number" id="goalsDoneTasks">0</div>
        <div class="stat-caption">Tasks completed towards vision</div>
      </div>
    </div>

    <!-- GOALS MILESTONE CARDS -->
    <div class="projects-grid" id="goalsCardsGrid">
      <div class="project-card">
        <div class="project-card-header">
          <div>
            <span class="eyebrow" style="margin-bottom: 4px; display: block;">STRATEGIC OBJECTIVE</span>
            <h3 class="project-title">Ship Second Brain Command Center v2.0</h3>
            <div class="project-desc">Complete full-stack architecture with modular components, task scheduling, habit tracking, and responsive UI.</div>
          </div>
          <span class="task-badge badge-high">Priority Q4</span>
        </div>
        <div class="project-progress-wrap">
          <div class="project-progress-labels">
            <span>Milestone Progress</span>
            <span>90%</span>
          </div>
          <div class="progress-track" style="height: 7px;">
            <div class="progress-fill green" style="width: 90%;"></div>
          </div>
        </div>
        <div class="project-footer">
          <span>Target: End of Month</span>
          <span style="color: var(--green); font-weight: 600;">On Schedule</span>
        </div>
      </div>

      <div class="project-card">
        <div class="project-card-header">
          <div>
            <span class="eyebrow" style="margin-bottom: 4px; display: block;">HEALTH & VITALITY</span>
            <h3 class="project-title">Elite Physical Conditioning & Energy</h3>
            <div class="project-desc">Maintain 5x weekly strength training, zone-2 cardiovascular capacity, and disciplined sleep architecture.</div>
          </div>
          <span class="task-badge badge-urgent">Core Pillar</span>
        </div>
        <div class="project-progress-wrap">
          <div class="project-progress-labels">
            <span>Consistency Rate</span>
            <span>80%</span>
          </div>
          <div class="progress-track" style="height: 7px;">
            <div class="progress-fill" style="width: 80%;"></div>
          </div>
        </div>
        <div class="project-footer">
          <span>Target: Ongoing Habit</span>
          <span style="color: var(--violet-light); font-weight: 600;">80% target days checked</span>
        </div>
      </div>

      <div class="project-card">
        <div class="project-card-header">
          <div>
            <span class="eyebrow" style="margin-bottom: 4px; display: block;">KNOWLEDGE ACQUISITION</span>
            <h3 class="project-title">Read 12 Foundational Books This Year</h3>
            <div class="project-desc">Focus on software architecture, cognitive productivity, systems engineering, and business strategy.</div>
          </div>
          <span class="task-badge badge-medium">Annual</span>
        </div>
        <div class="project-progress-wrap">
          <div class="project-progress-labels">
            <span>Annual Target (8/12 Books)</span>
            <span>67%</span>
          </div>
          <div class="progress-track" style="height: 7px;">
            <div class="progress-fill amber" style="width: 67%;"></div>
          </div>
        </div>
        <div class="project-footer">
          <span>Target: Dec 31</span>
          <span style="color: var(--amber); font-weight: 600;">4 books remaining</span>
        </div>
      </div>
    </div>
  `;

  function updateMetrics() {
    container.querySelector('#goalsProjCount').textContent = store.state.projects.length;
    container.querySelector('#goalsDoneTasks').textContent = store.state.tasks.filter(t => t.completed).length;

    let target = 0, done = 0;
    store.state.weeklyGoals.forEach(g => {
      const d = Array.isArray(g.days) ? g.days.filter(Boolean).length : 0;
      const t = Number(g.target) || 1;
      target += t;
      done += Math.min(d, t);
    });
    const pct = target > 0 ? Math.round((done / target) * 100) : 0;
    container.querySelector('#goalsHabitPercent').textContent = `${pct}%`;
  }

  container.querySelector('#addNewGoalBtn').addEventListener('click', () => {
    Toast.info('Goal creator: Link your vision to projects and habits.');
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'projects' } }));
  });

  updateMetrics();
  store.subscribe('tasks', () => updateMetrics());
  store.subscribe('projects', () => updateMetrics());
  store.subscribe('weeklyGoals', () => updateMetrics());
}
