import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { createEmptyState } from '../components/EmptyState.js';

export function renderProjectsView(container) {
  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Projects Command</h2>
        <p id="projectsSummaryCount">Organize deliverables, track milestones, and monitor task completion.</p>
      </div>
      <button class="btn btn-primary" id="openNewProjectBtn">+ New Project</button>
    </div>

    <!-- NEW PROJECT QUICK FORM PANEL -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Create Project</h3>
          <p>Define an overarching objective with target timeline.</p>
        </div>
        <span class="stat-icon">▦</span>
      </div>

      <form id="projectsQuickForm">
        <div class="form-group">
          <input class="field" id="newProjectName" type="text" maxlength="120" placeholder="Project name (e.g. Mobile App Redesign)" required>
        </div>
        <div class="form-group">
          <textarea class="field" id="newProjectDesc" rows="2" placeholder="Project objective, key outcomes, or notes (optional)"></textarea>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label for="newProjectDueDate">Target Due Date</label>
            <input class="field" id="newProjectDueDate" type="date">
          </div>
          <div class="form-group">
            <label for="newProjectStatus">Initial Status</label>
            <select class="field" id="newProjectStatus">
              <option value="Not Started">Not Started</option>
              <option value="In Progress" selected>In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" type="submit">+ Create Project</button>
      </form>
    </div>

    <!-- PROJECTS GRID -->
    <div class="projects-grid" id="projectsCardsGrid"></div>
  `;

  // Render Projects Grid
  function renderProjects() {
    const grid = container.querySelector('#projectsCardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const { projects, tasks } = store.state;
    const activeCount = projects.filter(p => p.status !== 'Completed').length;
    container.querySelector('#projectsSummaryCount').textContent =
      `${projects.length} total projects · ${activeCount} active in progress`;

    if (projects.length === 0) {
      grid.appendChild(createEmptyState({
        icon: '▦',
        title: 'No projects created yet',
        description: 'Define your major deliverables and link scheduled tasks to them.'
      }));
      return;
    }

    projects.forEach(project => {
      const card = document.createElement('article');
      card.className = 'project-card';

      // Header
      const header = document.createElement('div');
      header.className = 'project-card-header';

      const left = document.createElement('div');
      left.style.flex = '1';

      const title = document.createElement('h3');
      title.className = 'project-title';
      title.textContent = project.name;
      left.appendChild(title);

      if (project.description) {
        const desc = document.createElement('div');
        desc.className = 'project-desc';
        desc.textContent = project.description;
        left.appendChild(desc);
      }

      // Status selector
      const statusSelect = document.createElement('select');
      statusSelect.className = 'field';
      statusSelect.style.width = 'auto';
      statusSelect.style.padding = '5px 28px 5px 10px';
      statusSelect.style.fontSize = '11px';

      ['Not Started', 'In Progress', 'On Hold', 'Completed'].forEach(st => {
        const opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st;
        if (project.status === st) opt.selected = true;
        statusSelect.appendChild(opt);
      });

      statusSelect.addEventListener('change', async () => {
        const nextStatus = statusSelect.value;
        const updates = { status: nextStatus };
        if (nextStatus === 'Completed') updates.progress = 100;
        try {
          await api.updateProject(project.id, updates);
          Toast.success('Project status updated');
          await store.refreshAll();
        } catch {
          Toast.error('Failed to update project status');
        }
      });

      header.append(left, statusSelect);

      // Linked Tasks Count
      const linkedTasks = tasks.filter(t => t.projectId === project.id);
      const completedTasks = linkedTasks.filter(t => t.completed).length;

      // Progress Row
      const progressWrap = document.createElement('div');
      progressWrap.className = 'project-progress-wrap';

      const progressLabels = document.createElement('div');
      progressLabels.className = 'project-progress-labels';
      progressLabels.innerHTML = `
        <span>Progress (${completedTasks}/${linkedTasks.length} tasks)</span>
        <span>${project.progress || 0}%</span>
      `;

      const track = document.createElement('div');
      track.className = 'progress-track';

      const fill = document.createElement('div');
      fill.className = `progress-fill ${project.progress >= 100 ? 'green' : ''}`;
      fill.style.width = `${project.progress || 0}%`;
      track.appendChild(fill);

      // Progress Slider
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '5';
      slider.value = String(project.progress || 0);
      slider.style.width = '100%';
      slider.style.marginTop = '10px';
      slider.style.accentColor = 'var(--violet)';

      slider.addEventListener('change', async () => {
        const val = Number(slider.value);
        try {
          await api.updateProject(project.id, { progress: val });
          Toast.success(`Progress set to ${val}%`);
          await store.refreshAll();
        } catch {
          Toast.error('Could not save progress');
        }
      });

      progressWrap.append(progressLabels, track, slider);

      // Footer
      const footer = document.createElement('div');
      footer.className = 'project-footer';

      const dueText = document.createElement('span');
      dueText.textContent = project.dueDate ? `Target: ${project.dueDate}` : 'No target date';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';

      const viewTasksBtn = document.createElement('button');
      viewTasksBtn.className = 'btn btn-secondary btn-small';
      viewTasksBtn.textContent = 'View Tasks';
      viewTasksBtn.addEventListener('click', () => {
        store.state.activeProjectFilter = project.id;
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Tasks' } }));
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger btn-small';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        Modal.confirm({
          title: 'Delete Project',
          message: `Delete project "${project.name}"? Tasks associated will remain.`,
          confirmText: 'Delete Project',
          onConfirm: async () => {
            try {
              await api.deleteProject(project.id);
              Toast.success('Project deleted');
              await store.refreshAll();
            } catch {
              Toast.error('Could not delete project');
            }
          }
        });
      });

      actions.append(viewTasksBtn, delBtn);
      footer.append(dueText, actions);

      card.append(header, progressWrap, footer);
      grid.appendChild(card);
    });
  }

  // Quick form submit
  const form = container.querySelector('#projectsQuickForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = container.querySelector('#newProjectName').value.trim();
    const desc = container.querySelector('#newProjectDesc').value.trim();
    const dueDate = container.querySelector('#newProjectDueDate').value;
    const status = container.querySelector('#newProjectStatus').value;

    if (!name) return;

    try {
      await api.createProject({ name, description: desc, dueDate, status });
      form.reset();
      container.querySelector('#newProjectStatus').value = 'In Progress';
      Toast.success('Project created successfully! ⚡');
      await store.refreshAll();
    } catch {
      Toast.error('Failed to create project');
    }
  });

  renderProjects();
  store.subscribe('projects', () => renderProjects());
  store.subscribe('tasks', () => renderProjects());
}
