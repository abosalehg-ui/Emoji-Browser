let notificationTimeoutId = null;

export function showNotification(message, type = 'success') {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = message;
  el.className = 'notification' + (type === 'error' ? ' error' : '');
  el.classList.add('show');

  const live = document.getElementById('srNotify');
  if (live) live.textContent = message;

  if (notificationTimeoutId) clearTimeout(notificationTimeoutId);
  notificationTimeoutId = setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}
