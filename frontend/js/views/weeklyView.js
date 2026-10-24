import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { getLang } from '../i18n.js';

const DAY_NAMES_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_NAMES_AR = ['سبت', 'أحد', 'اثن', 'ثلث', 'أرب', 'خمس', 'جمع'];
const FULL_DAY_NAMES_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const FULL_DAY_NAMES_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export function getTodayDayIndex() {
  const date = new Date();
  return (date.getDay() + 1) % 7; // 0 = Sat, 1 = Sun, ..., 6 = Fri
}

export function getWeekDateRange() {
  const start = new Date();
  const daysSinceSaturday = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - daysSinceSaturday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

/**
 * Universal Edit Habit Modal
 * Allows modifying habit name, target days, and scheduled days of the week.
 * Auto-persists to weekly schedule and auto-renews every week.
 */
export function openEditHabitModal(goal) {
  const isAr = getLang() === 'ar';
  const DAY_NAMES = isAr ? DAY_NAMES_AR : DAY_NAMES_EN;
  let editSelectedDays = Array.isArray(goal.scheduledDays) && goal.scheduledDays.length > 0
    ? [...goal.scheduledDays]
    : [0, 1, 2, 3, 4, 5, 6];

  const content = document.createElement('div');
  content.innerHTML = `
    <form id="editHabitModalForm" style="display:grid; gap:16px;">
      <div class="form-group">
        <label for="modalEditHabitName" style="font-weight:700; font-size:12px; color:var(--text); margin-bottom:6px; display:block;">
          ${isAr ? 'اسم العادة / المادة في الجدول *' : 'Habit / Routine Name *'}
        </label>
        <input type="text" class="field" id="modalEditHabitName" value="${(goal.name || '').replace(/"/g, '&quot;')}" required maxlength="100">
      </div>

      <div class="form-group">
        <label for="modalEditHabitTarget" style="font-weight:700; font-size:12px; color:var(--text); margin-bottom:6px; display:block;">
          ${isAr ? 'أيام الهدف في الأسبوع (1 - 7)' : 'Target Days Per Week (1 - 7)'}
        </label>
        <input type="number" class="field" id="modalEditHabitTarget" min="1" max="7" value="${goal.target || 5}" required>
      </div>

      <div class="form-group">
        <label style="font-weight:700; font-size:12px; color:var(--text); margin-bottom:6px; display:block;">
          ${isAr ? 'اختر الأيام المجدولة (ستظهر العادة في تركيز اليوم في هذه الأيام):' : 'Scheduled Days (Appears on Today\'s Focus on these days):'}
        </label>
        <div class="day-selector-pills" id="modalEditDayPills" style="display:flex; gap:6px; flex-wrap:wrap;">
          ${DAY_NAMES.map((name, idx) => `
            <button type="button" class="day-chip ${editSelectedDays.includes(idx) ? 'active' : ''}" data-day-index="${idx}">${name}</button>
          `).join('')}
        </div>
      </div>

      <div style="font-size:11px; color:var(--muted); line-height:1.5; padding:10px; background:rgba(91,224,235,0.06); border-radius:8px; border:1px solid rgba(91,224,235,0.2);">
        💡 ${isAr 
          ? 'أي تعديل سيبقى متثبتاً في جدولك ويتجدد تلقائياً كل أسبوع مع بداية كل يوم سبت دون الحاجة لإعادة كتابته.' 
          : 'Any edits will stay locked into your schedule and will auto-renew every Saturday without needing to re-enter them.'}
      </div>
    </form>
  `;

  const targetInput = content.querySelector('#modalEditHabitTarget');
  content.querySelectorAll('#modalEditDayPills .day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = Number(chip.dataset.dayIndex);
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        editSelectedDays = editSelectedDays.filter(d => d !== idx);
      } else {
        chip.classList.add('active');
        editSelectedDays.push(idx);
      }
      targetInput.value = Math.max(1, editSelectedDays.length);
    });
  });

  Modal.show({
    title: isAr ? `تعديل العادة: ${goal.name}` : `Edit Habit: ${goal.name}`,
    content,
    footerButtons: [
      {
        text: isAr ? 'إلغاء' : 'Cancel',
        className: 'btn-secondary',
        onClick: () => Modal.close()
      },
      {
        text: isAr ? '💾 حفظ التعديل' : '💾 Save Changes',
        className: 'btn-primary',
        onClick: async () => {
          const nameInput = content.querySelector('#modalEditHabitName');
          const newName = nameInput.value.trim();
          const newTarget = Number(targetInput.value);

          if (!newName || newTarget < 1 || newTarget > 7) {
            Toast.error(isAr ? 'يرجى إدخال اسم وهدف صحيح (1 - 7)' : 'Please enter a valid name and target (1-7)');
            return;
          }

          try {
            await api.updateWeeklyGoal(goal.id, {
              name: newName,
              target: newTarget,
              scheduledDays: editSelectedDays.length > 0 ? editSelectedDays : [0, 1, 2, 3, 4, 5, 6]
            });
            Toast.success(isAr ? '✓ تم حفظ تعديل العادة والجدول بنجاح! ⚡' : '✓ Habit and weekly schedule updated! ⚡');
            Modal.close();
            await store.refreshAll();
          } catch (err) {
            Toast.error(err.message || 'Failed to update habit');
          }
        }
      }
    ]
  });
}

export function renderWeeklyView(container) {
  const todayIdx = getTodayDayIndex();
  const ar = getLang() === 'ar';
  const DAY_NAMES = ar ? DAY_NAMES_AR : DAY_NAMES_EN;
  const FULL_DAY_NAMES = ar ? FULL_DAY_NAMES_AR : FULL_DAY_NAMES_EN;
  let selectedDays = [0, 1, 2, 3, 4, 5, 6]; // default all days selected

  container.innerHTML = `
    <div class="section-heading" style="flex-wrap: wrap; gap: 14px;">
      <div>
        <h2>${ar ? 'مصفوفة العادات والجدول الأسبوعي' : "This Week's Habit & Schedule Matrix"}</h2>
        <p id="weeklyRangeLabel">${getWeekDateRange()} · <strong style="color: var(--cyan);">${ar ? `اليوم هو ${FULL_DAY_NAMES[todayIdx]}` : `Today is ${FULL_DAY_NAMES[todayIdx]}`}</strong></p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <span class="auto-renew-pill" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(80,220,130,0.12);border:1px solid rgba(80,220,130,0.3);border-radius:20px;font-size:12px;font-weight:700;color:var(--green);">
          <span style="width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);"></span>
          ${ar ? 'الجدول يتجدد تلقائياً كل أسبوع' : 'Auto-renews every Saturday'}
        </span>
        <button class="btn btn-secondary btn-small" id="renewWeekBtn" title="${ar ? 'تصفير علامات الأسبوع لبدء أسبوع جديد مع الحفاظ على كل عاداتك وجدولك' : 'Start a fresh week, resetting day check marks while keeping all habits in your schedule'}">
          ${ar ? '↺ تجديد الأسبوع الآن' : '↺ Renew Week Now'}
        </button>
      </div>
    </div>

    <!-- OVERALL PROGRESS PANEL -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>${ar ? 'تقدم الهدف الأسبوعي' : 'Weekly Target Progress'}</h3>
          <p>${ar ? 'الانضباط يبني الزخم. علم على كل يوم تنجز فيه عادتك. يتجدد السجل تلقائياً كل أسبوع.' : 'Discipline builds momentum. Check each day as you fulfill your habits. Auto-renews weekly.'}</p>
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
          <p>${ar ? "اختر اسم العادة وأيام الهدف والأيام التي ستظهر فيها في تركيز اليوم. ستبقى في جدولك وتتجدد أسبوعياً." : "Choose habit name, target days, and which days of the week it will appear on Today's Focus. Stays in schedule & auto-renews weekly."}</p>
        </div>
        <span class="stat-icon">+</span>
      </div>

      <form id="weeklyNewHabitForm">
        <div class="form-grid-2" style="margin-bottom: 14px;">
          <div class="form-group">
            <label for="weeklyHabitName">${ar ? 'اسم العادة *' : 'Habit Name *'}</label>
            <input class="field" id="weeklyHabitName" type="text" maxlength="100" placeholder="${ar ? 'مثال: تمرين الجيم، قراءة 20 صفحة، مذاكرة' : 'e.g. Gym Workout, Reading 20 Pages, Study Session'}" required>
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

  // Manual Renew Week Button
  const renewBtn = container.querySelector('#renewWeekBtn');
  if (renewBtn) {
    renewBtn.addEventListener('click', () => {
      Modal.confirm({
        title: ar ? 'تجديد الجدول الأسبوعي' : 'Renew Weekly Schedule',
        message: ar 
          ? 'هل تريد بدء أسبوع جديد وتصفير علامات الأيام لهذا الأسبوع؟ ستبقى جميع العادات والمهام في جدولك ولن يُحذف أي شيء!' 
          : 'Start a fresh week now? All day checkboxes will be reset for the new week while keeping all habits in your schedule!',
        confirmText: ar ? 'نعم، جدد الأسبوع' : 'Yes, Renew Week',
        onConfirm: async () => {
          try {
            await api.renewWeeklySchedule();
            Toast.success(ar ? '✓ تم تجديد الأسبوع بنجاح وجدولك جاهز ونشط! ⚡' : '✓ Week renewed successfully! Your schedule is active! ⚡');
            await store.refreshAll();
          } catch (err) {
            Toast.error(err.message || 'Could not renew week');
          }
        }
      });
    });
  }

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

    const goals = store.state.weeklyGoals || [];
    let totalTarget = 0;
    let totalCompleted = 0;

    if (goals.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="padding: 28px; color: var(--muted); font-style: italic;">
            ${ar ? 'لا توجد عادات في الجدول الأسبوعي بعد. استخدم النموذج أدناه لإضافة أول عادة أو روتين لجدولك.' : 'No weekly habits defined yet. Use the form below to add your first habit or routine to your schedule.'}
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
        nameCell.innerHTML = `
          <div style="font-weight: 700; color: var(--text);">${goal.name}</div>
          <div class="weekly-goal-target">${ar ? 'الهدف:' : 'Target:'} ${target}${ar ? 'ي/أسبوع' : 'd/wk'} · <span style="color: var(--text-secondary);">[${scheduledDayTags}]</span></div>
        `;

        // Hours logged this week
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
            return name === (goal.name || '').toLowerCase() && sDate >= weekStart;
          })
          .reduce((acc, s) => acc + (Number(s.durationMinutes || s.duration_minutes) || 0), 0);
        const habitHours = (habitMins / 60).toFixed(1);
        if (habitMins > 0) {
          const timeBadge = document.createElement('div');
          timeBadge.style.cssText = 'font-size:10px;color:var(--cyan);margin-top:2px;';
          timeBadge.textContent = ar ? `⏱ ${habitHours} ساعة مسجلة هذا الأسبوع` : `⏱ ${habitHours}h logged this week`;
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
            cb.title = ar ? 'غير مجدول لهذا اليوم، ولكن يمكنك تعليمه أيضاً' : 'Not scheduled for this day, but you can still check it';
          }

          cb.addEventListener('change', async () => {
            try {
              if (isToday) {
                await api.toggleHabitToday(goal.id, cb.checked);
                Toast.success(cb.checked
                  ? (ar ? `✓ تم تحديد اليوم! متزامن مع تركيز اليوم.` : `✓ Checked for Today! Synced with Today's Focus.`)
                  : (ar ? 'تم إعادة فتحه لليوم' : 'Reopened for Today'));
              } else {
                await api.toggleWeeklyGoalDay(goal.id, dayIdx);
              }
              await store.refreshAll();
            } catch {
              cb.checked = !cb.checked;
              Toast.error(ar ? 'تعذّر تحديث العادة' : 'Could not update habit');
            }
          });

          td.appendChild(cb);
          row.appendChild(td);
        });

        // Progress cell
        const progCell = document.createElement('td');
        progCell.className = 'weekly-progress-cell';
        progCell.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">${completedDays}/${target} ${ar ? 'أيام' : 'days'}</div>
          <div class="progress-track" style="height: 6px;">
            <div class="progress-fill ${progress >= 100 ? 'green' : ''}" style="width: ${progress}%;"></div>
          </div>
        `;
        row.appendChild(progCell);

        // Actions cell
        const actCell = document.createElement('td');
        actCell.style.whiteSpace = 'nowrap';

        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'weekly-actions-wrap';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'weekly-edit-btn';
        editBtn.title = ar ? `تعديل "${goal.name}" (الاسم، الأيام المجدولة، الهدف)` : `Edit "${goal.name}" (Name, scheduled days, target)`;
        editBtn.innerHTML = '✏️';
        editBtn.addEventListener('click', () => openEditHabitModal(goal));

        // Start timer today button
        const startTimerBtn = document.createElement('button');
        startTimerBtn.className = 'btn btn-icon';
        startTimerBtn.title = ar ? `بدء العداد لـ "${goal.name}" لليوم` : 'Start live stopwatch for today';
        startTimerBtn.innerHTML = '⏱';
        startTimerBtn.addEventListener('click', () => {
          store.startStopwatch(goal.id, goal.name, 'habit');
          Toast.info(`⏱ ${ar ? `بدأ العداد لـ "${goal.name}". جاري الانتقال لتركيز اليوم...` : `Stopwatch started for "${goal.name}". Navigating to Today's Focus...`}`);
          window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
        });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'weekly-delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = ar ? `حذف "${goal.name}"` : `Delete ${goal.name}`;
        delBtn.addEventListener('click', () => {
          Modal.confirm({
            title: ar ? 'حذف العادة من الجدول' : 'Delete Weekly Habit',
            message: ar ? `هل أنت متأكد من حذف "${goal.name}" من الجدول الأسبوعي؟` : `Delete habit "${goal.name}" from weekly schedule?`,
            confirmText: ar ? 'حذف' : 'Delete',
            onConfirm: async () => {
              try {
                await api.deleteWeeklyGoal(goal.id);
                Toast.success(ar ? 'تم حذف العادة من الجدول' : 'Habit removed from schedule');
                await store.refreshAll();
              } catch {
                Toast.error(ar ? 'تعذّر حذف العادة' : 'Could not delete habit');
              }
            }
          });
        });

        actionsWrap.append(editBtn, startTimerBtn, delBtn);
        actCell.appendChild(actionsWrap);
        row.appendChild(actCell);

        tbody.appendChild(row);
      });
    }

    // Overall Progress
    const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
    container.querySelector('#weeklyPageOverallNumber').textContent = `${overallPct}%`;
    container.querySelector('#weeklyPageOverallCount').textContent = ar
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
      Toast.error(ar ? 'أدخل اسم عادة صحيحًا وهدفًا من 1 إلى 7' : 'Please enter a valid habit name and target (1-7)');
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
      Toast.success(ar ? 'تم تسجيل العادة وإضافتها للجدول الأسبوعي بنجاح! ⚡' : 'Weekly habit registered and added to schedule! ⚡');
      await store.refreshAll();
    } catch {
      Toast.error(ar ? 'تعذّر إنشاء العادة' : 'Failed to create weekly habit');
    }
  });

  renderMatrix();
  store.subscribe('weeklyGoals', () => renderMatrix());
}
