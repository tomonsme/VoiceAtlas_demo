import { state, demoAccounts, diseases, ageRanges, genders } from "../state.js";
import { escapeHtml } from "../util.js";
import { logo, errorBox, sessionFooter } from "./shell.js";

export function renderAuth() {
  const isSignup = state.authMode === "signup";
  const accountList = demoAccounts
    .map(
      (account) => `<li>
        <button class="demo-account" data-demo-email="${escapeHtml(account.email)}">
          <span class="demo-account-name">${escapeHtml(account.label)}</span>
          <span class="demo-account-note">${escapeHtml(account.note)}</span>
        </button>
      </li>`
    )
    .join("");

  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}</div>
      <div class="auth-body">
        <h1>${isSignup ? "アカウント作成" : "ログイン"}</h1>
        <p class="muted">${
          isSignup
            ? "メールアドレスでアカウントを作成します。作成後に利用規約への同意とライト登録に進みます。"
            : "登録済みのメールアドレスでログインします。"
        }</p>
        ${errorBox()}
        <form id="authForm" class="form-grid">
          <div class="field full">
            <label for="authEmail">メールアドレス</label>
            <input id="authEmail" name="email" type="email" required autocomplete="email" placeholder="例：tippy@example.jp">
          </div>
          <div class="field full">
            <label for="authPassword">パスワード</label>
            <input id="authPassword" name="password" type="password" required value="demo"
                   autocomplete="${isSignup ? "new-password" : "current-password"}">
          </div>
          <div class="field full">
            <button class="primary" type="submit">${isSignup ? "アカウントを作成" : "ログイン"}</button>
          </div>
        </form>
        <p class="auth-switch">
          ${isSignup ? "すでにアカウントをお持ちの場合は" : "アカウントをお持ちでない場合は"}
          <button class="linklike" data-auth-mode="${isSignup ? "login" : "signup"}">${isSignup ? "ログイン" : "アカウント作成"}</button>
        </p>
        <p class="mock-note">モック環境のため、パスワードは検証されません。本番では Amazon Cognito が認証を担います。</p>
        ${isSignup ? "" : `<div class="demo-accounts"><h3>デモ用アカウント</h3><ul>${accountList}</ul></div>`}
      </div>
    </section>
  </div>`;
}

export function renderTerms() {
  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}</div>
      <div class="auth-body">
        <h1>利用規約・プライバシー同意</h1>
        <p class="muted">初回のみ表示します。研究参加の同意は、参加時に別画面で取得します。</p>
        <div class="legal-box">
          <h3>主な確認事項</h3>
          <p>VoiceAtlasは、疾患経験を持つユーザーがプロフィールを作成し、将来的に検索・交流・研究参加を行うためのWebアプリです。</p>
          <p>ライト登録では、ニックネーム、疾患、状態、任意の年代・性別のみを扱います。氏名・住所は研究参加時まで取得しません。</p>
          <p>プロフィールの公開範囲、検索への表示、通知の受け取りは、あとから設定で変更できます。退会と同意の撤回もいつでも行えます。</p>
        </div>
        <label class="check-row"><input id="termsCheck" type="checkbox"><span>利用規約とプライバシーポリシーに同意します</span></label>
        <div class="actions"><button id="acceptTerms" class="primary" disabled>同意して登録へ</button></div>
        ${sessionFooter()}
      </div>
    </section>
  </div>`;
}

export function profileFields(profile) {
  const selected = (list, current) =>
    list.map((item) => `<option ${item === current ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");

  return `<div class="field">
      <label for="nickname">ニックネーム</label>
      <input id="nickname" name="nickname" required maxlength="40" value="${escapeHtml(profile.nickname)}">
    </div>
    <div class="field">
      <label for="disease">疾患</label>
      <select id="disease" name="disease" required>${selected(diseases, profile.disease)}</select>
    </div>
    <div class="field">
      <label for="ageRange">年代（任意）</label>
      <select id="ageRange" name="ageRange">
        <option value="">未回答</option>
        ${selected(ageRanges, profile.ageRange)}
      </select>
    </div>
    <div class="field">
      <label for="gender">性別（任意）</label>
      <select id="gender" name="gender">
        <option value="">未回答</option>
        ${selected(genders, profile.gender)}
      </select>
    </div>
    <div class="field full">
      <label for="conditionStatusText">状態・ステージ・治療状況</label>
      <textarea id="conditionStatusText" name="conditionStatusText" required maxlength="420">${escapeHtml(profile.conditionStatusText)}</textarea>
    </div>`;
}

export function renderRegister() {
  const draft = {
    nickname: state.profile?.nickname || "ティッピー",
    disease: state.profile?.disease || diseases[0],
    ageRange: state.profile?.ageRange || "40代",
    gender: state.profile?.gender || "男性",
    conditionStatusText:
      state.profile?.conditionStatusText ||
      "3年前、コロナワクチン接種後に強い倦怠感から日常生活が困難になりました。筋痛性脳脊髄炎と診断されるまで2年かかり、現在も症状は改善しません。"
  };

  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}</div>
      <div class="auth-body">
        <span class="pill">ライト登録</span>
        <h1 style="margin-top:12px">1分以内で使いはじめる</h1>
        ${errorBox()}
        <form id="lightForm" class="form-grid">
          ${profileFields(draft)}
          <div class="field full"><button class="primary" type="submit">登録してホームへ</button></div>
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
    <div class="auth-head">${logo()}</div>
    <div class="auth-body">
      <h1>オフラインです</h1>
      <p class="muted">通信が復帰すると、続きから表示します。</p>
      <div class="actions"><button class="primary" data-retry-boot>再読み込み</button></div>
    </div>
  </section></div>`;
}

export function renderLoading() {
  return `<div class="auth-wrap"><section class="auth-panel"><div class="auth-head">${logo()}</div><div class="auth-body"><h1>読み込み中</h1><p class="muted">プロフィールを確認しています。</p></div></section></div>`;
}
