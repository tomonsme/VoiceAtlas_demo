const storageKey = "voiceatlas-user-id";
const app = document.getElementById("app");

const diseases = [
  "筋痛性脳脊髄炎",
  "Long COVID",
  "線維筋痛症",
  "がん",
  "自己免疫疾患",
  "希少疾患",
  "その他"
];

let state = {
  screen: "loading",
  active: "home",
  error: "",
  userId: localStorage.getItem(storageKey),
  termsAccepted: false,
  studyConsentAccepted: false,
  consentPdfOpened: false,
  totalUsers: null,
  userStatsLoading: false,
  profile: null
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[match]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
}

async function boot() {
  if (!state.userId) {
    state.screen = "terms";
    render();
    return;
  }

  try {
    const data = await api(`/api/profile/${state.userId}`);
    state.profile = data.profile;
    state.screen = "main";
  } catch (_error) {
    localStorage.removeItem(storageKey);
    state.userId = "";
    state.profile = null;
    state.screen = "terms";
  }
  render();
}

async function loadUserStats() {
  if (state.userStatsLoading) return;
  state.userStatsLoading = true;
  try {
    const data = await api("/api/search/summary");
    state.totalUsers = data.totalUsers;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.userStatsLoading = false;
    if (state.screen === "main" && state.active === "search") render();
  }
}

function logo() {
  return `<div class="brand"><img class="brand-logo" src="/assets/logo.png" alt="VoiceAtlas"></div>`;
}

function icon(name) {
  const icons = {
    home: `<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>`,
    dna: `<svg viewBox="0 0 24 24"><path d="M7 3c6 4 10 4 10 9s-4 5-10 9"/><path d="M17 3c-6 4-10 4-10 9s4 5 10 9"/><path d="M8 7h8M8 17h8M7 12h10"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
    chat: `<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-5A8 8 0 1 1 21 12z"/></svg>`
  };
  return icons[name] || icons.home;
}

function navItem(id, label, iconName) {
  const active = state.active === id ? " active" : "";
  return `<button class="nav-item${active}" data-nav="${id}" aria-label="${label}" title="${label}">${icon(iconName)}<span>${label}</span></button>`;
}

function verifiedBadge() {
  return `<span class="badge">
    <svg viewBox="0 0 24 24"><path d="M12 2 15 8l6 .9-4.5 4.4 1 6.2L12 16.6 6.5 19.5l1-6.2L3 8.9 9 8z"/></svg>
    研究認証
  </span>`;
}

function frame(content) {
  return `<div class="app-shell">
    <aside class="sidebar">
      ${logo()}
      <nav class="side-nav">
        ${navItem("home", "ホーム", "home")}
        ${navItem("search", "検索", "search")}
        ${navItem("research", "研究", "dna")}
        ${navItem("alerts", "通知", "bell")}
        ${navItem("community", "交流", "chat")}
      </nav>
      <button class="reset" data-reset>初期状態に戻す</button>
    </aside>
    <div class="mobile-head">${logo()}</div>
    <main class="main">${content}</main>
    <nav class="mobile-nav">
      ${navItem("home", "ホーム", "home")}
      ${navItem("search", "検索", "search")}
      ${navItem("research", "研究", "dna")}
      ${navItem("alerts", "通知", "bell")}
      ${navItem("community", "交流", "chat")}
    </nav>
  </div>`;
}

function renderTerms() {
  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}</div>
      <div class="auth-body">
        <h1>利用規約・プライバシー同意</h1>
        <p class="muted">初回起動時のみ表示します。研究参加の同意は、参加時に別画面で取得します。</p>
        <div class="legal-box">
          <h3>主な確認事項</h3>
          <p>VoiceAtlasは、疾患経験を持つユーザーがプロフィールを作成し、将来的に検索・交流・研究参加を行うためのWebアプリです。</p>
          <p>ライト登録では、ニックネーム、疾患、状態、任意の年代・性別のみを扱います。氏名・住所は研究参加時まで取得しません。</p>
          <p>投稿やプロフィール公開範囲、検索表示、通知、退会、同意撤回に対応できる構成にします。</p>
        </div>
        <label class="check-row"><input id="termsCheck" type="checkbox"><span>利用規約とプライバシーポリシーに同意します</span></label>
        <div class="actions"><button id="acceptTerms" class="primary" disabled>同意して登録へ</button></div>
      </div>
    </section>
  </div>`;
}

function renderRegister() {
  const error = state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : "";
  return `<div class="auth-wrap">
    <section class="auth-panel">
      <div class="auth-head">${logo()}</div>
      <div class="auth-body">
        <span class="pill">ライト登録</span>
        <h1 style="margin-top:12px">1分以内で使いはじめる</h1>
        ${error}
        <form id="lightForm" class="form-grid">
          <div class="field">
            <label>ニックネーム</label>
            <input name="nickname" required maxlength="40" value="ティッピー">
          </div>
          <div class="field">
            <label>疾患</label>
            <select name="disease" required>${diseases.map((disease) => `<option>${escapeHtml(disease)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>年代（任意）</label>
            <select name="ageRange">
              <option value="">未回答</option>
              ${["10代", "20代", "30代", "40代", "50代", "60代", "70代以上"].map((age) => `<option ${age === "40代" ? "selected" : ""}>${age}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>性別（任意）</label>
            <select name="gender">
              <option value="">未回答</option>
              ${["女性", "男性", "ノンバイナリー", "回答しない"].map((gender) => `<option ${gender === "男性" ? "selected" : ""}>${gender}</option>`).join("")}
            </select>
          </div>
          <div class="field full">
            <label>状態・ステージ・治療状況</label>
            <textarea name="conditionStatusText" required maxlength="420">3年前、コロナワクチン接種後に強い倦怠感から日常生活が困難になりました。筋痛性脳脊髄炎と診断されるまで2年かかり、現在も症状は改善しません。</textarea>
          </div>
          <div class="field full"><button class="primary" type="submit">登録してホームへ</button></div>
        </form>
      </div>
    </section>
  </div>`;
}

function renderHome() {
  const profile = state.profile;
  const age = profile.ageRange || "年代未回答";
  const gender = profile.gender || "性別未回答";
  const content = `<div class="home-layout">
    <section class="home-primary">
      <div class="brand-strip">${logo()}${profile.researchVerified ? verifiedBadge() : ""}</div>
      <div class="profile-body">
        <div class="profile-head">
          <div class="avatar" aria-hidden="true">
            <svg viewBox="0 0 120 120"><circle cx="60" cy="34" r="24"/><path d="M22 108V78c0-23 76-23 76 0v30"/></svg>
          </div>
          <div>
            <div class="name-row"><div class="name">${escapeHtml(profile.nickname)}</div>${profile.researchVerified ? verifiedBadge() : ""}</div>
            <div style="font-size:18px;font-weight:800">${escapeHtml(age)} / ${escapeHtml(gender)}</div>
            <div class="disease">${escapeHtml(profile.disease)}</div>
          </div>
        </div>
        <div class="profile-text">＜プロフィール＞<br>${escapeHtml(profile.conditionStatusText)}</div>
        <div class="home-cta"><button class="primary" data-start-research>${profile.researchVerified ? "研究登録を確認" : "研究に参加"}</button></div>
      </div>
    </section>
    <aside class="context-stack">
      <section class="panel">
        <h3>登録状況</h3>
        <div class="status-row"><span>利用規約</span><span class="state-ok">同意済み</span></div>
        <div class="status-row"><span>ライト登録</span><span class="state-ok">完了</span></div>
        <div class="status-row"><span>研究参加</span><span class="${profile.researchVerified ? "state-ok" : "state-wait"}">${profile.researchVerified ? "認証済み" : "未登録"}</span></div>
      </section>
      <section class="panel">
        <h3>公開範囲</h3>
        <p class="muted">ホームに出る情報はニックネーム、疾患、状態、任意属性のみ。氏名・住所は研究参加用領域に分離します。</p>
      </section>
    </aside>
  </div>`;
  return frame(content);
}

function renderStudyConsent() {
  return frame(`<section class="flow">
    <div class="flow-head"><h1>研究参加の同意</h1><p>通常利用とは別の同意として記録します。</p></div>
    <div class="flow-body">
      <div class="consent-points">
        <div class="point"><b>1</b><p>研究目的、取得項目、利用範囲、撤回方法は <a href="/research-consent-test.pdf" target="_blank" rel="noopener" data-consent-pdf-link>こちらから確認します</a>。<span id="pdfStatus" class="pdf-status">${state.consentPdfOpened ? "確認済み" : "未確認"}</span></p></div>
        <div class="point"><b>2</b><p>研究参加後に、氏名と住所を研究用本人情報として登録します。</p></div>
        <div class="point"><b>3</b><p>研究登録が完了すると、ホーム画面に研究認証バッジが表示されます。</p></div>
      </div>
      <label class="check-row"><input class="study-check" type="checkbox"><span>研究参加説明を確認しました</span></label>
      <label class="check-row"><input class="study-check" type="checkbox"><span>研究用本人情報の登録に同意します</span></label>
      <div class="actions">
        <button class="secondary" data-nav="home">戻る</button>
        <button id="studyNext" class="primary" disabled>同意して本人情報へ</button>
      </div>
    </div>
  </section>`);
}

function renderIdentity() {
  const error = state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : "";
  return frame(`<section class="flow">
    <div class="flow-head"><h1>研究用本人情報</h1><p>氏名・住所は研究参加登録にのみ紐づけます。</p></div>
    <div class="flow-body">
      ${error}
      <form id="identityForm" class="form-grid">
        <div class="field full"><label>氏名</label><input name="legalName" required placeholder="例：山田 太郎"></div>
        <div class="field"><label>郵便番号</label><input name="postalCode" required inputmode="numeric" placeholder="例：5670000"></div>
        <div class="field"><label>都道府県</label><input name="prefecture" required value="大阪府"></div>
        <div class="field"><label>市区町村</label><input name="city" required value="茨木市"></div>
        <div class="field"><label>番地・建物名</label><input name="addressLine1" required></div>
        <div class="field full"><label>補足（任意）</label><input name="addressLine2"></div>
        <div class="field full"><button class="primary" type="submit">研究登録を完了</button></div>
      </form>
    </div>
  </section>`);
}

function renderResearchStatus() {
  const error = state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : "";
  return frame(`<section class="flow">
    <div class="flow-head"><h1>研究登録</h1><p>研究認証バッジがホーム画面に表示されています。</p></div>
    <div class="flow-body">
      ${error}
      <p>${verifiedBadge()}</p>
      <div class="status-row"><span>参加ステータス</span><span class="state-ok">完了</span></div>
      <div class="status-row"><span>本人情報</span><span class="state-ok">登録済み</span></div>
      <div class="actions">
        <button class="primary" data-nav="home">ホームへ</button>
        <button class="secondary danger" data-withdraw-research>研究同意を撤回</button>
      </div>
    </div>
  </section>`);
}

function renderFuture(title, kind) {
  const items = {
    search: [["ユーザー検索", "疾患、年代、公開範囲で検索"], ["プライバシー", "検索表示はユーザーが制御"], ["ブロック", "不安な相手を非表示"]],
    alerts: [["研究通知", "同意更新や参加状況を通知"], ["交流通知", "コメント、返信、メンション"], ["安全通知", "通報対応や制限の連絡"]],
    community: [["コミュニティ", "疾患別・地域別・研究別に作成"], ["投稿", "公開範囲つきの本文投稿"], ["モデレーション", "通報、削除、権限管理"]]
  }[kind];
  const searchSummary = kind === "search"
    ? `<section class="search-summary">
        <div>
          <span>総ユーザー数</span>
          <strong>${state.totalUsers === null ? "..." : escapeHtml(state.totalUsers)}</strong>
        </div>
      </section>`
    : "";

  return frame(`<div class="page-title"><div><span class="pill">拡張予定</span><h1 style="margin-top:10px">${title}</h1></div></div>
    ${searchSummary}
    <section class="future-grid">${items.map((item) => `<div class="future-item"><h3>${item[0]}</h3><p class="muted">${item[1]}</p></div>`).join("")}</section>`);
}

function renderLoading() {
  return `<div class="auth-wrap"><section class="auth-panel"><div class="auth-head">${logo()}</div><div class="auth-body"><h1>読み込み中</h1><p class="muted">プロフィールを確認しています。</p></div></section></div>`;
}

function render() {
  if (state.screen === "loading") app.innerHTML = renderLoading();
  if (state.screen === "terms") app.innerHTML = renderTerms();
  if (state.screen === "register") app.innerHTML = renderRegister();
  if (state.screen === "studyConsent") app.innerHTML = renderStudyConsent();
  if (state.screen === "identity") app.innerHTML = renderIdentity();
  if (state.screen === "main") {
    if (state.active === "home") app.innerHTML = renderHome();
    if (state.active === "search") app.innerHTML = renderFuture("ユーザー検索", "search");
    if (state.active === "alerts") app.innerHTML = renderFuture("通知", "alerts");
    if (state.active === "community") app.innerHTML = renderFuture("交流コミュニティ", "community");
    if (state.active === "research") app.innerHTML = state.profile?.researchVerified ? renderResearchStatus() : renderStudyConsent();
  }
  bind();
  if (state.screen === "main" && state.active === "search" && state.totalUsers === null) loadUserStats();
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      const nav = button.dataset.nav;
      if (nav === "research" && !state.profile?.researchVerified) {
        state.screen = "studyConsent";
        state.active = "research";
      } else {
        state.screen = "main";
        state.active = nav;
      }
      render();
    });
  });

  document.querySelectorAll("[data-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.removeItem(storageKey);
      state = {
        screen: "terms",
        active: "home",
        error: "",
        userId: "",
        termsAccepted: false,
        studyConsentAccepted: false,
        consentPdfOpened: false,
        totalUsers: null,
        userStatsLoading: false,
        profile: null
      };
      render();
    });
  });

  const termsCheck = document.getElementById("termsCheck");
  const acceptTerms = document.getElementById("acceptTerms");
  if (termsCheck && acceptTerms) {
    termsCheck.addEventListener("change", () => {
      acceptTerms.disabled = !termsCheck.checked;
    });
    acceptTerms.addEventListener("click", () => {
      state.termsAccepted = true;
      state.screen = "register";
      render();
    });
  }

  const lightForm = document.getElementById("lightForm");
  if (lightForm) {
    lightForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(lightForm);
      try {
        const data = await api("/api/light-registration", {
          method: "POST",
          body: JSON.stringify({
            termsAccepted: state.termsAccepted,
            nickname: form.get("nickname"),
            disease: form.get("disease"),
            ageRange: form.get("ageRange"),
            gender: form.get("gender"),
            conditionStatusText: form.get("conditionStatusText")
          })
        });
        state.profile = data.profile;
        state.userId = data.profile.id;
        localStorage.setItem(storageKey, data.profile.id);
        state.screen = "main";
        state.active = "home";
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  }

  document.querySelectorAll("[data-start-research]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      if (state.profile?.researchVerified) {
        state.screen = "main";
        state.active = "research";
      } else {
        state.screen = "studyConsent";
        state.active = "research";
      }
      render();
    });
  });

  const studyChecks = [...document.querySelectorAll(".study-check")];
  const studyNext = document.getElementById("studyNext");
  if (studyChecks.length && studyNext) {
    const pdfStatus = document.getElementById("pdfStatus");
    const updateStudyNext = () => {
      studyNext.disabled = !state.consentPdfOpened || !studyChecks.every((item) => item.checked);
      if (pdfStatus) {
        pdfStatus.textContent = state.consentPdfOpened ? "確認済み" : "未確認";
        pdfStatus.classList.toggle("done", state.consentPdfOpened);
      }
    };
    studyChecks.forEach((check) => {
      check.addEventListener("change", updateStudyNext);
    });
    document.querySelectorAll("[data-consent-pdf-link]").forEach((link) => {
      link.addEventListener("click", () => {
        state.consentPdfOpened = true;
        updateStudyNext();
      });
    });
    updateStudyNext();
    studyNext.addEventListener("click", () => {
      state.studyConsentAccepted = true;
      state.screen = "identity";
      render();
    });
  }

  const identityForm = document.getElementById("identityForm");
  if (identityForm) {
    identityForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(identityForm);
      try {
        const data = await api("/api/research/enroll", {
          method: "POST",
          body: JSON.stringify({
            userId: state.userId,
            researchConsentAccepted: state.studyConsentAccepted,
            legalName: form.get("legalName"),
            postalCode: form.get("postalCode"),
            prefecture: form.get("prefecture"),
            city: form.get("city"),
            addressLine1: form.get("addressLine1"),
            addressLine2: form.get("addressLine2")
          })
        });
        state.profile = data.profile;
        state.consentPdfOpened = false;
        state.screen = "main";
        state.active = "home";
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  }

  document.querySelectorAll("[data-withdraw-research]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("研究参加の同意を撤回しますか？")) return;
      try {
        const data = await api("/api/research/withdraw", {
          method: "POST",
          body: JSON.stringify({ userId: state.userId })
        });
        state.profile = data.profile;
        state.studyConsentAccepted = false;
        state.screen = "main";
        state.active = "home";
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  });
}

boot();
