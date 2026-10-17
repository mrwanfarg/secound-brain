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
    const { name, target = 5 } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Goal name is required' });
    }

    const targetNum = Math.max(1, Math.min(7, parseInt(target, 10) || 5));
    const newGoal = db.create('weeklyGoals', {
      name: name.trim(),
      target: targetNum,
      days: [false, false, false, false, false, false, false],
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
