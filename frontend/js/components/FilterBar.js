/**
 * Shared FilterBar component
 * Reusable for Tasks, Notes, and Project filters
 */
export function createFilterBar({ options, activeKey, onSelect }) {
  const bar = document.createElement('div');
  bar.className = 'filter-bar';

  options.forEach(opt => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `filter-pill ${opt.key === activeKey ? 'active' : ''}`;
    pill.dataset.filterKey = opt.key;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = opt.label;
    pill.appendChild(labelSpan);

    if (opt.count !== undefined) {
      const countSpan = document.createElement('span');
      countSpan.className = 'filter-count';
      countSpan.textContent = opt.count;
      pill.appendChild(countSpan);
    }

    pill.addEventListener('click', () => {
      bar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (typeof onSelect === 'function') {
        onSelect(opt.key);
      }
    });

    bar.appendChild(pill);
  });

  return bar;
}
