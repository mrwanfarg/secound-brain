import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

export function renderSettingsView(container) {
  const currentTheme = document.body.getAttribute('data-theme') || 'dark-purple';

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Workspace Settings & Data Management</h2>
        <p>Configure themes, synchronize with your backend server, and manage full backups.</p>
      </div>
    </div>

    <!-- SERVER CONNECTION STATUS -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Full-Stack Server Connection</h3>
          <p>Status of the Node.js/Express backend API.</p>
        </div>
        <div class="server-status-pill" id="settingsServerStatusPill">
          <span class="server-status-dot ${store.state.isOnline ? '' : 'offline'}"></span>
          <span id="settingsServerStatusText">${store.state.isOnline ? 'Online · API Connected' : 'Local Fallback Mode'}</span>
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <button class="btn btn-secondary btn-small" id="testApiPingBtn">⚡ Test API Ping</button>
        <span style="font-size: 11px; color: var(--muted);" id="apiPingResult">Endpoint: ${window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000'}/api</span>
      </div>
    </div>

    <!-- THEME SELECTION -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Visual Design & Theme</h3>
          <p>Choose your workspace aesthetic tone.</p>
        </div>
        <span class="stat-icon">🎨</span>
      </div>

      <div class="form-group" style="max-width: 320px;">
        <label for="themeSelect">Color Theme</label>
        <select class="field" id="themeSelect">
          <option value="dark-purple" ${currentTheme === 'dark-purple' ? 'selected' : ''}>Obsidian Violet (Default)</option>
          <option value="midnight-blue" ${currentTheme === 'midnight-blue' ? 'selected' : ''}>Midnight Blue</option>
          <option value="cyber-emerald" ${currentTheme === 'cyber-emerald' ? 'selected' : ''}>Cyber Emerald</option>
        </select>
      </div>
    </div>

    <!-- BACKUP & RESTORE -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Backup & Data Portability</h3>
          <p>Export your full Second Brain database or restore from a JSON backup file.</p>
        </div>
        <span class="stat-icon">💾</span>
      </div>

      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-label">
            <h4>Export Complete Backup</h4>
            <p>Download a JSON snapshot of all your scheduled tasks, projects, habits, notes, and timers.</p>
          </div>
          <button class="btn btn-primary btn-small" id="exportBackupBtn">📥 Download Backup JSON</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-label">
            <h4>Import Backup File</h4>
            <p>Restore or merge data from an existing Second Brain backup JSON file.</p>
          </div>
          <label class="btn btn-secondary btn-small" style="cursor: pointer;">
            📤 Upload Backup JSON
            <input type="file" id="importBackupFileInput" accept=".json" style="display: none;">
          </label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-label">
            <h4 style="color: var(--red);">Reset to Fresh Template</h4>
            <p>Re-populate the workspace with the clean default schedule and sample projects.</p>
          </div>
          <button class="btn btn-danger btn-small" id="resetSeedBtn">⚠️ Reset to Defaults</button>
        </div>
      </div>
    </div>

    <!-- ARCHITECTURE & SPECS -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>System Architecture Information</h3>
          <p>Technical overview of your personal operating system.</p>
        </div>
        <span class="stat-icon">ℹ</span>
      </div>
      <div style="font-size: 11px; line-height: 1.8; color: var(--text-secondary);">
        <div><strong>Backend:</strong> Node.js + Express REST API (CORS enabled, atomic persistence)</div>
        <div><strong>Data Store:</strong> Zero-dependency persistent JSON database (with automatic schema migration)</div>
        <div><strong>Frontend:</strong> Modern ES Modules, Shared UI Components (TaskCard, StatCard, Modal, Toast)</div>
        <div><strong>Scheduling System:</strong> Multi-mode scheduler (Time-blocks, Kanban, Timeline, Weekly Habit Matrix)</div>
        <div><strong>Resilience:</strong> Automatic offline-first fallback with local state synchronization</div>
      </div>
    </div>
  `;

  // Test API Ping
  container.querySelector('#testApiPingBtn').addEventListener('click', async () => {
    const resultSpan = container.querySelector('#apiPingResult');
    resultSpan.textContent = 'Pinging /api/health...';
    const isOnline = await api.checkConnection();
    if (isOnline) {
      resultSpan.textContent = '✓ Healthy & Connected (HTTP 200 OK)';
      resultSpan.style.color = 'var(--green)';
      Toast.success('API backend is running and healthy! ⚡');
    } else {
      resultSpan.textContent = '⚠️ API unreachable. Running in Local Offline Mode.';
      resultSpan.style.color = 'var(--amber)';
      Toast.info('Operating in Local Fallback mode');
    }
  });

  // Theme select
  container.querySelector('#themeSelect').addEventListener('change', e => {
    const val = e.target.value;
    if (val === 'dark-purple') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', val);
    }
    localStorage.setItem('secondBrain_theme', val);
    Toast.success(`Theme updated to ${val}`);
  });

  // Export Backup
  container.querySelector('#exportBackupBtn').addEventListener('click', async () => {
    try {
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `second-brain-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Backup JSON downloaded successfully! 💾');
    } catch {
      // Local fallback export
      const localData = {
        tasks: JSON.parse(localStorage.getItem('secondBrain_tasks') || '[]'),
        projects: JSON.parse(localStorage.getItem('secondBrain_projects') || '[]'),
        weekly: JSON.parse(localStorage.getItem('secondBrain_weekly') || '[]'),
        notes: JSON.parse(localStorage.getItem('secondBrain_notes') || '[]')
      };
      const blob = new Blob([JSON.stringify(localData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `second-brain-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Local backup downloaded');
    }
  });

  // Import Backup
  container.querySelector('#importBackupFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.importBackup(parsed);
      Toast.success('Backup restored successfully! Refreshing...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      Toast.error('Invalid backup file: ' + err.message);
    }
  });

  // Reset to Defaults
  container.querySelector('#resetSeedBtn').addEventListener('click', () => {
    Modal.confirm({
      title: 'Reset Database to Defaults',
      message: 'This will reset all your tasks, projects, habits, and notes back to the sample template. Are you sure?',
      confirmText: 'Reset Everything',
      onConfirm: async () => {
        try {
          await api.resetSeed();
          Toast.success('Workspace reset to defaults');
          await store.refreshAll();
          window.location.reload();
        } catch {
          Toast.error('Failed to reset template');
        }
      }
    });
  });
}
