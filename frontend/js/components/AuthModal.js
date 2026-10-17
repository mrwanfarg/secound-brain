/**
 * Authentication Modal Dialog Component
 * Handles User Sign In, Sign Up, and Account Switch
 */
import { auth } from '../auth.js';
import { Toast } from './Toast.js';
import { config } from '../config.js';

export class AuthModal {
  static open({ mode = 'signin', onSuccess = null } = {}) {
    this.close();

    const isCloud = config.isSupabaseConfigured;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.id = 'authModalBackdrop';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.maxWidth = '420px';
    dialog.style.background = 'linear-gradient(180deg, #181226 0%, #110c1c 100%)';
    dialog.style.border = '1px solid rgba(155, 123, 255, 0.25)';
    dialog.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)';

    dialog.innerHTML = `
      <div style="padding: 24px 28px 20px; text-align: center; position: relative;">
        <button type="button" class="modal-close" id="authModalCloseBtn" style="position: absolute; right: 18px; top: 18px;">&times;</button>
        
        <div style="width: 52px; height: 52px; border-radius: 16px; margin: 0 auto 14px; background: linear-gradient(135deg, #7c3aed, #4c1d95); display: grid; place-items: center; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35); border: 1px solid rgba(255, 255, 255, 0.15);">
          <span style="font-size: 24px;">⚡</span>
        </div>

        <h3 style="font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 6px; letter-spacing: -0.3px;">
          Second Brain Workspace
        </h3>
        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 18px;">
          Sign in or create your personal account to keep your schedule, habits, and notes private.
        </p>

        <!-- TABS -->
        <div style="display: flex; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 20px;">
          <button type="button" id="authTabSignIn" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 7px; border: none; cursor: pointer; transition: all 0.2s;" class="${mode === 'signin' ? 'btn-primary' : 'btn-secondary'}">
            Sign In
          </button>
          <button type="button" id="authTabSignUp" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 7px; border: none; cursor: pointer; transition: all 0.2s;" class="${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}">
            Create Account
          </button>
        </div>

        <!-- FORM -->
        <form id="authForm" style="text-align: left; display: flex; flex-direction: column; gap: 14px;">
          <div id="authNameGroup" style="display: ${mode === 'signup' ? 'block' : 'none'};">
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px;">
              Full Name
            </label>
            <input type="text" id="authNameInput" class="field" placeholder="e.g. Marwan Mohamed" autocomplete="name">
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px;">
              Email Address *
            </label>
            <input type="email" id="authEmailInput" class="field" placeholder="name@example.com" required autocomplete="email">
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px;">
              Password *
            </label>
            <input type="password" id="authPasswordInput" class="field" placeholder="•••••••• (min 6 characters)" required autocomplete="current-password">
          </div>

          <button type="submit" id="authSubmitBtn" class="btn btn-primary" style="width: 100%; padding: 11px; font-size: 13px; font-weight: 700; margin-top: 6px;">
            ${mode === 'signin' ? 'Sign In to Workspace ⚡' : 'Create Free Account ⚡'}
          </button>
        </form>

        <!-- CLOUD BADGE -->
        <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted);">
          <span>
            ${isCloud
              ? '<span style="color: var(--green);">☁ Cloud Database Connected</span>'
              : '<span style="color: var(--violet-light);">⚡ Private Account Mode</span>'}
          </span>
          <button type="button" id="authGuestBtn" style="background: none; border: none; color: var(--cyan); cursor: pointer; text-decoration: underline; font-size: 11px;">
            Continue as Guest →
          </button>
        </div>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    let currentMode = mode;

    const setMode = newMode => {
      currentMode = newMode;
      const tabSignIn = dialog.querySelector('#authTabSignIn');
      const tabSignUp = dialog.querySelector('#authTabSignUp');
      const nameGroup = dialog.querySelector('#authNameGroup');
      const submitBtn = dialog.querySelector('#authSubmitBtn');

      if (currentMode === 'signin') {
        tabSignIn.className = 'btn-primary';
        tabSignUp.className = 'btn-secondary';
        nameGroup.style.display = 'none';
        submitBtn.textContent = 'Sign In to Workspace ⚡';
      } else {
        tabSignIn.className = 'btn-secondary';
        tabSignUp.className = 'btn-primary';
        nameGroup.style.display = 'block';
        submitBtn.textContent = 'Create Free Account ⚡';
      }
    };

    dialog.querySelector('#authTabSignIn').addEventListener('click', () => setMode('signin'));
    dialog.querySelector('#authTabSignUp').addEventListener('click', () => setMode('signup'));

    dialog.querySelector('#authModalCloseBtn').addEventListener('click', () => this.close());
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) this.close();
    });

    dialog.querySelector('#authGuestBtn').addEventListener('click', () => {
      this.close();
      Toast.info('Continuing as Guest. Account data will remain local.');
    });

    const form = dialog.querySelector('#authForm');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = dialog.querySelector('#authEmailInput').value;
      const password = dialog.querySelector('#authPasswordInput').value;
      const name = dialog.querySelector('#authNameInput').value;
      const submitBtn = dialog.querySelector('#authSubmitBtn');

      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating... ⏳';

      try {
        if (currentMode === 'signup') {
          const res = await auth.signUp({ name, email, password });
          Toast.success(res.message || 'Account created successfully! ⚡');
        } else {
          await auth.signIn({ email, password });
          Toast.success(`Welcome back, ${email}! ⚡`);
        }
        this.close();
        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) {
        Toast.error(err.message || 'Authentication failed');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    this.activeBackdrop = backdrop;
  }

  static close() {
    if (this.activeBackdrop) {
      this.activeBackdrop.remove();
      this.activeBackdrop = null;
    }
    const existing = document.getElementById('authModalBackdrop');
    if (existing) existing.remove();
  }
}
