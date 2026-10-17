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
  // STOPWATCH CONTROLS (Live tracker for habits & tasks)
  startStopwatch(itemId, title, type = 'habit') {
    // If another is running, clear interval
    if (this.state.stopwatch.intervalId) {
      clearInterval(this.state.stopwatch.intervalId);
    }

    const intervalId = setInterval(() => {
      if (this.state.stopwatch.isRunning && !this.state.stopwatch.isPaused) {
        this.state.stopwatch.elapsedSeconds++;
        this.notify('stopwatch');
      }
    }, 1000);

    this.setState({
      stopwatch: {
        isRunning: true,
        isPaused: false,
        elapsedSeconds: 0,
        activeItemId: itemId,
        activeItemTitle: title,
        activeItemType: type,
        intervalId
      }
    });
  }

  pauseStopwatch() {
    if (!this.state.stopwatch.isRunning) return;
    this.setState({
      stopwatch: {
        ...this.state.stopwatch,
        isPaused: true
      }
    });
  }

  resumeStopwatch() {
    if (!this.state.stopwatch.isRunning) return;
    this.setState({
      stopwatch: {
        ...this.state.stopwatch,
        isPaused: false
      }
    });
  }

  stopStopwatch() {
    if (this.state.stopwatch.intervalId) {
      clearInterval(this.state.stopwatch.intervalId);
    }
    const finalSeconds = this.state.stopwatch.elapsedSeconds;
    const finalItemId = this.state.stopwatch.activeItemId;
    const finalTitle = this.state.stopwatch.activeItemTitle;
    const finalType = this.state.stopwatch.activeItemType;

    this.setState({
      stopwatch: {
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
        activeItemId: null,
        activeItemTitle: '',
        activeItemType: 'habit',
        intervalId: null
      }
    });

    return {
      elapsedSeconds: finalSeconds,
      elapsedMinutes: Math.max(1, Math.round(finalSeconds / 60)),
      itemId: finalItemId,
      title: finalTitle,
      type: finalType
    };
  }
}

export const store = new Store();
