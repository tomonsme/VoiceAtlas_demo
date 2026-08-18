import { state } from "../state.js";
import { escapeHtml, formatDate } from "../util.js";
import { frame, errorBox, verifiedBadge, icon } from "./shell.js";
import { t, pick } from "../i18n.js";
import {
  stepLabel,
  stepNote,
  placeLabel,
  studyStatusLabel,
  specimenTypeLabel,
  withdrawalCopy,
  policyNote,
  trendInsight
} from "../labels.js";

export function renderStudyConsent() {
  return frame(`<div class="page-stack">
    <div class="page-title"><h1>${escapeHtml(t("consentFlow.title"))}</h1></div>
    <section class="card">
      <p class="muted">${escapeHtml(t("consentFlow.lead"))}</p>
      <div class="consent-points">
        <div class="point"><b>1</b><p>${escapeHtml(t("consentFlow.p1"))} <a href="/assets/research-consent.pdf" target="_blank" rel="noopener" data-consent-pdf-link>${escapeHtml(t("consentFlow.pdfLink"))}</a><span id="pdfStatus" class="pdf-status">${escapeHtml(state.consentPdfOpened ? t("consentFlow.checked") : t("consentFlow.unchecked"))}</span></p></div>
        <div class="point"><b>2</b><p>${escapeHtml(t("consentFlow.p2"))}</p></div>
        <div class="point"><b>3</b><p>${escapeHtml(t("consentFlow.p3"))}</p></div>
      </div>
      <label class="check-row"><input class="study-check" type="checkbox"><span>${escapeHtml(t("consentFlow.check1"))}</span></label>
      <label class="check-row"><input class="study-check" type="checkbox"><span>${escapeHtml(t("consentFlow.check2"))}</span></label>
      <div class="actions">
        <button class="secondary" data-back-to-studies>${escapeHtml(t("consentFlow.back"))}</button>
        <button id="studyNext" class="primary" disabled>${escapeHtml(t("consentFlow.next"))}</button>
      </div>
    </section>
  </div>`);
}

export function renderIdentity() {
  return frame(`<div class="page-stack">
    <div class="page-title"><h1>${escapeHtml(t("identity.title"))}</h1></div>
    <section class="card">
      <p class="muted">${escapeHtml(t("identity.lead"))}</p>
      ${errorBox()}
      <form id="identityForm" class="form-grid">
        <div class="field full"><label for="legalName">${escapeHtml(t("identity.legalName"))}</label><input id="legalName" name="legalName" required autocomplete="name" placeholder="${escapeHtml(t("identity.namePlaceholder"))}"></div>
        <div class="field"><label for="postalCode">${escapeHtml(t("identity.postalCode"))}</label><input id="postalCode" name="postalCode" required inputmode="numeric" autocomplete="postal-code" placeholder="${escapeHtml(t("identity.postalPlaceholder"))}"></div>
        <div class="field"><label for="prefecture">${escapeHtml(t("identity.prefecture"))}</label><input id="prefecture" name="prefecture" required autocomplete="address-level1" value="${escapeHtml(t("identity.prefectureDemo"))}"></div>
        <div class="field"><label for="city">${escapeHtml(t("identity.city"))}</label><input id="city" name="city" required autocomplete="address-level2" value="${escapeHtml(t("identity.cityDemo"))}"></div>
        <div class="field"><label for="addressLine1">${escapeHtml(t("identity.addressLine1"))}</label><input id="addressLine1" name="addressLine1" required autocomplete="address-line1"></div>
        <div class="field full"><label for="addressLine2">${escapeHtml(t("identity.addressLine2"))}</label><input id="addressLine2" name="addressLine2" autocomplete="address-line2"></div>
        <div class="field full"><button class="primary" type="submit">${escapeHtml(t("identity.submit"))}</button></div>
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
    return boundaryLine("lock", t("withdraw.boundaryClosed"), "");
  }

  if (entry.passed) {
    return boundaryLine(
      "lock",
      t("withdraw.boundaryClosed"),
      t("withdraw.startedOn", { date: formatDate(entry.at) })
    );
  }

  return boundaryLine(
    "clock",
    t("withdraw.boundaryOpen"),
    t("withdraw.scheduled", { date: formatDate(entry.at), n: entry.daysLeft }),
    "is-open"
  );
}

export function dataLockBoundary(withdrawal) {
  const entry = withdrawal.dataLock;
  if (!entry || !entry.at) return "";

  return boundaryLine(
    entry.passed ? "lock" : "clock",
    t(entry.passed ? "withdraw.lockClosed" : "withdraw.lockOpen"),
    entry.passed
      ? t("withdraw.lockMeta", { date: formatDate(entry.at) })
      : t("withdraw.lockMetaOpen", { date: formatDate(entry.at), n: entry.daysLeft }),
    entry.passed ? "" : "is-open"
  );
}

export function renderSpecimenTimeline(specimen, withdrawal) {
  if (!specimen) {
    return `<p class="muted">${escapeHtml(t("research.noSpecimen"))}</p>`;
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
    if (step.status === finalPipelineStatus) return `<span class="timeline-now is-complete">${escapeHtml(t("research.complete"))}</span>`;
    return `<span class="timeline-now">${escapeHtml(t("research.now"))}</span>`;
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

      const meta = [
        step.occurredAt ? formatDate(step.occurredAt) : t("common.notRecorded"),
        placeLabel(step.location)
      ]
        .filter(Boolean)
        .map((item) => escapeHtml(item))
        .join(t("common.dotSeparator"));

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
                aria-label="${escapeHtml(t("research.openStep", { label: stepLabel(step) }))}">
          <span class="timeline-marker">${stepIcon(step.icon)}</span>
          <span class="timeline-body">
            <span class="timeline-head">
              <span class="timeline-label">${escapeHtml(stepLabel(step))}${statusBadge(step)}</span>
              <span class="timeline-meta">${meta}</span>
            </span>
            <span class="muted">${escapeHtml(stepNote(step))}</span>
          </span>
          <span class="timeline-chevron" aria-hidden="true">›</span>
        </button>
      </li>${trailing}`;
    })
    .join("");

  const advance = specimen.canAdvance
    ? `<div class="demo-control">
        <button class="secondary" data-advance-specimen>${escapeHtml(t("research.demoAdvance"))}</button>
        <span class="muted">${escapeHtml(t("research.demoAdvanceNote"))}</span>
      </div>`
    : "";

  return `<div class="specimen-meta">
      <div><span>${escapeHtml(t("research.specimenCode"))}</span><strong>${escapeHtml(specimen.code)}</strong></div>
      <div><span>${escapeHtml(t("research.specimenType"))}</span><strong>${escapeHtml(specimenTypeLabel(specimen))}</strong></div>
    </div>
    <div class="progress ${disposed ? "is-disposed" : ""}">
      <div class="progress-head">
        <span>${
          disposed
            ? escapeHtml(t("research.disposedSummary", { done: doneCount }))
            : escapeHtml(t("research.progressSummary", { total: pipeline.length, done: doneCount }))
        }</span>
        <strong>${disposed ? escapeHtml(t("research.stopped")) : `${percent}%`}</strong>
      </div>
      <div class="progress-track" role="img" aria-label="${escapeHtml(t("research.progressAlt", { percent }))}">
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
    ? `<p class="muted">${escapeHtml(t("uses.allLead"))}</p>`
    : `<div class="modal-step">
        <div class="modal-step-meta">
          <span>${escapeHtml(step.occurredAt ? formatDate(step.occurredAt) : t("common.notRecorded"))}</span>
          ${step.location ? `<span>${escapeHtml(placeLabel(step.location))}</span>` : ""}
        </div>
        <p>${escapeHtml(stepNote(step))}</p>
      </div>
      <h3>${escapeHtml(t(step.done ? "uses.upTo" : "uses.from"))}</h3>`;

  return `<dialog class="modal" id="stepModal" aria-labelledby="stepModalTitle">
    <div class="modal-head">
      <h2 id="stepModalTitle">${escapeHtml(showAll ? t("uses.entry") : stepLabel(step))}</h2>
      <button class="modal-close" data-close-modal aria-label="${escapeHtml(t("common.close"))}">×</button>
    </div>
    <div class="modal-body">
      ${detail}
      ${uses.length ? renderDataUses(uses) : `<p class="muted">${escapeHtml(t("uses.noneYet"))}</p>`}
      ${
        pending.length
          ? `<p class="policy-note">${escapeHtml(
              t("uses.later", { list: pending.map((use) => pick(use.purpose)).join(t("common.listSeparator")) })
            )}</p>`
          : ""
      }
      <p class="policy-note">${escapeHtml(t("uses.nameNote"))}</p>
    </div>
  </dialog>`;
}

export function renderDataUses(dataUses) {
  if (!dataUses.length) return `<p class="muted">${escapeHtml(t("uses.empty"))}</p>`;

  return `<div class="use-grid">${dataUses
    .map(
      (use) => `<article class="use-card">
        <h4>${escapeHtml(pick(use.purpose))}</h4>
        <p class="muted">${escapeHtml(pick(use.detail))}</p>
        <dl class="use-list">
          <div><dt>${escapeHtml(t("uses.dataItems"))}</dt><dd>${escapeHtml(pick(use.dataItems))}</dd></div>
          <div><dt>${escapeHtml(t("uses.recipient"))}</dt><dd>${escapeHtml(pick(use.recipient))}</dd></div>
          <div><dt>${escapeHtml(t("uses.retention"))}</dt><dd>${escapeHtml(pick(use.retention) || t("common.none"))}</dd></div>
        </dl>
        <span class="use-flag ${use.withdrawable ? "ok" : "warn"}">${escapeHtml(t(use.withdrawable ? "uses.withdrawable" : "uses.notWithdrawable"))}</span>
      </article>`
    )
    .join("")}</div>`;
}

// Withdrawing is rare and irreversible, so it sits where a subscription
// cancellation would: last on the page, closed by default, no colour.
export function renderQuietExit(withdrawal, specimen) {
  const copy = withdrawalCopy(withdrawal, specimen);
  const note = policyNote(withdrawal);
  return `<details class="quiet-exit">
    <summary>${escapeHtml(t("withdraw.link"))}</summary>
    <div class="quiet-exit-body">
      <p><strong>${escapeHtml(copy.label)}</strong></p>
      <p class="muted">${escapeHtml(copy.summary)}</p>
      ${note ? `<p class="muted">${escapeHtml(note)}</p>` : ""}
      <button class="quiet-danger" data-withdraw-research>${escapeHtml(t("withdraw.action"))}</button>
    </div>
  </details>`;
}

export function studyCard(study) {
  const enrolled = Boolean(study.enrollmentStatus);
  const withdrawn = study.enrollmentStatus === "withdrawn";
  const chip = enrolled
    ? `<span class="chip ${withdrawn ? "chip-quiet" : "chip-on"}">${escapeHtml(
        t(withdrawn ? "research.chipWithdrawn" : "research.chipJoined")
      )}</span>`
    : `<span class="chip ${study.status === "recruiting" ? "chip-open" : "chip-quiet"}">${escapeHtml(
        studyStatusLabel(study)
      )}</span>`;

  const rows = [
    [t("research.institution"), pick(study.institution)],
    [t("research.target"), pick(study.targetSummary)],
    enrolled ? [t("research.joinedOn"), formatDate(study.enrolledAt)] : null,
    enrolled && study.specimenStatus
      ? [
          t("research.specimen"),
          t("research.specimenProgress", { total: study.specimenTotal, done: study.specimenDone })
        ]
      : null
  ].filter(Boolean);

  return `<button class="study-card" data-study="${escapeHtml(study.id)}">
    <span class="study-head">
      <span class="study-title">${escapeHtml(pick(study.title))}</span>
      ${chip}
    </span>
    <span class="study-summary">${escapeHtml(pick(study.summary))}</span>
    <span class="study-meta">
      ${rows
        .map(
          ([label, value]) =>
            `<span><span class="study-meta-label">${escapeHtml(label)}</span>${escapeHtml(value || t("common.none"))}</span>`
        )
        .join("")}
    </span>
    <span class="study-cta">${escapeHtml(t(enrolled ? "research.openEnrolled" : "research.openOther"))} <span aria-hidden="true">›</span></span>
  </button>`;
}

export function renderResearchList() {
  if (state.researchStudiesFailed) {
    return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.research"))}</h1>
      <div class="page-stack"><section class="card"><p class="muted">${escapeHtml(t("research.loadFailed"))}</p></section></div>`);
  }
  if (state.researchStudies === null) {
    return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.research"))}</h1>
      <div class="page-stack"><section class="card"><p class="muted">${escapeHtml(t("common.loading"))}</p></section></div>`);
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

  return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.research"))}</h1>
  <div class="page-stack">
    ${errorBox()}
    ${
      joined.length
        ? group(t("research.joined"), t("common.count", { n: joined.length }), joined)
        : `<section class="card">
            <div class="card-head"><h2>${escapeHtml(t("research.joined"))}</h2><span class="muted">${escapeHtml(
              t("common.count", { n: 0 })
            )}</span></div>
            <p class="muted">${escapeHtml(t("research.noneJoined"))}</p>
          </section>`
    }
    ${group(t("research.recruiting"), t("common.count", { n: open.length }), open)}
    ${group(t("research.other"), t("common.count", { n: other.length }), other)}
  </div>`);
}

export function renderResearch() {
  if (state.researchFailed) {
    return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.research"))}</h1>
      <div class="page-stack"><section class="card"><p class="muted">${escapeHtml(t("research.loadFailed"))}</p></section></div>`);
  }

  if (state.researchOverview === null) {
    return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.research"))}</h1>
      <div class="page-stack"><section class="card"><p class="muted">${escapeHtml(t("common.loading"))}</p></section></div>`);
  }

  const overview = state.researchOverview;
  // Null when the study is open but this account has not joined it.
  const enrollment = overview.enrollment;
  const withdrawn = enrollment?.status === "withdrawn";

  return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.research"))}</h1>
  <div class="page-stack research-page">
    <div class="page-title"><button class="linklike" data-back-to-studies>${escapeHtml(t("research.backToList"))}</button></div>
    ${errorBox()}

    <section class="card">
      <div class="card-head">
        <h2>${escapeHtml(pick(overview.study.title))}</h2>
        <span class="chip ${overview.study.status === "recruiting" ? "chip-open" : "chip-quiet"}">${escapeHtml(studyStatusLabel(overview.study))}</span>
      </div>
      <p class="muted">${escapeHtml(pick(overview.study.summary))}</p>
      <div class="status-row"><span>${escapeHtml(t("research.institution"))}</span><span>${escapeHtml(pick(overview.study.institution) || t("common.none"))}</span></div>
      <div class="status-row"><span>${escapeHtml(t("research.target"))}</span><span>${escapeHtml(pick(overview.study.targetSummary) || t("common.none"))}</span></div>
      ${
        enrollment
          ? `${withdrawn ? "" : `<p class="research-badge">${verifiedBadge()}</p>`}
             <div class="status-row"><span>${escapeHtml(t("research.enrolStatus"))}</span><span class="${withdrawn ? "state-wait" : "state-ok"}">${escapeHtml(t(withdrawn ? "research.withdrawn" : "research.participating"))}</span></div>
             <div class="status-row"><span>${escapeHtml(t("research.participantCode"))}</span><span>${escapeHtml(enrollment.participantCode || t("common.none"))}</span></div>
             <div class="status-row"><span>${escapeHtml(t("research.joinedOn"))}</span><span>${escapeHtml(formatDate(enrollment.enrolledAt))}</span></div>
             ${withdrawn ? `<div class="status-row"><span>${escapeHtml(t("research.withdrawnOn"))}</span><span>${escapeHtml(formatDate(enrollment.withdrawnAt))}</span></div>` : ""}
             ${
               withdrawn
                 ? `<p class="muted withdrawn-note">${escapeHtml(withdrawalCopy(overview.withdrawal, overview.specimen).summary)}</p>
                    <div class="actions"><button class="primary" data-rejoin-research>${escapeHtml(t("research.rejoin"))}</button></div>`
                 : ""
             }`
          : `<div class="status-row"><span>${escapeHtml(t("research.enrolStatus"))}</span><span class="state-wait">${escapeHtml(t("research.notJoined"))}</span></div>
             ${
               overview.study.status === "recruiting"
                 ? `<div class="actions"><button class="primary" data-join-study>${escapeHtml(t("research.join"))}</button></div>`
                 : `<p class="muted withdrawn-note">${escapeHtml(t("research.notRecruiting"))}</p>`
             }`
      }
    </section>

    ${
      enrollment
        ? `<section class="card">
            <div class="card-head"><h2>${escapeHtml(t("research.tracking"))}</h2></div>
            ${renderSpecimenTimeline(overview.specimen, overview.withdrawal)}
            ${usesEntry(overview)}
          </section>`
        : `<section class="card">
            <div class="card-head"><h2>${escapeHtml(t("research.willProvide"))}</h2></div>
            <p class="muted">${escapeHtml(t("research.willProvideNote"))}</p>
            ${usesEntry(overview)}
          </section>`
    }
    ${renderStepModal(overview)}

    ${enrollment && !withdrawn ? renderQuietExit(overview.withdrawal, overview.specimen) : ""}
  </div>`);
}

export function usesEntry(overview) {
  return `<button class="uses-entry" data-step="all">
    <span>${escapeHtml(t("uses.entry"))}</span>
    <span class="uses-entry-meta">${escapeHtml(t("common.count", { n: overview.dataUses.length }))} <span aria-hidden="true">›</span></span>
  </button>`;
}
