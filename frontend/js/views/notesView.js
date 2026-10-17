import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { createEmptyState } from '../components/EmptyState.js';

export function renderNotesView(container) {
  let noteSearchQuery = '';

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Knowledge Base & Quick Capture</h2>
        <p>A second brain for your mental clarity — notes, insights, and references.</p>
      </div>
    </div>

    <!-- NEW NOTE COMPOSER PANEL -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Capture Insight</h3>
          <p>Record mental models, meeting minutes, or reference material.</p>
        </div>
        <span class="stat-icon">▤</span>
      </div>

      <form id="notesComposeForm">
        <div class="form-group">
          <input class="field" id="newNoteTitle" type="text" maxlength="150" placeholder="Note Title (e.g. System Architecture Principles)">
        </div>
        <div class="form-group">
          <textarea class="field" id="newNoteContent" rows="3" placeholder="Write your thoughts, Markdown notes, or bullet points..." required></textarea>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <input class="field" id="newNoteTags" type="text" placeholder="Tags (comma-separated, e.g. architecture, ideas)">
          </div>
          <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
              <input type="checkbox" id="newNotePinned" style="accent-color: var(--violet);"> Pin note to top
            </label>
            <button class="btn btn-primary" type="submit">+ Save Note</button>
          </div>
        </div>
      </form>
    </div>

    <!-- NOTES SEARCH & GRID -->
    <div class="panel" style="padding: 14px 20px; margin-bottom: 20px;">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" class="field" id="notesSearchInput" placeholder="Filter notes by title, tag, or content...">
      </div>
    </div>

    <div class="notes-grid" id="notesCardsGrid"></div>
  `;

  // Search input
  container.querySelector('#notesSearchInput').addEventListener('input', e => {
    noteSearchQuery = e.target.value.toLowerCase().trim();
    renderNotesGrid();
  });

  // Render Grid
  function renderNotesGrid() {
    const grid = container.querySelector('#notesCardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let notes = store.state.notes;

    if (noteSearchQuery) {
      notes = notes.filter(n =>
        (n.title && n.title.toLowerCase().includes(noteSearchQuery)) ||
        (n.content && n.content.toLowerCase().includes(noteSearchQuery)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(noteSearchQuery)))
      );
    }

    if (notes.length === 0) {
      grid.appendChild(createEmptyState({
        icon: '▤',
        title: 'No notes match your filter',
        description: 'Capture your thoughts, ideas, or meeting notes using the composer above.'
      }));
      return;
    }

    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card ${note.pinned ? 'pinned' : ''}`;

      if (note.pinned) {
        const pin = document.createElement('span');
        pin.className = 'note-pin-indicator';
        pin.title = 'Pinned note';
        pin.textContent = '📌';
        card.appendChild(pin);
      }

      const title = document.createElement('div');
      title.className = 'note-card-title';
      title.textContent = note.title || 'Untitled Note';

      const content = document.createElement('div');
      content.className = 'note-card-content';
      content.textContent = note.content;

      card.append(title, content);

      // Tags
      if (Array.isArray(note.tags) && note.tags.length > 0) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'note-card-tags';
        note.tags.forEach(t => {
          const tag = document.createElement('span');
          tag.className = 'note-tag';
          tag.textContent = `#${t}`;
          tagsWrap.appendChild(tag);
        });
        card.appendChild(tagsWrap);
      }

      // Actions Footer
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.alignItems = 'center';
      footer.style.justifyContent = 'space-between';
      footer.style.marginTop = '10px';
      footer.style.paddingTop = '10px';
      footer.style.borderTop = '1px solid var(--border)';

      const dateStr = note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const dateEl = document.createElement('span');
      dateEl.style.fontSize = '10px';
      dateEl.style.color = 'var(--muted)';
      dateEl.textContent = dateStr;

      const actBtns = document.createElement('div');
      actBtns.style.display = 'flex';
      actBtns.style.gap = '6px';

      // Pin toggle
      const pinBtn = document.createElement('button');
      pinBtn.className = 'btn btn-icon';
      pinBtn.title = note.pinned ? 'Unpin' : 'Pin to top';
      pinBtn.textContent = note.pinned ? '📌' : '📍';
      pinBtn.addEventListener('click', async () => {
        try {
          await api.updateNote(note.id, { pinned: !note.pinned });
          Toast.success(note.pinned ? 'Note unpinned' : 'Note pinned to top! 📌');
          await store.refreshAll();
        } catch {
          Toast.error('Could not update note');
        }
      });

      // Copy content
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-icon';
      copyBtn.title = 'Copy note text';
      copyBtn.textContent = '📋';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(`${note.title ? `${note.title}\n\n` : ''}${note.content}`);
        Toast.success('Note copied to clipboard!');
      });

      // Delete
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-icon';
      delBtn.title = 'Delete note';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => {
        Modal.confirm({
          title: 'Delete Note',
          message: 'Are you sure you want to delete this note?',
          confirmText: 'Delete',
          onConfirm: async () => {
            try {
              await api.deleteNote(note.id);
              Toast.success('Note deleted');
              await store.refreshAll();
            } catch {
              Toast.error('Could not delete note');
            }
          }
        });
      });

      actBtns.append(pinBtn, copyBtn, delBtn);
      footer.append(dateEl, actBtns);
      card.appendChild(footer);

      grid.appendChild(card);
    });
  }

  // Compose form submit
  const form = container.querySelector('#notesComposeForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const title = container.querySelector('#newNoteTitle').value.trim();
    const content = container.querySelector('#newNoteContent').value.trim();
    const tags = container.querySelector('#newNoteTags').value.trim();
    const pinned = container.querySelector('#newNotePinned').checked;

    if (!content) return;

    try {
      await api.createNote({
        title,
        content,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        pinned
      });
      form.reset();
      Toast.success('Thought captured successfully! ⚡');
      await store.refreshAll();
    } catch {
      Toast.error('Could not save note');
    }
  });

  renderNotesGrid();
  store.subscribe('notes', () => renderNotesGrid());
}
