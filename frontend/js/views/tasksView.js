import { store } from '../store.js';
import { api } from '../api.js';
import { createTaskCard, openEditTaskModal } from '../components/TaskCard.js';
import { Toast } from '../components/Toast.js';
import { createEmptyState } from '../components/EmptyState.js';
import { t, getLang } from '../i18n.js';

export function renderTasksView(container) {
  const isAr = getLang() === 'ar';
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${t('tasks.title')}</h2>
        <p>${t('tasks.subtitle')}</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-small" id="rescheduleOverdueBtn">${t('tasks.reschedule_btn')}</button>
        <button class="btn btn-primary" id="openNewTaskModalBtn">${t('tasks.add_task')}</button>
      </div>
    </div>

    <!-- MONTHLY HABIT GOALS & DAILY TIME TRACKER (CONNECTED TO WEEKLY HABITS) -->
    <div id="monthlyHabitTrackerSection"></div>

    <!-- CONTROL BAR (SEARCH, FILTERS, VIEW SWITCHER) -->
    <div class="panel" style="padding: 16px 20px; margin-bottom: 20px;">
      <div class="tasks-control-bar">
        <!-- Search box -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="field" id="tasksSearchInput" placeholder="${t('tasks.search_placeholder')}">
        </div>

        <!-- View switcher -->
        <div class="view-switcher" id="tasksViewSwitcher">
          <button class="view-switch-btn active" data-view="list">${t('tasks.view_list')}</button>
          <button class="view-switch-btn" data-view="kanban">${t('tasks.view_kanban')}</button>
          <button class="view-switch-btn" data-view="schedule">${t('tasks.view_schedule')}</button>
        </div>
      </div>

      <!-- Filter Pills -->
      <div class="filter-bar" id="tasksFilterBar" style="margin-top: 12px; margin-bottom: 0;">
        <button class="filter-pill active" data-filter="all">${t('tasks.filter_all')}</button>
        <button class="filter-pill" data-filter="today">${t('tasks.filter_today')}</button>
        <button class="filter-pill" data-filter="pending">${t('tasks.filter_pending')}</button>
        <button class="filter-pill" data-filter="completed">${t('tasks.filter_completed')}</button>
        <button class="filter-pill" data-filter="urgent">${t('tasks.filter_urgent')}</button>
        <button class="filter-pill" data-filter="overdue">${t('tasks.filter_overdue')}</button>
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

  // ============================================================
  // MONTHLY HABIT GOALS & DAILY LOG RENDERER
  // ============================================================
  function renderMonthlyHabitTracker() {
    const trackerEl = container.querySelector('#monthlyHabitTrackerSection');
    if (!trackerEl) return;

    const habits = store.state.weeklyGoals || [];
    const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
    const monthName = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

    const currentUser = store.state.user;
    const userKey = currentUser ? currentUser.id || currentUser.email : 'guest';
    const storageTargetsKey = `secondBrain_habit_monthly_targets_${userKey}`;
    const storageSelectedHabitKey = `secondBrain_selected_monthly_habit_${userKey}`;

    let savedTargets = {};
    try {
      savedTargets = JSON.parse(localStorage.getItem(storageTargetsKey) || '{}');
    } catch (_) {
      savedTargets = {};
    }

    // If no habits exist in weekly matrix
    if (habits.length === 0) {
      trackerEl.innerHTML = `
        <div class="monthly-habit-panel" style="border-style: dashed; text-align: center; padding: 24px;">
          <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px;">
            ${t('tasks.monthly_tracker_title')}
          </div>
          <div style="font-size: 12px; color: var(--muted); margin-bottom: 14px; max-width: 480px; margin-left: auto; margin-right: auto;">
            ${t('tasks.no_weekly_habits_hint')}
          </div>
          <button class="btn btn-primary btn-small" id="goToWeeklyFromTasksBtn">
            ${t('tasks.open_weekly_btn')}
          </button>
        </div>
      `;
      trackerEl.querySelector('#goToWeeklyFromTasksBtn')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Weekly' } }));
      });
      return;
    }

    // Determine currently selected habit
    let selectedHabitName = localStorage.getItem(storageSelectedHabitKey);
    const habitExists = habits.some(h => h.name === selectedHabitName);
    if (!habitExists) {
      selectedHabitName = habits[0].name;
      localStorage.setItem(storageSelectedHabitKey, selectedHabitName);
    }

    const selectedHabit = habits.find(h => h.name === selectedHabitName) || habits[0];
    const habitTargetDays = Number(savedTargets[selectedHabit.name]) || 20;

    // Calculate progress, day logs, and total hours
    const stats = calculateMonthlyHabitStats(selectedHabit.name, habitTargetDays, currentMonthStr);
    const percentage = Math.min(100, Math.round((stats.completedDaysCount / habitTargetDays) * 100));
    const isGoalMet = stats.completedDaysCount >= habitTargetDays;
    const daysLeft = Math.max(0, habitTargetDays - stats.completedDaysCount);

    trackerEl.innerHTML = `
      <div class="monthly-habit-panel">
        <!-- HEADER -->
        <div class="monthly-habit-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); display: flex; align-items: center; justify-content: center; font-size: 22px;">
              🎯
            </div>
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--text);">
                ${t('tasks.monthly_tracker_title')}
              </h3>
              <p style="margin: 2px 0 0; font-size: 11px; color: var(--muted);">
                ${t('tasks.monthly_tracker_desc')}
              </p>
            </div>
          </div>
          <div class="date-badge" style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--violet-light); font-weight: 700;">
            📅 ${monthName}
          </div>
        </div>

        <!-- CONTROLS: HABIT SELECTOR & MONTHLY GOAL TARGET -->
        <div class="monthly-habit-controls">
          <div class="control-group">
            <label for="monthlyHabitSelect">${t('tasks.select_habit_label')}</label>
            <select class="field" id="monthlyHabitSelect" style="font-weight: 600;">
              ${habits.map(h => `
                <option value="${h.name}" ${h.name === selectedHabit.name ? 'selected' : ''}>
                  ${h.name} (${h.target || 1}d/wk)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="control-group" style="max-width: 170px;">
            <label for="monthlyHabitTargetInput">${t('tasks.monthly_target_label')}</label>
            <input type="number" class="field" id="monthlyHabitTargetInput" min="1" max="31" value="${habitTargetDays}">
          </div>

          <div>
            <button class="btn btn-primary" id="saveMonthlyHabitTargetBtn" style="white-space: nowrap;">
              ${t('tasks.save_target_btn')}
            </button>
          </div>
        </div>

        <!-- METRIC STATS CARDS -->
        <div class="monthly-habit-stats-grid">
          <!-- Card 1: Completed Days vs Goal -->
          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${t('tasks.days_completed_label')}</div>
            <div class="monthly-habit-stat-value" style="color: ${isGoalMet ? 'var(--green)' : 'var(--violet-light)'};">
              ${stats.completedDaysCount} <span style="font-size: 14px; color: var(--muted); font-weight: 600;">/ ${habitTargetDays} d</span>
            </div>
            <div class="progress-track" style="height: 6px; margin: 4px 0;">
              <div class="progress-fill" style="width: ${percentage}%; background: ${isGoalMet ? 'var(--green)' : 'var(--violet)'};"></div>
            </div>
            <div class="monthly-habit-stat-sub">
              ${percentage}% ${isGoalMet ? `<strong style="color: var(--green);">${t('tasks.goal_achieved')}</strong>` : `(${daysLeft} ${t('tasks.days_remaining_label')})`}
            </div>
          </div>

          <!-- Card 2: Total Hours Logged -->
          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${t('tasks.total_hours_label')}</div>
            <div class="monthly-habit-stat-value" style="color: var(--cyan);">
              ⏱ ${stats.totalHours} <span style="font-size: 13px; font-weight: 600; color: var(--muted);">${t('common.hours_short')}</span>
            </div>
            <div class="monthly-habit-stat-sub">
              ${stats.totalMinutes} ${t('common.minutes_short')} · ${stats.dailyLogs.length} ${isAr ? 'جلسة مسجلة' : 'sessions logged'}
            </div>
          </div>

          <!-- Card 3: Days Remaining -->
          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${t('tasks.days_remaining_label')}</div>
            <div class="monthly-habit-stat-value" style="color: ${isGoalMet ? 'var(--green)' : 'var(--amber)'};">
              ${isGoalMet ? '✓ 0' : daysLeft} <span style="font-size: 14px; color: var(--muted); font-weight: 600;">${isAr ? 'يوم' : 'days'}</span>
            </div>
            <div class="monthly-habit-stat-sub">
              ${isGoalMet ? t('tasks.goal_achieved') : (isAr ? 'متبقي للوصول لهدف الشهر' : 'Left to hit monthly target')}
            </div>
          </div>

          <!-- Card 4: Selected Routine Details -->
          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${isAr ? 'العادة المختارة' : 'Selected Habit'}</div>
            <div class="monthly-habit-stat-value" style="font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">
              ${selectedHabit.name}
            </div>
            <div class="monthly-habit-stat-sub">
              ${isAr ? `هدف الأسبوع: ${selectedHabit.target || 1} أيام` : `Weekly target: ${selectedHabit.target || 1}d/wk`}
            </div>
          </div>
        </div>

        <!-- DAY-BY-DAY TIME LOG TABLE -->
        <div class="daily-log-card">
          <div class="daily-log-header">
            <div style="font-size: 13px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px;">
              <span>${t('tasks.daily_log_title')}</span>
              <span class="task-badge" style="background: rgba(139, 92, 246, 0.15); color: var(--violet-light);">
                ${selectedHabit.name}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--muted);">
              ${isAr ? 'يتم التحديث تلقائياً عند إنهاء التوقيت أو التعليم في الأسبوعي' : 'Updated automatically from Stopwatch & Weekly schedule'}
            </div>
          </div>

          ${stats.dailyLogs.length === 0 ? `
            <div style="padding: 24px; text-align: center; color: var(--muted); font-size: 12px; line-height: 1.6;">
              ${t('tasks.no_daily_logs')}
            </div>
          ` : `
            <div class="daily-log-table-wrap">
              <table class="daily-log-table">
                <thead>
                  <tr>
                    <th>${t('tasks.daily_log_date')}</th>
                    <th>${t('tasks.daily_log_duration')}</th>
                    <th>${t('tasks.daily_log_source')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.dailyLogs.map(log => `
                    <tr>
                      <td style="font-weight: 600; color: var(--text);">
                        📅 ${formatDisplayDate(log.date, isAr)}
                      </td>
                      <td>
                        <span class="task-badge" style="background: rgba(91, 224, 235, 0.15); color: var(--cyan); font-weight: 700;">
                          ⏱ ${log.minutes > 0 ? formatMinutesDuration(log.minutes, isAr) : (isAr ? 'تم الإنجاز' : 'Completed')}
                        </span>
                      </td>
                      <td style="color: var(--text-secondary); font-size: 11px;">
                        ✓ ${log.details}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="daily-log-footer">
              <span>${t('tasks.grand_total')}:</span>
              <span style="color: var(--cyan); font-size: 14px;">
                ⏱ ${stats.totalHours} ${t('common.hours_short')} (${stats.totalMinutes} ${t('common.minutes_short')})
              </span>
            </div>
          `}
        </div>
      </div>
    `;

    // Habit Change Handler
    const habitSelect = trackerEl.querySelector('#monthlyHabitSelect');
    habitSelect?.addEventListener('change', () => {
      localStorage.setItem(storageSelectedHabitKey, habitSelect.value);
      renderMonthlyHabitTracker();
    });

    // Save Target Handler
    const targetInput = trackerEl.querySelector('#monthlyHabitTargetInput');
    const saveBtn = trackerEl.querySelector('#saveMonthlyHabitTargetBtn');
    const handleSave = () => {
      const val = Math.max(1, Math.min(31, parseInt(targetInput.value) || 20));
      savedTargets[selectedHabit.name] = val;
      localStorage.setItem(storageTargetsKey, JSON.stringify(savedTargets));
      Toast.success(isAr ? `تم حفظ هدف "${selectedHabit.name}" بنجاح!` : `Target for "${selectedHabit.name}" saved!`);
      renderMonthlyHabitTracker();
    };
    saveBtn?.addEventListener('click', handleSave);
    targetInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSave();
    });
  }

  // ============================================================
  // STATS CALCULATION HELPER
  // ============================================================
  function calculateMonthlyHabitStats(habitName, targetDays, monthPrefix) {
    const habitLower = (habitName || '').toLowerCase().trim();
    const tasks = store.state.tasks || [];
    const sessions = store.state.timeSessions || [];
    const weeklyGoals = store.state.weeklyGoals || [];

    const dateMap = {}; // dateString -> { date, minutes, sources: [] }

    // 1. Process matching tasks in this month
    tasks.forEach(t => {
      if (!t.title || t.title.toLowerCase().trim() !== habitLower) return;
      const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : null);
      if (!d || !d.startsWith(monthPrefix)) return;
      if (!t.completed && (Number(t.actualMinutes) || 0) === 0) return;

      if (!dateMap[d]) dateMap[d] = { date: d, minutes: 0, sources: [] };
      const mins = Number(t.actualMinutes) || 0;
      if (mins > 0) dateMap[d].minutes = Math.max(dateMap[d].minutes, mins);
      dateMap[d].sources.push(t.description || (isAr ? 'تم إنجاز المهمة' : 'Task completed'));
    });

    // 2. Process matching time sessions in this month
    sessions.forEach(s => {
      const sName = (s.activityName || s.activity_name || '').toLowerCase().trim();
      if (sName !== habitLower) return;
      const rawDate = s.startTime || s.created_at || s.createdAt || '';
      const d = rawDate ? rawDate.slice(0, 10) : null;
      if (!d || !d.startsWith(monthPrefix)) return;

      if (!dateMap[d]) dateMap[d] = { date: d, minutes: 0, sources: [] };
      const mins = Number(s.durationMinutes || s.duration_minutes) || 0;
      if (mins > 0) {
        if (dateMap[d].minutes === 0) dateMap[d].minutes = mins;
        else if (mins > dateMap[d].minutes) dateMap[d].minutes = mins;
      }
      dateMap[d].sources.push(s.notes || (isAr ? 'مسجل عبر عداد الوقت' : 'Recorded via Stopwatch'));
    });

    // 3. Process current week's habit checkmarks (Saturday to Friday)
    const currentGoal = weeklyGoals.find(g => (g.name || '').toLowerCase().trim() === habitLower);
    if (currentGoal && Array.isArray(currentGoal.days)) {
      const curr = new Date();
      const todayIdx = (curr.getDay() + 1) % 7; // 0 = Sat ... 6 = Fri
      currentGoal.days.forEach((checked, dayIdx) => {
        if (checked) {
          const d = new Date(curr);
          d.setDate(d.getDate() - (todayIdx - dayIdx));
          const dStr = d.toISOString().split('T')[0];
          if (dStr.startsWith(monthPrefix)) {
            if (!dateMap[dStr]) {
              dateMap[dStr] = {
                date: dStr,
                minutes: 0,
                sources: [isAr ? 'معلم عليه في جدول الأسبوع' : 'Checked in Weekly Matrix']
              };
            }
          }
        }
      });
    }

    // 4. Sort dates descending (most recent first)
    const sortedDates = Object.keys(dateMap).sort().reverse();
    const dailyLogs = sortedDates.map(d => ({
      date: d,
      minutes: dateMap[d].minutes,
      details: dateMap[d].sources[0] || (isAr ? 'تم الإنجاز' : 'Completed')
    }));

    const completedDaysCount = sortedDates.length;
    const totalMinutes = dailyLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    return {
      completedDaysCount,
      targetDays: Number(targetDays) || 20,
      totalMinutes,
      totalHours,
      dailyLogs
    };
  }

  function formatDisplayDate(dateStr, isArabic) {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (_) {
      return dateStr;
    }
  }

  function formatMinutesDuration(totalMinutes, isArabic) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) {
      return isArabic ? `${h} س و ${m} د` : `${h}h ${m}m`;
    }
    return isArabic ? `${m} دقيقة` : `${m}m`;
  }

  // ============================================================
  // RENDERING FUNCTIONS FOR TASKS LIST / KANBAN / SCHEDULE
  // ============================================================
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
              ${t('tasks.completed_today_from_schedule')} (${todayCompletedTasks.length} ${isAr ? 'عناصر' : 'items'})
            </div>
            <div style="font-size: 11px; color: var(--muted);">
              ${t('tasks.total_time_logged_today')} <strong style="color: var(--cyan);">${todayTrackedMinutes} ${t('common.minutes_short')}</strong>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${todayCompletedTasks.map(t => `
            <span class="task-badge" style="background: rgba(116, 214, 160, 0.12); color: var(--green); border: 1px solid rgba(116, 214, 160, 0.25);">
              ✓ ${t.title} ${t.actualMinutes ? `<strong style="color: var(--cyan);">(⏱ ${t.actualMinutes}${isAr ? 'د' : 'm'})</strong>` : ''}
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
        title: isAr ? 'لا توجد مهام مطابقة' : 'No matching tasks found',
        description: isAr ? 'جرب تغيير كلمات البحث أو الفلاتر أو أضف مهمة جديدة.' : 'Try adjusting your search keywords, project filter, or add a new scheduled task.',
        actionText: isAr ? '+ إضافة مهمة جديدة' : '+ Add New Task',
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
      { id: 'backlog', title: isAr ? 'المهام المعلقة' : 'To Do / Backlog', icon: '📋', filter: t => !t.completed && t.status !== 'in_progress' && t.dueDate !== today },
      { id: 'today', title: isAr ? 'مجدولة لليوم' : 'Scheduled Today', icon: '◷', filter: t => !t.completed && t.status !== 'in_progress' && t.dueDate === today },
      { id: 'in_progress', title: isAr ? 'قيد التنفيذ' : 'In Progress', icon: '⚡', filter: t => !t.completed && t.status === 'in_progress' },
      { id: 'done', title: isAr ? 'المكتملة' : 'Completed', icon: '✓', filter: t => t.completed }
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
        itemsEl.innerHTML = `<div style="text-align: center; color: var(--muted); font-size: 11px; padding: 24px 8px; font-style: italic;">${isAr ? 'لا توجد مهام' : 'No tasks'}</div>`;
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
        <h3>${isAr ? 'الجدول الزمني الزمني للمهام' : 'Chronological Task Schedule'}</h3>
        <p>${isAr ? 'مرتب حسب تاريخ الاستحقاق والفترات الزمنية.' : 'Ordered by scheduled due date and time slots.'}</p>
      </div>
    `;
    panel.appendChild(heading);

    // Group by Date
    const grouped = {};
    tasks.forEach(t => {
      const d = t.dueDate || (isAr ? 'غير محدد' : 'Unscheduled');
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });

    const dates = Object.keys(grouped).sort();

    if (dates.length === 0) {
      panel.appendChild(createEmptyState({
        icon: '◷',
        title: isAr ? 'لا توجد مهام مجدولة' : 'No scheduled tasks',
        description: isAr ? 'جدول المهام بتواريخ استحقاق لعرض المخطط الزمني.' : 'Schedule tasks with due dates to visualize your schedule timeline.'
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
        dateHeader.textContent = d === today 
          ? (isAr ? `📅 اليوم (${d})` : `📅 TODAY (${d})`)
          : `📅 ${d}`;

        const list = document.createElement('div');
        list.className = 'task-list';

        grouped[d].forEach(t => list.appendChild(createTaskCard(t)));

        groupEl.append(dateHeader, list);
        panel.appendChild(groupEl);
      });
    }

    target.appendChild(panel);
  }

  // INITIAL DRAW
  renderMonthlyHabitTracker();
  renderCurrentView();

  // SUBSCRIBE TO UPDATES
  store.subscribe('tasks', () => {
    renderMonthlyHabitTracker();
    renderCurrentView();
  });
  store.subscribe('weeklyGoals', () => {
    renderMonthlyHabitTracker();
  });
  store.subscribe('timeSessions', () => {
    renderMonthlyHabitTracker();
  });
}
