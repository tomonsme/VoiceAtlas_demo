import { state, consentLabel } from "../state.js";
import { escapeHtml, formatDate } from "../util.js";
import { frame, errorBox, verifiedBadge, installPanel } from "./shell.js";
import { profileFields } from "./auth.js";
import { t, pick, optLabel } from "../i18n.js";

export function renderProfileEdit() {
  return frame(`<div class="page-stack">
    <div class="page-title"><h1>${escapeHtml(t("mypage.editTitle"))}</h1></div>
    <section class="card">
      <p class="muted">${escapeHtml(t("mypage.editLead"))}</p>
      ${errorBox()}
      <form id="profileForm" class="form-grid">
        ${profileFields(state.profile)}
        <div class="actions form-actions">
          <button class="primary" type="submit">${escapeHtml(t("common.save"))}</button>
          <button class="secondary" type="button" data-go-mypage>${escapeHtml(t("common.cancel"))}</button>
        </div>
      </form>
      <p class="muted">${escapeHtml(t("mypage.editFooter"))}</p>
    </section>
  </div>`);
}

export function renderConsents() {
  let body;
  if (state.consentsFailed) {
    body = `<p class="muted">${escapeHtml(t("consents.failed"))}</p>`;
  } else if (state.consents === null) {
    body = `<p class="muted">${escapeHtml(t("common.loading"))}</p>`;
  } else if (!state.consents.length) {
    body = `<p class="muted">${escapeHtml(t("consents.empty"))}</p>`;
  } else {
    const rows = state.consents
      .map(
        (consent) => `<tr>
          <td>${escapeHtml(consentLabel(consent.documentType))}</td>
          <td>v${escapeHtml(consent.version)}</td>
          <td>${escapeHtml(formatDate(consent.acceptedAt))}</td>
          <td>${
            consent.withdrawnAt
              ? `<span class="state-wait">${escapeHtml(t("consents.withdrawnOn", { date: formatDate(consent.withdrawnAt) }))}</span>`
              : `<span class="state-ok">${escapeHtml(t("consents.active"))}</span>`
          }</td>
        </tr>`
      )
      .join("");
    body = `<div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>${escapeHtml(t("consents.document"))}</th><th>${escapeHtml(t("consents.version"))}</th><th>${escapeHtml(t("consents.acceptedOn"))}</th><th>${escapeHtml(t("consents.state"))}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  return frame(`<div class="page-stack">
    <div class="page-title"><h1>${escapeHtml(t("consents.title"))}</h1></div>
    <section class="card">
      <p class="muted">${escapeHtml(t("consents.lead"))}</p>
      ${body}
      <div class="actions"><button class="secondary" data-go-mypage>${escapeHtml(t("mypage.toMypage"))}</button></div>
    </section>
  </div>`);
}

export function renderMyPage() {
  const profile = state.profile;
  const age = profile.ageRange ? optLabel(profile.ageRange) : t("profile.ageUnanswered");
  const gender = profile.gender ? optLabel(profile.gender) : t("profile.genderUnanswered");

  return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.mypage"))}</h1>
  <div class="page-stack">
    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(t("mypage.profile"))}</h2>
        <span class="muted">${escapeHtml(t("mypage.profileNote"))}</span>
      </div>
      <div class="profile-mini-head">
        <div class="avatar small" aria-hidden="true">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="34" r="24"/><path d="M22 108V78c0-23 76-23 76 0v30"/></svg>
        </div>
        <div>
          <div class="name-row"><strong class="profile-mini-name">${escapeHtml(pick(profile.nickname))}</strong>${profile.researchVerified ? verifiedBadge() : ""}</div>
          <div class="muted">${escapeHtml(age)} / ${escapeHtml(gender)}</div>
        </div>
      </div>
      <div class="profile-mini-disease">${escapeHtml(optLabel(profile.disease))}</div>
      <p class="profile-mini-text">${escapeHtml(pick(profile.conditionStatusText))}</p>
      <div class="actions"><button class="secondary" data-edit-profile>${escapeHtml(t("mypage.editProfile"))}</button></div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(t("mypage.status"))}</h2>
        <span class="muted">${escapeHtml(profile.email)}</span>
      </div>
      <div class="status-row"><span>${escapeHtml(t("mypage.terms"))}</span><span class="state-ok">${escapeHtml(t("mypage.agreed"))}</span></div>
      <div class="status-row"><span>${escapeHtml(t("mypage.registration"))}</span><span class="state-ok">${escapeHtml(t("mypage.done"))}</span></div>
      <div class="status-row"><span>${escapeHtml(t("mypage.research"))}</span><span class="${profile.researchVerified ? "state-ok" : "state-wait"}">${escapeHtml(profile.researchVerified ? t("mypage.verified") : t("mypage.notEnrolled"))}</span></div>
      <div class="actions">
        <button class="secondary" data-start-research>${escapeHtml(profile.researchVerified ? t("mypage.checkResearch") : t("mypage.joinResearch"))}</button>
        <button class="secondary" data-show-consents>${escapeHtml(t("mypage.viewConsents"))}</button>
      </div>
    </section>

    ${installPanel()}

    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(t("mypage.notifications"))}</h2>
        <span class="pill">${escapeHtml(t("mypage.plannedBadge"))}</span>
      </div>
      <ul class="notice-list">
        <li>
          <span class="notice-kind kind-research">${escapeHtml(t("mypage.kindResearch"))}</span>
          <div><strong>${escapeHtml(t("mypage.noticeResearch"))}</strong><p class="muted">${escapeHtml(t("mypage.noticeResearchNote"))}</p></div>
        </li>
        <li>
          <span class="notice-kind kind-social">${escapeHtml(t("mypage.kindSocial"))}</span>
          <div><strong>${escapeHtml(t("mypage.noticeSocial"))}</strong><p class="muted">${escapeHtml(t("mypage.noticeSocialNote"))}</p></div>
        </li>
        <li>
          <span class="notice-kind kind-safety">${escapeHtml(t("mypage.kindSafety"))}</span>
          <div><strong>${escapeHtml(t("mypage.noticeSafety"))}</strong><p class="muted">${escapeHtml(t("mypage.noticeSafetyNote"))}</p></div>
        </li>
      </ul>
    </section>
  </div>`);
}

export function renderFuture(title, kind) {
  const items = {
    search: [1, 2, 3].map((n) => [t(`search.item${n}`), t(`search.item${n}Note`)]),
    community: [1, 2, 3].map((n) => [t(`community.item${n}`), t(`community.item${n}Note`)])
  }[kind];

  const totalUsersText = state.userStatsFailed
    ? t("search.failed")
    : state.totalUsers === null
      ? "..."
      : String(state.totalUsers);

  const summary = kind === "search"
    ? `<div class="stat-row">
        <div class="stat"><span>${escapeHtml(t("search.totalUsers"))}</span><strong>${escapeHtml(totalUsersText)}</strong><small>${escapeHtml(t("search.totalUsersNote"))}</small></div>
      </div>`
    : "";

  return frame(`<h1 class="visually-hidden">${escapeHtml(title)}</h1>
  <div class="page-stack">
    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(title)}</h2>
        <span class="pill">${escapeHtml(t("mypage.plannedBadge"))}</span>
      </div>
      ${summary}
      <ul class="notice-list">
        ${items
          .map(
            (item) => `<li>
              <span class="notice-kind kind-research">${escapeHtml(t("mypage.plannedBadge"))}</span>
              <div><strong>${escapeHtml(item[0])}</strong><p class="muted">${escapeHtml(item[1])}</p></div>
            </li>`
          )
          .join("")}
      </ul>
    </section>
  </div>`);
}
