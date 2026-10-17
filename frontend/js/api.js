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

// Ensure clean, fresh workspace for user accounts - no pre-made habits or tasks
function seedUserStarterData(userId, force = false) {
  if (typeof localStorage === 'undefined') return;
  const initKey = `secondBrain_${userId}_initialized`;
  if (!force && localStorage.getItem(initKey)) return;

  // New users start completely clean with 0 habits, 0 tasks - they build their own schedule
  if (!localStorage.getItem(`secondBrain_${userId}_tasks`) || force) {
    localStorage.setItem(`secondBrain_${userId}_tasks`, '[]');
  }
  if (!localStorage.getItem(`secondBrain_${userId}_weekly`) || force) {
    localStorage.setItem(`secondBrain_${userId}_weekly`, '[]');
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

// Helper to sync habit completion with user's today tasks
function syncHabitWithUserTasks(habitName, isCompleted) {
  if (typeof localStorage === 'undefined') return;
  const key = getUserKey('tasks');
  const todayDate = getTodayString(0);
  const tasks = JSON.parse(localStorage.getItem(key) || '[]');
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
        }).eq('id', id).catch(() => {});
      }

      return { success: true, data: raw[idx] };
    }
    throw new Error('Task not found');
  }

  async deleteTask(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('tasks').delete().eq('id', id).catch(() => {});
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
        }).eq('id', id).catch(() => {});
      }

      return { success: true, data: raw[idx] };
    }
    throw new Error('Project not found');
  }

  async deleteProject(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('projects').delete().eq('id', id).catch(() => {});
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

    if (supabase && user?.isCloud) {
      try {
        const { data, error } = await supabase.from('weekly_goals').select('*').order('created_at', { ascending: true });
        if (!error && Array.isArray(data)) {
          goals = data.map(g => ({
            id: g.id,
            name: g.name,
            target: g.target,
            days: Array.isArray(g.days) ? g.days : [false, false, false, false, false, false, false],
            scheduledDays: Array.isArray(g.scheduled_days) ? g.scheduled_days : [0, 1, 2, 3, 4, 5, 6],
            weekKey: g.week_key,
            createdAt: g.created_at
          }));
        }
      } catch (e) {}
    }

    if (goals.length === 0) {
      goals = JSON.parse(localStorage.getItem(key) || '[]');
    }

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
      localStorage.setItem(key, JSON.stringify(goals));
      if (supabase && user?.isCloud) {
        goals.forEach(g => {
          supabase.from('weekly_goals').update({ days: g.days, week_key: currentWeekKey }).eq('id', g.id).catch(() => {});
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
    return { success: true, data: newGoal };
  }

  async toggleWeeklyGoalDay(id, dayIndex, status) {
    const key = getUserKey('weekly');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const goal = raw.find(g => g.id === id);
    if (!goal) throw new Error('Goal not found');

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    goal.days[dayIndex] = status !== undefined ? Boolean(status) : !goal.days[dayIndex];
    localStorage.setItem(key, JSON.stringify(raw));

    const todayIdx = getTodayDayIndex();
    if (Number(dayIndex) === todayIdx) {
      syncHabitWithUserTasks(goal.name, goal.days[dayIndex]);
    }

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('weekly_goals').update({ days: goal.days }).eq('id', id).catch(() => {});
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

    syncHabitWithUserTasks(goal.name, nextState);

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('weekly_goals').update({ days: goal.days }).eq('id', id).catch(() => {});
    }

    return { success: true, isCompletedToday: nextState, goal, todayIndex };
  }

  async completeHabitToday(id, { durationMinutes = 0, elapsedSeconds = 0, notes = '' } = {}) {
    const key = getUserKey('weekly');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const goal = raw.find(g => g.id === id);
    if (!goal) throw new Error('Habit not found');

    const todayIndex = getTodayDayIndex();
    const todayDate = getTodayString(0);
    const actualMins = Math.max(1, Math.round(durationMinutes || (elapsedSeconds ? elapsedSeconds / 60 : 0)));

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    goal.days[todayIndex] = true;
    localStorage.setItem(key, JSON.stringify(raw));

    // Create or update task in tasks collection
    const tasksKey = getUserKey('tasks');
    const tasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
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
    localStorage.setItem(tasksKey, JSON.stringify(tasks));

    // Log time session
    const timersKey = getUserKey('timers');
    const timers = JSON.parse(localStorage.getItem(timersKey) || '[]');
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
    localStorage.setItem(timersKey, JSON.stringify(timers));

    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('weekly_goals').update({ days: goal.days }).eq('id', id).catch(() => {});
      supabase.from('time_sessions').insert({
        id: session.id,
        user_id: user.id,
        activity_name: goal.name,
        task_id: task.id,
        duration_minutes: actualMins,
        notes: session.notes
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Habit "${goal.name}" completed for today! Logged ${actualMins}m to Tasks.`,
      goal,
      task,
      session
    };
  }

  async deleteWeeklyGoal(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('weekly_goals').delete().eq('id', id).catch(() => {});
    }

    const key = getUserKey('weekly');
    let raw = JSON.parse(localStorage.getItem(key) || '[]');
    raw = raw.filter(g => g.id !== id);
    localStorage.setItem(key, JSON.stringify(raw));
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
      }).catch(() => {});
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
        supabase.from('notes').update(updates).eq('id', id).catch(() => {});
      }

      return { success: true, data: raw[idx] };
    }
    throw new Error('Note not found');
  }

  async deleteNote(id) {
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('notes').delete().eq('id', id).catch(() => {});
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
              durationMinutes: s.duration_minutes,
              notes: s.notes,
              createdAt: s.created_at
            }))
          };
        }
      } catch (e) {}
    }

    const key = getUserKey('timers');
    const raw = localStorage.getItem(key) || '[]';
    return { success: true, data: JSON.parse(raw) };
  }

  async logTimeSession(sessionData) {
    const id = `timer-${Date.now()}`;
    const supabase = getSupabase();
    const user = auth.getCurrentUser();
    if (supabase && user?.isCloud) {
      supabase.from('time_sessions').insert({
        id,
        user_id: user.id,
        activity_name: sessionData.activityName,
        task_id: sessionData.taskId || null,
        duration_minutes: Number(sessionData.durationMinutes) || 0,
        notes: sessionData.notes || ''
      }).catch(() => {});
    }

    const key = getUserKey('timers');
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    const newSession = {
      ...sessionData,
      id,
      durationMinutes: Number(sessionData.durationMinutes) || 0,
      createdAt: new Date().toISOString()
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
      }).catch(() => {});
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
