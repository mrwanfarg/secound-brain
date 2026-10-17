import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

const DEFAULT_DATA = {
  tasks: [
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
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date().toISOString()
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
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date().toISOString()
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
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date().toISOString()
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
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-5',
      title: 'Refactor UI State Management Store',
      description: 'Extract repeated components into reusable custom elements and optimize reactivity.',
      dueDate: getTodayString(1),
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
      dueDate: getTodayString(2),
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
      dueDate: getTodayString(14),
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
      dueDate: getTodayString(30),
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
      dueDate: getTodayString(60),
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
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal-2',
      name: 'Deep Work Focus Sessions (2hr+)',
      target: 5,
      days: [true, true, true, false, false, false, false],
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal-3',
      name: 'Read 20 Pages Non-fiction',
      target: 6,
      days: [true, true, true, true, true, false, false],
      weekKey: getSaturdayWeekKey(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'goal-4',
      name: 'Review Daily Intentions & Retrospective',
      target: 7,
      days: [true, true, true, true, false, false, false],
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
    [getTodayString(0)]: {
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
        // Ensure all collections exist
        for (const key of Object.keys(DEFAULT_DATA)) {
          if (!this.data[key]) {
            this.data[key] = DEFAULT_DATA[key];
          }
        }
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.save();
      }
    } catch (err) {
      console.error('Error loading database file, initializing with defaults:', err);
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
    this.data.settings = {
      ...this.getSettings(),
      ...newSettings
    };
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
    this.data = {
      ...DEFAULT_DATA,
      ...incomingData
    };
    this.save();
    return this.data;
  }
}

export const db = new Database();
