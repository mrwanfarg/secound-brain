/**
 * Second Brain API Client
 * Seamlessly talks to the Express REST API backend with resilient, full-featured
 * fallback to localStorage when running statically (e.g. GitHub Pages) or offline.
 */

function getTodayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSaturdayWeekKey() {
  const date = new Date();
  const daysSinceSaturday = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - daysSinceSaturday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDayIndex() {
  const date = new Date();
  return (date.getDay() + 1) % 7; // 0 = Saturday, 1 = Sunday, ..., 6 = Friday
}

// Initial demo seed data for new or offline workspaces
function seedDefaultData(force = false) {
  if (typeof localStorage === 'undefined') return;
  if (!force && localStorage.getItem('secondBrain_initialized')) return;

  const initialTasks = [
    {
      id: 'task-1',
      title: 'Review Q4 Strategic Roadmap & Task Schedule',
      description: 'Align upcoming product milestones and prioritize high-impact deliverables.',
      dueDate: getTodayString(0),
      dueTime: '10:00',
      timeSlot: 'morning',
      priority: 'high',
      status: 'pending',
      category: 'Deep Work',
      projectId: 'proj-1',
      estimatedMinutes: 45,
      actualMinutes: 30,
      completed: false,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'task-2',
      title: 'Complete System Architecture Documentation',
      description: 'Detail data models, API endpoints, and component interaction hierarchy.',
      dueDate: getTodayString(0),
      dueTime: '14:30',
      timeSlot: 'afternoon',
      priority: 'urgent',
      status: 'in_progress',
      category: 'Engineering',
      projectId: 'proj-1',
      estimatedMinutes: 60,
      actualMinutes: 40,
      completed: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'task-3',
      title: 'Team Sync on Sprint Deliverables',
      description: 'Quick check-in on project blockers and weekly habit progress.',
      dueDate: getTodayString(0),
      dueTime: '16:00',
      timeSlot: 'afternoon',
      priority: 'medium',
      status: 'pending',
      category: 'Meeting',
      projectId: 'proj-2',
      estimatedMinutes: 30,
      actualMinutes: 0,
      completed: false,
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    {
      id: 'task-4',
      title: 'Gym Workout & 5km Cardio Run',
      description: 'Upper body hypertrophy training followed by zone-2 cardio session.',
      dueDate: getTodayString(0),
      dueTime: '18:30',
      timeSlot: 'evening',
      priority: 'high',
      status: 'completed',
      category: 'Health',
      projectId: 'proj-3',
      estimatedMinutes: 75,
      actualMinutes: 75,
      completed: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
    }
  ];

  const initialProjects = [
    {
      id: 'proj-1',
      name: 'Second Brain Command Center',
      description: 'Next-generation personal operating system for task scheduling, habits, and knowledge capture.',
      dueDate: getTodayString(14),
      status: 'In Progress',
      progress: 65,
      color: '#9b7bff',
      createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
    },
    {
      id: 'proj-2',
      name: 'Q4 Product Roadmap Delivery',
      description: 'Shipping core features, client onboarding materials, and performance optimizations.',
      dueDate: getTodayString(30),
      status: 'In Progress',
      progress: 40,
      color: '#74d6a0',
      createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString()
    },
    {
      id: 'proj-3',
      name: 'Peak Physical Conditioning',
      description: 'Daily discipline tracker, strength routines, and nutrition scheduling.',
      dueDate: getTodayString(60),
      status: 'In Progress',
      progress: 80,
      color: '#ff9858',
      createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
    }
  ];

  const initialWeeklyGoals = [
    {
      id: 'goal-1',
      name: 'Morning Workout & Mobility',
      target: 5,
      days: [true, true, true, true, false, false, false],
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal-2',
      name: 'Deep Work Focus Sessions (2hr+)',
      target: 5,
      days: [true, true, true, false, false, false, false],
      scheduledDays: [0, 1, 2, 3, 4],
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal-3',
      name: 'Read 20 Pages Non-fiction',
      target: 6,
      days: [true, true, true, true, true, false, false],
      scheduledDays: [0, 1, 2, 3, 4, 5],
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal-4',
      name: 'Review Daily Intentions & Retrospective',
      target: 7,
      days: [true, true, true, true, false, false, false],
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    }
  ];

  const initialNotes = [
    {
      id: 'note-1',
      title: 'Scheduling Strategy: Time Blocking & Energy Cycles',
      content: 'Cluster demanding creative & technical tasks during morning peak focus (8:30am - 12:00pm). Leave meetings, administrative check-ins, and gym for afternoon/evening.',
      tags: ['productivity', 'scheduling', 'strategy'],
      pinned: true,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: 'note-2',
      title: 'Second Brain Principles: PARA Framework',
      content: 'Projects (active goals with deadlines), Areas (standards to maintain), Resources (topics of ongoing interest), Archives (inactive completed items).',
      tags: ['organization', 'second-brain'],
      pinned: true,
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
    }
  ];

  const initialTimers = [
    {
      id: 'time-1',
      activityName: 'Architecture Planning',
      taskId: 'task-1',
      durationMinutes: 30,
      startTime: new Date(Date.now() - 3600000 * 4).toISOString(),
      endTime: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      notes: 'Finalized database schema and API structure'
    }
  ];

  localStorage.setItem('secondBrain_tasks', JSON.stringify(initialTasks));
  localStorage.setItem('secondBrain_projects', JSON.stringify(initialProjects));
  localStorage.setItem('secondBrain_weekly', JSON.stringify(initialWeeklyGoals));
  localStorage.setItem('secondBrain_notes', JSON.stringify(initialNotes));
  localStorage.setItem('secondBrain_timers', JSON.stringify(initialTimers));
  localStorage.setItem('secondBrain_intention', 'Execute high-impact goals with single-tasking focus and discipline.');
  localStorage.setItem('secondBrain_initialized', 'true');
}

// Sync habit toggle with tasks collection
function syncHabitWithTodayTasks(habitName, isCompleted) {
  if (typeof localStorage === 'undefined') return;
  const todayDate = getTodayString(0);
  const tasks = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
  let task = tasks.find(t => t.title && t.title.toLowerCase() === habitName.toLowerCase() && t.dueDate === todayDate);

  if (isCompleted) {
    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
    } else {
      task = {
        id: `local-task-${Date.now()}`,
        title: habitName,
        description: `Checked from Today's Focus schedule.`,
        dueDate: todayDate,
        dueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeSlot: 'morning',
        priority: 'medium',
        category: 'Habit',
        completed: true,
        completedAt: new Date().toISOString(),
        actualMinutes: 0,
        createdAt: new Date().toISOString()
      };
      tasks.unshift(task);
    }
  } else if (task) {
    task.completed = false;
    task.completedAt = null;
  }
  localStorage.setItem('secondBrain_tasks', JSON.stringify(tasks));
}

const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
const customApi = typeof localStorage !== 'undefined' ? localStorage.getItem('secondBrain_custom_api_url') : null;

// Determine API Base: If on GitHub Pages without custom backend, don't ping /api on GitHub Pages
const API_BASE = customApi || (
  isGitHubPages
    ? ''
    : (typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? `${window.location.origin}/api`
        : 'http://localhost:3000/api')
);

class ApiClient {
  constructor() {
    this.isOnline = !isGitHubPages && Boolean(API_BASE);
    this.statusListeners = [];

    // Ensure seed data exists for standalone / GitHub Pages usage
    seedDefaultData(false);

    if (API_BASE) {
      this.checkConnection();
    } else {
      this.notifyStatus(false);
    }
  }

  onStatusChange(fn) {
    this.statusListeners.push(fn);
  }

  notifyStatus(status) {
    this.isOnline = status;
    this.statusListeners.forEach(fn => fn(this.isOnline));
  }

  async checkConnection() {
    if (!API_BASE) {
      this.notifyStatus(false);
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
      const online = res.ok;
      this.notifyStatus(online);
      return online;
    } catch {
      this.notifyStatus(false);
      return false;
    }
  }

  // Generic request with seamless fallback to localStorage
  async request(endpoint, options = {}, fallbackAction = null) {
    // If we have no remote backend or are already known to be offline, execute fallback immediately
    if (!API_BASE || (!this.isOnline && typeof fallbackAction === 'function')) {
      if (typeof fallbackAction === 'function') {
        return fallbackAction();
      }
      return { success: true };
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options,
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${res.status}`);
      }

      this.notifyStatus(true);
      return await res.json();
    } catch (err) {
      this.notifyStatus(false);
      if (typeof fallbackAction === 'function') {
        return fallbackAction();
      }
      throw err;
    }
  }

  /* ------------------- TASKS ------------------- */
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/tasks${query ? `?${query}` : ''}`;
    return this.request(url, { method: 'GET' }, () => {
      const raw = localStorage.getItem('secondBrain_tasks') || '[]';
      let tasks = JSON.parse(raw);
      if (params.dueDate) {
        tasks = tasks.filter(t => t.dueDate === params.dueDate);
      }
      return { success: true, count: tasks.length, data: tasks };
    });
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      const newTask = {
        ...taskData,
        id: `local-${Date.now()}`,
        completed: Boolean(taskData.completed),
        actualMinutes: Number(taskData.actualMinutes) || 0,
        createdAt: new Date().toISOString()
      };
      raw.unshift(newTask);
      localStorage.setItem('secondBrain_tasks', JSON.stringify(raw));
      return { success: true, data: newTask };
    });
  }

  async updateTask(id, updates) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      const idx = raw.findIndex(t => t.id === id);
      if (idx !== -1) {
        raw[idx] = { ...raw[idx], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('secondBrain_tasks', JSON.stringify(raw));
        return { success: true, data: raw[idx] };
      }
      throw new Error('Task not found');
    });
  }

  async toggleTask(id) {
    return this.request(`/tasks/${id}/toggle`, {
      method: 'PATCH'
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      const idx = raw.findIndex(t => t.id === id);
      if (idx !== -1) {
        raw[idx].completed = !raw[idx].completed;
        raw[idx].status = raw[idx].completed ? 'completed' : 'pending';
        raw[idx].completedAt = raw[idx].completed ? new Date().toISOString() : null;
        localStorage.setItem('secondBrain_tasks', JSON.stringify(raw));
        return { success: true, data: raw[idx] };
      }
      throw new Error('Task not found');
    });
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE'
    }, () => {
      let raw = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      raw = raw.filter(t => t.id !== id);
      localStorage.setItem('secondBrain_tasks', JSON.stringify(raw));
      return { success: true, message: 'Deleted locally' };
    });
  }

  async rescheduleOverdue() {
    return this.request('/tasks/reschedule-overdue', {
      method: 'POST'
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      const today = getTodayString(0);
      let count = 0;
      raw.forEach(t => {
        if (!t.completed && t.dueDate && t.dueDate < today) {
          t.dueDate = today;
          t.updatedAt = new Date().toISOString();
          count++;
        }
      });
      localStorage.setItem('secondBrain_tasks', JSON.stringify(raw));
      return { success: true, count, message: `Rescheduled ${count} overdue tasks to today.` };
    });
  }

  /* ------------------- PROJECTS ------------------- */
  async getProjects() {
    return this.request('/projects', { method: 'GET' }, () => {
      const raw = localStorage.getItem('secondBrain_projects') || '[]';
      return { success: true, data: JSON.parse(raw) };
    });
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_projects') || '[]');
      const newProj = {
        ...projectData,
        id: `local-proj-${Date.now()}`,
        progress: Number(projectData.progress) || 0,
        createdAt: new Date().toISOString()
      };
      raw.unshift(newProj);
      localStorage.setItem('secondBrain_projects', JSON.stringify(raw));
      return { success: true, data: newProj };
    });
  }

  async updateProject(id, updates) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_projects') || '[]');
      const idx = raw.findIndex(p => p.id === id);
      if (idx !== -1) {
        raw[idx] = { ...raw[idx], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('secondBrain_projects', JSON.stringify(raw));
        return { success: true, data: raw[idx] };
      }
      throw new Error('Project not found');
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    }, () => {
      let raw = JSON.parse(localStorage.getItem('secondBrain_projects') || '[]');
      raw = raw.filter(p => p.id !== id);
      localStorage.setItem('secondBrain_projects', JSON.stringify(raw));
      return { success: true, message: 'Project deleted' };
    });
  }

  /* ------------------- WEEKLY GOALS & HABITS ------------------- */
  async getWeeklyGoals() {
    return this.request('/weekly', { method: 'GET' }, () => {
      const currentWeekKey = getSaturdayWeekKey();
      let goals = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');

      // Saturday rollover check: If weekKey differs, reset checks for the fresh week
      let modified = false;
      goals.forEach(goal => {
        if (goal.weekKey !== currentWeekKey) {
          goal.days = [false, false, false, false, false, false, false];
          goal.weekKey = currentWeekKey;
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem('secondBrain_weekly', JSON.stringify(goals));
      }

      // Compute progress stats
      let totalTarget = 0;
      let totalCompleted = 0;

      const list = goals.map(goal => {
        const days = Array.isArray(goal.days) ? goal.days : [false, false, false, false, false, false, false];
        const completedDays = days.filter(Boolean).length;
        const target = Number(goal.target) || 1;
        const progress = Math.min(100, Math.round((completedDays / target) * 100));

        totalTarget += target;
        totalCompleted += Math.min(completedDays, target);

        return {
          ...goal,
          days,
          completedDays,
          progress
        };
      });

      const overallProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

      return {
        success: true,
        weekKey: currentWeekKey,
        todayIndex: getTodayDayIndex(),
        stats: {
          totalTarget,
          totalCompleted,
          overallProgress
        },
        data: list
      };
    });
  }

  async getTodayHabits() {
    return this.request('/weekly/today', { method: 'GET' }, () => {
      const todayIndex = getTodayDayIndex();
      const todayDate = getTodayString(0);
      const goals = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      const tasks = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');

      const todayHabits = goals.filter(g => {
        const sched = Array.isArray(g.scheduledDays) && g.scheduledDays.length > 0
          ? g.scheduledDays
          : [0, 1, 2, 3, 4, 5, 6];
        return sched.includes(todayIndex);
      }).map(g => {
        const days = Array.isArray(g.days) ? g.days : [false, false, false, false, false, false, false];
        const isCompletedToday = Boolean(days[todayIndex]);
        const linkedTask = tasks.find(t => t.title && t.title.toLowerCase() === g.name.toLowerCase() && t.dueDate === todayDate);

        return {
          ...g,
          todayIndex,
          isCompletedToday,
          actualMinutesToday: linkedTask ? (linkedTask.actualMinutes || 0) : 0,
          linkedTaskId: linkedTask ? linkedTask.id : null
        };
      });

      return {
        success: true,
        todayIndex,
        todayDate,
        count: todayHabits.length,
        data: todayHabits
      };
    });
  }

  async createWeeklyGoal(data) {
    return this.request('/weekly', {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      if (!data.name || !data.name.trim()) {
        throw new Error('Goal name is required');
      }
      const raw = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      const targetNum = Math.max(1, Math.min(7, parseInt(data.target, 10) || 5));
      const scheduledDays = Array.isArray(data.scheduledDays) && data.scheduledDays.length > 0
        ? data.scheduledDays
        : [0, 1, 2, 3, 4, 5, 6];

      const newGoal = {
        id: `goal-${Date.now()}`,
        name: data.name.trim(),
        target: targetNum,
        days: [false, false, false, false, false, false, false],
        scheduledDays,
        weekKey: getSaturdayWeekKey(),
        createdAt: new Date().toISOString()
      };

      raw.push(newGoal);
      localStorage.setItem('secondBrain_weekly', JSON.stringify(raw));
      return { success: true, data: newGoal };
    });
  }

  async toggleWeeklyGoalDay(id, dayIndex, status) {
    return this.request(`/weekly/${id}/toggle-day`, {
      method: 'PATCH',
      body: JSON.stringify({ dayIndex, status })
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      const goal = raw.find(g => g.id === id);
      if (!goal) throw new Error('Goal not found');

      if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
      goal.days[dayIndex] = status !== undefined ? Boolean(status) : !goal.days[dayIndex];
      localStorage.setItem('secondBrain_weekly', JSON.stringify(raw));

      // If the toggled day is TODAY, keep tasks collection in sync
      const todayIdx = getTodayDayIndex();
      if (Number(dayIndex) === todayIdx) {
        syncHabitWithTodayTasks(goal.name, goal.days[dayIndex]);
      }

      return { success: true, data: goal };
    });
  }

  async toggleHabitToday(id, status) {
    return this.request(`/weekly/${id}/toggle-today`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      const goal = raw.find(g => g.id === id);
      if (!goal) throw new Error('Habit not found');

      const todayIndex = getTodayDayIndex();
      if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
      const nextState = status !== undefined ? Boolean(status) : !goal.days[todayIndex];
      goal.days[todayIndex] = nextState;
      localStorage.setItem('secondBrain_weekly', JSON.stringify(raw));

      syncHabitWithTodayTasks(goal.name, nextState);
      return { success: true, isCompletedToday: nextState, goal, todayIndex };
    });
  }

  async completeHabitToday(id, { durationMinutes = 0, elapsedSeconds = 0, notes = '' } = {}) {
    return this.request(`/weekly/${id}/complete-today`, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes, elapsedSeconds, notes })
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      const goal = raw.find(g => g.id === id);
      if (!goal) throw new Error('Habit not found');

      const todayIndex = getTodayDayIndex();
      const todayDate = getTodayString(0);
      const actualMins = Math.max(1, Math.round(durationMinutes || (elapsedSeconds ? elapsedSeconds / 60 : 0)));

      if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
      goal.days[todayIndex] = true;
      localStorage.setItem('secondBrain_weekly', JSON.stringify(raw));

      // Create or update task in tasks collection
      const tasks = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      let task = tasks.find(t => t.title && t.title.toLowerCase() === goal.name.toLowerCase() && t.dueDate === todayDate);

      if (task) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        task.actualMinutes = (Number(task.actualMinutes) || 0) + actualMins;
      } else {
        task = {
          id: `local-task-${Date.now()}`,
          title: goal.name,
          description: `Completed from Weekly Habits schedule on ${todayDate}. Duration: ${actualMins} mins.`,
          dueDate: todayDate,
          dueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timeSlot: 'morning',
          priority: 'high',
          category: 'Habit',
          completed: true,
          completedAt: new Date().toISOString(),
          estimatedMinutes: actualMins,
          actualMinutes: actualMins,
          createdAt: new Date().toISOString()
        };
        tasks.unshift(task);
      }
      localStorage.setItem('secondBrain_tasks', JSON.stringify(tasks));

      // Log time session
      const timers = JSON.parse(localStorage.getItem('secondBrain_timers') || '[]');
      const session = {
        id: `timer-${Date.now()}`,
        activityName: goal.name,
        taskId: task.id,
        durationMinutes: actualMins,
        startTime: new Date(Date.now() - actualMins * 60000).toISOString(),
        endTime: new Date().toISOString(),
        notes: notes || `Recorded via stopwatch in Today's Focus`,
        createdAt: new Date().toISOString()
      };
      timers.unshift(session);
      localStorage.setItem('secondBrain_timers', JSON.stringify(timers));

      return {
        success: true,
        message: `Habit "${goal.name}" completed for today! Logged ${actualMins}m to Tasks.`,
        goal,
        task,
        session
      };
    });
  }

  async deleteWeeklyGoal(id) {
    return this.request(`/weekly/${id}`, {
      method: 'DELETE'
    }, () => {
      let raw = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      raw = raw.filter(g => g.id !== id);
      localStorage.setItem('secondBrain_weekly', JSON.stringify(raw));
      return { success: true, message: 'Habit deleted successfully' };
    });
  }

  /* ------------------- NOTES / QUICK CAPTURE ------------------- */
  async getNotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/notes${query ? `?${query}` : ''}`;
    return this.request(url, { method: 'GET' }, () => {
      const raw = localStorage.getItem('secondBrain_notes') || '[]';
      return { success: true, data: JSON.parse(raw) };
    });
  }

  async createNote(noteData) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(noteData)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_notes') || '[]');
      const newNote = {
        ...noteData,
        id: `local-note-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      raw.unshift(newNote);
      localStorage.setItem('secondBrain_notes', JSON.stringify(raw));
      return { success: true, data: newNote };
    });
  }

  async updateNote(id, updates) {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_notes') || '[]');
      const idx = raw.findIndex(n => n.id === id);
      if (idx !== -1) {
        raw[idx] = { ...raw[idx], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('secondBrain_notes', JSON.stringify(raw));
        return { success: true, data: raw[idx] };
      }
      throw new Error('Note not found');
    });
  }

  async deleteNote(id) {
    return this.request(`/notes/${id}`, {
      method: 'DELETE'
    }, () => {
      let raw = JSON.parse(localStorage.getItem('secondBrain_notes') || '[]');
      raw = raw.filter(n => n.id !== id);
      localStorage.setItem('secondBrain_notes', JSON.stringify(raw));
      return { success: true, message: 'Note deleted' };
    });
  }

  /* ------------------- TIME SESSIONS & TRACKER ------------------- */
  async getTimeSessions() {
    return this.request('/timers', { method: 'GET' }, () => {
      const raw = localStorage.getItem('secondBrain_timers') || '[]';
      return { success: true, data: JSON.parse(raw) };
    });
  }

  async logTimeSession(sessionData) {
    return this.request('/timers', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    }, () => {
      const raw = JSON.parse(localStorage.getItem('secondBrain_timers') || '[]');
      const newSession = {
        ...sessionData,
        id: `timer-${Date.now()}`,
        durationMinutes: Number(sessionData.durationMinutes) || 0,
        createdAt: new Date().toISOString()
      };
      raw.unshift(newSession);
      localStorage.setItem('secondBrain_timers', JSON.stringify(raw));
      return { success: true, data: newSession };
    });
  }

  async deleteTimeSession(id) {
    return this.request(`/timers/${id}`, {
      method: 'DELETE'
    }, () => {
      let raw = JSON.parse(localStorage.getItem('secondBrain_timers') || '[]');
      raw = raw.filter(s => s.id !== id);
      localStorage.setItem('secondBrain_timers', JSON.stringify(raw));
      return { success: true, message: 'Session deleted' };
    });
  }

  /* ------------------- STATS & INTENTION ------------------- */
  async getStats() {
    return this.request('/stats/overview', { method: 'GET' }, () => {
      const today = getTodayString(0);
      const tasks = JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]');
      const projects = JSON.parse(localStorage.getItem('secondBrain_projects') || '[]');
      const notes = JSON.parse(localStorage.getItem('secondBrain_notes') || '[]');
      const weekly = JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]');
      const sessions = JSON.parse(localStorage.getItem('secondBrain_timers') || '[]');

      const completedTasks = tasks.filter(t => t.completed).length;
      const totalTasks = tasks.length;
      const todayTasks = tasks.filter(t => t.dueDate === today);
      const todayPending = todayTasks.filter(t => !t.completed).length;
      const todayCompleted = todayTasks.filter(t => t.completed).length;
      const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed).length;

      const activeProjects = projects.filter(p => p.status !== 'Completed').length;
      const notesCount = notes.length;

      let totalTarget = 0;
      let totalDone = 0;
      weekly.forEach(g => {
        const days = Array.isArray(g.days) ? g.days : [];
        const c = days.filter(Boolean).length;
        const t = Number(g.target) || 1;
        totalTarget += t;
        totalDone += Math.min(c, t);
      });
      const weeklyPercent = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

      const totalFocusMinutes = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
      const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const intentions = JSON.parse(localStorage.getItem('secondBrain_intentions') || '{}');
      const intention = intentions[today] || localStorage.getItem('secondBrain_intention') || 'Focus deeply on top priorities.';

      return {
        success: true,
        data: {
          completedTasks,
          totalTasks,
          completionRate,
          todayPending,
          todayCompleted,
          overdueCount,
          activeProjects,
          totalProjects: projects.length,
          notesCount,
          weeklyPercent,
          weeklyDone: totalDone,
          weeklyTarget: totalTarget,
          totalFocusMinutes,
          totalFocusHours,
          intention,
          date: today
        }
      };
    });
  }

  async getIntention(date) {
    const targetDate = date || getTodayString(0);
    return this.request(`/stats/intention${date ? `?date=${date}` : ''}`, { method: 'GET' }, () => {
      const intentions = JSON.parse(localStorage.getItem('secondBrain_intentions') || '{}');
      const text = intentions[targetDate] || localStorage.getItem('secondBrain_intention') || '';
      return { success: true, date: targetDate, data: { text, date: targetDate } };
    });
  }

  async setIntention(text, date) {
    const targetDate = date || getTodayString(0);
    return this.request('/stats/intention', {
      method: 'POST',
      body: JSON.stringify({ text, date: targetDate })
    }, () => {
      const intentions = JSON.parse(localStorage.getItem('secondBrain_intentions') || '{}');
      intentions[targetDate] = text;
      localStorage.setItem('secondBrain_intentions', JSON.stringify(intentions));
      localStorage.setItem('secondBrain_intention', text);
      return { success: true, date: targetDate, data: { text, date: targetDate } };
    });
  }

  /* ------------------- SETTINGS & BACKUP ------------------- */
  async getSettings() {
    return this.request('/stats/settings', { method: 'GET' }, () => {
      const defaults = {
        theme: 'dark-purple',
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        soundEnabled: true
      };
      const raw = localStorage.getItem('secondBrain_settings');
      return { success: true, data: raw ? { ...defaults, ...JSON.parse(raw) } : defaults };
    });
  }

  async updateSettings(settings) {
    return this.request('/stats/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }, () => {
      const current = JSON.parse(localStorage.getItem('secondBrain_settings') || '{}');
      const updated = { ...current, ...settings };
      localStorage.setItem('secondBrain_settings', JSON.stringify(updated));
      return { success: true, data: updated };
    });
  }

  async exportBackup() {
    try {
      if (this.isOnline && API_BASE) {
        const res = await fetch(`${API_BASE}/stats/backup/export`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) return await res.json();
      }
    } catch {}

    return {
      success: true,
      exportedAt: new Date().toISOString(),
      data: {
        tasks: JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]'),
        projects: JSON.parse(localStorage.getItem('secondBrain_projects') || '[]'),
        weeklyGoals: JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]'),
        notes: JSON.parse(localStorage.getItem('secondBrain_notes') || '[]'),
        timeSessions: JSON.parse(localStorage.getItem('secondBrain_timers') || '[]'),
        settings: JSON.parse(localStorage.getItem('secondBrain_settings') || '{}')
      }
    };
  }

  async importBackup(jsonData) {
    return this.request('/stats/backup/import', {
      method: 'POST',
      body: JSON.stringify(jsonData)
    }, () => {
      const payload = jsonData.data || jsonData;
      if (Array.isArray(payload.tasks)) localStorage.setItem('secondBrain_tasks', JSON.stringify(payload.tasks));
      if (Array.isArray(payload.projects)) localStorage.setItem('secondBrain_projects', JSON.stringify(payload.projects));
      if (Array.isArray(payload.weeklyGoals || payload.weekly)) {
        localStorage.setItem('secondBrain_weekly', JSON.stringify(payload.weeklyGoals || payload.weekly));
      }
      if (Array.isArray(payload.notes)) localStorage.setItem('secondBrain_notes', JSON.stringify(payload.notes));
      if (Array.isArray(payload.timeSessions || payload.timers)) {
        localStorage.setItem('secondBrain_timers', JSON.stringify(payload.timeSessions || payload.timers));
      }
      return { success: true, message: 'Restored backup to localStorage successfully' };
    });
  }

  async resetSeed() {
    return this.request('/stats/seed/reset', {
      method: 'POST'
    }, () => {
      seedDefaultData(true);
      return { success: true, message: 'Reset local data to defaults' };
    });
  }
}

export const api = new ApiClient();
