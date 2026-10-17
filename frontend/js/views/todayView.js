import { store } from '../store.js';
import { api } from '../api.js';
import { createTaskCard, openEditTaskModal } from '../components/TaskCard.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { createEmptyState } from '../components/EmptyState.js';

const DAY_NAMES = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function getTodayDayIndex() {
  const date = new Date();
  return (date.getDay() + 1) % 7; // 0 = Sat, 1 = Sun, ..., 6 = Fri
}

function formatStopwatchTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function renderTodayView(container) {
  const todayDate = new Date().toISOString().split('T')[0];
  const todayIdx = getTodayDayIndex();
  const dayName = DAY_NAMES[todayIdx];

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Today's Focus & Daily Command</h2>
        <p>Today is <strong style="color: var(--cyan);">${dayName} (${todayDate})</strong>. Execute your scheduled habits, track real time, and log completed work.</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="btn btn-secondary btn-small" id="todayViewWeeklyBtn">View Weekly Matrix →</button>
        <button class="btn btn-primary" id="todayAddTaskBtn">+ Schedule Task for Today</button>
      </div>
    </div>

    <!-- LIVE ACTIVITY STOPWATCH & TRACKER CARD -->
    <div class="panel live-stopwatch-panel" id="liveStopwatchPanel">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="pulse-indicator" id="stopwatchPulseDot"></span>
          <div>
            <div class="eyebrow" style="margin: 0;">LIVE ACTIVITY TIME TRACKER</div>
            <h3 id="stopwatchItemTitle" style="font-size: 16px; margin: 2px 0 0; color: var(--text);">No active session</h3>
          </div>
        </div>
        <div class="stopwatch-digits" id="stopwatchClockDisplay">00:00</div>
      </div>

      <!-- Completion banner (hidden until Finish is pressed) -->
      <div id="stopwatchDoneBanner" style="display:none; align-items:center; gap:12px; margin-top:14px; padding:12px 16px; background:rgba(80,220,130,0.12); border:1px solid rgba(80,220,130,0.35); border-radius:12px;">
        <span style="font-size:24px; color:var(--green);">✓</span>
        <div>
          <div style="font-weight:700; color:var(--green); font-size:14px;" id="stopwatchDoneTitle">Session complete!</div>
          <div style="font-size:12px; color:var(--muted);" id="stopwatchDoneDetail"></div>
        </div>
      </div>

      <div class="stopwatch-actions-bar" style="display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap;">
        <button class="btn btn-primary" id="stopwatchMainToggleBtn">▶ Start Stopwatch</button>
        <button class="btn btn-secondary" id="stopwatchPauseBtn" style="display: none;">⏸ Pause</button>
        <button class="btn btn-success" id="stopwatchFinishBtn" style="display: none;">⏹ Finish & Log to Tasks</button>
        <button class="btn btn-secondary btn-small" id="stopwatchResetBtn">↺ Reset</button>
        <span style="font-size: 11px; color: var(--muted); margin-left: auto;" id="stopwatchStatusCaption">Ready to track your time</span>
      </div>
    </div>

    <!-- 1. TODAY'S SCHEDULED HABITS (CONNECTED TO WEEKLY HABITS) -->
    <section class="panel" id="todayHabitsSection" style="border: 1px solid rgba(155, 123, 255, 0.3);">
      <div class="panel-heading">
        <div>
          <h3 style="font-size: 15px; color: var(--violet-light);">
            ⚡ Today's Scheduled Habits (${dayName})
          </h3>
          <p>Habits scheduled for today from your Weekly Plan. Check off when done or use the stopwatch to log exact minutes into Tasks!</p>
        </div>
        <span class="stat-icon" style="background: rgba(155, 123, 255, 0.2);">▦</span>
      </div>

      <div id="todayHabitsList" style="display: grid; gap: 10px;"></div>
    </section>

    <!-- 2. TIME-SLOTTED TASKS GRID -->
    <div class="section-heading" style="margin-top: 28px;">
      <div>
        <h2>Today's Task Schedule</h2>
        <p>Grouped into morning, afternoon, and evening focus blocks.</p>
      </div>
    </div>

    <div class="timeline-column" style="display: grid; gap: 18px;">
      <!-- MORNING -->
      <div class="timeline-block">
        <div class="timeline-header">
          <div class="timeline-title">🌅 Morning Deep Work</div>
          <div class="timeline-time">08:00 — 12:00</div>
        </div>
        <div class="task-list" id="slotMorningTasks"></div>
      </div>

      <!-- AFTERNOON -->
      <div class="timeline-block">
        <div class="timeline-header">
          <div class="timeline-title">☀️ Afternoon Execution</div>
          <div class="timeline-time">12:00 — 17:00</div>
        </div>
        <div class="task-list" id="slotAfternoonTasks"></div>
      </div>

      <!-- EVENING -->
      <div class="timeline-block">
        <div class="timeline-header">
          <div class="timeline-title">🌙 Evening Wrap-up</div>
          <div class="timeline-time">17:00 — 21:00</div>
        </div>
        <div class="task-list" id="slotEveningTasks"></div>
      </div>
    </div>
  `;

  // Navigation shortcuts
  container.querySelector('#todayViewWeeklyBtn').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Weekly' } }));
  });
  container.querySelector('#todayAddTaskBtn').addEventListener('click', () => {
    openEditTaskModal({ dueDate: todayDate });
  });

  // STOPWATCH CONTROLS IN TOP WIDGET
  const pulseDot = container.querySelector('#stopwatchPulseDot');
  const titleEl = container.querySelector('#stopwatchItemTitle');
  const clockEl = container.querySelector('#stopwatchClockDisplay');
  const mainToggleBtn = container.querySelector('#stopwatchMainToggleBtn');
  const pauseBtn = container.querySelector('#stopwatchPauseBtn');
  const finishBtn = container.querySelector('#stopwatchFinishBtn');
  const resetBtn = container.querySelector('#stopwatchResetBtn');
  const statusCaption = container.querySelector('#stopwatchStatusCaption');
  const doneBanner = container.querySelector('#stopwatchDoneBanner');
  const doneTitle = container.querySelector('#stopwatchDoneTitle');
  const doneDetail = container.querySelector('#stopwatchDoneDetail');

  function updateStopwatchUI() {
    const sw = store.state.stopwatch;
    clockEl.textContent = formatStopwatchTime(sw.elapsedSeconds);

    if (sw.isRunning) {
      pulseDot.className = sw.isPaused ? 'pulse-indicator paused' : 'pulse-indicator running';
      titleEl.textContent = sw.activeItemTitle || 'Active Focus Session';
      statusCaption.textContent = sw.isPaused ? 'Paused · Click Resume to continue' : '⏱ Recording time live...';

      mainToggleBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      pauseBtn.textContent = sw.isPaused ? '▶ Resume' : '⏸ Pause';
      finishBtn.style.display = 'inline-flex';
    } else {
      pulseDot.className = 'pulse-indicator';
      titleEl.textContent = sw.activeItemTitle ? `Ready: ${sw.activeItemTitle}` : 'No active session';
      statusCaption.textContent = 'Choose any habit or task below to start timing';

      mainToggleBtn.style.display = 'inline-flex';
      mainToggleBtn.textContent = '▶ Start Stopwatch';
      pauseBtn.style.display = 'none';
      finishBtn.style.display = 'none';
    }
  }

  /** Show the green ✓ done banner inside the stopwatch panel */
  function showDoneBanner(title, mins) {
    doneBanner.style.display = 'flex';
    doneTitle.textContent = `✓ "${title}" خلصت!`;
    doneDetail.textContent = `تم تسجيل ${mins} دقيقة بنجاح`;
    // Auto-hide after 6 seconds
    setTimeout(() => { doneBanner.style.display = 'none'; }, 6000);
  }

  mainToggleBtn.addEventListener('click', () => {
    store.startStopwatch('custom-session', 'Deep Work Focus Session', 'task');
    Toast.info('⏱ Stopwatch started!');
    updateStopwatchUI();
  });

  pauseBtn.addEventListener('click', () => {
    if (store.state.stopwatch.isPaused) {
      store.resumeStopwatch();
      Toast.info('▶ Resumed timing');
    } else {
      store.pauseStopwatch();
      Toast.info('⏸ Paused timing');
    }
    updateStopwatchUI();
  });

  finishBtn.addEventListener('click', async () => {
    const result = store.stopStopwatch();
    const mins = Math.max(1, result.elapsedMinutes);
    const sessionTitle = result.title || 'Focus Session';

    // ── Immediate visual feedback ──
    updateStopwatchUI();
    showDoneBanner(sessionTitle, mins);

    try {
      if (result.type === 'habit' && result.itemId) {
        await api.completeHabitToday(result.itemId, {
          durationMinutes: mins,
          elapsedSeconds: result.elapsedSeconds,
          notes: `Tracked live via Stopwatch on ${todayDate}`
        });
      } else {
        await api.createTask({
          title: sessionTitle,
          description: `Finished via Stopwatch. Tracked duration: ${mins} minutes.`,
          dueDate: todayDate,
          priority: 'high',
          category: 'Deep Work',
          completed: true,
          completedAt: new Date().toISOString(),
          actualMinutes: mins
        });
        await api.logTimeSession({
          activityName: sessionTitle,
          durationMinutes: mins,
          notes: 'Completed from Today\'s Focus stopwatch'
        });
      }
      await store.refreshAll();
    } catch (err) {
      Toast.error('Could not save session: ' + err.message);
    }
  });

  resetBtn.addEventListener('click', () => {
    store.stopStopwatch();
    updateStopwatchUI();
    Toast.info('Stopwatch reset');
  });

  // 1. RENDER TODAY'S HABITS (CONNECTED TO WEEKLY MATRIX)
  function renderTodayHabits() {
    const listEl = container.querySelector('#todayHabitsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const goals = store.state.weeklyGoals;
    const tasks = store.state.tasks;

    // Filter habits scheduled for today
    const scheduledToday = goals.filter(g => {
      const scheduled = Array.isArray(g.scheduledDays) && g.scheduledDays.length > 0
        ? g.scheduledDays
        : [0, 1, 2, 3, 4, 5, 6];
      return scheduled.includes(todayIdx);
    });

    if (scheduledToday.length === 0) {
      listEl.appendChild(createEmptyState({
        icon: '▦',
        title: 'No habits scheduled for today',
        description: 'You can customize which days habits run from the Weekly Habits page.',
        actionText: 'Configure Weekly Schedule →',
        onAction: () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Weekly' } }))
      }));
      return;
    }

    scheduledToday.forEach(habit => {
      const days = Array.isArray(habit.days) ? habit.days : [false, false, false, false, false, false, false];
      const isCompletedToday = Boolean(days[todayIdx]);
      const target = Number(habit.target) || 1;
      const completedCount = days.filter(Boolean).length;

      // Find if there is a linked task for today to get logged actualMinutes
      const linkedTask = tasks.find(t => t.title.toLowerCase() === habit.name.toLowerCase() && t.dueDate === todayDate);
      const minutesSpent = linkedTask ? (linkedTask.actualMinutes || 0) : 0;

      const isCurrentTiming = store.state.stopwatch.isRunning && store.state.stopwatch.activeItemId === habit.id;

      const card = document.createElement('div');
      card.className = `task-row ${isCompletedToday ? 'completed' : ''}`;
      card.style.background = isCurrentTiming ? 'rgba(155, 123, 255, 0.12)' : 'var(--panel-2)';
      card.style.borderColor = isCurrentTiming ? 'var(--violet)' : 'var(--border)';

      // Checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'task-check';
      cb.checked = isCompletedToday;
      cb.setAttribute('aria-label', `Complete ${habit.name} for today`);

      cb.addEventListener('change', async () => {
        // Optimistic: keep the checkbox in its new state immediately
        const newState = cb.checked;
        try {
          await api.toggleHabitToday(habit.id, newState);
          if (newState) Toast.success(`✓ "${habit.name}" خلصت النهارده!`);
          await store.refreshAll();
        } catch (err) {
          // Only revert if it's a real local error (habit not found etc.)
          console.warn('toggleHabitToday:', err.message);
          // Don't revert — local save already succeeded
        }
      });

      // Details
      const details = document.createElement('div');
      details.className = 'task-details';

      const titleLine = document.createElement('div');
      titleLine.className = 'task-header-line';

      const title = document.createElement('span');
      title.className = 'task-name';
      title.textContent = habit.name;
      titleLine.appendChild(title);

      const habitBadge = document.createElement('span');
      habitBadge.className = 'task-badge badge-category';
      habitBadge.textContent = 'Weekly Habit';
      titleLine.appendChild(habitBadge);

      if (minutesSpent > 0) {
        const timeBadge = document.createElement('span');
        timeBadge.className = 'task-badge';
        timeBadge.style.background = 'rgba(91, 224, 235, 0.15)';
        timeBadge.style.color = 'var(--cyan)';
        timeBadge.textContent = `⏱ ${minutesSpent}m logged today`;
        titleLine.appendChild(timeBadge);
      }

      details.appendChild(titleLine);

      const meta = document.createElement('div');
      meta.className = 'task-meta-row';
      meta.innerHTML = `
        <span>Week Progress: ${completedCount}/${target} days completed</span>
        ${isCompletedToday ? '<span style="color: var(--green); font-weight: 700;">✓ Completed for today</span>' : '<span style="color: var(--amber);">Pending today</span>'}
      `;
      details.appendChild(meta);

      // Action Buttons (Start, Pause, Resume, Stop & Log)
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      if (isCurrentTiming) {
        // Currently timing this habit
        const liveIndicator = document.createElement('span');
        liveIndicator.className = 'live-clock-badge';
        liveIndicator.textContent = `⏱ ${formatStopwatchTime(store.state.stopwatch.elapsedSeconds)}`;

        const pauseResumeBtn = document.createElement('button');
        pauseResumeBtn.className = 'btn btn-secondary btn-small';
        pauseResumeBtn.textContent = store.state.stopwatch.isPaused ? '▶ Resume' : '⏸ Pause';
        pauseResumeBtn.addEventListener('click', () => {
          if (store.state.stopwatch.isPaused) store.resumeStopwatch();
          else store.pauseStopwatch();
          updateStopwatchUI();
          renderTodayHabits();
        });

        const finishHabitBtn = document.createElement('button');
        finishHabitBtn.className = 'btn btn-success btn-small';
        finishHabitBtn.textContent = '⏹ Finish & Log';
        finishHabitBtn.addEventListener('click', async () => {
          const res = store.stopStopwatch();
          const mins = Math.max(1, res.elapsedMinutes);

          // ── Immediate visual: replace action row with ✓ done badge ──
          actions.innerHTML = `
            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;
              background:rgba(80,220,130,0.15);border:1px solid rgba(80,220,130,0.4);
              border-radius:20px;font-size:12px;font-weight:700;color:var(--green);">
              ✓ خلصت! (${mins}m logged)
            </span>`;
          card.style.background = 'rgba(80,220,130,0.06)';
          card.style.borderColor = 'rgba(80,220,130,0.35)';
          updateStopwatchUI();
          showDoneBanner(habit.name, mins);

          try {
            await api.completeHabitToday(habit.id, {
              durationMinutes: mins,
              elapsedSeconds: res.elapsedSeconds
            });
            await store.refreshAll();
            renderTodayHabits();
          } catch (err) {
            Toast.error('Could not save: ' + err.message);
          }
        });

        actions.append(liveIndicator, pauseResumeBtn, finishHabitBtn);
      } else {
        // Not currently timing this habit
        const startBtn = document.createElement('button');
        startBtn.className = 'btn btn-secondary btn-small';
        startBtn.innerHTML = '▶ Start Time';
        startBtn.title = 'Start live stopwatch for this habit';
        startBtn.addEventListener('click', () => {
          store.startStopwatch(habit.id, habit.name, 'habit');
          Toast.info(`⏱ Started timing "${habit.name}"!`);
          updateStopwatchUI();
          renderTodayHabits();
        });

        actions.appendChild(startBtn);
      }

      card.append(cb, details, actions);
      listEl.appendChild(card);
    });
  }

  // 2. RENDER TIME-SLOTTED TASKS
  function renderSlots() {
    const todayTasks = store.state.tasks.filter(t => t.dueDate === todayDate);
    const morningEl = container.querySelector('#slotMorningTasks');
    const afternoonEl = container.querySelector('#slotAfternoonTasks');
    const eveningEl = container.querySelector('#slotEveningTasks');

    morningEl.innerHTML = '';
    afternoonEl.innerHTML = '';
    eveningEl.innerHTML = '';

    const morningTasks = todayTasks.filter(t => !t.timeSlot || t.timeSlot === 'morning');
    const afternoonTasks = todayTasks.filter(t => t.timeSlot === 'afternoon');
    const eveningTasks = todayTasks.filter(t => t.timeSlot === 'evening');

    const renderList = (el, list, emptyMsg) => {
      if (list.length === 0) {
        el.innerHTML = `<div style="color: var(--muted); font-size: 11px; padding: 12px; font-style: italic;">${emptyMsg}</div>`;
      } else {
        list.forEach(t => el.appendChild(createTaskCard(t, { compact: false })));
      }
    };

    renderList(morningEl, morningTasks, 'No morning tasks scheduled.');
    renderList(afternoonEl, afternoonTasks, 'No afternoon tasks scheduled.');
    renderList(eveningEl, eveningTasks, 'No evening tasks scheduled.');
  }

  // INITIAL DRAW
  updateStopwatchUI();
  renderTodayHabits();
  renderSlots();

  // SUBSCRIBE TO UPDATES
  store.subscribe('weeklyGoals', () => renderTodayHabits());
  store.subscribe('tasks', () => {
    renderTodayHabits();
    renderSlots();
  });
  store.subscribe('stopwatch', () => {
    updateStopwatchUI();
    // Update live badge on active habit row without full re-render
    const sw = store.state.stopwatch;
    const liveBadge = container.querySelector('.live-clock-badge');
    if (liveBadge && sw.isRunning) {
      liveBadge.textContent = `⏱ ${formatStopwatchTime(sw.elapsedSeconds)}`;
    }
  });
}
