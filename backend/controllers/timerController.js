import { db } from '../config/db.js';

export const getSessions = (req, res) => {
  try {
    const sessions = db.getAll('timeSessions');
    // Group monthly summary
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

    res.json({
      success: true,
      currentMonth: currentMonthKey,
      monthlySummary,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logSession = (req, res) => {
  try {
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

    // If linked to a task, update task's actual minutes
    if (taskId) {
      const task = db.getById('tasks', taskId);
      if (task) {
        db.update('tasks', taskId, {
          actualMinutes: (Number(task.actualMinutes) || 0) + duration
        });
      }
    }

    res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSession = (req, res) => {
  try {
    const success = db.delete('timeSessions', req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
