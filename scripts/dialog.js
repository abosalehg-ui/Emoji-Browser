// A small button-based chooser, replacing prompt() flows that asked people to
// type a number ("1 = merge, 2 = replace"). On mobile those opened a full
// keyboard to pick an option, and any typo cancelled silently.
//
// Resolves with the chosen option's `value`, or null when dismissed (Escape,
// backdrop click, or the cancel button).
import { t } from './i18n.js';

export function choiceDialog({ title, message = '', options }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'choice-dialog';
    const titleId = `choice-title-${Date.now()}`;
    dlg.setAttribute('aria-labelledby', titleId);

    const heading = document.createElement('h2');
    heading.id = titleId;
    heading.textContent = title;
    dlg.appendChild(heading);

    if (message) {
      const p = document.createElement('p');
      p.className = 'choice-message';
      p.textContent = message;
      dlg.appendChild(p);
    }

    const list = document.createElement('div');
    list.className = 'choice-list';
    let result = null;

    const finish = (value) => {
      result = value;
      if (typeof dlg.close === 'function' && dlg.open) dlg.close();
      else onClose();
    };

    options.forEach(({ label, value, description }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-option';
      const main = document.createElement('span');
      main.textContent = label;
      btn.appendChild(main);
      if (description) {
        const desc = document.createElement('span');
        desc.className = 'choice-desc';
        desc.textContent = description;
        btn.appendChild(desc);
      }
      btn.addEventListener('click', () => finish(value));
      list.appendChild(btn);
    });
    dlg.appendChild(list);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn-ghost choice-cancel';
    cancel.textContent = t('btnCancel');
    cancel.addEventListener('click', () => finish(null));
    dlg.appendChild(cancel);

    let settled = false;
    function onClose() {
      if (settled) return;
      settled = true;
      dlg.remove();
      resolve(result);
    }
    dlg.addEventListener('close', onClose);
    // A click whose target is the <dialog> itself landed on the backdrop.
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) finish(null);
    });

    document.body.appendChild(dlg);
    // showModal() supplies the focus trap, inert background and Escape handling.
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    const first = list.querySelector('button');
    if (first) first.focus();
  });
}
