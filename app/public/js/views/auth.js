import { state, demoAccounts, diseases, ageRanges, genders } from "../state.js";
import { escapeHtml } from "../util.js";
import { t, pick, optLabel } from "../i18n.js";
import { logo, errorBox, sessionFooter, languageSwitch } from "./shell.js";

export function renderAuth() {
  const isSignup = state.authMode === "signup";
  // ログインは初期値で埋めておき、デモは開いてボタンを押すだけで始められるようにする。
  // アカウント作成では埋めない（既存アドレスが入っていると必ず失敗するため）。
  const prefill = isSignup ? "" : demoAccounts[0]?.email || "";
  const accountList = demoAccounts
    .map(
      (account) => `<li>
        <button class="demo-account" data-demo-email="${escapeHtml(account.email)}">
          <span class="demo-account-name">${escapeHtml(t(account.labelKey))}</span>
          <span class="demo-account-note">${escapeHtml(t(account.noteKey))}</span>
        </button>
      </li>`
    )
    .join("");

  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}${languageSwitch("is-compact")}</div>
      <div class="auth-body">
        <h1>${escapeHtml(t(isSignup ? "auth.signup" : "auth.login"))}</h1>
        <p class="muted">${
          isSignup
            ? escapeHtml(t("auth.signupLead"))
            : escapeHtml(t("auth.loginLead"))
        }</p>
        ${errorBox()}
        <form id="authForm" class="form-grid">
          <div class="field full">
            <label for="authEmail">${escapeHtml(t("auth.email"))}</label>
            <input id="authEmail" name="email" type="email" required autocomplete="email"
                   value="${escapeHtml(prefill)}" placeholder="${escapeHtml(t("auth.emailPlaceholder"))}">
          </div>
          <div class="field full">
            <label for="authPassword">${escapeHtml(t("auth.password"))}</label>
            <input id="authPassword" name="password" type="password" required value="demo"
                   autocomplete="${isSignup ? "new-password" : "current-password"}">
          </div>
          <div class="field full">
            <button class="primary" type="submit">${escapeHtml(t(isSignup ? "auth.signup" : "auth.login"))}</button>
          </div>
        </form>
        <p class="auth-switch">
          ${escapeHtml(t(isSignup ? "auth.toLogin" : "auth.toSignup"))}
          <button class="linklike" data-auth-mode="${isSignup ? "login" : "signup"}">${escapeHtml(t(isSignup ? "auth.login" : "auth.signup"))}</button>
        </p>
        ${
          // 候補が1件のときは入力済みの値をなぞるだけなので出さない
          isSignup || demoAccounts.length < 2
            ? ""
            : `<div class="demo-accounts"><h3>${escapeHtml(t("auth.demoAccounts"))}</h3><ul>${accountList}</ul></div>`
        }
      </div>
    </section>
  </div>`;
}

export function renderTerms() {
  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}${languageSwitch("is-compact")}</div>
      <div class="auth-body">
        <h1>${escapeHtml(t("terms.title"))}</h1>
        <p class="muted">${escapeHtml(t("terms.lead"))}</p>
        <div class="legal-box">
          <h3>${escapeHtml(t("terms.heading"))}</h3>
          <p>${escapeHtml(t("terms.p1"))}</p>
          <p>${escapeHtml(t("terms.p2"))}</p>
          <p>${escapeHtml(t("terms.p3"))}</p>
        </div>
        <label class="check-row"><input id="termsCheck" type="checkbox"><span>${escapeHtml(t("terms.agree"))}</span></label>
        <div class="actions"><button id="acceptTerms" class="primary" disabled>${escapeHtml(t("terms.next"))}</button></div>
        ${sessionFooter()}
      </div>
    </section>
  </div>`;
}

export function profileFields(profile) {
  const selected = (list, current) =>
    list
      .map(
        (item) =>
          `<option value="${escapeHtml(item)}" ${item === current ? "selected" : ""}>${escapeHtml(optLabel(item))}</option>`
      )
      .join("");

  return `<div class="field">
      <label for="nickname">${escapeHtml(t("profile.nickname"))}</label>
      <input id="nickname" name="nickname" required maxlength="40" value="${escapeHtml(pick(profile.nickname))}">
    </div>
    <div class="field">
      <label for="disease">${escapeHtml(t("profile.disease"))}</label>
      <select id="disease" name="disease" required>${selected(diseases, profile.disease)}</select>
    </div>
    <div class="field">
      <label for="ageRange">${escapeHtml(t("profile.ageRange"))}</label>
      <select id="ageRange" name="ageRange">
        <option value="">${escapeHtml(t("profile.unanswered"))}</option>
        ${selected(ageRanges, profile.ageRange)}
      </select>
    </div>
    <div class="field">
      <label for="gender">${escapeHtml(t("profile.gender"))}</label>
      <select id="gender" name="gender">
        <option value="">${escapeHtml(t("profile.unanswered"))}</option>
        ${selected(genders, profile.gender)}
      </select>
    </div>
    <div class="field full">
      <label for="conditionStatusText">${escapeHtml(t("profile.condition"))}</label>
      <textarea id="conditionStatusText" name="conditionStatusText" required maxlength="420">${escapeHtml(pick(profile.conditionStatusText))}</textarea>
    </div>`;
}

export function renderRegister() {
  const draft = {
    nickname: pick(state.profile?.nickname) || t("register.defaultNickname"),
    disease: state.profile?.disease || diseases[0],
    // 保存される値は日本語で固定し、表示だけ optLabel が訳す
    ageRange: state.profile?.ageRange || "40代",
    gender: state.profile?.gender || "男性",
    conditionStatusText:
      pick(state.profile?.conditionStatusText) || t("register.defaultCondition")
  };

  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}${languageSwitch("is-compact")}</div>
      <div class="auth-body">
        <span class="pill">${escapeHtml(t("register.badge"))}</span>
        <h1 style="margin-top:12px">${escapeHtml(t("register.title"))}</h1>
        ${errorBox()}
        <form id="lightForm" class="form-grid">
          ${profileFields(draft)}
          <div class="field full"><button class="primary" type="submit">${escapeHtml(t("register.submit"))}</button></div>
        </form>
        ${sessionFooter()}
      </div>
    </section>
  </div>`;
}

/* Signed in but unreachable: showing the login screen here would suggest the
 * session was lost and invite a sign-in that cannot succeed. */
export function renderOffline() {
  return `<div class="auth-wrap"><section class="auth-panel">
    <div class="auth-head">${logo()}${languageSwitch("is-compact")}</div>
    <div class="auth-body">
      <h1>${escapeHtml(t("offline.title"))}</h1>
      <p class="muted">${escapeHtml(t("offline.lead"))}</p>
      <div class="actions"><button class="primary" data-retry-boot>${escapeHtml(t("offline.retry"))}</button></div>
    </div>
  </section></div>`;
}

export function renderLoading() {
  return `<div class="auth-wrap"><section class="auth-panel"><div class="auth-head">${logo()}${languageSwitch("is-compact")}</div><div class="auth-body"><h1>${escapeHtml(t("common.loading"))}</h1></div></section></div>`;
}
