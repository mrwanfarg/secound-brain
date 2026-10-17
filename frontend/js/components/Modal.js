/**
 * Shared Modal Dialog Component
 */
export class Modal {
  static activeModal = null;

  static show({ title, content, footerButtons = [], onClose = null }) {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.addEventListener('click', () => this.close());

    header.append(titleEl, closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    dialog.append(header, body);

    // Footer
    if (footerButtons.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';

      footerButtons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn ${btnConfig.className || 'btn-secondary'}`;
        btn.textContent = btnConfig.text;
        btn.addEventListener('click', () => {
          if (btnConfig.onClick) btnConfig.onClick(dialog);
        });
        footer.appendChild(btn);
      });

      dialog.appendChild(footer);
    }

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Close on backdrop click
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) this.close();
    });

    // Close on ESC
    const escListener = e => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', escListener);

    this.activeModal = {
      element: backdrop,
      escListener,
      onClose
    };

    requestAnimationFrame(() => {
      backdrop.classList.add('open');
    });

    return { dialog, backdrop };
  }

  static close() {
    if (this.activeModal) {
      const { element, escListener, onClose } = this.activeModal;
      element.classList.remove('open');
      document.removeEventListener('keydown', escListener);
      setTimeout(() => {
        element.remove();
        if (typeof onClose === 'function') onClose();
      }, 200);
      this.activeModal = null;
    }
  }

  static confirm({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', onConfirm }) {
    const p = document.createElement('p');
    p.textContent = message;
    p.style.fontSize = '13px';
    p.style.color = 'var(--text-secondary)';
    p.style.lineHeight = '1.6';

    this.show({
      title,
      content: p,
      footerButtons: [
        { text: 'Cancel', className: 'btn-secondary', onClick: () => this.close() },
        {
          text: confirmText,
          className: 'btn-danger',
          onClick: () => {
            this.close();
            if (typeof onConfirm === 'function') onConfirm();
          }
        }
      ]
    });
  }
}
