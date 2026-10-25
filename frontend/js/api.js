/**
 * Second Brain API Client
 * Seamlessly talks to:
 * 1. Supabase Cloud Database (Multi-user, cross-device real-time sync with PostgreSQL & RLS)
 * 2. Express REST API backend (when deployed on Render / Railway / Localhost)
 * 3. Resilient Local Storage (complete user-isolated workspace per account / email)
 */
import { auth } from './auth.js';
import { getSupabase } from './supabaseClient.js';
import { config } from './config.js';

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

// User-scoped LocalStorage Key generator to isolate data per account
function getUserKey(entity) {
  const userId = auth.getUserId();
  return `secondBrain_${userId}_${entity}`;
}

function getBackendUrl() {
  if (config.customApiUrl) return config.customApiUrl;
  if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

async function safeFetch(url, options = {}, timeoutMs = 2000) {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timeoutId = null;
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    const res = await fetch(url, {
      ...options,
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);
    return res;
  } catch (_) {
    return null;
  }
}

export const STARTER_WEEKLY_GOALS = [
  {
    id: 'goal-1',
    name: 'Morning Workout & Mobility',
    target: 5,
    days: [false, false, false, false, false, false, false],
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    createdAt: '2026-10-16T15:20:39.517Z'
  },
  {
    id: 'goal-2',
    name: 'Deep Work Focus Sessions (2hr+)',
    target: 5,
    days: [false, false, false, false, false, false, false],
    scheduledDays: [0, 1, 2, 3, 4],
    createdAt: '2026-10-16T15:20:39.517Z'
  },
  {
    id: 'goal-3',
    name: 'Read 20 Pages Non-fiction',
    target: 6,
    days: [false, false, false, false, false, false, false],
    scheduledDays: [0, 1, 2, 3, 4, 5],
    createdAt: '2026-10-16T15:20:39.517Z'
  },
  {
    id: 'goal-4',
    name: 'Review Daily Intentions & Retrospective',
    target: 7,
    days: [false, false, false, false, false, false, false],
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    createdAt: '2026-10-16T15:20:39.517Z'
  }
];

function archivePastWeekGoal(goal) {

  if (typeof localStorage === 'undefined' || !goal || !goal.weekKey) return;
  try {
    const historyKey = getUserKey('weekly_history');
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const days = Array.isArray(goal.days) ? goal.days : [];
    const completedDays = days.filter(Boolean).length;
    const exists = history.some(h => h.goalId === goal.id && h.weekKey === goal.weekKey);
    if (!exists) {
      history.push({
        goalId: goal.id,
        goalName: goal.name,
        target: goal.target,
        days: [...days],
        completedDays,
        weekKey: goal.weekKey,
        archivedAt: new Date().toISOString()
      });
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  } catch (_) {}
}

// Ensure clean, fresh workspace for user accounts while preserving any existing schedule
function seedUserStarterData(userId, force = false) {
  if (typeof localStorage === 'undefined') return;
  const initKey = `secondBrain_${userId}_initialized`;
  if (!force && localStorage.getItem(initKey)) return;

  if (!localStorage.getItem(`secondBrain_${userId}_tasks`) || force) {
    localStorage.setItem(`secondBrain_${userId}_tasks`, '[]');
  }
  if (!localStorage.getItem(`secondBrain_${userId}_weekly`) || force) {
    const existing = localStorage.getItem('secondBrain_weekly_backup') || 
                     localStorage.getItem('secondBrain_weekly') || 
                     localStorage.getItem('secondBrain_guest_weekly');
    if (existing && existing !== '[]') {
      localStorage.setItem(`secondBrain_${userId}_weekly`, existing);
    } else {
      localStorage.setItem(`secondBrain_${userId}_weekly`, '[]');
    }
  }
  if (!localStorage.getItem(`secondBrain_${userId}_notes`) || force) {
    localStorage.setItem(`secondBrain_${userId}_notes`, '[]');
  }
  if (!localStorage.getItem(`secondBrain_${userId}_timers`) || force) {
    localStorage.setItem(`secondBrain_${userId}_timers`, '[]');
  }
  if (!localStorage.getItem(`secondBrain_${userId}_intention`) || force) {
    localStorage.setItem(`secondBrain_${userId}_intention`, '');
  }
  localStorage.setItem(initKey, 'true');
}


function getDateForWeekDayIndex(dayIndex) {
  const d = new Date();
  const todayIdx = (d.getDay() + 1) % 7; // 0 = Sat ... 6 = Fri
  d.setDate(d.getDate() - (todayIdx - Number(dayIndex)));
  return d.toISOString().split('T')[0];
}

// Helper to sync habit completion with user's tasks
function syncHabitWithUserTasks(habitName, isCompleted, targetDate) {
  if (typeof localStorage === 'undefined') return;
  const key = getUserKey('tasks');
  const dDate = targetDate || getTodayString(0);
  const tasks = JSON.parse(localStorage.getItem(key) || '[]');
  let task = tasks.find(t => t.title && t.title.toLowerCase() === habitName.toLowerCase() && t.dueDate === dDate);

  if (isCompleted) {
    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
    } else {
      task = {
        id: `local-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: habitName,
        description: `Checked from Habits schedule on ${dDate}.`,
        dueDate: dDate,
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
  localStorage.setItem(key, JSON.stringify(tasks));
}

class ApiClient {
  constructor() {
    this.statusListeners = [];
    this.isOnline = true;

    // Check user auth and seed starter workspace if needed
    auth.onAuthChange(user => {
      const userId = user ? user.id : 'guest';
      seedUserStarterData(userId, false);
    });

    seedUserStarterData(auth.getUserId(), false);
  }

  onStatusChange(fn) {
    this.statusListeners.push(fn);
  }

  notifyStatus(status) {
    this.isOnline = status;
    this.statusListeners.forEach(fn => fn(this.isOnline));
  }

  async checkConnection() {
    if (config.isSupabaseConfigured) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { error } = await supabase.from('tasks').select('id').limit(1);
          const ok = !error || error.code === 'PGRST116' || !error.message.includes('FetchError');
          this.notifyStatus(ok);
          return ok;
        } catch {
          this.notifyStatus(false);
          return false;
        }
      }
    }

    if (config.customApiUrl) {
      try {
        const res = await fetch(`${config.customApiUrl}/health`, { signal: AbortSignal.timeout(2000) });
        const ok = res.ok;
        this.notifyStatus(ok);
        return ok;
      } catch {
        this.notifyStatus(false);
        return false;
      }
    }

    // Default standalone mode
    this.notifyStatus(false);
    return false;
  }

  /* ------------------- TASKS ------------------- */
  async getTasks(params = {}) {
    // 1. Supabase Cloud Sync
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (params.dueDate) query = query.eq('due_date', params.dueDate);
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const list = data.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            dueDate: t.due_date,
            dueTime: t.due_time,
            timeSlot: t.time_slot,
            priority: t.priority,
            status: t.status,
            category: t.category,
            projectId: t.project_id,
            estimatedMinutes: t.estimated_minutes,
            actualMinutes: t.actual_minutes,
            completed: Boolean(t.completed),
            completedAt: t.completed_at,
            createdAt: t.created_at
          }));
          return { success: true, count: list.length, data: list };
        }
      } catch (err) {
        console.warn('Supabase getTasks fallback to local:', err);
      }
    }

    // 2. User-isolated LocalStorage
    const key = getUserKey('tasks');
    const raw = localStorage.getItem(key) || '[]';
    let tasks = JSON.parse(raw);
    if (params.dueDate) {
      tasks = tasks.filter(t => t.dueDate === params.dueDate);
    }
    return { success: true, count: tasks.length, data: tasks };
  }

  async createTask(taskData) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (supabase && user?.isCloud) {
      try {
        const { data, error } = await supabase.from('tasks').insert({
          id: taskId,
          user_id: user.id,
          title: taskData.title,
          description: taskData.description || '',
          due_date: taskData.dueDate,
          due_time: taskData.dueTime || '10:00',
          time_slot: taskData.timeSlot || 'morning',
          priority: taskData.priority || 'medium',
          status: taskData.status || 'pending',
          category: taskData.category || 'General',
          project_id: taskData.projectId || null,
          estimated_minutes: Number(taskData.estimatedMinutes) || 30,
          actual_minutes: Number(taskData.actualMinutes) || 0,
          completed: Boolean(taskData.completed)
        }).select().single();

        if (!error && data) {
          return {
            success: true,
            data: {
              ...taskData,
              id: data.id,
              createdAt: data.created_at
            }
          };
        }
      } catch (err) {
        console.warn('Supabase createTask error:', err);
      }
    }

    const key = getUserKey('tasks');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const newTask = {
      ...taskData,
      id: taskId,
      completed: Boolean(taskData.completed),
      actualMinutes: Number(taskData.actualMinutes) || 0,
      createdAt: new Date().toISOString()
    };
    raw.unshift(newTask);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, data: newTask };
  }

  async updateTask(id, updates) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        const payload = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
        if (updates.dueTime !== undefined) payload.due_time = updates.dueTime;
        if (updates.timeSlot !== undefined) payload.time_slot = updates.timeSlot;
        if (updates.priority !== undefined) payload.priority = updates.priority;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.projectId !== undefined) payload.project_id = updates.projectId;
        if (updates.actualMinutes !== undefined) payload.actual_minutes = updates.actualMinutes;
        if (updates.completed !== undefined) payload.completed = updates.completed;
        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
        if (!error && data) {
          return { success: true, data: { ...updates, id } };
        }
      } catch (err) {
        console.warn('Supabase updateTask error:', err);
      }
    }

    const key = getUserKey('tasks');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = raw.findIndex(t => t.id === id);
    if (idx !== -1) {
      raw[idx] = { ...raw[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(raw));
      return { success: true, data: raw[idx] };
    }
    throw new Error('Task not found');
  }

  async toggleTask(id) {
    const key = getUserKey('tasks');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = raw.findIndex(t => t.id === id);
    if (idx !== -1) {
      const nextCompleted = !raw[idx].completed;
      raw[idx].completed = nextCompleted;
      raw[idx].status = nextCompleted ? 'completed' : 'pending';
      raw[idx].completedAt = nextCompleted ? new Date().toISOString() : null;
      localStorage.setItem(key, JSON.stringify(raw));

      const supabase = getSupabase();
      const user = auth.getCurrentUser();
      if (supabase && user?.isCloud) {
        supabase.from('tasks').update({
          completed: nextCompleted,
          status: raw[idx].status,
          completed_at: raw[idx].completedAt
        }).eq('id', id).then(() => {}, () => {});
      }

      return { success: true, data: raw[idx] };
    }
    throw new Error('Task not found');
  }

  async deleteTask(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('tasks').delete().eq('id', id).then(() => {}, () => {});
    }

    const key = getUserKey('tasks');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw = raw.filter(t => t.id !== id);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, message: 'Deleted successfully' };
  }

  async rescheduleOverdue() {
    const key = getUserKey('tasks');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const today = getTodayString(0);
    let count = 0;
    raw.forEach(t => {
      if (!t.completed && t.dueDate && t.dueDate < today) {
        t.dueDate = today;
        t.updatedAt = new Date().toISOString();
        count++;
      }
    });
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, count, message: `Rescheduled ${count} overdue tasks to today.` };
  }

  /* ------------------- PROJECTS ------------------- */
  async getProjects() {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return {
            success: true,
            data: data.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description || '',
              dueDate: p.due_date,
              status: p.status,
              progress: p.progress,
              color: p.color,
              createdAt: p.created_at
            }))
          };
        }
      } catch (e) {}
    }

    const key = getUserKey('projects');
    const raw = localStorage.getItem(key) || '[]';
    return { success: true, data: JSON.parse(raw) };
  }

  async createProject(projectData) {
    const id = `proj-${Date.now()}`;
    const supabase = getSupabase();
    const user = auth.getCurrentUser();

    if (supabase && user?.isCloud) {
      try {
        await supabase.from('projects').insert({
          id,
          user_id: user.id,
          name: projectData.name,
          description: projectData.description || '',
          due_date: projectData.dueDate,
          status: projectData.status || 'In Progress',
          progress: Number(projectData.progress) || 0,
          color: projectData.color || '#9b7bff'
        });
      } catch (e) {}
    }

    const key = getUserKey('projects');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const newProj = {
      ...projectData,
      id,
      progress: Number(projectData.progress) || 0,
      createdAt: new Date().toISOString()
    };
    raw.unshift(newProj);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, data: newProj };
  }

  async updateProject(id, updates) {
    const key = getUserKey('projects');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = raw.findIndex(p => p.id === id);
    if (idx !== -1) {
      raw[idx] = { ...raw[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(raw));

      const supabase = getSupabase();
      const user = auth.getCurrentUser();
      if (supabase && user?.isCloud) {
        supabase.from('projects').update({
          name: updates.name,
          description: updates.description,
          progress: updates.progress,
          status: updates.status,
          color: updates.color
        }).eq('id', id).then(() => {}, () => {});
      }

      return { success: true, data: raw[idx] };
    }
    throw new Error('Project not found');
  }

  async deleteProject(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('projects').delete().eq('id', id).then(() => {}, () => {});
    }

    const key = getUserKey('projects');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw = raw.filter(p => p.id !== id);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, message: 'Project deleted' };
  }

  /* ------------------- WEEKLY GOALS & HABITS ------------------- */
  async getWeeklyGoals() {
    const currentWeekKey = getSaturdayWeekKey();
    const key = getUserKey('weekly');

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    let goals = [];

    // 1. Try Supabase Cloud if user is authenticated via cloud
    if (supabase && user?.isCloud) {
      try {
        const { data, error } = await supabase.from('weekly_goals').select('*').order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          goals = data.map(g => ({
            id: g.id,
            name: g.name,
            target: g.target,
            days: Array.isArray(g.days) ? g.days : [false, false, false, false, false, false, false],
            scheduledDays: Array.isArray(g.scheduled_days) ? g.scheduled_days : [0, 1, 2, 3, 4, 5, 6],
            weekKey: g.week_key,
            createdAt: g.created_at
          }));
          // Merge any local-only habits (e.g. cloud insert failed) so nothing disappears
          try {
            const localGoals = JSON.parse(localStorage.getItem(key) || '[]');
            const cloudIds = new Set(goals.map(g => g.id));
            localGoals.forEach(lg => {
              if (lg && lg.id && !cloudIds.has(lg.id)) goals.push(lg);
            });
          } catch (_) {}
          localStorage.setItem(key, JSON.stringify(goals));
          localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(goals));
        }
      } catch (e) {}
    }

    // 2. Load from current user's local key
    if (goals.length === 0) {
      goals = JSON.parse(localStorage.getItem(key) || '[]');
    }

    // 3. Resilient recovery: if empty, search all candidate backup keys so schedule is never lost
    if (goals.length === 0 && typeof localStorage !== 'undefined') {
      const candidateKeys = [
        'secondBrain_weekly_backup',
        'secondBrain_weekly',
        'secondBrain_guest_weekly'
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('weekly') && !candidateKeys.includes(k) && k !== key) {
          candidateKeys.push(k);
        }
      }
      for (const k of candidateKeys) {
        try {
          const raw = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(raw) && raw.length > 0) {
            goals = raw;
            localStorage.setItem(key, JSON.stringify(goals));
            localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(goals));
            break;
          }
        } catch (_) {}
      }
    }

    // 4. If still empty, try Express REST API backend if running
    if (goals.length === 0) {
      try {
        const backendUrl = getBackendUrl();
        const res = await safeFetch(`${backendUrl}/api/weekly`, {}, 1500);
        if (res && res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            goals = json.data;
            localStorage.setItem(key, JSON.stringify(goals));
            localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(goals));
          }
        }
      } catch (_) {}
    }

    // 5. Resilient Starter Fallback: If still empty, initialize with STARTER_WEEKLY_GOALS so schedule is never lost
    if (goals.length === 0) {
      goals = JSON.parse(JSON.stringify(STARTER_WEEKLY_GOALS));
      goals.forEach(g => {
        g.weekKey = currentWeekKey;
        g.days = [false, false, false, false, false, false, false];
      });
      localStorage.setItem(key, JSON.stringify(goals));
      localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(goals));
    }

    // 6. Automatic Week Rollover Check (Runs every Saturday):
    // Preserves all habits in schedule, archives past week progress, and renews days to unchecked
    let modified = false;
    goals.forEach(goal => {
      if (goal.weekKey !== currentWeekKey) {
        archivePastWeekGoal(goal);
        goal.days = [false, false, false, false, false, false, false];
        goal.weekKey = currentWeekKey;
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(key, JSON.stringify(goals));
      localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(goals));
      if (supabase && user?.isCloud) {
        goals.forEach(g => {
          supabase.from('weekly_goals').update({ days: g.days, week_key: currentWeekKey }).eq('id', g.id).then(() => {}, () => {});
        });
      }
    }

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
  }

  async getTodayHabits() {
    const todayIndex = getTodayDayIndex();
    const todayDate = getTodayString(0);
    const goalsRes = await this.getWeeklyGoals();
    const goals = goalsRes.data || [];
    const tasksRes = await this.getTasks();
    const tasks = tasksRes.data || [];

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
  }

  async createWeeklyGoal(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Goal name is required');
    }

    const id = `goal-${Date.now()}`;
    const targetNum = Math.max(1, Math.min(7, parseInt(data.target, 10) || 5));
    const scheduledDays = Array.isArray(data.scheduledDays) && data.scheduledDays.length > 0
      ? data.scheduledDays
      : [0, 1, 2, 3, 4, 5, 6];
    const weekKey = getSaturdayWeekKey();

    const newGoal = {
      id,
      name: data.name.trim(),
      target: targetNum,
      days: [false, false, false, false, false, false, false],
      scheduledDays,
      weekKey,
      createdAt: new Date().toISOString()
    };

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        await supabase.from('weekly_goals').insert({
          id,
          user_id: user.id,
          name: newGoal.name,
          target: targetNum,
          days: newGoal.days,
          scheduled_days: scheduledDays,
          week_key: weekKey
        });
      } catch (e) {}
    }

    const key = getUserKey('weekly');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw.push(newGoal);
    localStorage.setItem(key, JSON.stringify(raw));
    localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(raw));

    try {
      const backendUrl = getBackendUrl();
      safeFetch(`${backendUrl}/api/weekly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal)
      }, 1500);
    } catch (_) {}

    return { success: true, data: newGoal };
  }

  async updateWeeklyGoal(id, updates) {
    const key = getUserKey('weekly');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    let idx = raw.findIndex(g => g.id === id);

    if (idx === -1) {
      const backup = JSON.parse(localStorage.getItem('secondBrain_weekly_backup') || '[]');
      const backupGoal = backup.find(g => g.id === id);
      if (backupGoal) {
        raw.push(backupGoal);
        idx = raw.length - 1;
      }
    }

    if (idx === -1) {
      throw new Error('Habit not found');
    }

    if (updates.name && typeof updates.name === 'string') {
      raw[idx].name = updates.name.trim();
    }
    if (updates.target !== undefined) {
      raw[idx].target = Math.max(1, Math.min(7, parseInt(updates.target, 10) || 5));
    }
    if (Array.isArray(updates.scheduledDays)) {
      raw[idx].scheduledDays = updates.scheduledDays.filter(d => d >= 0 && d <= 6);
    }
    if (Array.isArray(updates.days)) {
      raw[idx].days = updates.days.slice(0, 7).map(Boolean);
    }
    raw[idx].updatedAt = new Date().toISOString();

    localStorage.setItem(key, JSON.stringify(raw));
    localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(raw));

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        await supabase.from('weekly_goals').update({
          name: raw[idx].name,
          target: raw[idx].target,
          scheduled_days: raw[idx].scheduledDays,
          days: raw[idx].days
        }).eq('id', id);
      } catch (e) {}
    }

    try {
      const backendUrl = getBackendUrl();
      safeFetch(`${backendUrl}/api/weekly/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(raw[idx])
      }, 1500);
    } catch (_) {}

    return { success: true, data: raw[idx] };
  }

  async renewWeeklySchedule() {
    const currentWeekKey = getSaturdayWeekKey();
    const key = getUserKey('weekly');
    let goals = JSON.parse(localStorage.getItem(key) || '[]');
    if (goals.length === 0) {
      const res = await this.getWeeklyGoals();
      goals = res.data || [];
    }

    goals.forEach(goal => {
      archivePastWeekGoal(goal);
      goal.days = [false, false, false, false, false, false, false];
      goal.weekKey = currentWeekKey;
    });

    localStorage.setItem(key, JSON.stringify(goals));
    localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(goals));

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      goals.forEach(g => {
        supabase.from('weekly_goals').update({ days: g.days, week_key: currentWeekKey }).eq('id', g.id).then(() => {}, () => {});
      });
    }

    try {
      const backendUrl = getBackendUrl();
      safeFetch(`${backendUrl}/api/weekly/reset-week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, 1500);
    } catch (_) {}

    return { success: true, data: goals, weekKey: currentWeekKey };
  }

  /**
   * Dedicated One-Click Restore of the full habit schedule
   * Pulls from backend /api/weekly or STARTER_WEEKLY_GOALS and resets week checkpoints
   */
  async restoreStarterSchedule() {
    const currentWeekKey = getSaturdayWeekKey();
    const key = getUserKey('weekly');
    let baseGoals = [];

    // Try fetching existing schedule from backend first
    try {
      const backendUrl = getBackendUrl();
      const res = await safeFetch(`${backendUrl}/api/weekly`, {}, 1500);
      if (res && res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          baseGoals = json.data;
        }
      }
    } catch (_) {}

    // If still empty, use curated STARTER_WEEKLY_GOALS
    if (baseGoals.length === 0) {
      baseGoals = JSON.parse(JSON.stringify(STARTER_WEEKLY_GOALS));
    }

    const restoredGoals = baseGoals.map((g, idx) => ({
      id: `goal-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      name: g.name,
      target: Number(g.target) || 5,
      days: [false, false, false, false, false, false, false],
      scheduledDays: Array.isArray(g.scheduledDays) && g.scheduledDays.length > 0
        ? g.scheduledDays
        : [0, 1, 2, 3, 4, 5, 6],
      weekKey: currentWeekKey,
      createdAt: g.createdAt || new Date().toISOString()
    }));

    localStorage.setItem(key, JSON.stringify(restoredGoals));
    localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(restoredGoals));

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      for (const g of restoredGoals) {
        supabase.from('weekly_goals').upsert({
          id: g.id,
          user_id: user.id,
          name: g.name,
          target: g.target,
          days: g.days,
          scheduled_days: g.scheduledDays,
          week_key: currentWeekKey
        }).then(() => {}, () => {});
      }
    }

    return { success: true, data: restoredGoals };
  }

  async toggleWeeklyGoalDay(id, dayIndex, status) {
    const key = getUserKey('weekly');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const goal = raw.find(g => g.id === id);
    if (!goal) throw new Error('Goal not found');

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    goal.days[dayIndex] = status !== undefined ? Boolean(status) : !goal.days[dayIndex];
    localStorage.setItem(key, JSON.stringify(raw));

    const targetDate = getDateForWeekDayIndex(Number(dayIndex));
    syncHabitWithUserTasks(goal.name, goal.days[dayIndex], targetDate);

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('weekly_goals').update({ days: goal.days }).eq('id', id).then(() => {}, () => {});
    }

    return { success: true, data: goal };
  }

  async toggleHabitToday(id, status) {
    const key = getUserKey('weekly');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const goal = raw.find(g => g.id === id);
    if (!goal) throw new Error('Habit not found');

    const todayIndex = getTodayDayIndex();
    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    const nextState = status !== undefined ? Boolean(status) : !goal.days[todayIndex];
    goal.days[todayIndex] = nextState;
    localStorage.setItem(key, JSON.stringify(raw));

    // Sync task locally
    syncHabitWithUserTasks(goal.name, nextState);

    // Cloud sync – fire-and-forget, never throw
    try {
      const supabase = getSupabase();
      const user = auth.getCurrentUser();
      if (supabase && user?.isCloud) {
        await supabase.from('weekly_goals')
          .update({ days: goal.days })
          .eq('id', id);
      }
    } catch (_) { /* ignore cloud errors */ }

    return { success: true, isCompletedToday: nextState, goal, todayIndex };
  }

  async completeHabitToday(id, options = {}) {
    const { durationMinutes = 0, elapsedSeconds = 0, notes = '', totalMinutes = 0, sessionMinutes = 0, title = '' } = options || {};
    const key = getUserKey('weekly');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    let goal = raw.find(g => g.id === id || g.id?.toString() === id?.toString());

    // Fallback: check store state or lookup by title
    if (!goal && typeof store !== 'undefined' && store.state?.weeklyGoals) {
      const fromStore = store.state.weeklyGoals.find(g => 
        g.id === id || g.id?.toString() === id?.toString() || 
        (g.name && title && g.name.toLowerCase().trim() === title.toLowerCase().trim())
      );
      if (fromStore) {
        goal = { ...fromStore };
        raw.push(goal);
      }
    }
    if (!goal && title) {
      goal = raw.find(g => g.name && g.name.toLowerCase().trim() === title.toLowerCase().trim());
    }

    const todayIndex = getTodayDayIndex();
    const todayDate = getTodayString(0);
    const calculatedMins = Math.max(1, Math.ceil(durationMinutes || (elapsedSeconds ? elapsedSeconds / 60 : 0)));
    const finalTotalMins = Math.max(1, totalMinutes || calculatedMins);
    const addedSessionMins = Math.max(1, sessionMinutes || calculatedMins);
    const habitName = goal ? goal.name : (title || 'Focus Session');
    const nowIso = options.endTime || new Date().toISOString();
    const startTime = options.startTime || new Date(Date.now() - addedSessionMins * 60000).toISOString();
    const endTime = options.endTime || nowIso;

    // ── 1. Mark habit day as done in weekly matrix ───────────────
    if (goal) {
      if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
      goal.days[todayIndex] = true;
      localStorage.setItem(key, JSON.stringify(raw));
    }

    // ── 2. Create or update matching task in LocalStorage ────────
    const tasksKey = getUserKey('tasks');
    const tasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
    let task = tasks.find(t => t.title && t.title.toLowerCase().trim() === habitName.toLowerCase().trim() && t.dueDate === todayDate);

    if (task) {
      task.completed = true;
      task.status = 'completed';
      task.completedAt = nowIso;
      task.actualMinutes = Math.max(Number(task.actualMinutes) || 0, finalTotalMins);
    } else {
      task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: habitName,
        description: `Completed from Weekly Habits schedule on ${todayDate}. Duration: ${finalTotalMins} mins.`,
        dueDate: todayDate,
        dueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeSlot: 'morning',
        priority: 'high',
        category: 'Habit',
        status: 'completed',
        completed: true,
        completedAt: nowIso,
        estimatedMinutes: finalTotalMins,
        actualMinutes: finalTotalMins,
        createdAt: nowIso
      };
      tasks.unshift(task);
    }
    localStorage.setItem(tasksKey, JSON.stringify(tasks));

    // ── 3. Log time session in LocalStorage ───────────────────────
    const timersKey = getUserKey('timers');
    const timers = JSON.parse(localStorage.getItem(timersKey) || '[]');
    const sessionId = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const session = {
      id: sessionId,
      activityName: habitName,
      taskId: task.id,
      durationMinutes: addedSessionMins,
      startTime: startTime,
      endTime: nowIso,
      notes: notes || `Recorded via stopwatch on ${todayDate}`,
      createdAt: nowIso
    };
    timers.unshift(session);
    localStorage.setItem(timersKey, JSON.stringify(timers));

    // ── 4. Cloud Sync with Supabase (fully awaited) ──────────────
    try {
      const supabase = getSupabase();
      const user = auth.getCurrentUser();
      if (supabase && user?.isCloud) {
        // A) Update weekly habit if exists
        if (goal && goal.id) {
          await supabase.from('weekly_goals')
            .update({ days: goal.days })
            .eq('id', goal.id);
        }

        // B) Update or insert matching task in Supabase
        const { data: existingTasks } = await supabase.from('tasks')
          .select('id, actual_minutes')
          .ilike('title', habitName)
          .eq('due_date', todayDate);

        if (existingTasks && existingTasks.length > 0) {
          const existing = existingTasks[0];
          const newActual = Math.max(Number(existing.actual_minutes) || 0, finalTotalMins);
          await supabase.from('tasks').update({
            completed: true,
            status: 'completed',
            completed_at: nowIso,
            actual_minutes: newActual
          }).eq('id', existing.id);
          task.id = existing.id;
          task.actualMinutes = newActual;
        } else {
          await supabase.from('tasks').insert({
            id: task.id,
            user_id: user.id,
            title: habitName,
            description: `Completed from Weekly Habits schedule on ${todayDate}. Duration: ${finalTotalMins} mins.`,
            due_date: todayDate,
            due_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            time_slot: 'morning',
            priority: 'high',
            category: 'Habit',
            status: 'completed',
            completed: true,
            completed_at: nowIso,
            estimated_minutes: finalTotalMins,
            actual_minutes: finalTotalMins
          });
        }

        // C) Insert time session in Supabase (with id, start_time, end_time)
        await supabase.from('time_sessions').insert({
          id: sessionId,
          user_id: user.id,
          activity_name: habitName,
          task_id: task.id,
          duration_minutes: addedSessionMins,
          start_time: startTime,
          end_time: nowIso,
          notes: session.notes
        });
      }
    } catch (cloudErr) {
      console.warn('Supabase completeHabitToday sync warning:', cloudErr);
    }

    return {
      success: true,
      message: `Habit "${habitName}" completed! Logged ${finalTotalMins}m.`,
      goal,
      task,
      session
    };
  }

  async deleteWeeklyGoal(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('weekly_goals').delete().eq('id', id).then(() => {}, () => {});
    }

    const key = getUserKey('weekly');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw = raw.filter(g => g.id !== id);
    localStorage.setItem(key, JSON.stringify(raw));
    localStorage.setItem('secondBrain_weekly_backup', JSON.stringify(raw));

    try {
      const backendUrl = getBackendUrl();
      safeFetch(`${backendUrl}/api/weekly/${id}`, {
        method: 'DELETE'
      }, 1500);
    } catch (_) {}

    return { success: true, message: 'Habit deleted successfully' };
  }

  /* ------------------- NOTES / QUICK CAPTURE ------------------- */
  async getNotes(params = {}) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        const { data, error } = await supabase.from('notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return {
            success: true,
            data: data.map(n => ({
              id: n.id,
              title: n.title,
              content: n.content || '',
              tags: Array.isArray(n.tags) ? n.tags : [],
              pinned: Boolean(n.pinned),
              createdAt: n.created_at
            }))
          };
        }
      } catch (e) {}
    }

    const key = getUserKey('notes');
    const raw = localStorage.getItem(key) || '[]';
    return { success: true, data: JSON.parse(raw) };
  }

  async createNote(noteData) {
    const id = `note-${Date.now()}`;
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('notes').insert({
        id,
        user_id: user.id,
        title: noteData.title,
        content: noteData.content || '',
        tags: noteData.tags || [],
        pinned: Boolean(noteData.pinned)
      }).then(() => {}, () => {});
    }

    const key = getUserKey('notes');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const newNote = {
      ...noteData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    raw.unshift(newNote);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, data: newNote };
  }

  async updateNote(id, updates) {
    const key = getUserKey('notes');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = raw.findIndex(n => n.id === id);
    if (idx !== -1) {
      raw[idx] = { ...raw[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(raw));

      const supabase = getSupabase();
      const user = auth.getCurrentUser();
      if (supabase && user?.isCloud) {
        supabase.from('notes').update(updates).eq('id', id).then(() => {}, () => {});
      }

      return { success: true, data: raw[idx] };
    }
    throw new Error('Note not found');
  }

  async deleteNote(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('notes').delete().eq('id', id).then(() => {}, () => {});
    }

    const key = getUserKey('notes');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw = raw.filter(n => n.id !== id);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, message: 'Note deleted' };
  }

  /* ------------------- TIME SESSIONS & TRACKER ------------------- */
  async getTimeSessions() {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        const { data, error } = await supabase.from('time_sessions').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return {
            success: true,
            data: data.map(s => ({
              id: s.id,
              activityName: s.activity_name,
              taskId: s.task_id,
              durationMinutes: Number(s.duration_minutes) || 0,
              startTime: s.start_time || s.created_at,
              endTime: s.end_time || s.created_at,
              notes: s.notes || '',
              createdAt: s.created_at
            }))
          };
        }
      } catch (e) {
        console.warn('Supabase getTimeSessions fallback to local:', e);
      }
    }

    const key = getUserKey('timers');
    const raw = localStorage.getItem(key) || '[]';
    return { success: true, data: JSON.parse(raw) };
  }

  async logTimeSession(sessionData) {
    const id = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const durationMinutes = Math.max(1, Number(sessionData.durationMinutes) || 0);
    const startTime = sessionData.startTime || new Date(Date.now() - durationMinutes * 60000).toISOString();
    const endTime = sessionData.endTime || nowIso;

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      try {
        await supabase.from('time_sessions').insert({
          id,
          user_id: user.id,
          activity_name: sessionData.activityName,
          task_id: sessionData.taskId || null,
          duration_minutes: durationMinutes,
          start_time: startTime,
          end_time: endTime,
          notes: sessionData.notes || ''
        });
      } catch (err) {
        console.warn('Supabase logTimeSession insert error:', err);
      }
    }

    const key = getUserKey('timers');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const newSession = {
      ...sessionData,
      id,
      durationMinutes,
      startTime,
      endTime,
      createdAt: nowIso
    };
    raw.unshift(newSession);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, data: newSession };
  }

  async deleteTimeSession(id) {
    const key = getUserKey('timers');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw = raw.filter(s => s.id !== id);
    localStorage.setItem(key, JSON.stringify(raw));
    return { success: true, message: 'Session deleted' };
  }

  /* ------------------- STATS & INTENTION ------------------- */
  async getStats() {
    const today = getTodayString(0);
    const tasksRes = await this.getTasks();
    const tasks = tasksRes.data || [];
    const projectsRes = await this.getProjects();
    const projects = projectsRes.data || [];
    const notesRes = await this.getNotes();
    const notes = notesRes.data || [];
    const weeklyRes = await this.getWeeklyGoals();
    const weekly = weeklyRes.data || [];
    const timersRes = await this.getTimeSessions();
    const sessions = timersRes.data || [];

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

    const key = getUserKey('intentions');
    const intentions = JSON.parse(localStorage.getItem(key) || '{}');
    const intention = intentions[today] || localStorage.getItem(getUserKey('intention')) || 'Focus deeply on top priorities.';

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
  }

  async getIntention(date) {
    const targetDate = date || getTodayString(0);
    const key = getUserKey('intentions');
    const intentions = JSON.parse(localStorage.getItem(key) || '{}');
    const text = intentions[targetDate] || localStorage.getItem(getUserKey('intention')) || '';
    return { success: true, date: targetDate, data: { text, date: targetDate } };
  }

  async setIntention(text, date) {
    const targetDate = date || getTodayString(0);
    const key = getUserKey('intentions');
    const intentions = JSON.parse(localStorage.getItem(key) || '{}');
    intentions[targetDate] = text;
    localStorage.setItem(key, JSON.stringify(intentions));
    localStorage.setItem(getUserKey('intention'), text);

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('user_intentions').upsert({
        id: `${user.id}_${targetDate}`,
        user_id: user.id,
        date: targetDate,
        text
      }).then(() => {}, () => {});
    }

    return { success: true, date: targetDate, data: { text, date: targetDate } };
  }

  /* ------------------- SETTINGS & BACKUP ------------------- */
  async getSettings() {
    const defaults = {
      theme: 'dark-purple',
      pomodoroMinutes: 25,
      shortBreakMinutes: 5,
      soundEnabled: true
    };
    const key = getUserKey('settings');
    const raw = localStorage.getItem(key);
    return { success: true, data: raw ? { ...defaults, ...JSON.parse(raw) } : defaults };
  }

  async updateSettings(settings) {
    const key = getUserKey('settings');
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    const updated = { ...current, ...settings };
    localStorage.setItem(key, JSON.stringify(updated));
    return { success: true, data: updated };
  }

  async exportBackup() {
    const user = auth.getCurrentUser();
    return {
      success: true,
      user: user ? { email: user.email, name: user.name } : 'guest',
      exportedAt: new Date().toISOString(),
      data: {
        tasks: JSON.parse(localStorage.getItem(getUserKey('tasks')) || '[]'),
        projects: JSON.parse(localStorage.getItem(getUserKey('projects')) || '[]'),
        weeklyGoals: JSON.parse(localStorage.getItem(getUserKey('weekly')) || '[]'),
        notes: JSON.parse(localStorage.getItem(getUserKey('notes')) || '[]'),
        timeSessions: JSON.parse(localStorage.getItem(getUserKey('timers')) || '[]'),
        settings: JSON.parse(localStorage.getItem(getUserKey('settings')) || '{}')
      }
    };
  }

  async importBackup(jsonData) {
    const payload = jsonData.data || jsonData;
    if (Array.isArray(payload.tasks)) localStorage.setItem(getUserKey('tasks'), JSON.stringify(payload.tasks));
    if (Array.isArray(payload.projects)) localStorage.setItem(getUserKey('projects'), JSON.stringify(payload.projects));
    if (Array.isArray(payload.weeklyGoals || payload.weekly)) {
      localStorage.setItem(getUserKey('weekly'), JSON.stringify(payload.weeklyGoals || payload.weekly));
    }
    if (Array.isArray(payload.notes)) localStorage.setItem(getUserKey('notes'), JSON.stringify(payload.notes));
    if (Array.isArray(payload.timeSessions || payload.timers)) {
      localStorage.setItem(getUserKey('timers'), JSON.stringify(payload.timeSessions || payload.timers));
    }
    return { success: true, message: 'Restored backup to your account successfully' };
  }

  async resetSeed() {
    seedUserStarterData(auth.getUserId(), true);
    return { success: true, message: 'Reset workspace data to defaults' };
  }
}

export const api = new ApiClient();
