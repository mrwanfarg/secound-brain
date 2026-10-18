import { store } from '../store.js';
import { t, getLang } from '../i18n.js';
import { createEmptyState } from '../components/EmptyState.js';

export function renderMonthlyArchiveView(container) {
  const isAr = getLang() === 'ar';
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"

  // Storage key for selected month
  const currentUser = store.state.user;
  const userKey = currentUser ? currentUser.id || currentUser.email : 'guest';
  const selectedMonthStorageKey = `secondBrain_archive_selected_month_${userKey}`;
  let selectedMonth = localStorage.getItem(selectedMonthStorageKey) || currentMonthStr;

  let searchQuery = '';
  let categoryFilter = 'all'; // 'all' | 'habit' | 'task'

  // ============================================================
  // COLLECT ALL MONTHS (DATA-DRIVEN + YEAR CALENDAR MONTHS)
  // ============================================================
  function getAllMonths() {
    const monthSet = new Set();
    monthSet.add(currentMonthStr);

    // Also add previous 5 months and next 1 month so user can navigate easily
    for (let i = -5; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthSet.add(d.toISOString().slice(0, 7));
    }

    // Add any months from tasks
    (store.state.tasks || []).forEach(t => {
      const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : null);
      if (d && d.length >= 7) monthSet.add(d.slice(0, 7));
    });

    // Add any months from time sessions
    (store.state.timeSessions || []).forEach(s => {
      const d = (s.startTime || s.created_at || s.createdAt || '').slice(0, 7);
      if (d && d.length === 7) monthSet.add(d);
    });

    // Return sorted descending (newest first)
    return Array.from(monthSet).sort().reverse();
  }

  // ============================================================
  // AGGREGATE ALL ACTIVITIES FOR A GIVEN MONTH
  // ============================================================
  function getMonthAggregates(monthStr) {
    const tasks = store.state.tasks || [];
    const sessions = store.state.timeSessions || [];
    const weeklyGoals = store.state.weeklyGoals || [];

    // Map: itemNameLower -> { name, type, dateMap: { dateStr -> { minutes, notes: [] } } }
    const itemsMap = {};

    function ensureItem(name, type = 'task') {
      const key = (name || '').toLowerCase().trim();
      if (!itemsMap[key]) {
        itemsMap[key] = {
          name: name.trim(),
          type,
          dateMap: {}
        };
      }
      if (type === 'habit') itemsMap[key].type = 'habit';
      return itemsMap[key];
    }

    // 1. Process matching tasks in this month
    tasks.forEach(t => {
      const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : null);
      if (!d || !d.startsWith(monthStr)) return;
      if (!t.completed && (Number(t.actualMinutes) || 0) === 0) return;

      const isHabit = (t.category || '').toLowerCase() === 'habit' || weeklyGoals.some(g => g.name.toLowerCase().trim() === (t.title || '').toLowerCase().trim());
      const item = ensureItem(t.title || 'Task', isHabit ? 'habit' : 'task');

      if (!item.dateMap[d]) item.dateMap[d] = { minutes: 0, notes: [] };
      const mins = Number(t.actualMinutes) || 0;
      if (mins > 0) item.dateMap[d].minutes = Math.max(item.dateMap[d].minutes, mins);
      item.dateMap[d].notes.push(t.description || (isAr ? 'تم إنجاز المهمة' : 'Task completed'));
    });

    // 2. Process matching time sessions in this month
    sessions.forEach(s => {
      const d = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
      if (!d || !d.startsWith(monthStr)) return;

      const name = (s.activityName || s.activity_name || 'Focus Session').trim();
      const isHabit = weeklyGoals.some(g => g.name.toLowerCase().trim() === name.toLowerCase());
      const item = ensureItem(name, isHabit ? 'habit' : 'task');

      if (!item.dateMap[d]) item.dateMap[d] = { minutes: 0, notes: [] };
      const mins = Number(s.durationMinutes || s.duration_minutes) || 0;
      if (mins > 0) {
        if (item.dateMap[d].minutes === 0) item.dateMap[d].minutes = mins;
        else if (mins > item.dateMap[d].minutes) item.dateMap[d].minutes = mins;
      }
      item.dateMap[d].notes.push(s.notes || (isAr ? 'مسجل عبر العداد' : 'Recorded via stopwatch'));
    });

    // 3. Process current week's weekly goals if in this month
    weeklyGoals.forEach(goal => {
      const name = goal.name || '';
      if (!name) return;
      if (Array.isArray(goal.days)) {
        const curr = new Date();
        const todayIdx = (curr.getDay() + 1) % 7; // 0 = Sat ... 6 = Fri
        goal.days.forEach((checked, dayIdx) => {
          if (checked) {
            const d = new Date(curr);
            d.setDate(d.getDate() - (todayIdx - dayIdx));
            const dStr = d.toISOString().split('T')[0];
            if (dStr.startsWith(monthStr)) {
              const item = ensureItem(name, 'habit');
              if (!item.dateMap[dStr]) {
                item.dateMap[dStr] = {
                  minutes: 0,
                  notes: [isAr ? 'معلم عليه في جدول الأسبوع' : 'Checked in Weekly Matrix']
                };
              }
            }
          }
        });
      }
    });

    // Build finalized items list
    const items = Object.values(itemsMap).map(it => {
      const sortedDates = Object.keys(it.dateMap).sort();
      const daysCount = sortedDates.length;
      const totalMinutes = sortedDates.reduce((sum, d) => sum + (Number(it.dateMap[d].minutes) || 0), 0);
      const totalHours = (totalMinutes / 60).toFixed(1);

      const dayLogs = sortedDates.map(d => ({
        date: d,
        minutes: it.dateMap[d].minutes,
        details: it.dateMap[d].notes[0] || (isAr ? 'تم الإنجاز' : 'Completed')
      }));

      return {
        name: it.name,
        type: it.type,
        daysCount,
        totalMinutes,
        totalHours,
        days: sortedDates,
        dayLogs
      };
    }).sort((a, b) => b.daysCount - a.daysCount || b.totalMinutes - a.totalMinutes);

    // Global month stats
    const allActiveDates = new Set();
    let totalMonthMinutes = 0;
    items.forEach(it => {
      it.days.forEach(d => allActiveDates.add(d));
      totalMonthMinutes += it.totalMinutes;
    });

    const totalMonthHours = (totalMonthMinutes / 60).toFixed(1);

    return {
      monthStr,
      items,
      totalItemsCount: items.length,
      totalActiveDays: allActiveDates.size,
      totalMonthMinutes,
      totalMonthHours
    };
  }

  function formatMonthName(monthStr) {
    try {
      const parts = monthStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
    } catch (_) {
      return monthStr;
    }
  }

  function formatDisplayDate(dateStr) {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (_) {
      return dateStr;
    }
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return isAr ? `${h} س و ${m} د` : `${h}h ${m}m`;
    }
    return isAr ? `${m} دقيقة` : `${m}m`;
  }

  // ============================================================
  // MAIN VIEW RENDER
  // ============================================================
  function renderView() {
    const months = getAllMonths();
    if (!months.includes(selectedMonth)) {
      selectedMonth = months[0] || currentMonthStr;
    }

    const currentMonthData = getMonthAggregates(selectedMonth);

    // Filter items
    const filteredItems = currentMonthData.items.filter(it => {
      const matchesSearch = !searchQuery || it.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || it.type === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    container.innerHTML = `
      <div class="section-heading">
        <div>
          <h2>${isAr ? 'سجل الشهور والأرشيف الشهري للإنجازات' : 'Monthly Accomplishments & Time Archive'}</h2>
          <p>${isAr ? 'استعرض أي شهر لرؤية كل ما تم إنجازه، والأيام التي عملت فيها على كل عادة، وإجمالي الوقت والساعات.' : 'Review any month to see all completed habits, exact days worked, and total focus time.'}</p>
        </div>
      </div>

      <!-- MONTH CARDS / BOXES (خانات الشهور) -->
      <div class="panel" style="padding: 18px 20px 10px; margin-bottom: 22px;">
        <div class="panel-heading" style="margin-bottom: 14px;">
          <div>
            <h3>${isAr ? 'اختر الشهر (خانات الشهور)' : 'Select Month (Monthly Archive Grid)'}</h3>
            <p>${isAr ? 'اضغط على أي شهر لعرض سجل الإنجازات والوقت المفصل له.' : 'Click any month card to view its complete accomplishments and daily time log.'}</p>
          </div>
          <span class="stat-icon">🏛️</span>
        </div>

        <div class="month-cards-grid">
          ${months.map(m => {
            const mData = getMonthAggregates(m);
            const isSelected = m === selectedMonth;
            const isCurrent = m === currentMonthStr;
            return `
              <div class="month-card ${isSelected ? 'active' : ''}" data-month="${m}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                  <div class="month-card-title">${formatMonthName(m)}</div>
                  ${isCurrent ? `<span class="month-card-badge">${isAr ? 'الحالي' : 'Current'}</span>` : ''}
                </div>
                <div class="month-card-stats">
                  <div>✓ ${mData.totalItemsCount} ${isAr ? 'عادات ومهام' : 'items done'}</div>
                  <div class="month-card-hours">⏱ ${mData.totalMonthHours} ${isAr ? 'ساعة مسجلة' : 'hours logged'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- SELECTED MONTH OVERVIEW PANEL -->
      <div class="panel" style="background: linear-gradient(135deg, rgba(28, 24, 46, 0.98), rgba(18, 16, 32, 0.98)); border: 1px solid rgba(139, 92, 246, 0.35); margin-bottom: 24px;">
        <div class="monthly-habit-header" style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); display: flex; align-items: center; justify-content: center; font-size: 24px;">
              📅
            </div>
            <div>
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text); margin: 0;">
                ${isAr ? `إنجازات شهر ${formatMonthName(selectedMonth)}` : `${formatMonthName(selectedMonth)} Archive & Time Log`}
              </h3>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--muted);">
                ${isAr ? `إجمالي النشاط والوقت المحسوب تلقائياً لكافة عادات ومهام هذا الشهر` : `Full breakdown of routines, completed days, and total hours logged.`}
              </p>
            </div>
          </div>
          <div class="date-badge" style="background: rgba(91, 224, 235, 0.15); border: 1px solid rgba(91, 224, 235, 0.3); color: var(--cyan); font-weight: 800; font-size: 13px;">
            ⏱ ${currentMonthData.totalMonthHours} ${isAr ? 'ساعة كلياً' : 'Hours Total'}
          </div>
        </div>

        <!-- STATS ROW FOR SELECTED MONTH -->
        <div class="monthly-habit-stats-grid" style="margin-bottom: 0;">
          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${isAr ? 'إجمالي الساعات المسجلة' : 'Total Focus Hours'}</div>
            <div class="monthly-habit-stat-value" style="color: var(--cyan);">
              ⏱ ${currentMonthData.totalMonthHours} <span style="font-size: 13px; font-weight: 600; color: var(--muted);">${isAr ? 'س' : 'h'}</span>
            </div>
            <div class="monthly-habit-stat-sub">
              ${currentMonthData.totalMonthMinutes} ${isAr ? 'دقيقة مسجلة' : 'total minutes'}
            </div>
          </div>

          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${isAr ? 'العادات والمهام المنجزة' : 'Routines & Tasks Completed'}</div>
            <div class="monthly-habit-stat-value" style="color: var(--violet-light);">
              ${currentMonthData.totalItemsCount} <span style="font-size: 13px; font-weight: 600; color: var(--muted);">${isAr ? 'عنصر' : 'items'}</span>
            </div>
            <div class="monthly-habit-stat-sub">
              ${isAr ? 'تم العمل عليها خلال الشهر' : 'Engaged with during month'}
            </div>
          </div>

          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${isAr ? 'أيام النشاط والعمل' : 'Active Days this Month'}</div>
            <div class="monthly-habit-stat-value" style="color: var(--green);">
              ${currentMonthData.totalActiveDays} <span style="font-size: 13px; font-weight: 600; color: var(--muted);">${isAr ? 'يوماً' : 'days'}</span>
            </div>
            <div class="monthly-habit-stat-sub">
              ${isAr ? 'أيام سجلت فيها أوقات وإنجازات' : 'Days with completed routines'}
            </div>
          </div>

          <div class="monthly-habit-stat-card">
            <div class="monthly-habit-stat-label">${isAr ? 'أعلى عادة التزاماً' : 'Most Consistent Routine'}</div>
            <div class="monthly-habit-stat-value" style="font-size: 15px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${currentMonthData.items[0] ? currentMonthData.items[0].name : (isAr ? 'لا يوجد بعد' : 'None yet')}
            </div>
            <div class="monthly-habit-stat-sub">
              ${currentMonthData.items[0] ? `${currentMonthData.items[0].daysCount} ${isAr ? 'أيام منجزة' : 'days completed'}` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="panel" style="padding: 14px 20px; margin-bottom: 20px;">
        <div class="tasks-control-bar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" class="field" id="monthlyArchiveSearchInput" placeholder="${isAr ? 'ابحث في عادات ومهام هذا الشهر...' : 'Search habits or tasks completed this month...'}" value="${searchQuery}">
          </div>

          <div class="filter-bar" id="monthlyArchiveFilterBar" style="margin: 0;">
            <button class="filter-pill ${categoryFilter === 'all' ? 'active' : ''}" data-cat="all">${isAr ? 'الكل' : 'All'}</button>
            <button class="filter-pill ${categoryFilter === 'habit' ? 'active' : ''}" data-cat="habit">${isAr ? 'العادات فقط' : 'Habits Only'}</button>
            <button class="filter-pill ${categoryFilter === 'task' ? 'active' : ''}" data-cat="task">${isAr ? 'المهام فقط' : 'Tasks Only'}</button>
          </div>
        </div>
      </div>

      <!-- MONTHLY ITEMS BREAKDOWN (الحاجات الى عملتها الشهر ده والايام و total الوقت) -->
      <div id="monthlyItemsContainer">
        ${filteredItems.length === 0 ? `
          <div class="panel" style="padding: 36px 20px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 10px;">📅</div>
            <h3 style="font-size: 16px; margin-bottom: 6px; color: var(--text);">
              ${isAr ? 'لا توجد عناصر مسجلة في هذا الشهر حتى الآن' : 'No activities recorded for this month yet'}
            </h3>
            <p style="font-size: 12px; color: var(--muted); max-width: 440px; margin: 0 auto 18px;">
              ${isAr ? 'عند إنجاز العادات أو تشغيل عداد الوقت في صفحة تركيز اليوم، سيتم تسجيلها وحسابها تلقائياً هنا في أرشيف الشهر.' : 'When you complete habits or track time in Today\'s Focus, they will automatically be archived here.'}
            </p>
            <button class="btn btn-primary btn-small" id="archiveGoToTodayBtn">
              ${isAr ? 'فتح تركيز اليوم وبدء العداد →' : 'Open Today\'s Focus →'}
            </button>
          </div>
        ` : `
          ${filteredItems.map(item => `
            <div class="monthly-item-card">
              <!-- ITEM HEADER -->
              <div class="monthly-item-header">
                <div>
                  <div class="monthly-item-title">
                    <span>${item.name}</span>
                    <span class="task-badge ${item.type === 'habit' ? 'badge-category' : ''}" style="${item.type === 'habit' ? '' : 'background: rgba(139, 92, 246, 0.15); color: var(--violet-light);'}">
                      ${item.type === 'habit' ? (isAr ? 'عادة أسبوعية' : 'Weekly Habit') : (isAr ? 'مهمة' : 'Task')}
                    </span>
                  </div>
                  <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">
                    ${isAr 
                      ? `تم إنجازها في ${item.daysCount} أيام مختلفة خلال شهر ${formatMonthName(selectedMonth)}` 
                      : `Completed on ${item.daysCount} separate days during ${formatMonthName(selectedMonth)}`}
                  </div>
                </div>

                <div class="monthly-item-meta-badges">
                  <span class="task-badge" style="background: rgba(116, 214, 160, 0.15); color: var(--green); border: 1px solid rgba(116, 214, 160, 0.3); font-weight: 800; font-size: 12px;">
                    📅 ${item.daysCount} ${isAr ? 'أيام تم إنجازهم' : 'Days Done'}
                  </span>
                  <span class="task-badge" style="background: rgba(91, 224, 235, 0.15); color: var(--cyan); border: 1px solid rgba(91, 224, 235, 0.3); font-weight: 800; font-size: 12px;">
                    ⏱ ${isAr ? 'إجمالي الوقت:' : 'Total:'} ${item.totalHours} ${isAr ? 'ساعة' : 'hrs'} (${item.totalMinutes} ${isAr ? 'د' : 'm'})
                  </span>
                </div>
              </div>

              <!-- DAYS PILLS (الأيام التي تم العمل عليها في هذا الشهر) -->
              <div style="font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                ${isAr ? 'الأيام التي تم إنجازها بالشهـر (مع وقت كل يوم):' : 'Days Completed This Month (with duration per day):'}
              </div>
              <div class="month-days-chips-wrap">
                ${item.dayLogs.map(log => `
                  <span class="month-day-chip ${log.minutes > 0 ? '' : 'no-time'}">
                    <span>✓ ${formatDisplayDate(log.date)}</span>
                    <strong style="color: ${log.minutes > 0 ? 'var(--cyan)' : 'var(--muted)'};">
                      ${log.minutes > 0 ? `(⏱ ${formatDuration(log.minutes)})` : `(${isAr ? 'تم' : 'Done'})`}
                    </strong>
                  </span>
                `).join('')}
              </div>

              <!-- DAY-BY-DAY TABLE FOR THIS ITEM -->
              <div style="margin-top: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden;">
                <div class="daily-log-table-wrap">
                  <table class="daily-log-table">
                    <thead>
                      <tr>
                        <th>${isAr ? 'التاريخ واليوم' : 'Date & Day'}</th>
                        <th>${isAr ? 'الوقت المستغرق' : 'Logged Time'}</th>
                        <th>${isAr ? 'تفاصيل الجلسة' : 'Session Details'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${item.dayLogs.map(log => `
                        <tr>
                          <td style="font-weight: 700; color: var(--text);">
                            📅 ${formatDisplayDate(log.date)}
                          </td>
                          <td>
                            <span class="task-badge" style="background: rgba(91, 224, 235, 0.15); color: var(--cyan); font-weight: 700;">
                              ⏱ ${log.minutes > 0 ? formatDuration(log.minutes) : (isAr ? 'تم الإنجاز' : 'Completed')}
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
                <div class="daily-log-footer" style="background: rgba(139, 92, 246, 0.05);">
                  <span>${isAr ? `إجمالي ساعات "${item.name}":` : `Total hours for "${item.name}":`}</span>
                  <span style="color: var(--cyan); font-size: 13px;">
                    ⏱ ${item.totalHours} ${isAr ? 'ساعة' : 'hours'} (${item.totalMinutes} ${isAr ? 'دقيقة' : 'minutes'})
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        `}
      </div>
    `;

    // Month card click handlers
    container.querySelectorAll('.month-card').forEach(card => {
      card.addEventListener('click', () => {
        const m = card.dataset.month;
        if (m) {
          selectedMonth = m;
          localStorage.setItem(selectedMonthStorageKey, m);
          renderView();
        }
      });
    });

    // Search input handler
    const searchInput = container.querySelector('#monthlyArchiveSearchInput');
    searchInput?.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderView();
      // Keep cursor position
      const reInput = container.querySelector('#monthlyArchiveSearchInput');
      if (reInput) {
        reInput.focus();
        reInput.setSelectionRange(reInput.value.length, reInput.value.length);
      }
    });

    // Category filter pills
    container.querySelectorAll('#monthlyArchiveFilterBar .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        categoryFilter = pill.dataset.cat;
        renderView();
      });
    });

    // Go to Today shortcut
    container.querySelector('#archiveGoToTodayBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
    });
  }

  // INITIAL DRAW
  renderView();

  // SUBSCRIBE TO UPDATES
  store.subscribe('tasks', () => renderView());
  store.subscribe('weeklyGoals', () => renderView());
  store.subscribe('timeSessions', () => renderView());
}
