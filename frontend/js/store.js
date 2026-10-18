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

  /** Get total seconds already logged today for an item (habit or task) */
  getTodayLoggedSeconds(itemId, title) {
    const today = new Date().toISOString().split('T')[0];
    const titleLower = (title || '').toLowerCase().trim();

    // Check matching tasks for today
    const tasks = this.state.tasks || [];
    const matchingTask = tasks.find(t => 
      (t.id === itemId || (t.title && t.title.toLowerCase().trim() === titleLower)) &&
      t.dueDate === today
    );
    let mins = matchingTask ? (Number(matchingTask.actualMinutes) || 0) : 0;

    // Check time sessions for today
    const sessions = this.state.timeSessions || [];
    const todaySessions = sessions.filter(s => {
      const sName = (s.activityName || s.activity_name || '').toLowerCase().trim();
      const sDate = (s.startTime || s.created_at || s.createdAt || '').slice(0, 10);
      return sName === titleLower && sDate === today;
    });
    const sessionMins = todaySessions.reduce((acc, s) => acc + (Number(s.durationMinutes || s.duration_minutes) || 0), 0);

    mins = Math.max(mins, sessionMins);
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
      elapsedSeconds: sw.elapsedSeconds,
      elapsedAtStart: sw._elapsedAtStart ?? 0,
      startTimestamp: sw._startTimestamp ?? null,
      initialLoggedSeconds: sw._initialLoggedSeconds ?? 0,
      sessionDate: sw._sessionDate || todayStr,
      activeItemId: sw.activeItemId,
      activeItemTitle: sw.activeItemTitle,
      activeItemType: sw.activeItemType
    }));
  }

  /** Called once on app init – restores a running/paused stopwatch */
  _restoreStopwatchFromStorage() {
    try {
      const raw = localStorage.getItem(Store.SW_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved.isRunning) return;

      const todayStr = new Date().toISOString().split('T')[0];
      // If stored session was from a previous day, clean it up
      if (saved.sessionDate && saved.sessionDate !== todayStr) {
        localStorage.removeItem(Store.SW_KEY);
        return;
      }

      // Recalculate total elapsed (adds time that passed while page was closed)
      let elapsedSeconds = saved.elapsedAtStart || saved.elapsedSeconds || 0;
      if (!saved.isPaused && saved.startTimestamp) {
        elapsedSeconds += Math.floor((Date.now() - saved.startTimestamp) / 1000);
      }

      // Re-create the tick interval
      const intervalId = setInterval(() => {
        if (this.state.stopwatch.isRunning && !this.state.stopwatch.isPaused) {
          this.state.stopwatch.elapsedSeconds++;
          this._saveStopwatchToStorage();
          this.notify('stopwatch');
        }
      }, 1000);

      this.state.stopwatch = {
        isRunning: true,
        isPaused: saved.isPaused || false,
        elapsedSeconds,
        _initialLoggedSeconds: saved.initialLoggedSeconds || 0,
        _elapsedAtStart: saved.isPaused ? elapsedSeconds : (saved.elapsedAtStart || 0),
        _startTimestamp: saved.isPaused ? null : saved.startTimestamp,
        _sessionDate: saved.sessionDate || todayStr,
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
    // If starting on the same item on the same day, start from already-logged seconds!
    const alreadyLoggedSeconds = this.getTodayLoggedSeconds(itemId, title);
    const startTimestamp = Date.now();

    const intervalId = setInterval(() => {
      if (this.state.stopwatch.isRunning && !this.state.stopwatch.isPaused) {
        this.state.stopwatch.elapsedSeconds++;
        this._saveStopwatchToStorage();
        this.notify('stopwatch');
      }
    }, 1000);

    this.state.stopwatch = {
      isRunning: true,
      isPaused: false,
      elapsedSeconds: alreadyLoggedSeconds,
      _initialLoggedSeconds: alreadyLoggedSeconds,
      _elapsedAtStart: alreadyLoggedSeconds,
      _startTimestamp: startTimestamp,
      _sessionDate: todayStr,
      activeItemId: itemId,
      activeItemTitle: title,
      activeItemType: type,
      intervalId
    };
    this._saveStopwatchToStorage();
    this.notify('stopwatch');
  }

  pauseStopwatch() {
    if (!this.state.stopwatch.isRunning || this.state.stopwatch.isPaused) return;
    this.state.stopwatch = {
      ...this.state.stopwatch,
      isPaused: true,
      // Freeze elapsed count so we can resume from here
      _elapsedAtStart: this.state.stopwatch.elapsedSeconds,
      _startTimestamp: null
    };
    this._saveStopwatchToStorage();
    this.notify('stopwatch');
  }

  resumeStopwatch() {
    if (!this.state.stopwatch.isRunning || !this.state.stopwatch.isPaused) return;
    const startTimestamp = Date.now();
    this.state.stopwatch = {
      ...this.state.stopwatch,
      isPaused: false,
      _startTimestamp: startTimestamp,
      _elapsedAtStart: this.state.stopwatch.elapsedSeconds
    };
    this._saveStopwatchToStorage();
    this.notify('stopwatch');
  }

  stopStopwatch() {
    if (this.state.stopwatch.intervalId) {
      clearInterval(this.state.stopwatch.intervalId);
    }
    const finalSeconds = this.state.stopwatch.elapsedSeconds;
    const initialSeconds = this.state.stopwatch._initialLoggedSeconds || 0;
    const finalItemId = this.state.stopwatch.activeItemId;
    const finalTitle = this.state.stopwatch.activeItemTitle;
    const finalType = this.state.stopwatch.activeItemType;

    this.state.stopwatch = {
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      _initialLoggedSeconds: 0,
      _elapsedAtStart: 0,
      _startTimestamp: null,
      _sessionDate: null,
      activeItemId: null,
      activeItemTitle: '',
      activeItemType: 'habit',
      intervalId: null
    };
    localStorage.removeItem(Store.SW_KEY);
    this.notify('stopwatch');

    const totalMinutes = Math.max(1, Math.round(finalSeconds / 60));
    const addedMinutes = Math.max(1, Math.round((finalSeconds - initialSeconds) / 60));

    return {
      elapsedSeconds: finalSeconds,
      elapsedMinutes: totalMinutes,
      sessionMinutes: addedMinutes,
      initialMinutes: Math.round(initialSeconds / 60),
      itemId: finalItemId,
      title: finalTitle,
      type: finalType
    };
  }
}

export const store = new Store();
