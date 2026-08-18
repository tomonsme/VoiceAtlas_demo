import { state, installPrompt } from "../state.js";
import { escapeHtml } from "../util.js";
import { isStandalone, isIosDevice } from "../pwa.js";
import { t, pick, getLang, languages } from "../i18n.js";

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
    ${escapeHtml(t("research.badge"))}
  </span>`;
}

export function errorBox() {
  return state.error ? `<div class="error" role="alert">${escapeHtml(state.error)}</div>` : "";
}

export function offlineBanner() {
  if (!state.offline) return "";
  return `<div class="offline-bar" role="status">
    ${escapeHtml(t("offline.banner"))}
  </div>`;
}

export function installPanel() {
  if (state.installDismissed || isStandalone()) return "";

  const body = installPrompt
    ? `<p class="muted">${escapeHtml(t("install.lead"))}</p>
       <div class="panel-actions"><button class="secondary" data-install-app>${escapeHtml(t("install.action"))}</button></div>`
    : isIosDevice()
      ? `<p class="muted">${escapeHtml(t("install.ios"))}</p>`
      : "";

  if (!body) return "";

  return `<section class="card install-panel">
    <div class="panel-head">
      <h3>${escapeHtml(t("install.title"))}</h3>
      <button class="linklike" data-dismiss-install>${escapeHtml(t("common.close"))}</button>
    </div>
    ${body}
  </section>`;
}

// The terms and registration screens sit outside the app shell, so they carry
// their own way out -- otherwise a freshly signed-up account is a dead end.
export function sessionFooter() {
  if (!state.profile) return "";
  return `<p class="auth-switch">
    ${escapeHtml(t("auth.signedInAs", { email: state.profile.email }))}
    <button class="linklike" data-logout>${escapeHtml(t("nav.logout"))}</button>
  </p>`;
}

/* 言語切替。ログイン前でも押せるように、シェルと認証画面の両方に置く。 */
export function languageSwitch(modifier = "") {
  const current = getLang();
  const options = languages
    .map(
      (lang) => `<button class="lang-option${lang.code === current ? " on" : ""}"
        data-lang="${lang.code}" lang="${lang.code}"
        aria-pressed="${lang.code === current}">${escapeHtml(lang.label)}</button>`
    )
    .join("");
  return `<div class="lang-switch ${modifier}" role="group" aria-label="${escapeHtml(t("common.language"))}">${options}</div>`;
}

export function accountBox() {
  const profile = state.profile;
  if (!profile) return "";
  return `<div class="side-account">
    <div class="side-account-name">${escapeHtml(pick(profile.nickname))}</div>
    <div class="side-account-email">${escapeHtml(profile.email)}</div>
    <button class="linklike" data-logout>${escapeHtml(t("nav.logout"))}</button>
  </div>`;
}

export function frame(content) {
  return `<div class="app-shell">
    <aside class="sidebar">
      ${logo()}
      <nav class="side-nav">
        ${navItem("today", t("nav.today"), "note")}
        ${navItem("search", t("nav.search"), "search")}
        ${navItem("research", t("nav.research"), "dna")}
        ${navItem("community", t("nav.community"), "chat")}
        ${navItem("mypage", t("nav.mypage"), "user")}
      </nav>
      <div class="side-foot">
        ${accountBox()}
        ${languageSwitch()}
      </div>
    </aside>
    <div class="mobile-head">${logo()}<div class="mobile-head-actions">${languageSwitch("is-compact")}${state.profile ? `<button class="linklike mobile-logout" data-logout>${escapeHtml(t("nav.logout"))}</button>` : ""}</div></div>
    <main class="main">${content}</main>
    <nav class="mobile-nav">
      ${navItem("today", t("nav.today"), "note")}
      ${navItem("search", t("nav.search"), "search")}
      ${navItem("research", t("nav.research"), "dna")}
      ${navItem("community", t("nav.community"), "chat")}
      ${navItem("mypage", t("nav.mypage"), "user")}
    </nav>
  </div>`;
}
