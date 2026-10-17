import { db } from '../config/db.js';

export const getProjects = (req, res) => {
  try {
    const projects = db.getAll('projects');
    const tasks = db.getAll('tasks');

    // Enhance projects with linked tasks metrics
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProjectById = (req, res) => {
  try {
    const project = db.getById('projects', req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const tasks = db.getAll('tasks').filter(t => t.projectId === project.id);
    res.json({ success: true, data: { ...project, tasks } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProject = (req, res) => {
  try {
    const { name, description = '', dueDate = '', status = 'Not Started', color = '#9b7bff' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const newProject = db.create('projects', {
      name: name.trim(),
      description: description.trim(),
      dueDate,
      status,
      color,
      progress: status === 'Completed' ? 100 : 0
    });

    res.status(201).json({ success: true, data: newProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProject = (req, res) => {
  try {
    const project = db.getById('projects', req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const updates = { ...req.body };
    if (updates.progress !== undefined) {
      updates.progress = Number(updates.progress);
      if (updates.progress === 100) {
        updates.status = 'Completed';
      } else if (project.status === 'Completed' && updates.progress < 100) {
        updates.status = updates.progress > 0 ? 'In Progress' : 'Not Started';
      }
    }
    if (updates.status === 'Completed') {
      updates.progress = 100;
    }

    const updated = db.update('projects', req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = (req, res) => {
  try {
    const success = db.delete('projects', req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
