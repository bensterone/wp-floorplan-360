/**
 * helpers/confirm.js
 * Non-blocking confirmation dialog styled to match the WP admin UI.
 * Replaces native window.confirm() so the browser UI thread is never frozen.
 */

import { el } from '../helpers.js';

/* global fp360Admin */

/**
 * @param {string}    message     The confirmation message to display.
 * @param {Function}  onConfirm   Called when the user clicks OK.
 * @param {Function} [onCancel]   Called when the user clicks Cancel or presses Escape.
 */
export function fp360Confirm(message, onConfirm, onCancel) {
    const i18n = (typeof fp360Admin !== 'undefined' && fp360Admin.i18n) ? fp360Admin.i18n : {};

    const overlay   = el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100001;display:flex;align-items:center;justify-content:center;' });
    const dialog    = el('div', { style: 'background:#fff;border-radius:4px;padding:24px;max-width:420px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' });
    const msg       = el('p',   { style: 'margin:0 0 20px;font-size:14px;line-height:1.5;color:#1d2327;' }, message);
    const btnRow    = el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;' });
    const cancelBtn = el('button', { className: 'button' },         i18n.cancel || 'Cancel');
    const okBtn     = el('button', { className: 'button button-primary' }, i18n.ok || 'OK');

    const close = () => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    cancelBtn.addEventListener('click', () => { close(); if (onCancel) onCancel(); });
    okBtn.addEventListener('click',     () => { close(); onConfirm(); });
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { close(); if (onCancel) onCancel(); }
    });

    btnRow.append(cancelBtn, okBtn);
    dialog.append(msg, btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    okBtn.focus();
}
