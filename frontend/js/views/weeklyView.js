import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { getLang } from '../i18n.js';

const DAY_NAMES_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_NAMES_AR = ['سبت', 'أحد', 'اثن', 'ثلث', 'أرب', 'خمس', 'جمع'];
const FULL_DAY_NAMES_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const FULL_DAY_NAMES_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

function getTodayDayIndex() {
  const date = new Date();
  return (date.getDay() + 1) % 7; // 0 = Sat, 1 = Sun, ..., 6 = Fri
}

function getWeekDateRange() {
  const start = new Date();
  const daysSinceSaturday = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - daysSinceSaturday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export function renderWeeklyView(container) {
  const todayIdx = getTodayDayIndex();
  const ar = getLang() === 'ar';
  const DAY_NAMES = ar ? DAY_NAMES_AR : DAY_NAMES_EN;
  const FULL_DAY_NAMES = ar ? FULL_DAY_NAMES_AR : FULL_DAY_NAMES_EN;
  let selectedDays = [0, 1, 2, 3, 4, 5, 6]; // default all days selected

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${ar ? 'مصفوفة العادات والأهداف الأسبوعية' : "This Week's Habit & Goal Matrix"}</h2>
        <p id="weeklyRangeLabel">${getWeekDateRange()} · <strong style="color: var(--cyan);">${ar ? `اليوم هو ${FULL_DAY_NAMES[todayIdx]}` : `Today is ${FULL_DAY_NAMES[todayIdx]}`}</strong></p>
      </div>
    </div>

    <!-- OVERALL PROGRESS PANEL -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>${ar ? 'تقدم الهدف الأسبوعي' : 'Weekly Target Progress'}</h3>
          <p>${ar ? 'الانضباط يبني الزخم. علم على كل يوم تنجز فيه عادتك.' : 'Discipline builds momentum. Check each day as you fulfill your habits.'}</p>
        </div>
        <span class="stat-icon">✓</span>
      </div>

      <div class="weekly-summary-panel">
        <div>
          <div class="weekly-summary-label">${ar ? 'الإتمام الكلي' : 'Overall Completion'}</div>
          <div class="weekly-summary-number" id="weeklyPageOverallNumber">0%</div>
        </div>
        <div class="stat-caption" id="weeklyPageOverallCount">${ar ? '0 مكتملة' : '0 completed'}</div>
      </div>

      <div class="progress-track" style="height: 8px;">
        <div class="progress-fill" id="weeklyPageOverallFill" style="width: 0%;"></div>
      </div>
    </div>

    <!-- HABIT MATRIX TABLE -->
    <div class="panel" style="padding: 16px 20px;">
      <div class="panel-heading" style="margin-bottom: 12px;">
        <div>
          <h3 style="font-size: 13px;">${ar ? 'جدول العادات الأسبوعية' : 'Weekly Habits Schedule'}</h3>
          <p>${ar ? `العمود المميز بالسيان يمثل <strong style="color: var(--cyan);">اليوم (${DAY_NAMES[todayIdx]})</strong>. يتزامن التحديد مع تركيز اليوم تلقائياً!` : `The column highlighted in cyan represents <strong style="color: var(--cyan);">TODAY (${DAY_NAMES[todayIdx]})</strong>. Check marks automatically sync with Today's Focus!`}</p>
        </div>
        <button class="text-button" id="goToTodayFromWeeklyBtn">${ar ? 'افتح تركيز اليوم →' : "Open Today's Focus →"}</button>
      </div>

      <div class="weekly-table-wrap">
        <table class="weekly-table">
          <thead>
            <tr>
              <th style="text-align: left; padding-left: 16px;">${ar ? 'العادة / الروتين' : 'Habit / Routine'}</th>
              ${DAY_NAMES.map((name, idx) => `
                <th class="${idx === todayIdx ? 'today-col-header' : ''}">
                  ${name}
                  ${idx === todayIdx ? `<span class="today-indicator-pill">${ar ? 'اليوم' : 'TODAY'}</span>` : ''}
                </th>
              `).join('')}
              <th>${ar ? 'التقدم' : 'Progress'}</th>
              <th>${ar ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody id="weeklyTableBody"></tbody>
        </table>
      </div>
    </div>

    <!-- ADD HABIT FORM WITH DAY SELECTOR -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>${ar ? 'إضافة عادة جديدة للجدول الأسبوعي' : 'Add New Habit to Weekly Schedule'}</h3>
          <p>${ar ? "اختر اسم العادة وأيام الهدف والأيام التي ستظهر فيها في تركيز اليوم." : "Choose habit name, target days, and which days of the week it will appear on Today's Focus."}</p>
        </div>
        <span class="stat-icon">+</span>
      </div>

      <form id="weeklyNewHabitForm">
        <div class="form-grid-2" style="margin-bottom: 14px;">
          <div class="form-group">
            <label for="weeklyHabitName">${ar ? 'اسم العادة *' : 'Habit Name *'}</label>
            <input class="field" id="weeklyHabitName" type="text" maxlength="100" placeholder="${ar ? 'مثال: تمرين الجيم، قراءة 20 صفحة' : 'e.g. Gym Workout, Reading 20 Pages, Cold Shower'}" required>
          </div>
          <div class="form-group">
            <label for="weeklyHabitTarget">${ar ? 'أيام الهدف في الأسبوع' : 'Target Days Per Week'}</label>
            <input class="field" id="weeklyHabitTarget" type="number" min="1" max="7" value="5" required>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>${ar ? 'اختر الأيام المجدولة (ستظهر في تركيز اليوم في هذه الأيام):' : "Select Scheduled Days (Will appear in Today's Focus on these days):"}</label>
          <div class="day-selector-pills" id="habitDayPills">
            ${DAY_NAMES.map((name, idx) => `
              <button type="button" class="day-chip active" data-day-index="${idx}">${name}</button>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-primary" type="submit">${ar ? '+ إضافة عادة للجدول' : '+ Add Habit to Schedule'}</button>
      </form>
    </div>
  `;

  // Go to Today shortcut
  container.querySelector('#goToTodayFromWeeklyBtn').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
  });

  // Day Selector Chips in creation form
  const pillsContainer = container.querySelector('#habitDayPills');
  const targetInput = container.querySelector('#weeklyHabitTarget');

  pillsContainer.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = Number(chip.dataset.dayIndex);
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        selectedDays = selectedDays.filter(d => d !== idx);
      } else {
        chip.classList.add('active');
        selectedDays.push(idx);
      }
      targetInput.value = Math.max(1, selectedDays.length);
    });
  });

  // Render Matrix Table
  function renderMatrix() {
    const tbody = container.querySelector('#weeklyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const goals = store.state.weeklyGoals;
    let totalTarget = 0;
    let totalCompleted = 0;

    if (goals.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="padding: 28px; color: var(--muted); font-style: italic;">
            ${getLang() === 'ar' ? 'لا توجد عادات أسبوعية بعد. استخدم النموذج أدناه لإنشاء جدولك.' : 'No weekly habits defined yet. Use the form below to create your schedule.'}
          </td>
        </tr>
      `;
    } else {
      goals.forEach(goal => {
        const days = Array.isArray(goal.days) ? goal.days : [false, false, false, false, false, false, false];
        const scheduled = Array.isArray(goal.scheduledDays) && goal.scheduledDays.length > 0
          ? goal.scheduledDays
          : [0, 1, 2, 3, 4, 5, 6];
        const completedDays = days.filter(Boolean).length;
        const target = Number(goal.target) || 1;
        const progress = Math.min(100, Math.round((completedDays / target) * 100));

        totalTarget += target;
        totalCompleted += Math.min(completedDays, target);

        const row = document.createElement('tr');

        // Name cell
        const nameCell = document.createElement('td');
        nameCell.className = 'weekly-goal-name';

        const scheduledDayTags = scheduled.map(d => DAY_NAMES[d]).join(', ');
        const _ar = getLang() === 'ar';
        nameCell.innerHTML = `
          <div style="font-weight: 700; color: var(--text);">${goal.name}</div>
          <div class="weekly-goal-target">${_ar ? 'الهدف:' : 'Target:'} ${target}${_ar ? 'ي/أسبوع' : 'd/wk'} · <span style="color: var(--text-secondary);">[${scheduledDayTags}]</span></div>
        `;

        // ── Hours logged this week for this habit ──
        const timeSessions = store.state.timeSessions || [];
        const weekStart = (() => {
          const d = new Date();
          const dss = (d.getDay() + 1) % 7;
          d.setDate(d.getDate() - dss);
          d.setHours(0,0,0,0);
          return d;
        })();
        const habitMins = timeSessions
          .filter(s => {
            const name = (s.activityName || s.activity_name || '').toLowerCase();
            const sDate = new Date(s.startTime || s.created_at || s.createdAt || 0);
            return name === goal.name.toLowerCase() && sDate >= weekStart;
          })
          .reduce((acc, s) => acc + (Number(s.durationMinutes || s.duration_minutes) || 0), 0);
        const habitHours = (habitMins / 60).toFixed(1);
        if (habitMins > 0) {
          const timeBadge = document.createElement('div');
          timeBadge.style.cssText = 'font-size:10px;color:var(--cyan);margin-top:2px;';
          const _ar2 = getLang() === 'ar';
          timeBadge.textContent = _ar2 ? `⏱ ${habitHours} ساعة مسجلة هذا الأسبوع` : `⏱ ${habitHours}h logged this week`;
          nameCell.appendChild(timeBadge);
        }
        row.appendChild(nameCell);

        // Days 0..6
        days.forEach((checked, dayIdx) => {
          const td = document.createElement('td');
          const isToday = dayIdx === todayIdx;
          const isScheduledDay = scheduled.includes(dayIdx);

          if (isToday) {
            td.className = 'today-cell-highlight';
          }

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = `weekly-check ${isToday ? 'today-check' : ''}`;
          cb.checked = checked;
          cb.setAttribute('aria-label', `${goal.name} ${DAY_NAMES[dayIdx]}`);

          if (!isScheduledDay) {
            td.style.opacity = '0.4';
            cb.title = 'Not scheduled for this day, but you can still check it';
          }

          cb.addEventListener('change', async () => {
            const _arMsg = getLang() === 'ar';
            try {
              if (isToday) {
                // Use toggle-today to sync with tasks automatically
                await api.toggleHabitToday(goal.id, cb.checked);
                Toast.success(cb.checked
                  ? (_arMsg ? `✓ تم تحديد اليوم! متزامن مع تركيز اليوم.` : `✓ Checked for Today! Synced with Today's Focus.`)
                  : (_arMsg ? 'تم إعادة فتحه لليوم' : 'Reopened for Today'));
              } else {
                await api.toggleWeeklyGoalDay(goal.id, dayIdx);
              }
              await store.refreshAll();
            } catch {
              cb.checked = !cb.checked;
              Toast.error(getLang() === 'ar' ? 'تعذّر تحديث العادة' : 'Could not update habit');
            }
          });

          td.appendChild(cb);
          row.appendChild(td);
        });

        // Progress cell
        const progCell = document.createElement('td');
        progCell.className = 'weekly-progress-cell';
        const _arProg = getLang() === 'ar';
        progCell.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">${completedDays}/${target} ${_arProg ? 'أيام' : 'days'}</div>
          <div class="progress-track" style="height: 6px;">
            <div class="progress-fill ${progress >= 100 ? 'green' : ''}" style="width: ${progress}%;"></div>
          </div>
        `;
        row.appendChild(progCell);

        // Actions cell
        const actCell = document.createElement('td');
        actCell.style.whiteSpace = 'nowrap';

        // Start timer today button
        const startTimerBtn = document.createElement('button');
        startTimerBtn.className = 'btn btn-icon';
        startTimerBtn.title = 'Start live stopwatch for today';
        startTimerBtn.innerHTML = '⏱';
        startTimerBtn.addEventListener('click', () => {
          store.startStopwatch(goal.id, goal.name, 'habit');
          Toast.info(`⏱ Stopwatch started for "${goal.name}". Navigating to Today's Focus...`);
          window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
        });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'weekly-delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = `Delete ${goal.name}`;
        delBtn.addEventListener('click', () => {
          Modal.confirm({
            title: 'Delete Weekly Habit',
            message: `Delete habit "${goal.name}" from weekly schedule?`,
            confirmText: 'Delete',
            onConfirm: async () => {
              try {
                await api.deleteWeeklyGoal(goal.id);
                Toast.success('Habit removed');
                await store.refreshAll();
              } catch {
                Toast.error('Could not delete habit');
              }
            }
          });
        });

        actCell.append(startTimerBtn, delBtn);
        row.appendChild(actCell);

        tbody.appendChild(row);
      });
    }

    // Overall Progress
    const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
    const _arSummary = getLang() === 'ar';
    container.querySelector('#weeklyPageOverallNumber').textContent = `${overallPct}%`;
    container.querySelector('#weeklyPageOverallCount').textContent = _arSummary
      ? `${totalCompleted} / ${totalTarget} أيام هدف مكتملة`
      : `${totalCompleted} / ${totalTarget} target days completed`;
    container.querySelector('#weeklyPageOverallFill').style.width = `${overallPct}%`;
  }

  // Form submit
  const form = container.querySelector('#weeklyNewHabitForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nameInput = container.querySelector('#weeklyHabitName');
    const target = Number(targetInput.value);
    const name = nameInput.value.trim();

    if (!name || target < 1 || target > 7) {
      Toast.error(getLang() === 'ar' ? 'أدخل اسم عادة صحيحًا وهدفًا من 1 إلى 7' : 'Please enter a valid habit name and target (1-7)');
      return;
    }

    try {
      await api.createWeeklyGoal({
        name,
        target,
        scheduledDays: selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6]
      });
      nameInput.value = '';
      targetInput.value = '5';
      selectedDays = [0, 1, 2, 3, 4, 5, 6];
      pillsContainer.querySelectorAll('.day-chip').forEach(c => c.classList.add('active'));
      Toast.success(getLang() === 'ar' ? 'تم تسجيل العادة الأسبوعية وإضافتها للجدول! ⚡' : 'Weekly habit registered and added to schedule! ⚡');
      await store.refreshAll();
    } catch {
      Toast.error(getLang() === 'ar' ? 'تعذّر إنشاء العادة' : 'Failed to create weekly habit');
    }
  });

  renderMatrix();
  store.subscribe('weeklyGoals', () => renderMatrix());
}
