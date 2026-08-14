import { state, consentLabels } from "../state.js";
import { escapeHtml, formatDate } from "../util.js";
import { frame, errorBox, verifiedBadge, installPanel } from "./shell.js";
import { profileFields } from "./auth.js";

export function renderProfileEdit() {
  return frame(`<div class="page-stack">
    <div class="page-title"><h1>プロフィールを編集</h1></div>
    <section class="card">
      <p class="muted">マイページと検索に表示される情報です。氏名・住所は含まれません。</p>
      ${errorBox()}
      <form id="profileForm" class="form-grid">
        ${profileFields(state.profile)}
        <div class="actions form-actions">
          <button class="primary" type="submit">変更を保存</button>
          <button class="secondary" type="button" data-go-mypage>キャンセル</button>
        </div>
      </form>
      <p class="muted">状態の変更履歴はサーバに残ります。過去の記述が上書きで消えることはありません。</p>
    </section>
  </div>`);
}

export function renderConsents() {
  let body;
  if (state.consentsFailed) {
    body = `<p class="muted">同意履歴を取得できませんでした。</p>`;
  } else if (state.consents === null) {
    body = `<p class="muted">読み込み中です。</p>`;
  } else if (!state.consents.length) {
    body = `<p class="muted">同意の記録はまだありません。</p>`;
  } else {
    const rows = state.consents
      .map(
        (consent) => `<tr>
          <td>${escapeHtml(consentLabels[consent.documentType] || consent.documentType)}</td>
          <td>v${escapeHtml(consent.version)}</td>
          <td>${escapeHtml(formatDate(consent.acceptedAt))}</td>
          <td>${
            consent.withdrawnAt
              ? `<span class="state-wait">${escapeHtml(formatDate(consent.withdrawnAt))} 撤回</span>`
              : `<span class="state-ok">有効</span>`
          }</td>
        </tr>`
      )
      .join("");
    body = `<div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>文書</th><th>版</th><th>同意日</th><th>状態</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  return frame(`<div class="page-stack">
    <div class="page-title"><h1>同意履歴</h1></div>
    <section class="card">
      <p class="muted">いつ、どの文書のどの版に同意し、いつ撤回したかの記録です。</p>
      ${body}
      <div class="actions"><button class="secondary" data-go-mypage>マイページへ</button></div>
    </section>
  </div>`);
}

export function renderMyPage() {
  const profile = state.profile;
  const age = profile.ageRange || "年代未回答";
  const gender = profile.gender || "性別未回答";

  return frame(`<h1 class="visually-hidden">マイページ</h1>
  <div class="page-stack">
    <section class="card">
      <div class="card-head">
        <h2>プロフィール</h2>
        <span class="muted">検索や交流で表示される情報です</span>
      </div>
      <div class="profile-mini-head">
        <div class="avatar small" aria-hidden="true">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="34" r="24"/><path d="M22 108V78c0-23 76-23 76 0v30"/></svg>
        </div>
        <div>
          <div class="name-row"><strong class="profile-mini-name">${escapeHtml(profile.nickname)}</strong>${profile.researchVerified ? verifiedBadge() : ""}</div>
          <div class="muted">${escapeHtml(age)} / ${escapeHtml(gender)}</div>
        </div>
      </div>
      <div class="profile-mini-disease">${escapeHtml(profile.disease)}</div>
      <p class="profile-mini-text">${escapeHtml(profile.conditionStatusText)}</p>
      <div class="actions"><button class="secondary" data-edit-profile>プロフィールを編集</button></div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>登録状況</h2>
        <span class="muted">${escapeHtml(profile.email)}</span>
      </div>
      <div class="status-row"><span>利用規約</span><span class="state-ok">同意済み</span></div>
      <div class="status-row"><span>ライト登録</span><span class="state-ok">完了</span></div>
      <div class="status-row"><span>研究参加</span><span class="${profile.researchVerified ? "state-ok" : "state-wait"}">${profile.researchVerified ? "認証済み" : "未登録"}</span></div>
      <div class="actions">
        <button class="secondary" data-start-research>${profile.researchVerified ? "研究登録を確認" : "研究に参加"}</button>
        <button class="secondary" data-show-consents>同意履歴を見る</button>
      </div>
    </section>

    ${installPanel()}

    <section class="card">
      <div class="card-head">
        <h2>通知</h2>
        <span class="pill">拡張予定</span>
      </div>
      <ul class="notice-list">
        <li>
          <span class="notice-kind kind-research">研究</span>
          <div><strong>研究通知</strong><p class="muted">同意更新、検体の進捗、参加状況の変化</p></div>
        </li>
        <li>
          <span class="notice-kind kind-social">交流</span>
          <div><strong>交流通知</strong><p class="muted">コメント、返信、メンション</p></div>
        </li>
        <li>
          <span class="notice-kind kind-safety">安全</span>
          <div><strong>安全通知</strong><p class="muted">通報対応や制限の連絡</p></div>
        </li>
      </ul>
    </section>
  </div>`);
}

export function renderFuture(title, kind) {
  const items = {
    search: [["ユーザー検索", "疾患、年代、公開範囲で検索"], ["プライバシー", "検索表示はユーザーが制御"], ["ブロック", "不安な相手を非表示"]],
    community: [["コミュニティ", "疾患別・地域別・研究別に作成"], ["投稿", "公開範囲つきの本文投稿"], ["モデレーション", "通報、削除、権限管理"]]
  }[kind];

  const totalUsersText = state.userStatsFailed
    ? "取得できませんでした"
    : state.totalUsers === null
      ? "..."
      : String(state.totalUsers);

  const summary = kind === "search"
    ? `<div class="stat-row">
        <div class="stat"><span>総ユーザー数</span><strong>${escapeHtml(totalUsersText)}</strong><small>登録済みのアカウント</small></div>
      </div>`
    : "";

  return frame(`<h1 class="visually-hidden">${escapeHtml(title)}</h1>
  <div class="page-stack">
    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(title)}</h2>
        <span class="pill">拡張予定</span>
      </div>
      ${summary}
      <ul class="notice-list">
        ${items
          .map(
            (item) => `<li>
              <span class="notice-kind kind-research">予定</span>
              <div><strong>${escapeHtml(item[0])}</strong><p class="muted">${escapeHtml(item[1])}</p></div>
            </li>`
          )
          .join("")}
      </ul>
    </section>
  </div>`);
}
