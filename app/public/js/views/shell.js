import { state, installPrompt } from "../state.js";
import { escapeHtml } from "../util.js";
import { isStandalone, isIosDevice } from "../pwa.js";

export function logo() {
  return `<div class="brand"><img class="brand-logo" src="/assets/logo.png" alt="VoiceAtlas"></div>`;
}

export function icon(name) {
  const icons = {
    home: `<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>`,
    dna: `<svg viewBox="0 0 24 24"><path d="M7 3c6 4 10 4 10 9s-4 5-10 9"/><path d="M17 3c-6 4-10 4-10 9s4 5 10 9"/><path d="M8 7h8M8 17h8M7 12h10"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
    user: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1c0-3.3 3.6-5 8-5s8 1.7 8 5v1"/></svg>`,
    note: `<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9 15 2 2 4-4"/></svg>`,
    chat: `<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-5A8 8 0 1 1 21 12z"/></svg>`
  };
  return icons[name] || icons.home;
}

export function navItem(id, label, iconName) {
  const active = state.active === id ? " active" : "";
  return `<button class="nav-item${active}" data-nav="${id}" aria-label="${label}" title="${label}">${icon(iconName)}<span>${label}</span></button>`;
}

export function verifiedBadge() {
  return `<span class="badge">
    <svg viewBox="0 0 24 24"><path d="M12 2 15 8l6 .9-4.5 4.4 1 6.2L12 16.6 6.5 19.5l1-6.2L3 8.9 9 8z"/></svg>
    研究認証
  </span>`;
}

export function errorBox() {
  return state.error ? `<div class="error" role="alert">${escapeHtml(state.error)}</div>` : "";
}

export function offlineBanner() {
  if (!state.offline) return "";
  return `<div class="offline-bar" role="status">
    オフラインです。表示中の内容は最新でない場合があります。
  </div>`;
}

export function installPanel() {
  if (state.installDismissed || isStandalone()) return "";

  const body = installPrompt
    ? `<p class="muted">ホーム画面に追加すると、ブラウザのバーがない画面で使えます。</p>
       <div class="panel-actions"><button class="secondary" data-install-app>アプリとしてインストール</button></div>`
    : isIosDevice()
      ? `<p class="muted">画面下部の共有ボタン <span class="ios-share" aria-hidden="true">⬆︎</span> から「ホーム画面に追加」を選ぶと、アプリとして使えます。</p>`
      : "";

  if (!body) return "";

  return `<section class="card install-panel">
    <div class="panel-head">
      <h3>アプリとして使う</h3>
      <button class="linklike" data-dismiss-install>閉じる</button>
    </div>
    ${body}
  </section>`;
}

// The terms and registration screens sit outside the app shell, so they carry
// their own way out -- otherwise a freshly signed-up account is a dead end.
export function sessionFooter() {
  if (!state.profile) return "";
  return `<p class="auth-switch">
    ${escapeHtml(state.profile.email)} でログイン中
    <button class="linklike" data-logout>ログアウト</button>
  </p>`;
}

export function accountBox() {
  const profile = state.profile;
  if (!profile) return "";
  return `<div class="side-account">
    <div class="side-account-name">${escapeHtml(profile.nickname)}</div>
    <div class="side-account-email">${escapeHtml(profile.email)}</div>
    <button class="linklike" data-logout>ログアウト</button>
  </div>`;
}

export function frame(content) {
  return `<div class="app-shell">
    <aside class="sidebar">
      ${logo()}
      <nav class="side-nav">
        ${navItem("today", "本日の記録", "note")}
        ${navItem("search", "検索", "search")}
        ${navItem("research", "研究", "dna")}
        ${navItem("community", "交流", "chat")}
        ${navItem("mypage", "マイページ", "user")}
      </nav>
      ${accountBox()}
    </aside>
    <div class="mobile-head">${logo()}${state.profile ? `<button class="linklike mobile-logout" data-logout>ログアウト</button>` : ""}</div>
    <main class="main">${content}</main>
    <nav class="mobile-nav">
      ${navItem("today", "本日の記録", "note")}
      ${navItem("search", "検索", "search")}
      ${navItem("research", "研究", "dna")}
      ${navItem("community", "交流", "chat")}
      ${navItem("mypage", "マイページ", "user")}
    </nav>
  </div>`;
}
