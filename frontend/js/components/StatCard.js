/**
 * Shared StatCard component
 * Reusable across Dashboard, Insights, and Overview sections
 */
export function createStatCard({ title, value, caption, icon, trend = null, onClick = null }) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  if (onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', onClick);
  }

  const top = document.createElement('div');
  top.className = 'stat-top';

  const titleSpan = document.createElement('span');
  titleSpan.textContent = title;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'stat-icon';
  iconDiv.textContent = icon;

  top.append(titleSpan, iconDiv);

  const numDiv = document.createElement('div');
  numDiv.className = 'stat-number';
  numDiv.textContent = value !== undefined && value !== null ? value : '0';

  const captionDiv = document.createElement('div');
  captionDiv.className = 'stat-caption';
  captionDiv.textContent = caption || '';

  if (trend) {
    const trendSpan = document.createElement('span');
    trendSpan.className = `stat-trend ${trend.positive ? 'positive' : ''}`;
    trendSpan.textContent = trend.text;
    captionDiv.prepend(trendSpan);
  }

  card.append(top, numDiv, captionDiv);
  return card;
}
