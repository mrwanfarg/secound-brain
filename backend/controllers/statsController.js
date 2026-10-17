import { db } from '../config/db.js';

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getDashboardStats = (req, res) => {
  try {
    const today = getLocalDate();
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

    const activeProjects = projects.filter(p => p.status !== 'Completed').length;
    const notesCount = notes.length;

    // Weekly habit metrics
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

    // Total focus hours
    const totalFocusMinutes = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
    const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

    // Productivity rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Today's intention
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
        activeProjects,
        totalProjects: projects.length,
        notesCount,
        weeklyPercent,
        weeklyDone: totalDone,
        weeklyTarget: totalTarget,
        totalFocusMinutes,
        totalFocusHours,
        intention: intention.text,
        date: today
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getIntention = (req, res) => {
  try {
    const date = req.query.date || getLocalDate();
    const intention = db.getIntention(date);
    res.json({ success: true, date, data: intention });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setIntention = (req, res) => {
  try {
    const { text, date } = req.body;
    const targetDate = date || getLocalDate();
    const intention = db.setIntention(targetDate, text || '');
    res.json({ success: true, date: targetDate, data: intention });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSettings = (req, res) => {
  try {
    res.json({ success: true, data: db.getSettings() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportBackup = (req, res) => {
  try {
    const backup = db.exportAll();
    res.setHeader('Content-Disposition', `attachment; filename=second-brain-backup-${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const importBackup = (req, res) => {
  try {
    const imported = db.importAll(req.body);
    res.json({ success: true, message: 'Data successfully restored from backup', data: imported });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetSeed = (req, res) => {
  try {
    const freshData = db.resetSeed();
    res.json({ success: true, message: 'Database reset to default template', data: freshData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
