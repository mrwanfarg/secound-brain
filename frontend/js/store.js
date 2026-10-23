import { api } from './api.js';
import { auth } from './auth.js';

class Store {
  constructor() {
    this.state = {
      user: auth.getCurrentUser(),
      currentPage: 'Dashboard',
      tasks: [],
      projects: [],
      weeklyGoals: [],
      notes: [],
      timeSessions: [],
      stats: {},
      intention: '',
      settings: {},
      taskFilter: 'all',
      taskViewMode: 'list', // 'list' | 'kanban' | 'schedule'
      searchQuery: '',
      activeProjectFilter: '',
      isOnline: true,
      // Pomodoro Timer State
      timer: {
        secondsLeft: 25 * 60,
        totalSeconds: 25 * 60,
        isRunning: false,
        intervalId: null,
        mode: 'work', // 'work' | 'break'
        linkedTaskId: null,
        activityName: 'Focus Session'
      },
      // Live Stopwatch for Habits & Tasks (Start, Pause, Resume, Stop)
      stopwatch: {
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
        startTimestamp: null,
        startTimeFormatted: '',
        pausedDuration: 0,
        pauseTimestamp: null,
        sessionDate: null,
        activeItemId: null,
        activeItemTitle: '',
        activeItemType: 'habit', // 'habit' | 'task'
        intervalId: null
      }
    };

    this.listeners = new Map();
  }

  // Subscribe to changes: store.subscribe('tasks', () => ...) or store.subscribe('*', () => ...)
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }

  notify(key) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(cb => cb(this.state[key], this.state));
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => cb(this.state));
    }
  }

  setState(partial) {
    for (const [k, v] of Object.entries(partial)) {
      this.state[k] = v;
      this.notify(k);
    }
  }

  async init() {
    api.onStatusChange(online => {
      this.setState({ isOnline: online });
    });

    // Register auth listener BEFORE auth.init() so the immediate
    // notify() at end of init() propagates correctly to the store
    auth.onAuthChange(async user => {
      this.setState({ user });
      await this.refreshAll();
    });

    // auth.init() restores localStorage session then calls notify()
    // which triggers the listener above — so by the time we await here,
    // this.state.user is already set
    await auth.init();

    // Restore stopwatch state from localStorage (survives page close/lock)
    this._restoreStopwatchFromStorage();
  }

  async refreshAll() {
    try {
      const [tasksRes, projectsRes, weeklyRes, notesRes, timersRes, statsRes, settingsRes] = await Promise.allSettled([
        api.getTasks(),
        api.getProjects(),
        api.getWeeklyGoals(),
        api.getNotes(),
        api.getTimeSessions(),
        api.getStats(),
        api.getSettings()
      ]);

      const updates = {};
      if (tasksRes.status === 'fulfilled' && tasksRes.value?.data) updates.tasks = tasksRes.value.data;
      if (projectsRes.status === 'fulfilled' && projectsRes.value?.data) updates.projects = projectsRes.value.data;
      if (weeklyRes.status === 'fulfilled' && weeklyRes.value?.data) updates.weeklyGoals = weeklyRes.value.data;
      if (notesRes.status === 'fulfilled' && notesRes.value?.data) updates.notes = notesRes.value.data;
      if (timersRes.status === 'fulfilled' && timersRes.value?.data) updates.timeSessions = timersRes.value.data;
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        updates.stats = statsRes.value.data;
        if (statsRes.value.data.intention !== undefined) {
          updates.intention = statsRes.value.data.intention;
        }
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) updates.settings = settingsRes.value.data;

      this.setState(updates);
    } catch (err) {
      console.warn('Initial store refresh warning:', err);
    }
  }

  // Filtered task getter
  getFilteredTasks() {
    const { tasks, taskFilter, searchQuery, activeProjectFilter } = this.state;
    const today = new Date().toISOString().split('T')[0];

    return tasks.filter(task => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches = (task.title && task.title.toLowerCase().includes(q)) ||
                        (task.description && task.description.toLowerCase().includes(q)) ||
                        (task.category && task.category.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Project
      if (activeProjectFilter && task.projectId !== activeProjectFilter) {
        return false;
      }

      // Filter
      switch (taskFilter) {
        case 'today':
          return task.dueDate === today;
        case 'pending':
          return !task.completed;
        case 'completed':
          return task.completed;
        case 'overdue':
          return task.dueDate && task.dueDate < today && !task.completed;
        case 'urgent':
          return (task.priority === 'urgent' || task.priority === 'high') && !task.completed;
        case 'all':
        default:
          return true;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STOPWATCH – persists across page close / phone lock
  //
  // Strategy:
  //   Running → save { startTimestamp, elapsedAtStart } to localStorage
  //   Paused  → save { isPaused: true, elapsedAtStart } to localStorage
  //   On open → recalculate elapsed = elapsedAtStart + (now - startTimestamp)
  // ─────────────────────────────────────────────────────────────

  static get SW_KEY() { return 'secondBrain_stopwatch_state'; }

  /** Helper to format time of day (e.g. 4:30 PM or 04:30 م) */
  formatTimeOfDay(dateOrTimestamp) {
    if (!dateOrTimestamp) return '';
    try {
      const d = new Date(dateOrTimestamp);
      if (isNaN(d.getTime())) return '';
      const isAr = localStorage.getItem('secondBrain_lang') === 'ar';
      return d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  }

  /** Get total seconds already logged today for an item (habit or task) */
  getTodayLoggedSeconds(itemId, title) {
    const localD = new Date();
    const localToday = `${localD.getFullYear()}-${String(localD.getMonth() + 1).padStart(2, '0')}-${String(localD.getDate()).padStart(2, '0')}`;
    const utcToday = localD.toISOString().split('T')[0];
    const isToday = (d) => d === localToday || d === utcToday;
    const titleLower = (title || '').toLowerCase().trim();

    // Check matching tasks for today
    const tasks = this.state.tasks || [];
    const matchingTasks = tasks.filter(t => 
      (t.id === itemId || (t.title && t.title.toLowerCase().trim() === titleLower)) &&
      isToday(t.dueDate)
    );
    const taskMins = matchingTasks.reduce((sum, t) => sum + (Number(t.actualMinutes) || 0), 0);

    // Check time sessions for today
    const sessions = this.state.timeSessions || [];
    const todaySessions = sessions.filter(s => {
      const sName = (s.activityName || s.activity_name || '').toLowerCase().trim();
      const sDate = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
      return sName === titleLower && isToday(sDate);
    });
    const sessionMins = todaySessions.reduce((acc, s) => acc + (Number(s.durationMinutes || s.duration_minutes) || 0), 0);

    const mins = Math.max(taskMins, sessionMins);
    return mins * 60;
  }

  /** Persist current stopwatch state so it survives page reload/lock */
  _saveStopwatchToStorage() {
    const sw = this.state.stopwatch;
    if (!sw.isRunning) {
      localStorage.removeItem(Store.SW_KEY);
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(Store.SW_KEY, JSON.stringify({
      isRunning: true,
      isPaused: sw.isPaused,
      startTimestamp: sw.startTimestamp,
      startTimeFormatted: sw.startTimeFormatted,
      pausedDuration: sw.pausedDuration || 0,
      pauseTimestamp: sw.pauseTimestamp || null,
      sessionDate: sw.sessionDate || todayStr,
      activeItemId: sw.activeItemId,
      activeItemTitle: sw.activeItemTitle,
      activeItemType: sw.activeItemType
    }));
  }

  /** Called once on app init – restores a running/paused stopwatch idempotently */
  _restoreStopwatchFromStorage() {
    try {
      const raw = localStorage.getItem(Store.SW_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved.isRunning || !saved.startTimestamp) return;

      const todayStr = new Date().toISOString().split('T')[0];
      // If stored session was from a previous day, clean it up
      if (saved.sessionDate && saved.sessionDate !== todayStr) {
        localStorage.removeItem(Store.SW_KEY);
        return;
      }

      const now = Date.now();
      const startTimestamp = saved.startTimestamp;
      const startTimeFormatted = saved.startTimeFormatted || this.formatTimeOfDay(startTimestamp);
      let pausedDuration = saved.pausedDuration || 0;
      let pauseTimestamp = saved.pauseTimestamp || null;

      // Calculate elapsed strictly from real clock time — never increments artificially on refresh!
      let elapsedSeconds;
      if (saved.isPaused) {
        const refTime = pauseTimestamp || now;
        elapsedSeconds = Math.max(0, Math.floor((refTime - startTimestamp - pausedDuration) / 1000));
      } else {
        elapsedSeconds = Math.max(0, Math.floor((now - startTimestamp - pausedDuration) / 1000));
      }

      // Re-create the tick interval
      const intervalId = setInterval(() => {
        const current = this.state.stopwatch;
        if (current.isRunning && !current.isPaused) {
          const currentElapsed = Math.max(0, Math.floor((Date.now() - current.startTimestamp - (current.pausedDuration || 0)) / 1000));
          current.elapsedSeconds = currentElapsed;
          this._saveStopwatchToStorage();
          this.notify('stopwatch');
        }
      }, 1000);

      this.state.stopwatch = {
        isRunning: true,
        isPaused: Boolean(saved.isPaused),
        elapsedSeconds,
        startTimestamp,
        startTimeFormatted,
        pausedDuration,
        pauseTimestamp,
        sessionDate: saved.sessionDate || todayStr,
        activeItemId: saved.activeItemId,
        activeItemTitle: saved.activeItemTitle,
        activeItemType: saved.activeItemType || 'habit',
        intervalId
      };
      this.notify('stopwatch');
    } catch (e) {
      console.warn('Could not restore stopwatch:', e);
    }
  }

  // ── STOPWATCH PUBLIC API ──────────────────────────────────────

  startStopwatch(itemId, title, type = 'habit') {
    // Clear any existing interval first
    if (this.state.stopwatch.intervalId) {
      clearInterval(this.state.stopwatch.intervalId);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const startTimestamp = Date.now();
    const startTimeFormatted = this.formatTimeOfDay(startTimestamp);

    const intervalId = setInterval(() => {
      const sw = this.state.stopwatch;
      if (sw.isRunning && !sw.isPaused) {
        sw.elapsedSeconds = Math.max(0, Math.floor((Date.now() - sw.startTimestamp - (sw.pausedDuration || 0)) / 1000));
        this._saveStopwatchToStorage();
        this.notify('stopwatch');
      }
    }, 1000);

    this.state.stopwatch = {
      isRunning: true,
      isPaused: false,
      elapsedSeconds: 0,
      startTimestamp,
      startTimeFormatted,
      pausedDuration: 0,
      pauseTimestamp: null,
      sessionDate: todayStr,
      activeItemId: itemId,
      activeItemTitle: title,
      activeItemType: type,
      intervalId
    };
    this._saveStopwatchToStorage();
    this.notify('stopwatch');
  }

  pauseStopwatch() {
    const sw = this.state.stopwatch;
    if (!sw.isRunning || sw.isPaused) return;
    this.state.stopwatch = {
      ...sw,
      isPaused: true,
      pauseTimestamp: Date.now()
    };
    this._saveStopwatchToStorage();
    this.notify('stopwatch');
  }

  resumeStopwatch() {
    const sw = this.state.stopwatch;
    if (!sw.isRunning || !sw.isPaused) return;
    const now = Date.now();
    const addedPause = sw.pauseTimestamp ? (now - sw.pauseTimestamp) : 0;
    this.state.stopwatch = {
      ...sw,
      isPaused: false,
      pausedDuration: (sw.pausedDuration || 0) + addedPause,
      pauseTimestamp: null
    };
    this._saveStopwatchToStorage();
    this.notify('stopwatch');
  }

  stopStopwatch() {
    if (this.state.stopwatch.intervalId) {
      clearInterval(this.state.stopwatch.intervalId);
    }
    const sw = this.state.stopwatch;
    const endTimestamp = Date.now();
    const startTimestamp = sw.startTimestamp || (endTimestamp - (sw.elapsedSeconds * 1000));
    const pausedDuration = sw.pausedDuration || 0;

    // Accurate duration between Start and Finish
    const totalElapsedMs = Math.max(0, endTimestamp - startTimestamp - pausedDuration);
    const finalSeconds = Math.max(0, Math.floor(totalElapsedMs / 1000));
    // Exact auto-calculated duration in minutes (e.g. 4:30 to 5:30 = 60 mins)
    const durationMinutes = Math.max(1, Math.round(finalSeconds / 60));

    const startTimeFormatted = sw.startTimeFormatted || this.formatTimeOfDay(startTimestamp);
    const endTimeFormatted = this.formatTimeOfDay(endTimestamp);
    const startTimeIso = new Date(startTimestamp).toISOString();
    const endTimeIso = new Date(endTimestamp).toISOString();

    const finalItemId = sw.activeItemId;
    const finalTitle = sw.activeItemTitle;
    const finalType = sw.activeItemType;

    this.state.stopwatch = {
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      startTimestamp: null,
      startTimeFormatted: '',
      pausedDuration: 0,
      pauseTimestamp: null,
      sessionDate: null,
      activeItemId: null,
      activeItemTitle: '',
      activeItemType: 'habit',
      intervalId: null
    };
    localStorage.removeItem(Store.SW_KEY);
    this.notify('stopwatch');

    return {
      elapsedSeconds: finalSeconds,
      elapsedMinutes: durationMinutes,
      durationMinutes: durationMinutes,
      sessionMinutes: durationMinutes,
      startTime: startTimeIso,
      endTime: endTimeIso,
      startTimeFormatted,
      endTimeFormatted,
      itemId: finalItemId,
      title: finalTitle,
      type: finalType
    };
  }
}

export const store = new Store();
