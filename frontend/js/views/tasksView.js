import { store } from '../store.js';
import { api } from '../api.js';
import { createTaskCard, openEditTaskModal } from '../components/TaskCard.js';
import { Toast } from '../components/Toast.js';
import { createEmptyState } from '../components/EmptyState.js';

export function renderTasksView(container) {
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Task Scheduling Command Center</h2>
        <p>Plan, organize, and execute your tasks with precision timeframes.</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-small" id="rescheduleOverdueBtn">⚡ Reschedule Overdue to Today</button>
        <button class="btn btn-primary" id="openNewTaskModalBtn">+ Schedule Task</button>
      </div>
    </div>

    <!-- CONTROL BAR (SEARCH, FILTERS, VIEW SWITCHER) -->
    <div class="panel" style="padding: 16px 20px; margin-bottom: 20px;">
      <div class="tasks-control-bar">
        <!-- Search box -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="field" id="tasksSearchInput" placeholder="Search tasks by title, category, or notes...">
        </div>

        <!-- Project Filter -->
        <div style="min-width: 170px;">
          <select class="field" id="tasksProjectFilter">
            <option value="">All Projects</option>
          </select>
        </div>

        <!-- View switcher -->
        <div class="view-switcher" id="tasksViewSwitcher">
          <button class="view-switch-btn active" data-view="list">☰ List</button>
          <button class="view-switch-btn" data-view="kanban">▦ Kanban</button>
          <button class="view-switch-btn" data-view="schedule">◷ Schedule</button>
        </div>
      </div>

      <!-- Filter Pills -->
      <div class="filter-bar" id="tasksFilterBar" style="margin-top: 12px; margin-bottom: 0;">
        <button class="filter-pill active" data-filter="all">All Tasks</button>
        <button class="filter-pill" data-filter="today">Today</button>
        <button class="filter-pill" data-filter="pending">Pending</button>
        <button class="filter-pill" data-filter="completed">Completed</button>
        <button class="filter-pill" data-filter="urgent">🔥 Urgent</button>
        <button class="filter-pill" data-filter="overdue">⚠️ Overdue</button>
      </div>
    </div>

    <!-- MAIN TASKS CONTENT CONTAINER -->
    <div id="tasksContentContainer"></div>
  `;

  // Reschedule Overdue Button
  container.querySelector('#rescheduleOverdueBtn').addEventListener('click', async () => {
    try {
      const res = await api.rescheduleOverdue();
      Toast.success(res.message || 'Overdue tasks rescheduled to today!');
      await store.refreshAll();
    } catch {
      Toast.error('Could not reschedule overdue tasks');
    }
  });

  // Open New Task Modal
  container.querySelector('#openNewTaskModalBtn').addEventListener('click', () => {
    openEditTaskModal();
  });

  // Search input handler
  const searchInput = container.querySelector('#tasksSearchInput');
  searchInput.addEventListener('input', () => {
    store.state.searchQuery = searchInput.value;
    renderCurrentView();
  });

  // Project filter handler
  const projectSelect = container.querySelector('#tasksProjectFilter');
  function populateProjects() {
    projectSelect.innerHTML = '<option value="">All Projects</option>';
    store.state.projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `▦ ${p.name}`;
      projectSelect.appendChild(opt);
    });
  }
  projectSelect.addEventListener('change', () => {
    store.state.activeProjectFilter = projectSelect.value;
    renderCurrentView();
  });

  // View switch handler
  container.querySelectorAll('#tasksViewSwitcher .view-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#tasksViewSwitcher .view-switch-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      store.state.taskViewMode = btn.dataset.view;
      renderCurrentView();
    });
  });

  // Filter bar pills
  container.querySelectorAll('#tasksFilterBar .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('#tasksFilterBar .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      store.state.taskFilter = pill.dataset.filter;
      renderCurrentView();
    });
  });

  // RENDERING FUNCTIONS
  function renderCurrentView() {
    const target = container.querySelector('#tasksContentContainer');
    if (!target) return;
    target.innerHTML = '';

    // Summary of what was finished today from the schedule with exact tracked time
    const todayCompletedTasks = store.state.tasks.filter(t => t.dueDate === today && t.completed);
    const todayTrackedMinutes = todayCompletedTasks.reduce((sum, t) => sum + (Number(t.actualMinutes) || 0), 0);

    if (todayCompletedTasks.length > 0) {
      const summaryBanner = document.createElement('div');
      summaryBanner.className = 'panel';
      summaryBanner.style.padding = '14px 18px';
      summaryBanner.style.marginBottom = '18px';
      summaryBanner.style.background = 'linear-gradient(135deg, rgba(24, 22, 34, 0.95), rgba(18, 17, 26, 0.95))';
      summaryBanner.style.border = '1px solid rgba(116, 214, 160, 0.25)';

      const bannerTop = document.createElement('div');
      bannerTop.style.display = 'flex';
      bannerTop.style.justifyContent = 'space-between';
      bannerTop.style.alignItems = 'center';
      bannerTop.style.flexWrap = 'wrap';
      bannerTop.style.gap = '8px';

      bannerTop.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--green); font-size: 16px;">✓</span>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text);">
              Completed Today from Schedule (${todayCompletedTasks.length} items)
            </div>
            <div style="font-size: 11px; color: var(--muted);">
              Total time logged on today's items: <strong style="color: var(--cyan);">${todayTrackedMinutes} minutes</strong>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${todayCompletedTasks.map(t => `
            <span class="task-badge" style="background: rgba(116, 214, 160, 0.12); color: var(--green); border: 1px solid rgba(116, 214, 160, 0.25);">
              ✓ ${t.title} ${t.actualMinutes ? `<strong style="color: var(--cyan);">(⏱ ${t.actualMinutes}m)</strong>` : ''}
            </span>
          `).join('')}
        </div>
      `;

      summaryBanner.appendChild(bannerTop);
      target.appendChild(summaryBanner);
    }

    const tasks = store.getFilteredTasks();

    if (store.state.taskViewMode === 'kanban') {
      renderKanban(target, tasks);
    } else if (store.state.taskViewMode === 'schedule') {
      renderScheduleView(target, tasks);
    } else {
      renderListView(target, tasks);
    }
  }

  // 1. LIST VIEW
  function renderListView(target, tasks) {
    if (tasks.length === 0) {
      target.appendChild(createEmptyState({
        icon: '☑',
        title: 'No matching tasks found',
        description: 'Try adjusting your search keywords, project filter, or add a new scheduled task.',
        actionText: '+ Add New Task',
        onAction: () => openEditTaskModal()
      }));
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'panel';

    const list = document.createElement('div');
    list.className = 'task-list';

    tasks.forEach(task => {
      list.appendChild(createTaskCard(task));
    });

    panel.appendChild(list);
    target.appendChild(panel);
  }

  // 2. KANBAN VIEW
  function renderKanban(target, tasks) {
    const board = document.createElement('div');
    board.className = 'kanban-board';

    const columns = [
      { id: 'backlog', title: 'To Do / Backlog', icon: '📋', filter: t => !t.completed && t.status !== 'in_progress' && t.dueDate !== today },
      { id: 'today', title: 'Scheduled Today', icon: '◷', filter: t => !t.completed && t.status !== 'in_progress' && t.dueDate === today },
      { id: 'in_progress', title: 'In Progress', icon: '⚡', filter: t => !t.completed && t.status === 'in_progress' },
      { id: 'done', title: 'Completed', icon: '✓', filter: t => t.completed }
    ];

    columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'kanban-col';

      const colTasks = tasks.filter(col.filter);

      const header = document.createElement('div');
      header.className = 'kanban-header';
      header.innerHTML = `
        <div class="kanban-col-title">
          <span>${col.icon}</span> ${col.title}
        </div>
        <span class="filter-count">${colTasks.length}</span>
      `;

      const itemsEl = document.createElement('div');
      itemsEl.className = 'kanban-items';

      if (colTasks.length === 0) {
        itemsEl.innerHTML = `<div style="text-align: center; color: var(--muted); font-size: 11px; padding: 24px 8px; font-style: italic;">No tasks</div>`;
      } else {
        colTasks.forEach(task => {
          itemsEl.appendChild(createTaskCard(task, { compact: true }));
        });
      }

      colEl.append(header, itemsEl);
      board.appendChild(colEl);
    });

    target.appendChild(board);
  }

  // 3. SCHEDULE / TIMELINE VIEW
  function renderScheduleView(target, tasks) {
    const panel = document.createElement('div');
    panel.className = 'panel';

    const heading = document.createElement('div');
    heading.className = 'panel-heading';
    heading.innerHTML = `
      <div>
        <h3>Chronological Task Schedule</h3>
        <p>Ordered by scheduled due date and time slots.</p>
      </div>
    `;
    panel.appendChild(heading);

    // Group by Date
    const grouped = {};
    tasks.forEach(t => {
      const d = t.dueDate || 'Unscheduled';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });

    const dates = Object.keys(grouped).sort();

    if (dates.length === 0) {
      panel.appendChild(createEmptyState({
        icon: '◷',
        title: 'No scheduled tasks',
        description: 'Schedule tasks with due dates to visualize your schedule timeline.'
      }));
    } else {
      dates.forEach(d => {
        const groupEl = document.createElement('div');
        groupEl.style.marginBottom = '20px';

        const dateHeader = document.createElement('div');
        dateHeader.style.fontSize = '12px';
        dateHeader.style.fontWeight = '700';
        dateHeader.style.color = d === today ? 'var(--cyan)' : 'var(--violet-light)';
        dateHeader.style.marginBottom = '8px';
        dateHeader.textContent = d === today ? `📅 TODAY (${d})` : `📅 ${d}`;

        const list = document.createElement('div');
        list.className = 'task-list';

        grouped[d].forEach(t => list.appendChild(createTaskCard(t)));

        groupEl.append(dateHeader, list);
        panel.appendChild(groupEl);
      });
    }

    target.appendChild(panel);
  }

  // Initial render
  populateProjects();
  renderCurrentView();

  store.subscribe('tasks', () => renderCurrentView());
  store.subscribe('projects', () => populateProjects());
}
