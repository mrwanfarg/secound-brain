/**
 * ============================================================================
 * SECOND BRAIN ⚡ - ALL-IN-ONE BACKEND SERVER
 * ============================================================================
 * Combines Express server, Database Engine, Controllers, and REST Routes
 * in a single, robust, production-grade file.
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* ============================================================================
   1. UTILITY FUNCTIONS
   ============================================================================ */
function getLocalDate(offsetDays = 0) {
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

/* ============================================================================
   2. DEFAULT SEED DATA
   ============================================================================ */
function getTodayDayIndex() {
  const date = new Date();
  return (date.getDay() + 1) % 7; // 0 = Saturday, 1 = Sunday, ..., 6 = Friday
}

const DEFAULT_DATA = {
  tasks: [
    {
      id: 'task-1',
      title: 'Review Q4 Strategic Roadmap & Task Schedule',
      description: 'Align upcoming product milestones and prioritize high-impact deliverables.',
      dueDate: getLocalDate(0),
      dueTime: '10:00',
      timeSlot: 'morning',
      priority: 'high',
      status: 'pending',
      category: 'Deep Work',
      projectId: 'proj-1',
      estimatedMinutes: 45,
      actualMinutes: 30,
      completed: false,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-2',
      title: 'Complete System Architecture Documentation',
      description: 'Detail data models, API endpoints, and component interaction hierarchy.',
      dueDate: getLocalDate(0),
      dueTime: '14:30',
      timeSlot: 'afternoon',
      priority: 'urgent',
      status: 'in_progress',
      category: 'Engineering',
      projectId: 'proj-1',
      estimatedMinutes: 60,
      actualMinutes: 40,
      completed: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-3',
      title: 'Team Sync on Sprint Deliverables',
      description: 'Quick check-in on project blockers and weekly habit progress.',
      dueDate: getLocalDate(0),
      dueTime: '16:00',
      timeSlot: 'afternoon',
      priority: 'medium',
      status: 'pending',
      category: 'Meeting',
      projectId: 'proj-2',
      estimatedMinutes: 30,
      actualMinutes: 0,
      completed: false,
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-4',
      title: 'Gym Workout & 5km Cardio Run',
      description: 'Upper body hypertrophy training followed by zone-2 cardio session.',
      dueDate: getLocalDate(0),
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
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-5',
      title: 'Refactor UI State Management Store',
      description: 'Extract repeated components into reusable custom elements and optimize reactivity.',
      dueDate: getLocalDate(1),
      dueTime: '11:00',
      timeSlot: 'morning',
      priority: 'high',
      status: 'pending',
      category: 'Engineering',
      projectId: 'proj-1',
      estimatedMinutes: 90,
      actualMinutes: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-6',
      title: 'Prepare Client Presentation Deck',
      description: 'Summarize user feedback and key value propositions for enterprise pitch.',
      dueDate: getLocalDate(2),
      dueTime: '15:00',
      timeSlot: 'afternoon',
      priority: 'medium',
      status: 'pending',
      category: 'Deep Work',
      projectId: 'proj-2',
      estimatedMinutes: 60,
      actualMinutes: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Second Brain Command Center',
      description: 'Next-generation personal operating system for task scheduling, habits, and knowledge capture.',
      dueDate: getLocalDate(14),
      status: 'In Progress',
      progress: 65,
      color: '#9b7bff',
      createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'proj-2',
      name: 'Q4 Product Roadmap Delivery',
      description: 'Shipping core features, client onboarding materials, and performance optimizations.',
      dueDate: getLocalDate(30),
      status: 'In Progress',
      progress: 40,
      color: '#74d6a0',
      createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'proj-3',
      name: 'Peak Physical Conditioning',
      description: 'Daily discipline tracker, strength routines, and nutrition scheduling.',
      dueDate: getLocalDate(60),
      status: 'In Progress',
      progress: 80,
      color: '#ff9858',
      createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  weeklyGoals: [
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
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
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
  ],
  notes: [
    {
      id: 'note-1',
      title: 'Scheduling Strategy: Time Blocking & Energy Cycles',
      content: 'Cluster demanding creative & technical tasks during morning peak focus (8:30am - 12:00pm). Leave meetings, administrative check-ins, and gym for afternoon/evening.',
      tags: ['productivity', 'scheduling', 'strategy'],
      pinned: true,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'note-2',
      title: 'Second Brain Principles: PARA Framework',
      content: 'Projects (active goals with deadlines), Areas (standards to maintain), Resources (topics of ongoing interest), Archives (inactive completed items).',
      tags: ['organization', 'second-brain'],
      pinned: true,
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'note-3',
      title: 'Weekly Sprint Retrospective Ideas',
      content: 'Track velocity against estimated minutes vs actual minutes to fine-tune scheduling accuracy.',
      tags: ['reflection', 'habits'],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  timeSessions: [
    {
      id: 'time-1',
      activityName: 'Architecture Planning',
      taskId: 'task-1',
      durationMinutes: 45,
      startTime: new Date(Date.now() - 3600000 * 4).toISOString(),
      endTime: new Date(Date.now() - 3600000 * 3.25).toISOString(),
      notes: 'Finalized database schema and API structure',
      createdAt: new Date().toISOString()
    },
    {
      id: 'time-2',
      activityName: 'Deep Work Coding',
      taskId: 'task-2',
      durationMinutes: 60,
      startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      endTime: new Date(Date.now() - 3600000 * 1).toISOString(),
      notes: 'Implemented controller logic and input validation',
      createdAt: new Date().toISOString()
    }
  ],
  intentions: {
    [getLocalDate(0)]: {
      text: 'Architect and execute the ultimate task scheduling system with clean components and robust backend persistence.',
      updatedAt: new Date().toISOString()
    }
  },
  settings: {
    theme: 'dark-purple',
    dailyGoalCount: 5,
    autoBackup: true,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    workspaceName: 'Personal Command Center'
  }
};

/* ============================================================================
   3. PERSISTENT DATABASE ENGINE (ATOMIC WRITES)
   ============================================================================ */
class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        for (const key of Object.keys(DEFAULT_DATA)) {
          if (!this.data[key]) {
            this.data[key] = DEFAULT_DATA[key];
          }
        }
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.save();
      }
    } catch {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      this.save();
    }
  }

  save() {
    try {
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
      return true;
    } catch (err) {
      console.error('Failed to write database file:', err);
      return false;
    }
  }

  getAll(collection) {
    return this.data[collection] || [];
  }

  getById(collection, id) {
    const items = this.data[collection];
    if (!Array.isArray(items)) return null;
    return items.find(item => item.id === id) || null;
  }

  create(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    const newItem = {
      ...item,
      id: item.id || `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data[collection].unshift(newItem);
    this.save();
    return newItem;
  }

  update(collection, id, updates) {
    const items = this.data[collection];
    if (!Array.isArray(items)) return null;
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return items[index];
  }

  delete(collection, id) {
    const items = this.data[collection];
    if (!Array.isArray(items)) return false;
    const initialLength = items.length;
    this.data[collection] = items.filter(item => item.id !== id);
    if (this.data[collection].length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  getIntention(dateStr) {
    return this.data.intentions?.[dateStr] || { text: '', updatedAt: null };
  }

  setIntention(dateStr, text) {
    if (!this.data.intentions) {
      this.data.intentions = {};
    }
    this.data.intentions[dateStr] = {
      text,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.intentions[dateStr];
  }

  getSettings() {
    return this.data.settings || DEFAULT_DATA.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.getSettings(), ...newSettings };
    this.save();
    return this.data.settings;
  }

  resetSeed() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
    return this.data;
  }

  exportAll() {
    return JSON.parse(JSON.stringify(this.data));
  }

  importAll(incomingData) {
    if (!incomingData || typeof incomingData !== 'object') {
      throw new Error('Invalid backup payload');
    }
    this.data = { ...DEFAULT_DATA, ...incomingData };
    this.save();
    return this.data;
  }
}

const db = new Database();

/* ============================================================================
   4. EXPRESS APPLICATION SETUP
   ============================================================================ */
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    name: 'Second Brain All-in-One API',
    version: '2.1.0',
    timestamp: new Date().toISOString()
  });
});

/* ============================================================================
   5. TASKS API ROUTES & LOGIC
   ============================================================================ */
app.get('/api/tasks', (req, res) => {
  try {
    let tasks = db.getAll('tasks');
    const { filter, date, priority, projectId, search, timeSlot } = req.query;
    const today = getLocalDate(0);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      tasks = tasks.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    if (projectId) tasks = tasks.filter(t => t.projectId === projectId);
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    if (timeSlot) tasks = tasks.filter(t => t.timeSlot === timeSlot);

    if (date) {
      tasks = tasks.filter(t => t.dueDate === date);
    } else if (filter) {
      switch (filter) {
        case 'today':
          tasks = tasks.filter(t => t.dueDate === today);
          break;
        case 'pending':
          tasks = tasks.filter(t => !t.completed);
          break;
        case 'completed':
          tasks = tasks.filter(t => t.completed);
          break;
        case 'overdue':
          tasks = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed);
          break;
        case 'urgent':
          tasks = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && !t.completed);
          break;
      }
    }

    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      const weightA = priorityWeight[a.priority] || 1;
      const weightB = priorityWeight[b.priority] || 1;
      return weightB - weightA;
    });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tasks/reschedule-overdue', (req, res) => {
  try {
    const today = getLocalDate(0);
    const tasks = db.getAll('tasks');
    let count = 0;
    tasks.forEach(task => {
      if (task.dueDate && task.dueDate < today && !task.completed) {
        db.update('tasks', task.id, { dueDate: today });
        count++;
      }
    });
    res.json({
      success: true,
      message: `Rescheduled ${count} overdue task(s) to today`,
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.getById('tasks', req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, data: task });
});

app.post('/api/tasks', (req, res) => {
  try {
    const {
      title,
      description = '',
      dueDate = '',
      dueTime = '09:00',
      timeSlot = 'morning',
      priority = 'medium',
      category = 'General',
      projectId = null,
      estimatedMinutes = 30
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const newTask = db.create('tasks', {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || getLocalDate(0),
      dueTime,
      timeSlot,
      priority,
      status: 'pending',
      category,
      projectId: projectId || null,
      estimatedMinutes: Number(estimatedMinutes) || 30,
      actualMinutes: 0,
      completed: false
    });

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  const task = db.getById('tasks', req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const updates = { ...req.body };
  if (updates.completed !== undefined) {
    updates.completed = Boolean(updates.completed);
    updates.status = updates.completed ? 'completed' : 'pending';
    updates.completedAt = updates.completed ? new Date().toISOString() : null;
  }

  const updated = db.update('tasks', req.params.id, updates);
  res.json({ success: true, data: updated });
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  const task = db.getById('tasks', req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const nextCompleted = !task.completed;
  const updated = db.update('tasks', req.params.id, {
    completed: nextCompleted,
    status: nextCompleted ? 'completed' : 'pending',
    completedAt: nextCompleted ? new Date().toISOString() : null
  });

  res.json({ success: true, data: updated });
});

app.delete('/api/tasks/:id', (req, res) => {
  const success = db.delete('tasks', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, message: 'Task deleted successfully' });
});

/* ============================================================================
   6. PROJECTS API ROUTES & LOGIC
   ============================================================================ */
app.get('/api/projects', (req, res) => {
  const projects = db.getAll('projects');
  const tasks = db.getAll('tasks');

  const enhanced = projects.map(proj => {
    const linkedTasks = tasks.filter(t => t.projectId === proj.id);
    const completedTasks = linkedTasks.filter(t => t.completed).length;
    const totalTasks = linkedTasks.length;
    return {
      ...proj,
      totalTasks,
      completedTasks,
      autoProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : proj.progress
    };
  });

  res.json({ success: true, count: enhanced.length, data: enhanced });
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.getById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  const tasks = db.getAll('tasks').filter(t => t.projectId === project.id);
  res.json({ success: true, data: { ...project, tasks } });
});

app.post('/api/projects', (req, res) => {
  const { name, description = '', dueDate = '', status = 'Not Started', color = '#9b7bff' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Project name is required' });

  const newProject = db.create('projects', {
    name: name.trim(),
    description: description.trim(),
    dueDate,
    status,
    color,
    progress: status === 'Completed' ? 100 : 0
  });

  res.status(201).json({ success: true, data: newProject });
});

app.put('/api/projects/:id', (req, res) => {
  const project = db.getById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const updates = { ...req.body };
  if (updates.progress !== undefined) {
    updates.progress = Number(updates.progress);
    if (updates.progress === 100) updates.status = 'Completed';
    else if (project.status === 'Completed' && updates.progress < 100) {
      updates.status = updates.progress > 0 ? 'In Progress' : 'Not Started';
    }
  }
  if (updates.status === 'Completed') updates.progress = 100;

  const updated = db.update('projects', req.params.id, updates);
  res.json({ success: true, data: updated });
});

app.delete('/api/projects/:id', (req, res) => {
  const success = db.delete('projects', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true, message: 'Project deleted successfully' });
});

/* ============================================================================
   7. WEEKLY HABITS API ROUTES & LOGIC
   ============================================================================ */
app.get('/api/weekly', (req, res) => {
  const currentWeekKey = getSaturdayWeekKey();
  let goals = db.getAll('weeklyGoals');

  let modified = false;
  goals.forEach(goal => {
    if (goal.weekKey !== currentWeekKey) {
      goal.days = [false, false, false, false, false, false, false];
      goal.weekKey = currentWeekKey;
      modified = true;
    }
  });
  if (modified) db.save();

  let totalTarget = 0;
  let totalCompleted = 0;

  const list = goals.map(goal => {
    const days = Array.isArray(goal.days) ? goal.days : [false, false, false, false, false, false, false];
    const completedDays = days.filter(Boolean).length;
    const target = Number(goal.target) || 1;
    const progress = Math.min(100, Math.round((completedDays / target) * 100));

    totalTarget += target;
    totalCompleted += Math.min(completedDays, target);

    return { ...goal, days, completedDays, progress };
  });

  const overallProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  res.json({
    success: true,
    weekKey: currentWeekKey,
    todayIndex: getTodayDayIndex(),
    stats: { totalTarget, totalCompleted, overallProgress },
    data: list
  });
});

// GET habits specifically scheduled for TODAY
app.get('/api/weekly/today', (req, res) => {
  const todayIndex = getTodayDayIndex();
  const todayDate = getLocalDate(0);
  const goals = db.getAll('weeklyGoals');
  const tasks = db.getAll('tasks');

  const todayHabits = goals.filter(g => {
    const sched = Array.isArray(g.scheduledDays) && g.scheduledDays.length > 0
      ? g.scheduledDays
      : [0, 1, 2, 3, 4, 5, 6];
    return sched.includes(todayIndex);
  }).map(g => {
    const days = Array.isArray(g.days) ? g.days : [false, false, false, false, false, false, false];
    const isCompletedToday = Boolean(days[todayIndex]);
    const linkedTask = tasks.find(t => t.title.toLowerCase() === g.name.toLowerCase() && t.dueDate === todayDate);

    return {
      ...g,
      todayIndex,
      isCompletedToday,
      actualMinutesToday: linkedTask ? (linkedTask.actualMinutes || 0) : 0,
      linkedTaskId: linkedTask ? linkedTask.id : null
    };
  });

  res.json({
    success: true,
    todayIndex,
    todayDate,
    count: todayHabits.length,
    data: todayHabits
  });
});

app.post('/api/weekly', (req, res) => {
  const { name, target = 5, scheduledDays = [0, 1, 2, 3, 4, 5, 6] } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Goal name is required' });

  const targetNum = Math.max(1, Math.min(7, parseInt(target, 10) || 5));
  const newGoal = db.create('weeklyGoals', {
    name: name.trim(),
    target: targetNum,
    days: [false, false, false, false, false, false, false],
    scheduledDays: Array.isArray(scheduledDays) && scheduledDays.length > 0 ? scheduledDays : [0, 1, 2, 3, 4, 5, 6],
    weekKey: getSaturdayWeekKey()
  });

  res.status(201).json({ success: true, data: newGoal });
});

app.put('/api/weekly/:id', (req, res) => {
  const goal = db.getById('weeklyGoals', req.params.id);
  if (!goal) return res.status(404).json({ success: false, message: 'Habit not found' });

  const updates = { ...req.body };
  if (updates.target) updates.target = Math.max(1, Math.min(7, parseInt(updates.target, 10)));
  const updated = db.update('weeklyGoals', req.params.id, updates);
  res.json({ success: true, data: updated });
});

// Toggle today's status for a habit & keep tasks in sync
app.patch('/api/weekly/:id/toggle-today', (req, res) => {
  try {
    const goal = db.getById('weeklyGoals', req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Habit not found' });

    const todayIndex = getTodayDayIndex();
    const todayDate = getLocalDate(0);

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    const nextState = req.body.status !== undefined ? Boolean(req.body.status) : !goal.days[todayIndex];
    goal.days[todayIndex] = nextState;
    db.save();

    // Sync with tasks collection for today
    const tasks = db.getAll('tasks');
    let task = tasks.find(t => t.title.toLowerCase() === goal.name.toLowerCase() && t.dueDate === todayDate);

    if (nextState) {
      if (task) {
        db.update('tasks', task.id, { completed: true, completedAt: new Date().toISOString() });
      } else {
        task = db.create('tasks', {
          title: goal.name,
          description: `Checked from Today's Focus schedule.`,
          dueDate: todayDate,
          dueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timeSlot: 'morning',
          priority: 'medium',
          category: 'Habit',
          completed: true,
          completedAt: new Date().toISOString(),
          actualMinutes: 0
        });
      }
    } else if (task) {
      db.update('tasks', task.id, { completed: false, completedAt: null });
    }

    res.json({ success: true, isCompletedToday: nextState, goal, todayIndex });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Complete habit for today with exact recorded stopwatch duration & log to tasks
app.post('/api/weekly/:id/complete-today', (req, res) => {
  try {
    const goal = db.getById('weeklyGoals', req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Habit not found' });

    const todayIndex = getTodayDayIndex();
    const todayDate = getLocalDate(0);
    const { durationMinutes = 0, elapsedSeconds = 0, notes = '' } = req.body;
    const actualMins = Math.max(1, Math.round(durationMinutes || (elapsedSeconds ? elapsedSeconds / 60 : 0)));

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    goal.days[todayIndex] = true;
    db.save();

    // Create or update task in tasks collection
    const tasks = db.getAll('tasks');
    let task = tasks.find(t => t.title.toLowerCase() === goal.name.toLowerCase() && t.dueDate === todayDate);

    if (task) {
      db.update('tasks', task.id, {
        completed: true,
        completedAt: new Date().toISOString(),
        actualMinutes: (Number(task.actualMinutes) || 0) + actualMins
      });
      task = db.getById('tasks', task.id);
    } else {
      task = db.create('tasks', {
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
        actualMinutes: actualMins
      });
    }

    // Log time session
    const session = db.create('timeSessions', {
      activityName: goal.name,
      taskId: task.id,
      durationMinutes: actualMins,
      startTime: new Date(Date.now() - actualMins * 60000).toISOString(),
      endTime: new Date().toISOString(),
      notes: notes || `Recorded via stopwatch in Today's Focus`
    });

    res.json({
      success: true,
      message: `Habit "${goal.name}" completed for today! Logged ${actualMins}m to Tasks.`,
      goal,
      task,
      session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/weekly/:id/toggle-day', (req, res) => {
  const { id } = req.params;
  const { dayIndex, status } = req.body;

  const goal = db.getById('weeklyGoals', id);
  if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

  if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
  goal.days[dayIndex] = status !== undefined ? Boolean(status) : !goal.days[dayIndex];
  db.save();

  // If the toggled day is TODAY, also sync with tasks
  const todayIndex = getTodayDayIndex();
  if (Number(dayIndex) === todayIndex) {
    const todayDate = getLocalDate(0);
    const tasks = db.getAll('tasks');
    let task = tasks.find(t => t.title.toLowerCase() === goal.name.toLowerCase() && t.dueDate === todayDate);
    if (goal.days[dayIndex]) {
      if (task) {
        db.update('tasks', task.id, { completed: true, completedAt: new Date().toISOString() });
      } else {
        task = db.create('tasks', {
          title: goal.name,
          description: `Checked from Weekly Habits schedule.`,
          dueDate: todayDate,
          dueTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timeSlot: 'morning',
          priority: 'medium',
          category: 'Habit',
          completed: true,
          completedAt: new Date().toISOString(),
          actualMinutes: 0
        });
      }
    } else if (task) {
      db.update('tasks', task.id, { completed: false, completedAt: null });
    }
  }

  res.json({ success: true, data: goal });
});

app.delete('/api/weekly/:id', (req, res) => {
  const success = db.delete('weeklyGoals', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Goal not found' });
  res.json({ success: true, message: 'Goal deleted successfully' });
});

/* ============================================================================
   8. NOTES & QUICK CAPTURE API ROUTES
   ============================================================================ */
app.get('/api/notes', (req, res) => {
  let notes = db.getAll('notes');
  const { search, tag, pinned } = req.query;

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    notes = notes.filter(n =>
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.content && n.content.toLowerCase().includes(q)) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  if (tag) notes = notes.filter(n => n.tags && n.tags.includes(tag));
  if (pinned !== undefined) notes = notes.filter(n => Boolean(n.pinned) === (pinned === 'true'));

  notes.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({ success: true, count: notes.length, data: notes });
});

app.post('/api/notes', (req, res) => {
  const { title = '', content, tags = [], pinned = false } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Note content is required' });

  const cleanTitle = title.trim() || content.trim().slice(0, 40) + '...';
  const tagArray = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const newNote = db.create('notes', {
    title: cleanTitle,
    content: content.trim(),
    tags: tagArray,
    pinned: Boolean(pinned)
  });

  res.status(201).json({ success: true, data: newNote });
});

app.put('/api/notes/:id', (req, res) => {
  const note = db.getById('notes', req.params.id);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

  const updates = { ...req.body };
  if (updates.tags && typeof updates.tags === 'string') {
    updates.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const updated = db.update('notes', req.params.id, updates);
  res.json({ success: true, data: updated });
});

app.delete('/api/notes/:id', (req, res) => {
  const success = db.delete('notes', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, message: 'Note deleted successfully' });
});

/* ============================================================================
   9. TIMERS & FOCUS SESSIONS API ROUTES
   ============================================================================ */
app.get('/api/timers', (req, res) => {
  const sessions = db.getAll('timeSessions');
  const monthlyMap = {};
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  sessions.forEach(session => {
    const date = new Date(session.createdAt || session.startTime);
    const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (mKey === currentMonthKey) {
      const act = session.activityName || 'General';
      monthlyMap[act] = (monthlyMap[act] || 0) + (Number(session.durationMinutes) || 0);
    }
  });

  const monthlySummary = Object.entries(monthlyMap).map(([activity, totalMinutes]) => ({
    activity,
    totalMinutes,
    totalHours: (totalMinutes / 60).toFixed(1)
  }));

  res.json({ success: true, currentMonth: currentMonthKey, monthlySummary, data: sessions });
});

app.post('/api/timers', (req, res) => {
  const { activityName, taskId, durationMinutes, notes = '' } = req.body;
  if (!activityName || !durationMinutes) {
    return res.status(400).json({ success: false, message: 'Activity name and duration are required' });
  }

  const duration = Math.max(1, parseInt(durationMinutes, 10));
  const newSession = db.create('timeSessions', {
    activityName: activityName.trim(),
    taskId: taskId || null,
    durationMinutes: duration,
    notes: notes.trim(),
    startTime: new Date(Date.now() - duration * 60000).toISOString(),
    endTime: new Date().toISOString()
  });

  if (taskId) {
    const task = db.getById('tasks', taskId);
    if (task) {
      db.update('tasks', taskId, {
        actualMinutes: (Number(task.actualMinutes) || 0) + duration
      });
    }
  }

  res.status(201).json({ success: true, data: newSession });
});

app.delete('/api/timers/:id', (req, res) => {
  const success = db.delete('timeSessions', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, message: 'Session deleted successfully' });
});

/* ============================================================================
   10. STATS, INTENTIONS, BACKUP & SETTINGS
   ============================================================================ */
app.get('/api/stats/overview', (req, res) => {
  const today = getLocalDate(0);
  const tasks = db.getAll('tasks');
  const projects = db.getAll('projects');
  const notes = db.getAll('notes');
  const weekly = db.getAll('weeklyGoals');
  const sessions = db.getAll('timeSessions');

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const todayTasks = tasks.filter(t => t.dueDate === today);
  const todayPending = todayTasks.filter(t => !t.completed).length;
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed).length;

  let totalTarget = 0, totalDone = 0;
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
  const intention = db.getIntention(today);

  res.json({
    success: true,
    data: {
      completedTasks,
      totalTasks,
      completionRate,
      todayPending,
      todayCompleted,
      overdueCount,
      activeProjects: projects.filter(p => p.status !== 'Completed').length,
      totalProjects: projects.length,
      notesCount: notes.length,
      weeklyPercent,
      weeklyDone: totalDone,
      weeklyTarget: totalTarget,
      totalFocusMinutes,
      totalFocusHours,
      intention: intention.text,
      date: today
    }
  });
});

app.get('/api/stats/intention', (req, res) => {
  const date = req.query.date || getLocalDate(0);
  res.json({ success: true, date, data: db.getIntention(date) });
});

app.post('/api/stats/intention', (req, res) => {
  const { text, date } = req.body;
  const targetDate = date || getLocalDate(0);
  const intention = db.setIntention(targetDate, text || '');
  res.json({ success: true, date: targetDate, data: intention });
});

app.get('/api/stats/settings', (req, res) => {
  res.json({ success: true, data: db.getSettings() });
});

app.put('/api/stats/settings', (req, res) => {
  res.json({ success: true, data: db.updateSettings(req.body) });
});

app.get('/api/stats/backup/export', (req, res) => {
  const backup = db.exportAll();
  res.setHeader('Content-Disposition', `attachment; filename=second-brain-backup-${Date.now()}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.json(backup);
});

app.post('/api/stats/backup/import', (req, res) => {
  try {
    const imported = db.importAll(req.body);
    res.json({ success: true, message: 'Data successfully restored from backup', data: imported });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/stats/seed/reset', (req, res) => {
  res.json({ success: true, message: 'Database reset to default template', data: db.resetSeed() });
});

/* ============================================================================
   11. STATIC FRONTEND HOSTING & SPA FALLBACK
   ============================================================================ */
app.use(express.static(FRONTEND_DIR));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

/* ============================================================================
   12. SERVER STARTUP
   ============================================================================ */
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ Second Brain All-in-One Server Running`);
  console.log(`------------------------------------------------------`);
  console.log(`Local Access:      http://localhost:${PORT}`);
  console.log(`API Health Check:  http://localhost:${PORT}/api/health`);
  console.log(`API Base URL:      http://localhost:${PORT}/api/tasks`);
  console.log(`Frontend Assets:   ${FRONTEND_DIR}`);
  console.log(`Database File:     ${DB_FILE}`);
  console.log(`======================================================\n`);
});

export default app;
