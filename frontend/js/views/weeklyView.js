import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

const DAY_NAMES = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FULL_DAY_NAMES = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
  let selectedDays = [0, 1, 2, 3, 4, 5, 6]; // default all days selected

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>This Week's Habit & Goal Matrix</h2>
        <p id="weeklyRangeLabel">${getWeekDateRange()} · <strong style="color: var(--cyan);">Today is ${FULL_DAY_NAMES[todayIdx]}</strong></p>
      </div>
    </div>

    <!-- OVERALL PROGRESS PANEL -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Weekly Target Progress</h3>
          <p>Discipline builds momentum. Check each day as you fulfill your habits.</p>
        </div>
        <span class="stat-icon">✓</span>
      </div>

      <div class="weekly-summary-panel">
        <div>
          <div class="weekly-summary-label">Overall Completion</div>
          <div class="weekly-summary-number" id="weeklyPageOverallNumber">0%</div>
        </div>
        <div class="stat-caption" id="weeklyPageOverallCount">0 completed</div>
      </div>

      <div class="progress-track" style="height: 8px;">
        <div class="progress-fill" id="weeklyPageOverallFill" style="width: 0%;"></div>
      </div>
    </div>

    <!-- HABIT MATRIX TABLE -->
    <div class="panel" style="padding: 16px 20px;">
      <div class="panel-heading" style="margin-bottom: 12px;">
        <div>
          <h3 style="font-size: 13px;">Weekly Habits Schedule</h3>
          <p>The column highlighted in cyan represents <strong style="color: var(--cyan);">TODAY (${DAY_NAMES[todayIdx]})</strong>. Check marks automatically sync with Today's Focus!</p>
        </div>
        <button class="text-button" id="goToTodayFromWeeklyBtn">Open Today's Focus →</button>
      </div>

      <div class="weekly-table-wrap">
        <table class="weekly-table">
          <thead>
            <tr>
              <th style="text-align: left; padding-left: 16px;">Habit / Routine</th>
              ${DAY_NAMES.map((name, idx) => `
                <th class="${idx === todayIdx ? 'today-col-header' : ''}">
                  ${name}
                  ${idx === todayIdx ? '<span class="today-indicator-pill">TODAY</span>' : ''}
                </th>
              `).join('')}
              <th>Progress</th>
              <th>Actions</th>
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
          <h3>Add New Habit to Weekly Schedule</h3>
          <p>Choose habit name, target days, and which days of the week it will appear on Today's Focus.</p>
        </div>
        <span class="stat-icon">+</span>
      </div>

      <form id="weeklyNewHabitForm">
        <div class="form-grid-2" style="margin-bottom: 14px;">
          <div class="form-group">
            <label for="weeklyHabitName">Habit Name *</label>
            <input class="field" id="weeklyHabitName" type="text" maxlength="100" placeholder="e.g. Gym Workout, Reading 20 Pages, Cold Shower" required>
          </div>
          <div class="form-group">
            <label for="weeklyHabitTarget">Target Days Per Week</label>
            <input class="field" id="weeklyHabitTarget" type="number" min="1" max="7" value="5" required>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label>Select Scheduled Days (Will appear in Today's Focus on these days):</label>
          <div class="day-selector-pills" id="habitDayPills">
            ${DAY_NAMES.map((name, idx) => `
              <button type="button" class="day-chip active" data-day-index="${idx}">${name}</button>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-primary" type="submit">+ Add Habit to Schedule</button>
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
            No weekly habits defined yet. Use the form below to create your schedule.
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
          <div class="weekly-goal-target">Target: ${target}d/wk · <span style="color: var(--text-secondary);">[${scheduledDayTags}]</span></div>
        `;
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
            try {
              if (isToday) {
                // Use toggle-today to sync with tasks automatically
                await api.toggleHabitToday(goal.id, cb.checked);
                Toast.success(cb.checked ? `✓ Checked for Today! Synced with Today's Focus.` : `Reopened for Today`);
              } else {
                await api.toggleWeeklyGoalDay(goal.id, dayIdx);
              }
              await store.refreshAll();
            } catch {
              cb.checked = !cb.checked;
              Toast.error('Could not update habit');
            }
          });

          td.appendChild(cb);
          row.appendChild(td);
        });

        // Progress cell
        const progCell = document.createElement('td');
        progCell.className = 'weekly-progress-cell';
        progCell.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">${completedDays}/${target} days</div>
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
    const overall = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;
    container.querySelector('#weeklyPageOverallNumber').textContent = `${overall}%`;
    container.querySelector('#weeklyPageOverallCount').textContent = `${totalCompleted} / ${totalTarget} target days completed`;
    container.querySelector('#weeklyPageOverallFill').style.width = `${overall}%`;
  }

  // Form submit
  const form = container.querySelector('#weeklyNewHabitForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nameInput = container.querySelector('#weeklyHabitName');
    const target = Number(targetInput.value);
    const name = nameInput.value.trim();

    if (!name || target < 1 || target > 7) {
      Toast.error('Please enter a valid habit name and target (1-7)');
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
      Toast.success('Weekly habit registered and added to schedule! ⚡');
      await store.refreshAll();
    } catch {
      Toast.error('Failed to create weekly habit');
    }
  });

  renderMatrix();
  store.subscribe('weeklyGoals', () => renderMatrix());
}
