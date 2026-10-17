/**
 * Authentication Modal Dialog Component
 * Handles User Sign In, Sign Up, and Mandatory Gatekeeper Onboarding
 */
import { auth } from '../auth.js';
import { Toast } from './Toast.js';
import { config } from '../config.js';

export class AuthModal {
  static open({ mode = 'signup', isGatekeeper = false, onSuccess = null } = {}) {
    this.close();

    const isCloud = config.isSupabaseConfigured;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.id = 'authModalBackdrop';
    if (isGatekeeper) {
      backdrop.style.backdropFilter = 'blur(12px)';
      backdrop.style.background = 'rgba(7, 5, 12, 0.92)';
    }

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.maxWidth = '430px';
    dialog.style.background = 'linear-gradient(180deg, #181226 0%, #110c1c 100%)';
    dialog.style.border = '1px solid rgba(155, 123, 255, 0.3)';
    dialog.style.boxShadow = '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 92, 246, 0.2)';

    dialog.innerHTML = `
      <div style="padding: 26px 28px 22px; text-align: center; position: relative;">
        ${!isGatekeeper ? `
          <button type="button" class="modal-close" id="authModalCloseBtn" style="position: absolute; right: 18px; top: 18px;">&times;</button>
        ` : ''}
        
        <div style="width: 54px; height: 54px; border-radius: 16px; margin: 0 auto 14px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); display: grid; place-items: center; box-shadow: 0 8px 26px rgba(124, 58, 237, 0.4); border: 1px solid rgba(255, 255, 255, 0.18);">
          <span style="font-size: 26px;">⚡</span>
        </div>

        <h3 style="font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 6px; letter-spacing: -0.3px;">
          Second Brain Workspace
        </h3>
        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
          ${isGatekeeper 
            ? 'Sign in or create your personal account to activate your private dashboard. You will remain logged in on this device.' 
            : 'Access your private schedule, habits, and knowledge base.'}
        </p>

        <!-- TABS -->
        <div style="display: flex; background: rgba(0,0,0,0.35); padding: 4px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 20px;">
          <button type="button" id="authTabSignUp" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 7px; border: none; cursor: pointer; transition: all 0.2s;" class="${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}">
            Create Account
          </button>
          <button type="button" id="authTabSignIn" style="flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: 7px; border: none; cursor: pointer; transition: all 0.2s;" class="${mode === 'signin' ? 'btn-primary' : 'btn-secondary'}">
            Sign In
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

          <button type="submit" id="authSubmitBtn" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 13px; font-weight: 700; margin-top: 6px; box-shadow: 0 4px 18px rgba(139, 92, 246, 0.35);">
            ${mode === 'signup' ? 'Activate My Workspace ⚡' : 'Sign In to Workspace ⚡'}
          </button>
        </form>

        <!-- FOOTER BADGE -->
        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: ${isGatekeeper ? 'center' : 'space-between'}; font-size: 11px; color: var(--muted);">
          <span>
            ${isCloud
              ? '<span style="color: var(--green);">☁ Cloud Realtime Sync Active</span>'
              : '<span style="color: var(--violet-light);">🔒 Private Encrypted Storage (Saved Permanently)</span>'}
          </span>
          ${!isGatekeeper ? `
            <button type="button" id="authGuestBtn" style="background: none; border: none; color: var(--cyan); cursor: pointer; text-decoration: underline; font-size: 11px;">
              Close
            </button>
          ` : ''}
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
        submitBtn.textContent = 'Activate My Workspace ⚡';
      }
    };

    dialog.querySelector('#authTabSignIn').addEventListener('click', () => setMode('signin'));
    dialog.querySelector('#authTabSignUp').addEventListener('click', () => setMode('signup'));

    if (!isGatekeeper) {
      dialog.querySelector('#authModalCloseBtn')?.addEventListener('click', () => this.close());
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) this.close();
      });
      dialog.querySelector('#authGuestBtn')?.addEventListener('click', () => this.close());
    }

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
          Toast.success(res.message || 'Workspace activated successfully! ⚡');
        } else {
          await auth.signIn({ email, password });
          Toast.success(`Welcome back! ⚡`);
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
