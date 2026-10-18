import { store } from '../store.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { config } from '../config.js';
import { resetSupabase } from '../supabaseClient.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { AuthModal } from '../components/AuthModal.js';
import { t, getLang, setLang } from '../i18n.js';

export function renderSettingsView(container) {
  const currentTheme = document.body.getAttribute('data-theme') || 'dark-purple';
  const currentUser = store.state.user;
  const isCloud = config.isSupabaseConfigured;
  const currentLang = getLang();

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${t('settings.title')}</h2>
        <p>${t('settings.subtitle')}</p>
      </div>
    </div>

    <!-- USER ACCOUNT & PROFILE -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>User Account & Data Isolation</h3>
          <p>Every email address has its own private schedule, habits, and knowledge base.</p>
        </div>
        <span class="stat-icon">👤</span>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: gap: 16px; padding: 12px 16px; background: var(--panel-2); border-radius: var(--radius); border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="avatar" style="width: 44px; height: 44px; font-size: 18px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff; font-weight: 800;">
            ${currentUser ? (currentUser.name || currentUser.email)[0].toUpperCase() : '⚡'}
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text);">
              ${currentUser ? (currentUser.name || currentUser.email.split('@')[0]) : 'Guest Account'}
              ${isCloud && currentUser?.isCloud ? '<span class="task-badge" style="background: rgba(116, 214, 160, 0.15); color: var(--green); margin-left: 6px;">☁ Cloud Synced</span>' : '<span class="task-badge" style="background: rgba(155, 123, 255, 0.15); color: var(--violet); margin-left: 6px;">⚡ Private Account</span>'}
            </div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">
              ${currentUser ? currentUser.email : 'Local offline guest — Click below to create your own email account.'}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center;">
          ${currentUser ? `
            <button class="btn btn-secondary btn-small" id="switchAccountBtn">${t('settings.switch_account') || 'Switch Account'}</button>
            <button class="btn btn-danger btn-small" id="signOutBtn">${t('settings.sign_out') || 'Sign Out'}</button>
          ` : `
            <button class="btn btn-primary btn-small" id="signInBtn">⚡ Sign In / Create Account</button>
          `}
        </div>
      </div>
    </div>

    <!-- LANGUAGE CONFIGURATION (ARABIC / ENGLISH) -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>${t('settings.language_title')}</h3>
          <p>${t('settings.language_desc')}</p>
        </div>
        <span class="stat-icon">🌐</span>
      </div>

      <div class="lang-switcher-grid">
        <div class="lang-option-card ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
          <span class="lang-flag">🇬🇧</span>
          <div class="lang-meta">
            <div class="lang-name">${t('settings.lang_en')}</div>
            <div class="lang-desc">English interface with Left-to-Right (LTR) layout</div>
          </div>
          <div class="lang-check">✓</div>
        </div>

        <div class="lang-option-card ${currentLang === 'ar' ? 'active' : ''}" data-lang="ar">
          <span class="lang-flag">🇪🇬</span>
          <div class="lang-meta">
            <div class="lang-name">${t('settings.lang_ar')}</div>
            <div class="lang-desc">واجهة عربية كاملة مع دعم الاتجاه من اليمين إلى اليسار (RTL)</div>
          </div>
          <div class="lang-check">✓</div>
        </div>
      </div>
    </div>

    <!-- SUPABASE CLOUD DATABASE CONFIGURATION -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>Supabase Cloud Synchronization</h3>
          <p>Sync tasks, habits, and projects across all your phones, tablets, and computers.</p>
        </div>
        <span class="stat-icon">☁</span>
      </div>

      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
        To let anyone sign up and access their private data across any device, create a free project at <a href="https://supabase.com" target="_blank" rel="noopener" style="color: var(--cyan); text-decoration: underline;">supabase.com</a>, run the SQL setup script, and paste your Project URL and Anon Key here.
      </p>

      <div style="display: flex; flex-direction: column; gap: 14px; max-width: 600px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px;">
            Supabase Project URL
          </label>
          <input type="text" id="supabaseUrlInput" class="field" placeholder="https://xyzcompany.supabase.co" value="${config.supabaseUrl}">
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px;">
            Supabase Anon / Public Key
          </label>
          <input type="password" id="supabaseKeyInput" class="field" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${config.supabaseKey}">
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 4px;">
          <button class="btn btn-primary btn-small" id="saveSupabaseBtn">💾 Save & Connect Cloud</button>
          ${isCloud ? '<button class="btn btn-secondary btn-small" id="disconnectSupabaseBtn">Disconnect Cloud</button>' : ''}
          <button class="btn btn-secondary btn-small" id="viewSqlScriptBtn">📄 View SQL Setup Script</button>
        </div>
      </div>
    </div>

    <!-- THEME SELECTION -->
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h3>${t('settings.theme_title')}</h3>
          <p>${t('settings.theme_desc')}</p>
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
          <p>Export your personal Second Brain database or restore from a JSON backup file.</p>
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
            <p>Re-populate this account with the clean default schedule and sample projects.</p>
          </div>
          <button class="btn btn-danger btn-small" id="resetSeedBtn">⚠️ Reset to Defaults</button>
        </div>
      </div>
    </div>
  `;

  // Language Switcher Handlers
  container.querySelectorAll('.lang-option-card').forEach(card => {
    card.addEventListener('click', () => {
      const selectedLang = card.dataset.lang;
      if (selectedLang === getLang()) return;
      setLang(selectedLang);
      Toast.success(selectedLang === 'ar' 
        ? 'تم تحويل لوحة التحكم بالكامل إلى اللغة العربية بنجاح! 🇪🇬' 
        : 'Dashboard language switched to English! 🇬🇧'
      );
      renderSettingsView(container);
    });
  });

  // Auth Button Handlers
  container.querySelector('#switchAccountBtn')?.addEventListener('click', () => {
    AuthModal.open({ mode: 'signin' });
  });

  container.querySelector('#signInBtn')?.addEventListener('click', () => {
    AuthModal.open({ mode: 'signin' });
  });

  container.querySelector('#signOutBtn')?.addEventListener('click', async () => {
    await auth.signOut();
    Toast.success('Signed out successfully.');
    renderSettingsView(container);
  });

  // Supabase Connect Handler
  container.querySelector('#saveSupabaseBtn')?.addEventListener('click', async () => {
    const url = container.querySelector('#supabaseUrlInput').value.trim();
    const key = container.querySelector('#supabaseKeyInput').value.trim();

    if (!url || !key) {
      Toast.error('Please enter both Supabase Project URL and Anon Key');
      return;
    }

    config.supabaseUrl = url;
    config.supabaseKey = key;
    resetSupabase();

    Toast.info('Connecting to Supabase...');
    const connected = await api.checkConnection();
    if (connected) {
      Toast.success('Connected to Supabase Cloud! ☁⚡');
    } else {
      Toast.info('Credentials saved! Ensure you have executed supabase_schema.sql in Supabase SQL editor.');
    }
    setTimeout(() => window.location.reload(), 1200);
  });

  // Supabase Disconnect Handler
  container.querySelector('#disconnectSupabaseBtn')?.addEventListener('click', () => {
    config.supabaseUrl = '';
    config.supabaseKey = '';
    resetSupabase();
    Toast.info('Disconnected from Supabase. Operating in Local Multi-Account Mode.');
    setTimeout(() => window.location.reload(), 1000);
  });

  // View SQL Setup Script Modal
  container.querySelector('#viewSqlScriptBtn')?.addEventListener('click', () => {
    Modal.show({
      title: 'Supabase Cloud Database Setup (SQL Script)',
      content: `
        <div style="font-size: 12px; line-height: 1.6; color: var(--text-secondary); margin-bottom: 14px;">
          To enable multi-user data isolation and cloud sync across all your devices:
          <ol style="margin-top: 8px; padding-left: 20px;">
            <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener" style="color: var(--cyan); text-decoration: underline;">supabase.com</a> and create a free project.</li>
            <li>In the left sidebar, click on <strong>SQL Editor</strong>.</li>
            <li>Click <strong>New query</strong>, paste the script below, and click <strong>Run</strong>.</li>
            <li>Copy your <strong>Project URL</strong> & <strong>anon public API key</strong> from <em>Project Settings -> API</em> and paste them above.</li>
          </ol>
        </div>
        <div style="position: relative;">
          <textarea id="sqlScriptContent" readonly style="width: 100%; height: 240px; background: #0b0714; color: #a5b4fc; font-family: monospace; font-size: 11px; padding: 12px; border-radius: 8px; border: 1px solid var(--border); resize: vertical;">-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  due_time TEXT DEFAULT '10:00',
  time_slot TEXT DEFAULT 'morning',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  category TEXT DEFAULT 'General',
  project_id TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  actual_minutes INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  status TEXT DEFAULT 'In Progress',
  progress INTEGER DEFAULT 0,
  color TEXT DEFAULT '#9b7bff',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER DEFAULT 5,
  days JSONB DEFAULT '[false, false, false, false, false, false, false]'::jsonb,
  scheduled_days JSONB DEFAULT '[0, 1, 2, 3, 4, 5, 6]'::jsonb,
  week_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  task_id TEXT,
  duration_minutes INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_intentions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_intentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own weekly_goals" ON public.weekly_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own time_sessions" ON public.time_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own intentions" ON public.user_intentions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
</textarea>
        </div>
      `,
      footerButtons: [
        {
          text: '📋 Copy SQL to Clipboard',
          className: 'btn-primary',
          onClick: () => {
            const textarea = document.getElementById('sqlScriptContent');
            if (textarea) {
              textarea.select();
              navigator.clipboard.writeText(textarea.value);
              Toast.success('SQL Script copied to clipboard! 📋');
            }
          }
        },
        {
          text: 'Close',
          className: 'btn-secondary',
          onClick: () => Modal.close()
        }
      ]
    });
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
      a.download = `second-brain-backup-${currentUser ? currentUser.email : 'guest'}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Backup JSON downloaded successfully! 💾');
    } catch (e) {
      Toast.error('Could not export backup: ' + e.message);
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
      title: 'Reset Workspace to Defaults',
      message: 'This will reset your scheduled tasks, habits, and notes back to the clean sample template. Are you sure?',
      confirmText: 'Reset Workspace',
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
