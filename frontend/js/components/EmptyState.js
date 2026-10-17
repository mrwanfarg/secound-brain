/**
 * Shared EmptyState component
 */
export function createEmptyState({ icon = '📋', title = 'No items found', description = 'Get started by creating your first entry.', actionText = null, onAction = null }) {
  const container = document.createElement('div');
  container.className = 'empty-state';

  const iconEl = document.createElement('div');
  iconEl.className = 'empty-state-icon';
  iconEl.textContent = icon;

  const titleEl = document.createElement('div');
  titleEl.className = 'empty-state-title';
  titleEl.textContent = title;

  const descEl = document.createElement('div');
  descEl.className = 'empty-state-desc';
  descEl.textContent = description;

  container.append(iconEl, titleEl, descEl);

  if (actionText && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-small';
    btn.style.marginTop = '10px';
    btn.textContent = actionText;
    btn.addEventListener('click', onAction);
    container.appendChild(btn);
  }

  return container;
}
