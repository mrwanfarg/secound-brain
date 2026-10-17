import { store } from '../store.js';
import { createStatCard } from '../components/StatCard.js';

export function renderInsightsView(container) {
  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Productivity Insights & Velocity Analytics</h2>
        <p>Understand your time allocation, task completion velocity, and habit consistency.</p>
      </div>
    </div>

    <!-- METRICS CARDS -->
    <div class="overview-grid" id="insightsMetricsGrid" style="margin-bottom: 24px;"></div>

    <!-- CHARTS & DISTRIBUTION PANELS -->
    <div class="insights-grid">
      <!-- TASK CATEGORY DISTRIBUTION -->
      <div class="panel">
        <div class="panel-heading">
          <div>
            <h3>Task Allocation by Category</h3>
            <p>Where your time and scheduled tasks are concentrated.</p>
          </div>
          <span class="stat-icon">📊</span>
        </div>
        <div class="chart-bars" id="categoryBarsContainer"></div>
      </div>

      <!-- PRIORITY DISTRIBUTION -->
      <div class="panel">
        <div class="panel-heading">
          <div>
            <h3>Priority Breakdown</h3>
            <p>Distribution of urgency across all scheduled tasks.</p>
          </div>
          <span class="stat-icon">⚡</span>
        </div>
        <div class="chart-bars" id="priorityBarsContainer"></div>
      </div>
    </div>

    <!-- FOCUS SESSIONS LOG -->
    <div class="panel" style="margin-top: 24px;">
      <div class="panel-heading">
        <div>
          <h3>Recent Deep Focus Sessions</h3>
          <p>Logged Pomodoro and focused work sessions.</p>
        </div>
        <span class="stat-icon">⏱</span>
      </div>
      <div id="insightsSessionsList" style="display: grid; gap: 8px;"></div>
    </div>
  `;

  function renderInsights() {
    const { tasks, timeSessions, weeklyGoals } = store.state;
    const today = new Date().toISOString().split('T')[0];

    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed).length;

    const totalMinutes = timeSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
    const focusHours = (totalMinutes / 60).toFixed(1);

    // Metrics grid
    const metricsGrid = container.querySelector('#insightsMetricsGrid');
    metricsGrid.innerHTML = '';

    metricsGrid.appendChild(createStatCard({
      title: 'Completion Rate',
      value: `${rate}%`,
      caption: `${completed} of ${total} tasks finished`,
      icon: '✓',
      trend: { positive: rate >= 60, text: rate >= 60 ? 'Optimal' : 'Needs attention' }
    }));

    metricsGrid.appendChild(createStatCard({
      title: 'Focus Hours Logged',
      value: `${focusHours}h`,
      caption: `${timeSessions.length} focus sessions recorded`,
      icon: '⏱'
    }));

    metricsGrid.appendChild(createStatCard({
      title: 'Overdue Items',
      value: overdue,
      caption: overdue === 0 ? 'Clear backlog ✓' : 'Requires rescheduling',
      icon: '⚠️'
    }));

    metricsGrid.appendChild(createStatCard({
      title: 'Productivity Streak',
      value: '7 Days',
      caption: 'Continuous daily habit check-ins',
      icon: '🔥'
    }));

    // Category breakdown
    const catMap = {};
    tasks.forEach(t => {
      const c = t.category || 'General';
      catMap[c] = (catMap[c] || 0) + 1;
    });

    const catContainer = container.querySelector('#categoryBarsContainer');
    catContainer.innerHTML = '';

    Object.entries(catMap).forEach(([cat, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barItem = document.createElement('div');
      barItem.className = 'chart-bar-item';
      barItem.innerHTML = `
        <div class="chart-bar-header">
          <span>${cat}</span>
          <span style="color: var(--muted);">${count} tasks (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      catContainer.appendChild(barItem);
    });

    // Priority breakdown
    const priMap = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach(t => {
      const p = t.priority || 'medium';
      if (priMap[p] !== undefined) priMap[p]++;
    });

    const priContainer = container.querySelector('#priorityBarsContainer');
    priContainer.innerHTML = '';

    const priorityColors = {
      urgent: 'var(--red)',
      high: 'var(--amber)',
      medium: 'var(--violet)',
      low: 'var(--muted)'
    };

    Object.entries(priMap).forEach(([pri, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barItem = document.createElement('div');
      barItem.className = 'chart-bar-item';
      barItem.innerHTML = `
        <div class="chart-bar-header">
          <span style="text-transform: capitalize; color: ${priorityColors[pri]}; font-weight: 700;">${pri}</span>
          <span style="color: var(--muted);">${count} tasks (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%; background: ${priorityColors[pri]};"></div>
        </div>
      `;
      priContainer.appendChild(barItem);
    });

    // Recent Sessions
    const sessContainer = container.querySelector('#insightsSessionsList');
    sessContainer.innerHTML = '';

    if (timeSessions.length === 0) {
      sessContainer.innerHTML = `<div style="color: var(--muted); font-size: 11px; padding: 12px; font-style: italic;">No focus sessions logged yet. Use the timer on the Today page!</div>`;
    } else {
      timeSessions.slice(0, 5).forEach(s => {
        const item = document.createElement('div');
        item.className = 'task-row';
        item.style.padding = '10px 14px';
        const dStr = s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        item.innerHTML = `
          <span style="color: var(--cyan); font-size: 16px;">⏱</span>
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 600;">${s.activityName}</div>
            <div style="font-size: 10px; color: var(--muted);">${s.notes || 'Focus session'} · ${dStr}</div>
          </div>
          <span class="task-badge badge-category" style="color: var(--cyan); font-weight: 700;">${s.durationMinutes}m focus</span>
        `;
        sessContainer.appendChild(item);
      });
    }
  }

  renderInsights();
  store.subscribe('tasks', () => renderInsights());
  store.subscribe('timeSessions', () => renderInsights());
}
