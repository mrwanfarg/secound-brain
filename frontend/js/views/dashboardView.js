import { store } from '../store.js';
import { api } from '../api.js';
import { createStatCard } from '../components/StatCard.js';
import { createTaskCard, openEditTaskModal } from '../components/TaskCard.js';
import { Toast } from '../components/Toast.js';
import { createEmptyState } from '../components/EmptyState.js';
import { getLang } from '../i18n.js';

let intentionTimer = null;

export function renderDashboardView(container) {
  const ar = getLang() === 'ar';

  container.innerHTML = `
    <!-- OVERVIEW STATS -->
    <div class="eyebrow">${ar ? 'نظرة عامة على لوحتك' : 'YOUR OVERVIEW'}</div>
    <div class="overview-grid" id="dashboardOverviewGrid"></div>

    <!-- LIVE ACTIVITY / AUTO-CALCULATED FOCUS BANNER -->
    <div id="dashboardFocusBanner"></div>

    <!-- WEEKLY SUMMARY PROGRESS -->
    <section class="panel" id="dashboardWeeklyPanel">
      <div class="panel-heading">
        <div>
          <h3>${ar ? 'تقدم الأهداف الأسبوعية' : 'Weekly Goals Progress'}</h3>
          <p>${ar ? 'الانضباط والعادات المتتبعة هذا الأسبوع.' : 'Discipline and habits tracked this week.'}</p>
        </div>
        <button class="text-button" id="dashViewWeekBtn">${ar ? 'عرض العادات الأسبوعية →' : 'View weekly habits →'}</button>
      </div>

      <div class="weekly-summary-panel">
        <div>
          <div class="weekly-summary-label">${ar ? 'نسبة الإتمام المستهدفة' : 'Target Completion'}</div>
          <div class="weekly-summary-number" id="dashWeeklyPercent">0%</div>
        </div>
        <div class="stat-caption" id="dashWeeklyCount">${ar ? '0 / 0 أيام هدف مكتملة' : '0 / 0 target days completed'}</div>
      </div>

      <div class="progress-track" style="height: 8px;">
        <div class="progress-fill" id="dashWeeklyFill" style="width: 0%;"></div>
      </div>
    </section>

    <!-- CONTENT GRID (TASKS & QUICK CAPTURE) -->
    <div class="content-grid">
      <!-- TASKS PANEL -->
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h3>${ar ? 'التركيز والمهام' : 'Focus & Tasks'}</h3>
            <p>${ar ? 'مهامك ذات الأولوية العالية والمواعيد المجدولة.' : 'Your high priority and scheduled action items.'}</p>
          </div>
          <button class="text-button" id="dashViewTasksBtn">${ar ? 'الجدول الكامل →' : 'Full Scheduler →'}</button>
        </div>

        <form class="task-form" id="dashTaskForm">
          <div class="task-form-fields">
            <input class="field" id="dashTaskInput" type="text" maxlength="200" placeholder="${ar ? 'ماذا تريد أن تُنجز؟' : 'What needs to get done?'}" required>
            <input class="field" id="dashTaskDate" type="date">
          </div>
          <button class="btn btn-primary" type="submit">${ar ? '+ إضافة مهمة' : '+ Add task'}</button>
        </form>

        <div class="filter-bar" id="dashTaskFilters">
          <button class="filter-pill active" data-filter="all">${ar ? 'الكل' : 'All'}</button>
          <button class="filter-pill" data-filter="today">${ar ? 'اليوم' : 'Today'}</button>
          <button class="filter-pill" data-filter="pending">${ar ? 'قيد الانتظار' : 'Pending'}</button>
          <button class="filter-pill" data-filter="completed">${ar ? 'المكتملة' : 'Completed'}</button>
        </div>

        <div class="task-list" id="dashTaskList"></div>
      </section>

      <!-- QUICK NOTES / CAPTURE PANEL -->
      <section class="panel" id="capturePanel">
        <div class="panel-heading">
          <div>
            <h3>${ar ? 'التقاط سريع' : 'Quick Capture'}</h3>
            <p>${ar ? 'احفظ أفكارك وأفكارك وتذكيراتك فوراً.' : 'Save thoughts, ideas, or reminders instantly.'}</p>
          </div>
          <span class="stat-icon">✦</span>
        </div>

        <form class="capture-form" id="dashCaptureForm">
          <textarea class="field" id="dashCaptureInput" maxlength="3000" placeholder="${ar ? 'اكتب فكرة أو ملاحظة أو مرجعاً...' : 'Write a thought, insight, or reference...'}" required></textarea>
          <button class="btn btn-primary" type="submit">${ar ? 'حفظ الفكرة' : 'Save thought'}</button>
        </form>

        <div class="capture-list" id="dashCaptureList" style="margin-top: 16px; display: grid; gap: 10px;"></div>
      </section>
    </div>

    <!-- DAILY INTENTION PANEL -->
    <section class="intention-panel">
      <div class="eyebrow">${ar ? 'نية التركيز اليومية' : 'DAILY FOCUS INTENTION'}</div>
      <h3>${ar ? 'ما الذي يهمك أكثر اليوم؟' : 'What matters most today?'}</h3>
      <p style="color: var(--muted); font-size: 11px; margin-top: 4px;">${ar ? 'اختر نية واحدة واضحة لتوجيه تركيزك. يتم المزامنة تلقائياً.' : 'Choose one clear intention to anchor your focus. Changes sync automatically to the cloud.'}</p>
      <input class="intention-input" id="dashDailyIntention" type="text" maxlength="300" placeholder="${ar ? 'اليوم، سأركز على...' : 'Today, I will focus on...'}">
      <div class="save-status" id="dashIntentionStatus"></div>
    </section>
  `;

  // Wire up navigation shortcuts
  container.querySelector('#dashViewWeekBtn').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Weekly' } }));
  });
  container.querySelector('#dashViewTasksBtn').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Tasks' } }));
  });

  // Wire up Task Add Form
  const taskForm = container.querySelector('#dashTaskForm');
  taskForm.addEventListener('submit', async e => {
    e.preventDefault();
    const input = container.querySelector('#dashTaskInput');
    const dateInput = container.querySelector('#dashTaskDate');
    const text = input.value.trim();
    if (!text) return;
    const _ar = getLang() === 'ar';

    try {
      await api.createTask({
        title: text,
        dueDate: dateInput.value || new Date().toISOString().split('T')[0],
        priority: 'medium'
      });
      input.value = '';
      dateInput.value = '';
      Toast.success(_ar ? 'تمت جدولة المهمة بنجاح' : 'Task scheduled successfully');
      await store.refreshAll();
    } catch {
      Toast.error(_ar ? 'تعذّر جدولة المهمة' : 'Could not schedule task');
    }
  });

  // Wire up Quick Capture
  const captureForm = container.querySelector('#dashCaptureForm');
  captureForm.addEventListener('submit', async e => {
    e.preventDefault();
    const input = container.querySelector('#dashCaptureInput');
    const content = input.value.trim();
    if (!content) return;
    const _ar = getLang() === 'ar';

    try {
      await api.createNote({ content });
      input.value = '';
      Toast.success(_ar ? 'تم حفظ الفكرة ✦' : 'Thought captured successfully ✦');
      await store.refreshAll();
    } catch {
      Toast.error(_ar ? 'تعذّر حفظ الفكرة' : 'Could not save thought');
    }
  });

  // Wire up Daily Intention
  const intentionInput = container.querySelector('#dashDailyIntention');
  const intentionStatus = container.querySelector('#dashIntentionStatus');
  intentionInput.value = store.state.intention || '';

  intentionInput.addEventListener('input', () => {
    const _ar = getLang() === 'ar';
    clearTimeout(intentionTimer);
    intentionStatus.textContent = _ar ? 'جاري الحفظ...' : 'Saving...';
    intentionTimer = setTimeout(async () => {
      try {
        await api.setIntention(intentionInput.value);
        intentionStatus.textContent = _ar ? 'تم الحفظ في Second Brain ✓' : 'Saved to Second Brain ✓';
      } catch {
        intentionStatus.textContent = _ar ? 'تم الحفظ محلياً' : 'Saved locally';
      }
    }, 600);
  });

  // Filter pills
  let activeFilter = 'all';
  container.querySelectorAll('#dashTaskFilters .filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#dashTaskFilters .filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderTasksList();
    });
  });

function formatStopwatchTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

  // RENDER DYNAMIC DATA
  function updateStats() {
    const grid = container.querySelector('#dashboardOverviewGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const _ar = getLang() === 'ar';

    const { tasks, projects, notes, weeklyGoals, timeSessions = [] } = store.state;
    const today = new Date().toISOString().split('T')[0];

    const completedCount = tasks.filter(t => t.completed).length;
    const activeProjectsCount = projects.filter(p => p.status !== 'Completed').length;
    const todayCount = tasks.filter(t => t.dueDate === today && !t.completed).length;
    const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed).length;

    // Calculate today's auto-calculated focus time
    const itemMap = {};
    tasks.filter(t => t.dueDate === today && Number(t.actualMinutes) > 0).forEach(t => {
      const name = t.title || 'Task';
      itemMap[name] = Number(t.actualMinutes) || 0;
    });
    timeSessions.filter(s => {
      const d = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
      return d === today;
    }).forEach(s => {
      const name = s.activityName || s.activity_name || 'Focus Session';
      const mins = Number(s.durationMinutes || s.duration_minutes) || 0;
      itemMap[name] = Math.max(itemMap[name] || 0, mins);
    });
    const totalTodayMins = Object.values(itemMap).reduce((sum, m) => sum + m, 0);

    grid.appendChild(createStatCard({
      title: _ar ? 'المهام المنجزة' : 'Completed Tasks',
      value: completedCount,
      caption: _ar ? `${tasks.length} مهمة مسجلة إجمالاً` : `${tasks.length} total recorded`,
      icon: '✓',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Tasks' } }))
    }));

    grid.appendChild(createStatCard({
      title: _ar ? 'العادات الأسبوعية' : 'Weekly Habits',
      value: weeklyGoals.length,
      caption: weeklyGoals.length > 0
        ? (_ar ? `${weeklyGoals.length} عادة نشطة` : `${weeklyGoals.length} habits active`)
        : (_ar ? 'ابنِ روتينك اليومي' : 'Build your routine'),
      icon: '▦',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Weekly' } }))
    }));

    grid.appendChild(createStatCard({
      title: _ar ? 'وقت التركيز اليوم' : "Today's Focus Time",
      value: totalTodayMins >= 60 
        ? `${Math.floor(totalTodayMins / 60)}${_ar ? 'س' : 'h'} ${totalTodayMins % 60}${_ar ? 'د' : 'm'}` 
        : `${totalTodayMins} ${_ar ? 'دقيقة' : 'm'}`,
      caption: _ar ? '⏱ محسوب تلقائياً من البدء والانتهاء' : '⏱ Auto-calculated from start & finish',
      icon: '⏱',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }))
    }));

    grid.appendChild(createStatCard({
      title: _ar ? 'جدول اليوم' : "Today's Schedule",
      value: todayCount,
      caption: overdueCount > 0
        ? `⚠️ ${overdueCount} ${_ar ? 'متأخرة' : 'overdue'}`
        : (_ar ? 'على المسار الصحيح اليوم' : 'On track today'),
      icon: '◷',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }))
    }));

    grid.appendChild(createStatCard({
      title: _ar ? 'الملاحظات والأفكار' : 'Notes & Ideas',
      value: notes.length,
      caption: _ar ? 'قاعدة معرفة Second Brain' : 'Second Brain knowledge base',
      icon: '✦',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Notes' } }))
    }));

    // Weekly summary bar
    let totalTarget = 0;
    let totalDone = 0;
    weeklyGoals.forEach(g => {
      const days = Array.isArray(g.days) ? g.days : [];
      const c = days.filter(Boolean).length;
      const t = Number(g.target) || 1;
      totalTarget += t;
      totalDone += Math.min(c, t);
    });
    const percent = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
    container.querySelector('#dashWeeklyPercent').textContent = `${percent}%`;
    container.querySelector('#dashWeeklyCount').textContent = _ar
      ? `${totalDone} / ${totalTarget} أيام هدف مكتملة`
      : `${totalDone} / ${totalTarget} target days completed`;
    container.querySelector('#dashWeeklyFill').style.width = `${percent}%`;

    renderDashboardFocusBanner();
  }

  // RENDER TODAY FOCUS BANNER ON DASHBOARD (LIVE ACTIVITY OR AUTO-CALCULATED LOG)
  function renderDashboardFocusBanner() {
    const bannerEl = container.querySelector('#dashboardFocusBanner');
    if (!bannerEl) return;
    const _ar = getLang() === 'ar';
    const sw = store.state.stopwatch;
    const today = new Date().toISOString().split('T')[0];

    // If session is active/running
    if (sw.isRunning) {
      bannerEl.innerHTML = `
        <div class="panel" style="padding: 16px 20px; margin-bottom: 24px; background: linear-gradient(135deg, rgba(91, 224, 235, 0.12), rgba(155, 123, 255, 0.12)); border: 1px solid rgba(91, 224, 235, 0.35); border-radius: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="pulse-indicator ${sw.isPaused ? 'paused' : 'running'}"></span>
              <div>
                <div style="font-size: 11px; font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.5px;">
                  ${_ar ? '⚡ جلسة تركيز قيد التشغيل الآن' : '⚡ LIVE FOCUS SESSION ACTIVE'}
                </div>
                <div style="font-size: 16px; font-weight: 800; color: var(--text); margin-top: 2px;">
                  ${sw.activeItemTitle || (_ar ? 'جلسة تركيز' : 'Focus Session')}
                </div>
                <div style="font-size: 12px; color: var(--muted); margin-top: 2px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                  <span style="color: var(--cyan); font-weight: 700;">⏰ ${_ar ? `بدأت الساعة: ${sw.startTimeFormatted || ''}` : `Started at: ${sw.startTimeFormatted || ''}`}</span>
                  <span>·</span>
                  <span>${_ar ? 'المدة الحالية:' : 'Current duration:'} <strong style="color: var(--text); font-family: monospace;">${formatStopwatchTime(sw.elapsedSeconds)}</strong></span>
                  ${sw.isPaused ? `<span style="color: var(--amber); font-weight: 700;">(${_ar ? 'متوقف مؤقتاً' : 'Paused'})</span>` : ''}
                </div>
              </div>
            </div>
            <button class="btn btn-primary" id="dashGoToLiveTodayBtn">
              ${_ar ? 'الانتقال للتوقيت والإنهاء في تركيز اليوم →' : "Open Today's Focus & Finish →"}
            </button>
          </div>
        </div>
      `;
      bannerEl.querySelector('#dashGoToLiveTodayBtn')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
      });
      return;
    }

    // Auto-calculated summary from sessions and tasks for today
    const tasks = store.state.tasks || [];
    const sessions = store.state.timeSessions || [];

    const itemMap = {};
    tasks.filter(t => t.dueDate === today && Number(t.actualMinutes) > 0).forEach(t => {
      const name = t.title || 'Task';
      itemMap[name] = { name, minutes: Number(t.actualMinutes) || 0 };
    });

    sessions.filter(s => {
      const d = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
      return d === today;
    }).forEach(s => {
      const name = s.activityName || s.activity_name || 'Focus Session';
      let timeRange = '';
      if (s.startTime && s.endTime) {
        const sFmt = store.formatTimeOfDay(s.startTime);
        const eFmt = store.formatTimeOfDay(s.endTime);
        if (sFmt && eFmt) timeRange = `${sFmt} - ${eFmt}`;
      }
      const mins = Number(s.durationMinutes || s.duration_minutes) || 0;
      if (!itemMap[name]) {
        itemMap[name] = { name, minutes: mins, timeRange };
      } else {
        itemMap[name].minutes = Math.max(itemMap[name].minutes, mins);
        if (timeRange && !itemMap[name].timeRange) itemMap[name].timeRange = timeRange;
      }
    });

    const items = Object.values(itemMap);
    const totalTodayMins = items.reduce((sum, it) => sum + (Number(it.minutes) || 0), 0);
    const totalHours = (totalTodayMins / 60).toFixed(1);

    const formattedTime = totalTodayMins >= 60 
      ? (_ar ? `${Math.floor(totalTodayMins/60)} ساعة و ${totalTodayMins%60} دقيقة` : `${Math.floor(totalTodayMins/60)}h ${totalTodayMins%60}m`)
      : (_ar ? `${totalTodayMins} دقيقة` : `${totalTodayMins} mins`);

    bannerEl.innerHTML = `
      <div class="today-time-summary-banner" style="margin-bottom: 24px;">
        <div class="today-time-left">
          <div class="today-time-icon">⏱</div>
          <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--cyan);">
              ${_ar ? 'إجمالي وقت التركيز اليوم (محسوب تلقائياً من أوقات البدء والانتهاء)' : 'TODAY\'S TOTAL FOCUS TIME (AUTO CALCULATED FROM START & FINISH)'}
            </div>
            <div class="today-time-digits">
              ${formattedTime} ${totalTodayMins >= 60 ? `<span style="font-size: 13px; color: var(--muted); font-weight: 600;">(${totalHours}h)</span>` : ''}
            </div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">
              ${items.length > 0
                ? (_ar ? `${items.length} جلسات تركيز مكتملة اليوم` : `${items.length} focus sessions logged today`)
                : (_ar ? 'اضغط بدء التوقيت في تركيز اليوم أو الأسبوعي لتسجيل الوقت تلقائياً' : 'Start timing any habit or task in Today\'s Focus to auto-calculate time')}
            </div>
          </div>
        </div>

        <div class="today-time-items-wrap">
          ${items.filter(it => it.minutes > 0).map(it => `
            <span class="task-badge" style="background: rgba(91, 224, 235, 0.12); color: var(--cyan); border: 1px solid rgba(91, 224, 235, 0.25); font-weight: 700;">
              ✓ ${it.name} (${it.minutes}${_ar ? 'د' : 'm'}${it.timeRange ? ` · ${it.timeRange}` : ''})
            </span>
          `).join('')}
          <button class="btn btn-secondary btn-small" id="dashStartSessionShortcutBtn" style="font-size: 11px; padding: 4px 10px;">
            ${_ar ? '⚡ تركيز اليوم →' : "⚡ Today's Focus →"}
          </button>
        </div>
      </div>
    `;

    bannerEl.querySelector('#dashStartSessionShortcutBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
    });
  }

  function renderTasksList() {
    const listEl = container.querySelector('#dashTaskList');
    if (!listEl) return;
    listEl.innerHTML = '';
    const _ar = getLang() === 'ar';

    const today = new Date().toISOString().split('T')[0];
    let tasks = store.state.tasks;

    if (activeFilter === 'today') {
      tasks = tasks.filter(t => t.dueDate === today);
    } else if (activeFilter === 'pending') {
      tasks = tasks.filter(t => !t.completed);
    } else if (activeFilter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    }

    const limited = tasks.slice(0, 6);

    if (limited.length === 0) {
      listEl.appendChild(createEmptyState({
        icon: '☑',
        title: _ar ? 'لا توجد مهام في هذا الفلتر' : 'No tasks in this filter',
        description: _ar ? 'أضف مهمة جديدة من الأعلى أو غيّر الفلتر.' : 'Add a new task using the input above or change filter.'
      }));
      return;
    }

    limited.forEach(task => {
      listEl.appendChild(createTaskCard(task, {
        onUpdate: () => updateStats(),
        onDelete: () => updateStats()
      }));
    });
  }

  function renderNotesList() {
    const listEl = container.querySelector('#dashCaptureList');
    if (!listEl) return;
    listEl.innerHTML = '';
    const _ar = getLang() === 'ar';

    const notes = store.state.notes.slice(0, 5);
    if (notes.length === 0) {
      listEl.appendChild(createEmptyState({
        icon: '✦',
        title: _ar ? 'لا توجد ملاحظات بعد' : 'No notes yet',
        description: _ar ? 'التقط أفكارك وأفكارك من الأعلى.' : 'Capture your thoughts and insights above.'
      }));
      return;
    }

    notes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'task-row';
      item.style.cursor = 'default';

      const icon = document.createElement('span');
      icon.style.color = 'var(--violet-light)';
      icon.textContent = '✦';

      const text = document.createElement('div');
      text.style.flex = '1';
      text.style.fontSize = '12px';
      text.textContent = note.content;

      const del = document.createElement('button');
      del.className = 'btn btn-icon';
      del.innerHTML = '&times;';
      del.title = _ar ? 'حذف الملاحظة' : 'Delete note';
      del.addEventListener('click', async () => {
        await api.deleteNote(note.id);
        Toast.success(_ar ? 'تم حذف الملاحظة' : 'Note deleted');
        await store.refreshAll();
      });

      item.append(icon, text, del);
      listEl.appendChild(item);
    });
  }

  // Initial draw
  updateStats();
  renderTasksList();
  renderNotesList();

  // Subscribe to changes
  store.subscribe('tasks', () => {
    updateStats();
    renderTasksList();
  });
  store.subscribe('notes', () => {
    updateStats();
    renderNotesList();
  });
  store.subscribe('weeklyGoals', () => updateStats());
  store.subscribe('timeSessions', () => updateStats());
  store.subscribe('stopwatch', () => {
    renderDashboardFocusBanner();
  });
}
