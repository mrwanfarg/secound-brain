import { store } from './store.js';
import { Toast } from './components/Toast.js';
import { openEditTaskModal } from './components/TaskCard.js';

import { renderDashboardView } from './views/dashboardView.js';
import { renderTodayView } from './views/todayView.js';
import { renderTasksView } from './views/tasksView.js';
import { renderWeeklyView } from './views/weeklyView.js';
import { renderNotesView } from './views/notesView.js';
import { renderInsightsView } from './views/insightsView.js';
import { renderSettingsView } from './views/settingsView.js';
import { AuthModal } from './components/AuthModal.js';
import { auth } from './auth.js';

const PAGE_META = {
  Dashboard: {
    title: 'Command Dashboard',
    subtitle: 'Your schedule, habits, and cognitive progress — all in one unified control center.',
    breadcrumb: 'Overview'
  },
  Today: {
    title: "Today's Focus & Timeline",
    subtitle: 'Execute high-impact tasks across morning, afternoon, and evening blocks.',
    breadcrumb: 'Today'
  },
  Weekly: {
    title: 'Weekly Habit & Goal Matrix',
    subtitle: 'Build unstoppable daily routines with Saturday-to-Friday habit tracking.',
    breadcrumb: 'Weekly'
  },
  Tasks: {
    title: 'Task Scheduling Center',
    subtitle: 'Plan, categorize, and execute action items via List, Kanban, or Timeline view.',
    breadcrumb: 'Tasks'
  },
  Notes: {
    title: 'Knowledge Base & Capture',
    subtitle: 'A second brain for your mental clarity — notes, insights, and references.',
    breadcrumb: 'Notes'
  },
  Insights: {
    title: 'Productivity Velocity & Analytics',
    subtitle: 'Deep dive into your task throughput, completion velocity, and focus hours.',
    breadcrumb: 'Insights'
  },
  Settings: {
    title: 'Workspace Configuration',
    subtitle: 'Customize themes, manage cloud server synchronization, and download backups.',
    breadcrumb: 'Settings'
  }
};

class App {
  constructor() {
    this.currentPage = 'Dashboard';
    this.views = {
      Dashboard: renderDashboardView,
      Today: renderTodayView,
      Weekly: renderWeeklyView,
      Tasks: renderTasksView,
      Notes: renderNotesView,
      Insights: renderInsightsView,
      Settings: renderSettingsView
    };
  }

  init() {
    this.applyTheme();
    this.updateCurrentDate();
    this.bindNavigation();
    this.bindGlobalActions();
    this.bindMobileMenu();

    // Listen for custom navigation events
    window.addEventListener('navigate-to', e => {
      if (e.detail?.page) {
        this.navigateTo(e.detail.page);
      }
    });

    // Wire up dedicated Gatekeeper Onboarding & Login Screen
    this.setupGatekeeper();

    // Initialize Store
    store.init().then(() => {
      const user = auth.getCurrentUser();
      if (user) {
        this.unlockDashboard();
      } else {
        this.lockDashboard('signup');
      }
    });

    // Update server status dot in sidebar
    store.subscribe('isOnline', isOnline => {
      const dot = document.getElementById('sidebarServerDot');
      const text = document.getElementById('sidebarServerText');
      if (dot && text) {
        dot.className = `server-status-dot ${isOnline ? '' : 'offline'}`;
        text.textContent = isOnline ? 'Online (API Active)' : 'Local Mode';
      }
    });

    // Update user profile avatar and actions in sidebar & mobile header
    store.subscribe('user', user => this.renderUserProfile(user));
    this.renderUserProfile(store.state.user);
  }

  setupGatekeeper() {
    const gateScreen = document.getElementById('authGatekeeperScreen');
    const appContainer = document.getElementById('appContainer');
    const form = document.getElementById('gateAuthForm');
    const tabSignUp = document.getElementById('gateTabSignUp');
    const tabSignIn = document.getElementById('gateTabSignIn');
    const nameGroup = document.getElementById('gateNameGroup');
    const nameInput = document.getElementById('gateNameInput');
    const emailInput = document.getElementById('gateEmailInput');
    const passwordInput = document.getElementById('gatePasswordInput');
    const submitBtn = document.getElementById('gateSubmitBtn');
    const errorEl = document.getElementById('gateErrorMessage');
    const titleEl = document.getElementById('gateTitle');
    const subtitleEl = document.getElementById('gateSubtitle');

    if (!gateScreen || !appContainer) return;

    let currentMode = 'signup';

    const setMode = mode => {
      currentMode = mode;
      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }
      if (mode === 'signup') {
        tabSignUp?.classList.add('active');
        tabSignIn?.classList.remove('active');
        if (nameGroup) nameGroup.style.display = 'block';
        if (titleEl) titleEl.textContent = 'إنشاء حساب جديد للبدء';
        if (subtitleEl) subtitleEl.textContent = 'أنشئ حسابك الخاص لتفعيل لوحة التحكم وجدول مهامك وعاداتك. حسابك يظل متثبتاً تلقائياً على هذا الجهاز.';
        if (submitBtn) submitBtn.innerHTML = '<span>إنشاء الحساب ودخول الـ Dashboard ⚡</span>';
      } else {
        tabSignUp?.classList.remove('active');
        tabSignIn?.classList.add('active');
        if (nameGroup) nameGroup.style.display = 'none';
        if (titleEl) titleEl.textContent = 'تسجيل الدخول إلى حسابك';
        if (subtitleEl) subtitleEl.textContent = 'أدخل بريدك وكلمة المرور للوصول إلى لوحة التحكم الخاصة بك.';
        if (submitBtn) submitBtn.innerHTML = '<span>تسجيل الدخول ودخول الـ Dashboard ⚡</span>';
      }
    };

    tabSignUp?.addEventListener('click', () => setMode('signup'));
    tabSignIn?.addEventListener('click', () => setMode('signin'));

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = (emailInput?.value || '').trim();
      const password = (passwordInput?.value || '').trim();
      const name = (nameInput?.value || '').trim();

      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }

      const originalHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>جاري التحقق والدخول... ⏳</span>';
      }

      try {
        if (currentMode === 'signup') {
          const res = await auth.signUp({ name, email, password });
          Toast.success(res.message || 'تم إنشاء الحساب بنجاح! ⚡');
        } else {
          await auth.signIn({ email, password });
          Toast.success('أهلاً بك مجدداً! ⚡');
        }

        // Unlock Dashboard directly
        this.unlockDashboard();
      } catch (err) {
        if (errorEl) {
          errorEl.style.display = 'block';
          errorEl.textContent = err.message || 'حدث خطأ في التسجيل';
        }
        Toast.error(err.message || 'فشل التسجيل');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        }
      }
    });

    // Initial check: if already authenticated, unlock dashboard immediately
    const user = auth.getCurrentUser();
    if (user) {
      this.unlockDashboard();
    } else {
      this.lockDashboard('signup');
    }
  }

  unlockDashboard() {
    const gateScreen = document.getElementById('authGatekeeperScreen');
    const appContainer = document.getElementById('appContainer');
    if (gateScreen) gateScreen.style.display = 'none';
    if (appContainer) {
      appContainer.style.display = 'flex';
    }
    this.navigateTo(this.currentPage || 'Dashboard');
  }

  lockDashboard(mode = 'signup') {
    const gateScreen = document.getElementById('authGatekeeperScreen');
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.style.display = 'none';
    if (gateScreen) {
      gateScreen.style.display = 'flex';
      const tabSignUp = document.getElementById('gateTabSignUp');
      const tabSignIn = document.getElementById('gateTabSignIn');
      if (mode === 'signup') tabSignUp?.click();
      else tabSignIn?.click();
    }
  }

  renderUserProfile(user) {
    const container = document.getElementById('sidebarProfileSection');
    const mobileBtn = document.getElementById('mobileAuthBtn');

    if (user) {
      const initial = (user.name || user.email || 'U')[0].toUpperCase();
      if (container) {
        container.innerHTML = `
          <div class="avatar" style="background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">
            ${initial}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="profile-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
              <span>${user.name || user.email.split('@')[0]}</span>
              ${user.isCloud ? '<span title="Cloud Synchronized" style="font-size: 11px;">☁</span>' : ''}
            </div>
            <div class="profile-role" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${user.email}
            </div>
          </div>
          <button class="btn btn-icon btn-secondary" id="sidebarLogoutBtn" title="Sign Out" style="width: 28px; height: 28px; font-size: 13px; color: var(--muted); border-radius: 6px;">
            ⎋
          </button>
        `;

        container.querySelector('#sidebarLogoutBtn')?.addEventListener('click', async e => {
          e.stopPropagation();
          await auth.signOut();
          Toast.info('تم تسجيل الخروج بنجاح.');
          this.lockDashboard('signin');
        });

        container.onclick = e => {
          if (!e.target.closest('#sidebarLogoutBtn')) {
            this.navigateTo('Settings');
          }
        };
      }

      if (mobileBtn) {
        mobileBtn.innerHTML = `👤 ${initial}`;
        mobileBtn.title = user.email;
        mobileBtn.onclick = () => {
          const sidebar = document.querySelector('.sidebar');
          const overlay = document.getElementById('sidebarOverlay');
          if (sidebar) sidebar.classList.add('open');
          if (overlay) overlay.classList.add('visible');
        };
      }
    } else {
      if (container) {
        container.innerHTML = `
          <button type="button" class="btn btn-primary" id="sidebarAuthBtn" style="width: 100%; font-size: 11px; padding: 9px 12px; gap: 6px; box-shadow: 0 4px 14px rgba(155, 123, 255, 0.25);">
            ⚡ Create Account / Sign In
          </button>
        `;
        container.querySelector('#sidebarAuthBtn')?.addEventListener('click', () => {
          this.lockDashboard('signup');
        });
      }

      if (mobileBtn) {
        mobileBtn.innerHTML = '⚡ Sign In';
        mobileBtn.onclick = () => {
          this.lockDashboard('signup');
        };
      }
    }
  }

  applyTheme() {
    const saved = localStorage.getItem('secondBrain_theme');
    if (saved && saved !== 'dark-purple') {
      document.body.setAttribute('data-theme', saved);
    }
  }

  updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        const page = button.dataset.page;
        this.navigateTo(page);

        // Close mobile sidebar if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });
  }

  bindGlobalActions() {
    // Quick Add Task button in topbar
    const topbarAddBtn = document.getElementById('topbarNewTaskBtn');
    if (topbarAddBtn) {
      topbarAddBtn.addEventListener('click', () => {
        openEditTaskModal();
      });
    }
  }

  bindMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('visible', isOpen);
      });
    }

    // Close sidebar when clicking the overlay
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }

    // Mobile bottom nav
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) this.navigateTo(page);
      });
    });
  }

  navigateTo(page) {
    if (!auth.getCurrentUser()) {
      AuthModal.open({ mode: 'signup', isGatekeeper: true, onSuccess: () => this.navigateTo(page) });
      return;
    }

    if (!this.views[page]) page = 'Dashboard';
    this.currentPage = page;
    store.state.currentPage = page;

    // Update Topbar metadata
    const meta = PAGE_META[page] || PAGE_META.Dashboard;
    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSubtitle');
    const breadcrumbEl = document.getElementById('breadcrumbPage');

    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = meta.subtitle;
    if (breadcrumbEl) breadcrumbEl.textContent = meta.breadcrumb;

    // Update active nav button (sidebar)
    document.querySelectorAll('.nav-item').forEach(button => {
      button.classList.toggle('active', button.dataset.page === page);
    });

    // Update active mobile bottom nav button
    document.querySelectorAll('.mob-nav-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.page === page);
    });

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');

    // Render Page View
    const mainViewContainer = document.getElementById('mainViewContainer');
    if (mainViewContainer) {
      mainViewContainer.innerHTML = '';
      const viewRenderer = this.views[page];
      if (typeof viewRenderer === 'function') {
        viewRenderer(mainViewContainer);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Start Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
