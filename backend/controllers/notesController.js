import { db } from '../config/db.js';

export const getNotes = (req, res) => {
  try {
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

    if (tag) {
      notes = notes.filter(n => n.tags && n.tags.includes(tag));
    }

    if (pinned !== undefined) {
      const isPinned = pinned === 'true';
      notes = notes.filter(n => Boolean(n.pinned) === isPinned);
    }

    // Sort pinned first, then newest
    notes.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, count: notes.length, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNote = (req, res) => {
  try {
    const { title = '', content, tags = [], pinned = false } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Note content is required' });
    }

    const cleanTitle = title.trim() || content.trim().slice(0, 40) + '...';
    const tagArray = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const newNote = db.create('notes', {
      title: cleanTitle,
      content: content.trim(),
      tags: tagArray,
      pinned: Boolean(pinned)
    });

    res.status(201).json({ success: true, data: newNote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNote = (req, res) => {
  try {
    const note = db.getById('notes', req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const updates = { ...req.body };
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const updated = db.update('notes', req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNote = (req, res) => {
  try {
    const success = db.delete('notes', req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
