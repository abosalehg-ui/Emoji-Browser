import * as state from './state.js';
import { t, getLang } from './i18n.js';
import { escapeHtml } from './utils.js';

export function recordUsage(emoji) {
  const stats = { ...state.get('stats') };
  stats.counts = { ...(stats.counts || {}) };
  stats.firstSeen = { ...(stats.firstSeen || {}) };
  stats.lastUsed = { ...(stats.lastUsed || {}) };

  stats.counts[emoji] = (stats.counts[emoji] || 0) + 1;
  const now = Date.now();
  if (!stats.firstSeen[emoji]) stats.firstSeen[emoji] = now;
  stats.lastUsed[emoji] = now;
  state.set('stats', stats);
}

export function totalCopies() {
  const counts = state.get('stats').counts || {};
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

export function uniqueCount() {
  return Object.keys(state.get('stats').counts || {}).length;
}

export function topUsed(n = 10) {
  const counts = state.get('stats').counts || {};
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function resetStats() {
  state.set('stats', { counts: {}, firstSeen: {}, lastUsed: {} });
}

export function renderDashboard(container) {
  const lang = getLang();
  const total = totalCopies();
  const unique = uniqueCount();
  const top = topUsed(10);
  const favCount = state.get('favorites').length;
  const collCount = state.get('collections').length;
  const maxCount = top.length ? top[0][1] : 1;

  container.innerHTML = `
    <div class="stats-section">
      <div class="stats-card">
        <h3>${t('statsTotalCopies')}</h3>
        <div class="stat-number">${total}</div>
      </div>
      <div class="stats-card">
        <h3>${t('statsUniqueEmojis')}</h3>
        <div class="stat-number">${unique}</div>
      </div>
      <div class="stats-card">
        <h3>${t('statsFavCount')}</h3>
        <div class="stat-number">${favCount}</div>
      </div>
      <div class="stats-card">
        <h3>${t('statsCollectionsCount')}</h3>
        <div class="stat-number">${collCount}</div>
      </div>
    </div>
    <div class="stats-card">
      <h3>${t('statsTopUsed')}</h3>
      <div id="topUsedChart"></div>
    </div>
    <div style="margin-top: 20px; text-align: center;">
      <button class="btn btn-danger" id="resetStatsBtn">${t('btnReset')}</button>
    </div>
  `;

  const chart = container.querySelector('#topUsedChart');
  if (!top.length) {
    chart.innerHTML = `<div class="empty-state" style="padding: 20px;">${escapeHtml(
      t('emptyRecent')
    )}</div>`;
  } else {
    top.forEach(([emoji, count]) => {
      const pct = Math.max(2, (count / maxCount) * 100);
      const row = document.createElement('div');
      row.className = 'chart-bar';
      row.innerHTML = `
        <span class="bar-emoji">${emoji}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-value">${count}</span>
      `;
      chart.appendChild(row);
    });
  }

  const btn = container.querySelector('#resetStatsBtn');
  btn.addEventListener('click', () => {
    if (confirm(t('confirmResetStats'))) {
      resetStats();
      renderDashboard(container);
    }
  });
}
