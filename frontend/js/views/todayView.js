import { store } from '../store.js';
import { api } from '../api.js';
import { createTaskCard, openEditTaskModal } from '../components/TaskCard.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { createEmptyState } from '../components/EmptyState.js';
import { t, getLang } from '../i18n.js';

const DAY_NAMES_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_NAMES_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

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
  const isAr = getLang() === 'ar';
  const dayName = isAr ? DAY_NAMES_AR[todayIdx] : DAY_NAMES_EN[todayIdx];

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${isAr ? 'تركيز اليوم والأوامر اليومية' : "Today's Focus & Daily Command"}</h2>
        <p>${isAr ? `اليوم هو <strong style="color: var(--cyan);">${dayName} (${todayDate})</strong>. نفّذ عاداتك المجدولة، تتبع الوقت، وسجّل أعمالك المنجزة.` : `Today is <strong style="color: var(--cyan);">${dayName} (${todayDate})</strong>. Execute your scheduled habits, track real time, and log completed work.`}</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="btn btn-secondary btn-small" id="todayViewWeeklyBtn">${isAr ? 'عرض المصفوفة الأسبوعية →' : 'View Weekly Matrix →'}</button>
        <button class="btn btn-primary" id="todayAddTaskBtn">${isAr ? '+ جدولة مهمة لليوم' : '+ Schedule Task for Today'}</button>
      </div>
    </div>

    <!-- LIVE ACTIVITY STOPWATCH & TRACKER CARD -->
    <div class="panel live-stopwatch-panel" id="liveStopwatchPanel">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="pulse-indicator" id="stopwatchPulseDot"></span>
          <div>
            <div class="eyebrow" style="margin: 0;">${isAr ? 'متتبع الوقت المباشر' : 'LIVE ACTIVITY TIME TRACKER'}</div>
            <h3 id="stopwatchItemTitle" style="font-size: 16px; margin: 2px 0 0; color: var(--text);">${isAr ? 'لا توجد جلسة نشطة' : 'No active session'}</h3>
          </div>
        </div>
        <div class="stopwatch-digits" id="stopwatchClockDisplay">00:00</div>
      </div>

      <!-- Completion banner (hidden until Finish is pressed) -->
      <div id="stopwatchDoneBanner" style="display:none; align-items:center; gap:12px; margin-top:14px; padding:12px 16px; background:rgba(80,220,130,0.12); border:1px solid rgba(80,220,130,0.35); border-radius:12px;">
        <span style="font-size:24px; color:var(--green);">✓</span>
        <div>
          <div style="font-weight:700; color:var(--green); font-size:14px;" id="stopwatchDoneTitle">${isAr ? 'اكتملت الجلسة!' : 'Session complete!'}</div>
          <div style="font-size:12px; color:var(--muted);" id="stopwatchDoneDetail"></div>
        </div>
      </div>

      <div class="stopwatch-actions-bar" style="display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap;">
        <button class="btn btn-primary" id="stopwatchMainToggleBtn">${isAr ? '▶ ابدأ الساعة' : '▶ Start Stopwatch'}</button>
        <button class="btn btn-secondary" id="stopwatchPauseBtn" style="display: none;">${isAr ? '⏸ إيقاف مؤقت' : '⏸ Pause'}</button>
        <button class="btn btn-success" id="stopwatchFinishBtn" style="display: none;">${isAr ? '⏹ إنهاء وتسجيل في المهام' : '⏹ Finish & Log to Tasks'}</button>
        <button class="btn btn-secondary btn-small" id="stopwatchResetBtn">${isAr ? '↺ إعادة ضبط' : '↺ Reset'}</button>
        <span style="font-size: 11px; color: var(--muted); margin-left: auto;" id="stopwatchStatusCaption">${isAr ? 'اختر عادة أو مهمة أدناه لبدء التوقيت' : 'Choose any habit or task below to start timing'}</span>
      </div>
    </div>

    <!-- TODAY'S TOTAL TIME FOCUS SUMMARY BANNER -->
    <div id="todayTimeSummaryContainer"></div>

    <!-- 1. TODAY'S SCHEDULED HABITS (CONNECTED TO WEEKLY HABITS) -->
    <section class="panel" id="todayHabitsSection" style="border: 1px solid rgba(155, 123, 255, 0.3);">
      <div class="panel-heading">
        <div>
          <h3 style="font-size: 15px; color: var(--violet-light);">
            ⚡ ${isAr ? `عادات اليوم المجدولة (${dayName})` : `Today's Scheduled Habits (${dayName})`}
          </h3>
          <p>${isAr ? 'العادات المجدولة لليوم من خطتك الأسبوعية. علّم عليها عند الإنجاز أو شغّل الساعة لتسجيل الوقت في المهام!' : 'Habits scheduled for today from your Weekly Plan. Check off when done or use the stopwatch to log exact minutes into Tasks!'}</p>
        </div>
        <span class="stat-icon" style="background: rgba(155, 123, 255, 0.2);">▦</span>
      </div>

      <div id="todayHabitsList" style="display: grid; gap: 10px;"></div>
    </section>

    <!-- 2. TIME-SLOTTED TASKS GRID -->
    <div class="section-heading" style="margin-top: 28px;">
      <div>
        <h2>${isAr ? 'جدول مهام اليوم' : "Today's Task Schedule"}</h2>
        <p>${isAr ? 'مجمعة في كتل العمل الصباحية والمسائية والليلية.' : 'Grouped into morning, afternoon, and evening focus blocks.'}</p>
      </div>
    </div>

    <div class="timeline-column" style="display: grid; gap: 18px;">
      <!-- MORNING -->
      <div class="timeline-block">
        <div class="timeline-header">
          <div class="timeline-title">${isAr ? '🌅 عمل الصباح' : '🌅 Morning Deep Work'}</div>
          <div class="timeline-time">08:00 — 12:00</div>
        </div>
        <div class="task-list" id="slotMorningTasks"></div>
      </div>

      <!-- AFTERNOON -->
      <div class="timeline-block">
        <div class="timeline-header">
          <div class="timeline-title">${isAr ? '☀️ تنفيذ الظهيرة' : '☀️ Afternoon Execution'}</div>
          <div class="timeline-time">12:00 — 17:00</div>
        </div>
        <div class="task-list" id="slotAfternoonTasks"></div>
      </div>

      <!-- EVENING -->
      <div class="timeline-block">
        <div class="timeline-header">
          <div class="timeline-title">${isAr ? '🌙 ختام المساء' : '🌙 Evening Wrap-up'}</div>
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
    const _ar = getLang() === 'ar';
    clockEl.textContent = formatStopwatchTime(sw.elapsedSeconds);

    if (sw.isRunning) {
      pulseDot.className = sw.isPaused ? 'pulse-indicator paused' : 'pulse-indicator running';
      titleEl.textContent = sw.activeItemTitle || (_ar ? 'جلسة تركيز نشطة' : 'Active Focus Session');
      statusCaption.textContent = sw.isPaused
        ? (_ar ? 'متوقف مؤقتاً · اضغط استئناف للمتابعة' : 'Paused · Click Resume to continue')
        : (_ar ? '⏱ تسجيل الوقت مباشرة...' : '⏱ Recording time live...');

      mainToggleBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      pauseBtn.textContent = sw.isPaused ? (_ar ? '▶ استئناف' : '▶ Resume') : (_ar ? '⏸ إيقاف مؤقت' : '⏸ Pause');
      finishBtn.style.display = 'inline-flex';
    } else {
      pulseDot.className = 'pulse-indicator';
      titleEl.textContent = sw.activeItemTitle
        ? (_ar ? `جاهز: ${sw.activeItemTitle}` : `Ready: ${sw.activeItemTitle}`)
        : (_ar ? 'لا توجد جلسة نشطة' : 'No active session');
      statusCaption.textContent = _ar ? 'اختر عادة أو مهمة أدناه لبدء التوقيت' : 'Choose any habit or task below to start timing';

      mainToggleBtn.style.display = 'inline-flex';
      mainToggleBtn.textContent = _ar ? '▶ ابدأ الساعة' : '▶ Start Stopwatch';
      pauseBtn.style.display = 'none';
      finishBtn.style.display = 'none';
    }
  }

  /** Show the green ✓ done banner inside the stopwatch panel */
  function showDoneBanner(title, mins) {
    const _ar = getLang() === 'ar';
    doneBanner.style.display = 'flex';
    doneTitle.textContent = _ar ? `✓ "${title}" خلصت!` : `✓ "${title}" done!`;
    doneDetail.textContent = _ar ? `تم تسجيل ${mins} دقيقة بنجاح` : `Logged ${mins} minute${mins !== 1 ? 's' : ''} successfully`;
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
    const totalMins  = Math.max(1, result.elapsedMinutes);   // cumulative total today
    const sessionMins = Math.max(1, result.sessionMinutes);  // only this session's delta
    const sessionTitle = result.title || 'Focus Session';

    // ── Immediate visual feedback ──
    updateStopwatchUI();
    showDoneBanner(sessionTitle, sessionMins);

    try {
      if (result.type === 'habit' && result.itemId) {
        await api.completeHabitToday(result.itemId, {
          durationMinutes: sessionMins,
          elapsedSeconds: result.elapsedSeconds,
          totalMinutes: totalMins,
          sessionMinutes: sessionMins,
          title: sessionTitle,
          notes: `Tracked live via Stopwatch on ${todayDate}`
        });
      } else {
        // If it's a task or general focus session:
        const existingTask = (store.state.tasks || []).find(t => 
          (result.itemId && t.id === result.itemId) ||
          (t.title && t.title.toLowerCase().trim() === sessionTitle.toLowerCase().trim() && t.dueDate === todayDate)
        );

        if (existingTask) {
          const newActual = Math.max(Number(existingTask.actualMinutes) || 0, totalMins);
          await api.updateTask(existingTask.id, {
            completed: true,
            status: 'completed',
            actualMinutes: newActual
          });
          await api.logTimeSession({
            activityName: sessionTitle,
            taskId: existingTask.id,
            durationMinutes: sessionMins,
            notes: "Completed from Today's Focus stopwatch"
          });
        } else {
          const newTaskRes = await api.createTask({
            title: sessionTitle,
            description: `Finished via Stopwatch. Tracked duration: ${totalMins} minutes.`,
            dueDate: todayDate,
            priority: 'high',
            category: 'Deep Work',
            status: 'completed',
            completed: true,
            completedAt: new Date().toISOString(),
            actualMinutes: totalMins
          });
          await api.logTimeSession({
            activityName: sessionTitle,
            taskId: newTaskRes?.data?.id || null,
            durationMinutes: sessionMins,
            notes: "Completed from Today's Focus stopwatch"
          });
        }
      }
      await store.refreshAll();
      renderTodayHabits();
      renderTodayTimeSummary();
      renderSlots();
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

      // Find if there is a linked task or timer session for today to get logged actualMinutes
      const habitNameLower = (habit.name || '').toLowerCase().trim();
      const linkedTasks = tasks.filter(t => t.title && t.title.toLowerCase().trim() === habitNameLower && t.dueDate === todayDate);
      const taskMins = linkedTasks.reduce((sum, t) => sum + (Number(t.actualMinutes) || 0), 0);
      const sessionMins = (store.state.timeSessions || [])
        .filter(s => {
          const sName = (s.activityName || s.activity_name || '').toLowerCase().trim();
          const sDate = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
          return sName === habitNameLower && sDate === todayDate;
        })
        .reduce((sum, s) => sum + (Number(s.durationMinutes || s.duration_minutes) || 0), 0);
      const minutesSpent = Math.max(taskMins, sessionMins);

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
        const newState = cb.checked;
        try {
          await api.toggleHabitToday(habit.id, newState);
          if (newState) Toast.success(`✓ "${habit.name}" completed for today!`);
          await store.refreshAll();
        } catch (err) {
          console.warn('toggleHabitToday:', err.message);
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
      habitBadge.textContent = getLang() === 'ar' ? 'عادة أسبوعية' : 'Weekly Habit';
      titleLine.appendChild(habitBadge);

      const isAr = getLang() === 'ar';
      const timeBadge = document.createElement('span');
      timeBadge.className = 'task-badge';
      if (minutesSpent > 0) {
        timeBadge.style.background = 'rgba(91, 224, 235, 0.15)';
        timeBadge.style.color = 'var(--cyan)';
        timeBadge.style.fontWeight = '700';
        timeBadge.textContent = isAr 
          ? `⏱ استغرقت ${minutesSpent} دقيقة اليوم` 
          : `⏱ ${minutesSpent}m logged today`;
      } else {
        timeBadge.style.background = 'rgba(255, 255, 255, 0.05)';
        timeBadge.style.color = 'var(--muted)';
        timeBadge.textContent = isAr ? '⏱ 0 دقيقة' : '⏱ 0m logged';
      }
      titleLine.appendChild(timeBadge);

      details.appendChild(titleLine);

      const meta = document.createElement('div');
      meta.className = 'task-meta-row';
      const _isAr = getLang() === 'ar';
      meta.innerHTML = `
        <span>${_isAr ? `تقدم الأسبوع: ${completedCount}/${target} أيام مكتملة` : `Week Progress: ${completedCount}/${target} days completed`}</span>
        ${isCompletedToday ? `<span style="color: var(--green); font-weight: 700;">✓ ${_isAr ? 'مكتملة اليوم' : 'Completed for today'}</span>` : `<span style="color: var(--amber);">${_isAr ? 'قيد الانتظار' : 'Pending today'}</span>`}
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
        finishHabitBtn.textContent = getLang() === 'ar' ? '⏹ إنهاء وتسجيل' : '⏹ Finish & Log';
        finishHabitBtn.addEventListener('click', async () => {
          const res = store.stopStopwatch();
          const totalMins   = Math.max(1, res.elapsedMinutes);   // cumulative today
          const sessionMins = Math.max(1, res.sessionMinutes);   // this session only
          const _isAr2 = getLang() === 'ar';

          // ── Immediate visual: replace action row with ✓ done badge ──
          actions.innerHTML = `
            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;
              background:rgba(80,220,130,0.15);border:1px solid rgba(80,220,130,0.4);
              border-radius:20px;font-size:12px;font-weight:700;color:var(--green);">
              ${_isAr2 ? `✓ خلصت! (${totalMins} دقيقة)` : `✓ Done! (${totalMins}m logged)`}
            </span>`;
          card.style.background = 'rgba(80,220,130,0.06)';
          card.style.borderColor = 'rgba(80,220,130,0.35)';
          updateStopwatchUI();
          showDoneBanner(habit.name, sessionMins);

          try {
            await api.completeHabitToday(habit.id, {
              durationMinutes: sessionMins,
              elapsedSeconds: res.elapsedSeconds,
              totalMinutes: totalMins,
              sessionMinutes: sessionMins,
              title: habit.name,
              notes: `Tracked via stopwatch on ${todayDate}`
            });
            await store.refreshAll();
            renderTodayHabits();
            renderTodayTimeSummary();
          } catch (err) {
            Toast.error('Could not save: ' + err.message);
          }
        });

        actions.append(liveIndicator, pauseResumeBtn, finishHabitBtn);
      } else {
        // Not currently timing this habit
        const startBtn = document.createElement('button');
        startBtn.className = 'btn btn-secondary btn-small';
        startBtn.innerHTML = getLang() === 'ar' ? '▶ ابدأ التوقيت' : '▶ Start Time';
        startBtn.title = getLang() === 'ar' ? 'شغّل العداد لهذه العادة' : 'Start live stopwatch for this habit';
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

    const _noTaskAr = getLang() === 'ar';
    renderList(morningEl, morningTasks, _noTaskAr ? 'لا توجد مهام صباحية مجدولة.' : 'No morning tasks scheduled.');
    renderList(afternoonEl, afternoonTasks, _noTaskAr ? 'لا توجد مهام في الظهيرة مجدولة.' : 'No afternoon tasks scheduled.');
    renderList(eveningEl, eveningTasks, _noTaskAr ? 'لا توجد مهام مسائية مجدولة.' : 'No evening tasks scheduled.');
  }

  // RENDER TODAY TOTAL TIME SUMMARY BANNER
  function renderTodayTimeSummary() {
    const summaryEl = container.querySelector('#todayTimeSummaryContainer');
    if (!summaryEl) return;

    const isAr = getLang() === 'ar';
    const tasks = store.state.tasks || [];
    const sessions = store.state.timeSessions || [];

    // All items completed or timed today
    const itemMap = {}; // name -> { name, minutes, isDone }

    // From tasks for today
    tasks.filter(t => t.dueDate === todayDate).forEach(t => {
      const name = t.title || 'Task';
      if (!itemMap[name]) itemMap[name] = { name, minutes: 0, isDone: Boolean(t.completed) };
      const mins = Number(t.actualMinutes) || 0;
      if (mins > 0) itemMap[name].minutes = Math.max(itemMap[name].minutes, mins);
      if (t.completed) itemMap[name].isDone = true;
    });

    // From time sessions for today
    sessions.filter(s => {
      const d = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
      return d === todayDate;
    }).forEach(s => {
      const name = s.activityName || s.activity_name || 'Focus Session';
      if (!itemMap[name]) itemMap[name] = { name, minutes: 0, isDone: true };
      const mins = Number(s.durationMinutes || s.duration_minutes) || 0;
      if (mins > 0) itemMap[name].minutes = Math.max(itemMap[name].minutes, mins);
    });

    const items = Object.values(itemMap);
    const totalTodayMins = items.reduce((sum, it) => sum + (Number(it.minutes) || 0), 0);
    const totalHours = (totalTodayMins / 60).toFixed(1);
    const completedCount = items.filter(it => it.isDone || it.minutes > 0).length;

    const formattedTime = totalTodayMins >= 60 
      ? (isAr ? `${Math.floor(totalTodayMins/60)} ساعة و ${totalTodayMins%60} دقيقة` : `${Math.floor(totalTodayMins/60)}h ${totalTodayMins%60}m`)
      : (isAr ? `${totalTodayMins} دقيقة` : `${totalTodayMins} mins`);

    summaryEl.innerHTML = `
      <div class="today-time-summary-banner">
        <div class="today-time-left">
          <div class="today-time-icon">⏱</div>
          <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--cyan);">
              ${isAr ? 'إجمالي وقت التركيز اليوم (محسوب تلقائياً)' : 'TODAY\'S TOTAL FOCUS TIME (AUTO CALCULATED)'}
            </div>
            <div class="today-time-digits">
              ${formattedTime} ${totalTodayMins >= 60 ? `<span style="font-size: 13px; color: var(--muted); font-weight: 600;">(${totalHours}h)</span>` : ''}
            </div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">
              ${isAr ? `${completedCount} عناصر تم العمل عليها اليوم` : `${completedCount} items focused on today`}
            </div>
          </div>
        </div>

        <div class="today-time-items-wrap">
          ${items.filter(it => it.minutes > 0).map(it => `
            <span class="task-badge" style="background: rgba(91, 224, 235, 0.12); color: var(--cyan); border: 1px solid rgba(91, 224, 235, 0.25); font-weight: 700;">
              ✓ ${it.name} (${it.minutes}${isAr ? 'د' : 'm'})
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  // INITIAL DRAW
  updateStopwatchUI();
  renderTodayTimeSummary();
  renderTodayHabits();
  renderSlots();

  // SUBSCRIBE TO UPDATES
  store.subscribe('weeklyGoals', () => {
    renderTodayHabits();
    renderTodayTimeSummary();
  });
  store.subscribe('tasks', () => {
    renderTodayHabits();
    renderTodayTimeSummary();
    renderSlots();
  });
  store.subscribe('timeSessions', () => {
    renderTodayHabits();
    renderTodayTimeSummary();
  });
  store.subscribe('stopwatch', () => {
    updateStopwatchUI();
    const sw = store.state.stopwatch;
    const liveBadge = container.querySelector('.live-clock-badge');
    if (liveBadge && sw.isRunning) {
      liveBadge.textContent = `⏱ ${formatStopwatchTime(sw.elapsedSeconds)}`;
    }
  });
}
