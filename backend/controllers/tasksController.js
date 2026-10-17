import { db } from '../config/db.js';

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getTasks = (req, res) => {
  try {
    let tasks = db.getAll('tasks');
    const { filter, date, priority, projectId, search, timeSlot } = req.query;
    const today = getLocalDate();

    // Text search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      tasks = tasks.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Project filter
    if (projectId) {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    // Priority filter
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }

    // Time slot filter (morning, afternoon, evening)
    if (timeSlot) {
      tasks = tasks.filter(t => t.timeSlot === timeSlot);
    }

    // Date or status filter
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
        case 'all':
        default:
          break;
      }
    }

    // Sort by: Overdue/Pending first, then due date, then priority
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      const weightA = priorityWeight[a.priority] || 1;
      const weightB = priorityWeight[b.priority] || 1;
      return weightB - weightA;
    });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskById = (req, res) => {
  try {
    const task = db.getById('tasks', req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTask = (req, res) => {
  try {
    const {
      title,
      description = '',
      dueDate = '',
      dueTime = '',
      timeSlot = 'morning',
      priority = 'medium',
      category = 'General',
      projectId = '',
      estimatedMinutes = 30
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const newTask = db.create('tasks', {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || getLocalDate(),
      dueTime: dueTime || '09:00',
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
};

export const updateTask = (req, res) => {
  try {
    const task = db.getById('tasks', req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updates = { ...req.body };
    if (updates.completed !== undefined) {
      updates.completed = Boolean(updates.completed);
      updates.status = updates.completed ? 'completed' : 'pending';
      if (updates.completed) {
        updates.completedAt = new Date().toISOString();
      } else {
        updates.completedAt = null;
      }
    }

    const updatedTask = db.update('tasks', req.params.id, updates);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleTask = (req, res) => {
  try {
    const task = db.getById('tasks', req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const nextCompleted = !task.completed;
    const updated = db.update('tasks', req.params.id, {
      completed: nextCompleted,
      status: nextCompleted ? 'completed' : 'pending',
      completedAt: nextCompleted ? new Date().toISOString() : null
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTask = (req, res) => {
  try {
    const success = db.delete('tasks', req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rescheduleOverdue = (req, res) => {
  try {
    const today = getLocalDate();
    const tasks = db.getAll('tasks');
    let rescheduledCount = 0;

    tasks.forEach(task => {
      if (task.dueDate && task.dueDate < today && !task.completed) {
        db.update('tasks', task.id, { dueDate: today });
        rescheduledCount++;
      }
    });

    res.json({
      success: true,
      message: `Successfully rescheduled ${rescheduledCount} overdue task(s) to today`,
      count: rescheduledCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
