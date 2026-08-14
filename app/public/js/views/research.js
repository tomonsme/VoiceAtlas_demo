import { state, levelLabels } from "../state.js";
import { escapeHtml, formatDate } from "../util.js";
import { frame, errorBox, verifiedBadge, icon } from "./shell.js";

export function renderStudyConsent() {
  return frame(`<div class="page-stack">
    <div class="page-title"><h1>研究参加の同意</h1></div>
    <section class="card">
      <p class="muted">通常利用とは別の同意として記録します。</p>
      <div class="consent-points">
        <div class="point"><b>1</b><p>研究目的、取得項目、利用範囲、撤回方法は <a href="/assets/research-consent.pdf" target="_blank" rel="noopener" data-consent-pdf-link>こちらから確認します</a>。<span id="pdfStatus" class="pdf-status">${state.consentPdfOpened ? "確認済み" : "未確認"}</span></p></div>
        <div class="point"><b>2</b><p>研究参加後に、氏名と住所を研究用本人情報として登録します。</p></div>
        <div class="point"><b>3</b><p>研究登録が完了すると、ホーム画面に研究認証バッジが表示されます。</p></div>
      </div>
      <label class="check-row"><input class="study-check" type="checkbox"><span>研究参加説明を確認しました</span></label>
      <label class="check-row"><input class="study-check" type="checkbox"><span>研究用本人情報の登録に同意します</span></label>
      <div class="actions">
        <button class="secondary" data-back-to-studies>戻る</button>
        <button id="studyNext" class="primary" disabled>同意して本人情報へ</button>
      </div>
    </section>
  </div>`);
}

export function renderIdentity() {
  return frame(`<div class="page-stack">
    <div class="page-title"><h1>研究用本人情報</h1></div>
    <section class="card">
      <p class="muted">氏名・住所は研究参加登録にのみ紐づけます。</p>
      ${errorBox()}
      <form id="identityForm" class="form-grid">
        <div class="field full"><label for="legalName">氏名</label><input id="legalName" name="legalName" required autocomplete="name" placeholder="例：山田 太郎"></div>
        <div class="field"><label for="postalCode">郵便番号</label><input id="postalCode" name="postalCode" required inputmode="numeric" autocomplete="postal-code" placeholder="例：5670000"></div>
        <div class="field"><label for="prefecture">都道府県</label><input id="prefecture" name="prefecture" required autocomplete="address-level1" value="大阪府"></div>
        <div class="field"><label for="city">市区町村</label><input id="city" name="city" required autocomplete="address-level2" value="茨木市"></div>
        <div class="field"><label for="addressLine1">番地・建物名</label><input id="addressLine1" name="addressLine1" required autocomplete="address-line1"></div>
        <div class="field full"><label for="addressLine2">補足（任意）</label><input id="addressLine2" name="addressLine2" autocomplete="address-line2"></div>
        <div class="field full"><button class="primary" type="submit">研究登録を完了</button></div>
      </form>
    </section>
  </div>`);
}

export function stepIcon(name) {
  const icons = {
    package: `<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>`,
    home: `<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>`,
    truck: `<path d="M3 6h11v11H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>`,
    building: `<path d="M4 21V5l8-3 8 3v16"/><path d="M4 21h16M9 21v-5h6v5"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1"/>`,
    clipboard: `<path d="M9 4h6v3H9z"/><path d="M15 5h3v15H6V5h3"/><path d="m9 13 2 2 4-4"/>`,
    flask: `<path d="M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 16h8"/>`,
    check: `<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>`,
    database: `<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>`,
    trash: `<path d="M4 7h16M9 7V4h6v3"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>`
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.package}</svg>`;
}

export function boundaryLine(icon, title, meta, modifier = "") {
  const icons = {
    clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    lock: `<path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="5" y="11" width="14" height="10" rx="2"/>`
  };
  return `<li class="timeline-boundary ${modifier}">
    <svg viewBox="0 0 24 24" aria-hidden="true">${icons[icon]}</svg>
    <div class="boundary-body">
      <span class="boundary-title">${escapeHtml(title)}</span>
      ${meta ? `<span class="boundary-meta">${escapeHtml(meta)}</span>` : ""}
    </div>
  </li>`;
}

export function analysisBoundary(withdrawal) {
  const entry = withdrawal.fullWithdrawal;

  if (!entry || !entry.at) {
    return boundaryLine("lock", "ここから先は全面撤回できません", "");
  }

  if (entry.passed) {
    return boundaryLine(
      "lock",
      "ここから先は全面撤回できません",
      `${formatDate(entry.at)}に解析を開始しました`
    );
  }

  return boundaryLine(
    "clock",
    "ここまでは全面撤回できます",
    `${entry.basis} ${formatDate(entry.at)} ・ あと${entry.daysLeft}日`,
    "is-open"
  );
}

export function dataLockBoundary(withdrawal) {
  const entry = withdrawal.dataLock;
  if (!entry || !entry.at) return "";

  return boundaryLine(
    entry.passed ? "lock" : "clock",
    entry.passed
      ? "データは固定済みです。統計処理に含まれたデータは取り出せません"
      : "この日を過ぎると、統計処理に含まれたデータは取り出せません",
    `${entry.basis} ${formatDate(entry.at)}${entry.passed ? "" : ` ・ あと${entry.daysLeft}日`}`,
    entry.passed ? "" : "is-open"
  );
}

export function renderSpecimenTimeline(specimen, withdrawal) {
  if (!specimen) {
    return `<p class="muted">検体の登録はまだありません。</p>`;
  }

  const pipeline = specimen.steps.filter((step) => step.status !== "disposed");
  const doneCount = pipeline.filter((step) => step.done).length;
  const percent = Math.round((doneCount / pipeline.length) * 100);
  const disposed = specimen.steps.some((step) => step.status === "disposed" && step.done);

  const boundaryIndex = specimen.steps.findIndex((step) => step.locked);
  const finalPipelineStatus = pipeline[pipeline.length - 1].status;
  let boundaryDrawn = false;

  // "現在" only means something while there is somewhere left to go. At the end
  // of the pipeline the step is finished, and a terminal disposal says so itself.
  const statusBadge = (step) => {
    if (!step.current) return "";
    if (step.status === "disposed") return "";
    if (step.status === finalPipelineStatus) return '<span class="timeline-now is-complete">完了</span>';
    return '<span class="timeline-now">現在</span>';
  };

  const steps = specimen.steps
    .map((step, index) => {
      const classes = ["timeline-step", `group-${step.group}`];
      if (boundaryIndex > 0 && index === boundaryIndex - 1) classes.push("before-boundary");
      if (step.done) classes.push("done");
      if (step.current) classes.push("current");
      if (step.locked) classes.push("locked");
      if (step.milestone) classes.push("milestone");
      if (step.status === "disposed") classes.push("disposed");
      if (step.status === state.specimenJustAdvancedTo) classes.push("just-advanced");

      const meta = [step.occurredAt ? formatDate(step.occurredAt) : "未完了", step.location]
        .filter(Boolean)
        .map((item) => escapeHtml(item))
        .join(" ・ ");

      // The points of no return are drawn across the flow itself, so the
      // deadlines read as part of the pipeline instead of a separate section.
      let boundary = "";
      if (step.locked && !boundaryDrawn) {
        boundaryDrawn = true;
        boundary = analysisBoundary(withdrawal);
      }

      // The data lock is a milestone with no handling step of its own, so it
      // closes the flow after the last one.
      const trailing = index === pipeline.length - 1 ? dataLockBoundary(withdrawal) : "";

      return `${boundary}<li class="${classes.join(" ")}">
        <button class="timeline-hit" data-step="${escapeHtml(step.status)}"
                aria-label="${escapeHtml(step.label)}の詳細を開く">
          <span class="timeline-marker">${stepIcon(step.icon)}</span>
          <span class="timeline-body">
            <span class="timeline-head">
              <span class="timeline-label">${escapeHtml(step.label)}${statusBadge(step)}</span>
              <span class="timeline-meta">${meta}</span>
            </span>
            <span class="muted">${escapeHtml(step.note || step.description)}</span>
          </span>
          <span class="timeline-chevron" aria-hidden="true">›</span>
        </button>
      </li>${trailing}`;
    })
    .join("");

  const advance = specimen.canAdvance
    ? `<div class="demo-control">
        <button class="secondary" data-advance-specimen>デモ: 次の工程へ進める</button>
        <span class="muted">実際には検査機関側のシステムが更新します。</span>
      </div>`
    : "";

  return `<div class="specimen-meta">
      <div><span>検体番号</span><strong>${escapeHtml(specimen.code)}</strong></div>
      <div><span>種別</span><strong>${escapeHtml(specimen.typeLabel)}</strong></div>
    </div>
    <div class="progress ${disposed ? "is-disposed" : ""}">
      <div class="progress-head">
        <span>${
          disposed
            ? `検体は破棄済みです（${doneCount} 工程まで進行）`
            : `全${pipeline.length}工程のうち ${doneCount} 工程が完了`
        }</span>
        <strong>${disposed ? "停止" : `${percent}%`}</strong>
      </div>
      <div class="progress-track" role="img" aria-label="進捗 ${percent}パーセント">
        <div class="progress-bar" style="--progress:${percent}%"></div>
      </div>
    </div>
    <ol class="timeline">${steps}</ol>
    ${advance}`;
}

/* The step modal.
 *
 * The purposes used to sit on the page as four cards, which pushed the tracking
 * timeline -- the reason to open this page -- above a long scroll. They are the
 * same data, reached from the step the reader is already looking at, and each
 * step shows only the uses that have started by that point.
 */
export function renderStepModal(overview) {
  if (!state.stepModal) return "";

  const steps = overview.specimen ? overview.specimen.steps : [];
  const order = steps.map((item) => item.status);
  const showAll = state.stepModal === "all";
  const step = showAll ? null : steps.find((item) => item.status === state.stepModal);
  if (!showAll && !step) return "";

  const uses = showAll
    ? overview.dataUses
    : overview.dataUses.filter((use) => {
        if (!use.appliesFrom) return true;
        const from = order.indexOf(use.appliesFrom);
        return from === -1 || from <= order.indexOf(step.status);
      });

  const pending = showAll ? [] : overview.dataUses.filter((use) => !uses.includes(use));

  const detail = showAll
    ? `<p class="muted">この研究が、提供いただいた検体と情報をどう使うかの内訳です。</p>`
    : `<div class="modal-step">
        <div class="modal-step-meta">
          <span>${escapeHtml(step.occurredAt ? formatDate(step.occurredAt) : "未完了")}</span>
          ${step.location ? `<span>${escapeHtml(step.location)}</span>` : ""}
        </div>
        <p>${escapeHtml(step.note || step.description)}</p>
      </div>
      <h3>${step.done ? "ここまでの利用目的" : "この段階からの利用目的"}</h3>`;

  return `<dialog class="modal" id="stepModal" aria-labelledby="stepModalTitle">
    <div class="modal-head">
      <h2 id="stepModalTitle">${escapeHtml(showAll ? "検体・データの利用目的" : step.label)}</h2>
      <button class="modal-close" data-close-modal aria-label="閉じる">×</button>
    </div>
    <div class="modal-body">
      ${detail}
      ${uses.length ? renderDataUses(uses) : `<p class="muted">この段階では、まだ解析や公表には使われていません。</p>`}
      ${
        pending.length
          ? `<p class="policy-note">このあとの段階で ${pending
              .map((use) => escapeHtml(use.purpose))
              .join("、")} に使われます。</p>`
          : ""
      }
      <p class="policy-note">氏名・住所は、キットの発送と結果の返却にのみ使用します。解析や研究成果の公表には使用しません。</p>
    </div>
  </dialog>`;
}

export function renderDataUses(dataUses) {
  if (!dataUses.length) return `<p class="muted">利用目的の登録がありません。</p>`;

  return `<div class="use-grid">${dataUses
    .map(
      (use) => `<article class="use-card">
        <h4>${escapeHtml(use.purpose)}</h4>
        <p class="muted">${escapeHtml(use.detail || "")}</p>
        <dl class="use-list">
          <div><dt>使用するもの</dt><dd>${escapeHtml(use.dataItems)}</dd></div>
          <div><dt>提供先</dt><dd>${escapeHtml(use.recipient)}</dd></div>
          <div><dt>保管期間</dt><dd>${escapeHtml(use.retention || "—")}</dd></div>
        </dl>
        <span class="use-flag ${use.withdrawable ? "ok" : "warn"}">${
          use.withdrawable ? "撤回すると以後の利用を停止します" : "公表後は撤回による削除ができません"
        }</span>
      </article>`
    )
    .join("")}</div>`;
}

// Withdrawing is rare and irreversible, so it sits where a subscription
// cancellation would: last on the page, closed by default, no colour.
export function renderQuietExit(withdrawal) {
  return `<details class="quiet-exit">
    <summary>研究への参加をやめる</summary>
    <div class="quiet-exit-body">
      <p><strong>${escapeHtml(withdrawal.label)}</strong></p>
      <p class="muted">${escapeHtml(withdrawal.summary)}</p>
      ${withdrawal.policyNote ? `<p class="muted">${escapeHtml(withdrawal.policyNote)}</p>` : ""}
      <button class="quiet-danger" data-withdraw-research>研究同意を撤回する</button>
    </div>
  </details>`;
}

export function studyCard(study) {
  const enrolled = Boolean(study.enrollmentStatus);
  const withdrawn = study.enrollmentStatus === "withdrawn";
  const chip = enrolled
    ? `<span class="chip ${withdrawn ? "chip-quiet" : "chip-on"}">${withdrawn ? "撤回済み" : "参加中"}</span>`
    : `<span class="chip ${study.status === "recruiting" ? "chip-open" : "chip-quiet"}">${escapeHtml(study.statusLabel)}</span>`;

  const rows = [
    ["実施機関", study.institution],
    ["対象", study.targetSummary],
    enrolled ? ["参加日", formatDate(study.enrolledAt)] : null,
    enrolled && study.specimenStatus
      ? ["検体", `全${study.specimenTotal}工程のうち ${study.specimenDone} 工程`]
      : null
  ].filter(Boolean);

  return `<button class="study-card" data-study="${escapeHtml(study.id)}">
    <span class="study-head">
      <span class="study-title">${escapeHtml(study.title)}</span>
      ${chip}
    </span>
    <span class="study-summary">${escapeHtml(study.summary)}</span>
    <span class="study-meta">
      ${rows
        .map(
          ([label, value]) =>
            `<span><span class="study-meta-label">${escapeHtml(label)}</span>${escapeHtml(value || "—")}</span>`
        )
        .join("")}
    </span>
    <span class="study-cta">${enrolled ? "参加状況と検体を見る" : "内容を見る"} <span aria-hidden="true">›</span></span>
  </button>`;
}

export function renderResearchList() {
  if (state.researchStudiesFailed) {
    return frame(`<h1 class="visually-hidden">研究</h1>
      <div class="page-stack"><section class="card"><p class="muted">研究情報を取得できませんでした。</p></section></div>`);
  }
  if (state.researchStudies === null) {
    return frame(`<h1 class="visually-hidden">研究</h1>
      <div class="page-stack"><section class="card"><p class="muted">読み込み中です。</p></section></div>`);
  }

  const studies = state.researchStudies;
  const joined = studies.filter((study) => study.enrollmentStatus);
  const open = studies.filter((study) => !study.enrollmentStatus && study.status === "recruiting");
  const other = studies.filter((study) => !study.enrollmentStatus && study.status !== "recruiting");

  const group = (title, note, list) =>
    !list.length
      ? ""
      : `<section class="card">
          <div class="card-head">
            <h2>${escapeHtml(title)}</h2>
            <span class="muted">${escapeHtml(note)}</span>
          </div>
          <div class="study-list">${list.map(studyCard).join("")}</div>
        </section>`;

  return frame(`<h1 class="visually-hidden">研究</h1>
  <div class="page-stack">
    ${errorBox()}
    ${
      joined.length
        ? group("参加している研究", `${joined.length}件`, joined)
        : `<section class="card">
            <div class="card-head"><h2>参加している研究</h2><span class="muted">0件</span></div>
            <p class="muted">まだ参加している研究はありません。募集中の研究から内容を確認できます。</p>
          </section>`
    }
    ${group("募集中の研究", `${open.length}件`, open)}
    ${group("その他の研究", `${other.length}件`, other)}
  </div>`);
}

export function renderResearch() {
  if (state.researchFailed) {
    return frame(`<h1 class="visually-hidden">研究</h1>
      <div class="page-stack"><section class="card"><p class="muted">研究情報を取得できませんでした。</p></section></div>`);
  }

  if (state.researchOverview === null) {
    return frame(`<h1 class="visually-hidden">研究</h1>
      <div class="page-stack"><section class="card"><p class="muted">読み込み中です。</p></section></div>`);
  }

  const overview = state.researchOverview;
  // Null when the study is open but this account has not joined it.
  const enrollment = overview.enrollment;
  const withdrawn = enrollment?.status === "withdrawn";

  return frame(`<h1 class="visually-hidden">研究</h1>
  <div class="page-stack research-page">
    <div class="page-title"><button class="linklike" data-back-to-studies>‹ 研究の一覧へ</button></div>
    ${errorBox()}

    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(overview.study.title)}</h2>
        <span class="chip ${overview.study.status === "recruiting" ? "chip-open" : "chip-quiet"}">${escapeHtml(overview.study.statusLabel)}</span>
      </div>
      <p class="muted">${escapeHtml(overview.study.summary)}</p>
      <div class="status-row"><span>実施機関</span><span>${escapeHtml(overview.study.institution || "—")}</span></div>
      <div class="status-row"><span>対象</span><span>${escapeHtml(overview.study.targetSummary || "—")}</span></div>
      ${
        enrollment
          ? `${withdrawn ? "" : `<p class="research-badge">${verifiedBadge()}</p>`}
             <div class="status-row"><span>参加ステータス</span><span class="${withdrawn ? "state-wait" : "state-ok"}">${withdrawn ? "撤回済み" : "参加中"}</span></div>
             <div class="status-row"><span>参加者コード</span><span>${escapeHtml(enrollment.participantCode || "—")}</span></div>
             <div class="status-row"><span>参加日</span><span>${escapeHtml(formatDate(enrollment.enrolledAt))}</span></div>
             ${withdrawn ? `<div class="status-row"><span>撤回日</span><span>${escapeHtml(formatDate(enrollment.withdrawnAt))}</span></div>` : ""}
             ${
               withdrawn
                 ? `<p class="muted withdrawn-note">${escapeHtml(overview.withdrawal.summary)}</p>
                    <div class="actions"><button class="primary" data-rejoin-research>もう一度参加する</button></div>`
                 : ""
             }`
          : `<div class="status-row"><span>参加ステータス</span><span class="state-wait">未参加</span></div>
             ${
               overview.study.status === "recruiting"
                 ? `<div class="actions"><button class="primary" data-join-study>この研究に参加する</button></div>`
                 : `<p class="muted withdrawn-note">この研究は現在募集していません。</p>`
             }`
      }
    </section>

    ${
      enrollment
        ? `<section class="card">
            <div class="card-head"><h2>検体トラッキング</h2></div>
            ${renderSpecimenTimeline(overview.specimen, overview.withdrawal)}
            ${usesEntry(overview)}
          </section>`
        : `<section class="card">
            <div class="card-head"><h2>提供するもの</h2></div>
            <p class="muted">参加すると、採取キットの発送から研究データベースへの登録まで、検体の状況をこの画面で追えます。</p>
            ${usesEntry(overview)}
          </section>`
    }
    ${renderStepModal(overview)}

    ${enrollment && !withdrawn ? renderQuietExit(overview.withdrawal) : ""}
  </div>`);
}

export function usesEntry(overview) {
  return `<button class="uses-entry" data-step="all">
    <span>検体・データの利用目的</span>
    <span class="uses-entry-meta">${overview.dataUses.length}件 <span aria-hidden="true">›</span></span>
  </button>`;
}
