import { db } from '../config/db.js';

function getSaturdayWeekKey() {
  const date = new Date();
  const daysSinceSaturday = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - daysSinceSaturday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getWeeklyGoals = (req, res) => {
  try {
    const currentWeekKey = getSaturdayWeekKey();
    let goals = db.getAll('weeklyGoals');

    // Week rollover check: If recorded weekKey differs, reset checks for the fresh week
    let modified = false;
    goals.forEach(goal => {
      if (goal.weekKey !== currentWeekKey) {
        goal.days = [false, false, false, false, false, false, false];
        goal.weekKey = currentWeekKey;
        modified = true;
      }
    });

    if (modified) {
      db.save();
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

    res.json({
      success: true,
      weekKey: currentWeekKey,
      stats: {
        totalTarget,
        totalCompleted,
        overallProgress
      },
      data: list
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createWeeklyGoal = (req, res) => {
  try {
    const { name, target = 5, scheduledDays = [0, 1, 2, 3, 4, 5, 6] } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Goal name is required' });
    }

    const targetNum = Math.max(1, Math.min(7, parseInt(target, 10) || 5));
    const newGoal = db.create('weeklyGoals', {
      name: name.trim(),
      target: targetNum,
      days: [false, false, false, false, false, false, false],
      scheduledDays: Array.isArray(scheduledDays) && scheduledDays.length > 0 ? scheduledDays : [0, 1, 2, 3, 4, 5, 6],
      weekKey: getSaturdayWeekKey()
    });

    res.status(201).json({ success: true, data: newGoal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleWeeklyGoalDay = (req, res) => {
  try {
    const { id } = req.params;
    const { dayIndex, status } = req.body;

    if (dayIndex === undefined || dayIndex < 0 || dayIndex > 6) {
      return res.status(400).json({ success: false, message: 'Invalid dayIndex (must be 0-6)' });
    }

    const goal = db.getById('weeklyGoals', id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (!Array.isArray(goal.days)) {
      goal.days = [false, false, false, false, false, false, false];
    }

    goal.days[dayIndex] = status !== undefined ? Boolean(status) : !goal.days[dayIndex];
    db.save();

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleHabitToday = (req, res) => {
  try {
    const goal = db.getById('weeklyGoals', req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Habit not found' });

    const date = new Date();
    const todayIndex = (date.getDay() + 1) % 7;
    const todayDate = date.toISOString().split('T')[0];

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    const nextState = req.body.status !== undefined ? Boolean(req.body.status) : !goal.days[todayIndex];
    goal.days[todayIndex] = nextState;
    db.save();

    const tasks = db.getAll('tasks');
    let task = tasks.find(t => t.title && t.title.toLowerCase() === goal.name.toLowerCase() && t.dueDate === todayDate);

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
};

export const completeHabitToday = (req, res) => {
  try {
    const goal = db.getById('weeklyGoals', req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Habit not found' });

    const date = new Date();
    const todayIndex = (date.getDay() + 1) % 7;
    const todayDate = date.toISOString().split('T')[0];
    const { durationMinutes = 0, elapsedSeconds = 0, notes = '' } = req.body;
    const actualMins = Math.max(1, Math.round(durationMinutes || (elapsedSeconds ? elapsedSeconds / 60 : 0)));

    if (!Array.isArray(goal.days)) goal.days = [false, false, false, false, false, false, false];
    goal.days[todayIndex] = true;
    db.save();

    const tasks = db.getAll('tasks');
    let task = tasks.find(t => t.title && t.title.toLowerCase() === goal.name.toLowerCase() && t.dueDate === todayDate);

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
};

export const updateWeeklyGoal = (req, res) => {
  try {
    const goal = db.getById('weeklyGoals', req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Habit not found' });

    const updates = { ...req.body };
    if (updates.name && typeof updates.name === 'string') {
      updates.name = updates.name.trim();
    }
    if (updates.target !== undefined) {
      updates.target = Math.max(1, Math.min(7, parseInt(updates.target, 10) || 5));
    }
    if (Array.isArray(updates.scheduledDays)) {
      updates.scheduledDays = updates.scheduledDays.filter(d => d >= 0 && d <= 6);
    }
    if (Array.isArray(updates.days)) {
      updates.days = updates.days.slice(0, 7).map(Boolean);
    }
    updates.updatedAt = new Date().toISOString();

    const updated = db.update('weeklyGoals', req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetWeekRollover = (req, res) => {
  try {
    const currentWeekKey = getSaturdayWeekKey();
    let goals = db.getAll('weeklyGoals');
    goals.forEach(goal => {
      goal.days = [false, false, false, false, false, false, false];
      goal.weekKey = currentWeekKey;
    });
    db.save();
    res.json({ success: true, message: 'Weekly schedule renewed successfully', weekKey: currentWeekKey, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWeeklyGoal = (req, res) => {
  try {
    const success = db.delete('weeklyGoals', req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

