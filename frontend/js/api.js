/**
 * Second Brain API Client
 * Seamlessly talks to the Express REST API backend with graceful fallback to localStorage
 */

const API_BASE = window.location.origin.startsWith('http')
  ? `${window.location.origin}/api`
  : 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.isOnline = true;
    this.statusListeners = [];
    this.checkConnection();
  }

  onStatusChange(fn) {
    this.statusListeners.push(fn);
  }

  notifyStatus(status) {
    this.isOnline = status;
    this.statusListeners.forEach(fn => fn(this.isOnline));
  }

  async checkConnection() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      const online = res.ok;
      this.notifyStatus(online);
      return online;
    } catch {
      this.notifyStatus(false);
      return false;
    }
  }

  // Generic request with fallback handler
  async request(endpoint, options = {}, fallbackAction = null) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options,
        signal: AbortSignal.timeout(6000)
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
      // Local fallback
      const raw = localStorage.getItem('secondBrain_tasks') || '[]';
      return { success: true, data: JSON.parse(raw) };
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
        completed: false,
        actualMinutes: 0,
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
        progress: 0,
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
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    });
  }

  /* ------------------- WEEKLY GOALS & HABITS ------------------- */
  async getWeeklyGoals() {
    return this.request('/weekly', { method: 'GET' }, () => {
      const raw = localStorage.getItem('secondBrain_weekly') || '[]';
      return { success: true, data: JSON.parse(raw), stats: { overallProgress: 0 } };
    });
  }

  async getTodayHabits() {
    return this.request('/weekly/today', { method: 'GET' });
  }

  async createWeeklyGoal(data) {
    return this.request('/weekly', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async toggleWeeklyGoalDay(id, dayIndex) {
    return this.request(`/weekly/${id}/toggle-day`, {
      method: 'PATCH',
      body: JSON.stringify({ dayIndex })
    });
  }

  async toggleHabitToday(id, status) {
    return this.request(`/weekly/${id}/toggle-today`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async completeHabitToday(id, { durationMinutes = 0, elapsedSeconds = 0, notes = '' } = {}) {
    return this.request(`/weekly/${id}/complete-today`, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes, elapsedSeconds, notes })
    });
  }

  async deleteWeeklyGoal(id) {
    return this.request(`/weekly/${id}`, {
      method: 'DELETE'
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
        createdAt: new Date().toISOString()
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
    });
  }

  async deleteNote(id) {
    return this.request(`/notes/${id}`, {
      method: 'DELETE'
    });
  }

  /* ------------------- TIME SESSIONS & TRACKER ------------------- */
  async getTimeSessions() {
    return this.request('/timers', { method: 'GET' });
  }

  async logTimeSession(sessionData) {
    return this.request('/timers', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }

  async deleteTimeSession(id) {
    return this.request(`/timers/${id}`, {
      method: 'DELETE'
    });
  }

  /* ------------------- STATS & INTENTION ------------------- */
  async getStats() {
    return this.request('/stats/overview', { method: 'GET' });
  }

  async getIntention(date) {
    return this.request(`/stats/intention${date ? `?date=${date}` : ''}`, { method: 'GET' });
  }

  async setIntention(text, date) {
    return this.request('/stats/intention', {
      method: 'POST',
      body: JSON.stringify({ text, date })
    });
  }

  /* ------------------- SETTINGS & BACKUP ------------------- */
  async getSettings() {
    return this.request('/stats/settings', { method: 'GET' });
  }

  async updateSettings(settings) {
    return this.request('/stats/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  async exportBackup() {
    const res = await fetch(`${API_BASE}/stats/backup/export`);
    if (!res.ok) throw new Error('Backup export failed');
    return await res.json();
  }

  async importBackup(jsonData) {
    return this.request('/stats/backup/import', {
      method: 'POST',
      body: JSON.stringify(jsonData)
    });
  }

  async resetSeed() {
    return this.request('/stats/seed/reset', {
      method: 'POST'
    });
  }
}

export const api = new ApiClient();
