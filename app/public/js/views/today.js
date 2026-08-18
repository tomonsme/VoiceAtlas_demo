import { state } from "../state.js";
import { t, optLabel } from "../i18n.js";
import { trendInsight } from "../labels.js";
import { escapeHtml, formatDate } from "../util.js";
import { errorBox, frame } from "./shell.js";

export function levelGroup(name, label, scale, selected, size = "") {
  const options = [1, 2, 3, 4, 5]
    .map(
      (level) => `<label class="level-option${size ? " " + size : ""}">
        <input type="radio" name="${name}" value="${level}" ${selected === level ? "checked" : ""}>
        <span><b>${level}</b><em>${escapeHtml(t(`level.${scale}.${level}`))}</em></span>
      </label>`
    )
    .join("");

  return `<fieldset class="level-group">
    <legend>${escapeHtml(label)}</legend>
    <div class="level-options">${options}</div>
  </fieldset>`;
}

export function todayLabel() {
  const now = new Date();
  const weekday = t("today.weekdays").split(",")[now.getDay()];
  return t("today.dateLabel", { month: now.getMonth() + 1, day: now.getDate(), weekday });
}

/* The day's entry.
 *
 * Three states, in the order a returning user meets them:
 *   not recorded -> one question, five large targets, recorded on a single tap
 *   recorded     -> today's state as the headline, not a form
 *   editing      -> the full set, including the optional items
 * Optional items never stand between the user and a finished record.
 */
export function renderCheckinCard() {
  const board = state.checkins;
  if (state.checkinsFailed) {
    return `<section class="card checkin-card"><h2>${escapeHtml(t("today.recordTitle"))}</h2><p class="muted">${escapeHtml(t("today.loadFailed"))}</p></section>`;
  }
  if (!board) {
    return `<section class="card checkin-card"><h2>${escapeHtml(t("today.recordTitle"))}</h2><p class="muted">${escapeHtml(t("common.loading"))}</p></section>`;
  }

  const today = board.today;
  if (state.checkinEditing) return renderCheckinForm(today);
  return today ? renderCheckinDone(today) : renderCheckinQuick();
}

export function renderCheckinQuick() {
  const options = [1, 2, 3, 4, 5]
    .map(
      (level) => `<button class="level-quick" data-quick-level="${level}">
        <b>${level}</b><em>${escapeHtml(t(`level.condition.${level}`))}</em>
      </button>`
    )
    .join("");

  return `<section class="card checkin-card">
    <div class="card-head">
      <h2>${escapeHtml(t("today.question"))}</h2>
      <span class="muted">${escapeHtml(todayLabel())}</span>
    </div>
    <p class="muted">${escapeHtml(t("today.quickLead"))}</p>
    ${errorBox()}
    <div class="level-options quick" role="group" aria-label="${escapeHtml(t("today.condition"))}">${options}</div>
    <p class="quick-more">
      <button class="linklike" data-open-detail>${escapeHtml(t("today.detailLink"))}</button>
    </p>
  </section>`;
}

export function renderCheckinDone(today) {
  const extras = [
    today.fatigueLevel ? `${t("today.fatigue").replace(/（.*|\s*\(.*/, "")} ${t(`level.fatigue.${today.fatigueLevel}`)}` : "",
    today.sleepLevel ? `${t("today.sleep").replace(/（.*|\s*\(.*/, "")} ${t(`level.sleep.${today.sleepLevel}`)}` : "",
    today.pem ? t("today.pemShort") : ""
  ].filter(Boolean);

  const scale = [1, 2, 3, 4, 5]
    .map((level) => `<span class="${level === today.conditionLevel ? "on" : ""}"></span>`)
    .join("");

  return `<section class="card checkin-card is-done">
    <div class="card-head">
      <h2>${escapeHtml(t("today.recordTitle"))}</h2>
      <span class="recorded-chip">${escapeHtml(t("today.recorded", { date: todayLabel() }))}</span>
    </div>
    ${state.checkinSaved ? `<p class="save-note" role="status">${escapeHtml(t("today.saved"))}</p>` : ""}
    <div class="hero">
      <span class="hero-label">${escapeHtml(t("today.condition"))}</span>
      <strong class="hero-value">${escapeHtml(t(`level.condition.${today.conditionLevel}`))}</strong>
      <span class="hero-scale" aria-hidden="true">${scale}</span>
    </div>
    ${extras.length ? `<p class="hero-sub">${escapeHtml(extras.join(t("common.dotSeparator")))}</p>` : ""}
    ${today.note ? `<p class="recorded-note">${escapeHtml(today.note)}</p>` : ""}
    <div class="actions">
      <button class="secondary" data-edit-checkin>${escapeHtml(t(extras.length || today.note ? "today.edit" : "today.addDetail"))}</button>
    </div>
  </section>`;
}

export function renderCheckinForm(today) {
  return `<section class="card checkin-card">
    <div class="card-head">
      <h2>${escapeHtml(t("today.recordTitle"))}</h2>
      <span class="muted">${escapeHtml(todayLabel())}</span>
    </div>
    <p class="muted">${escapeHtml(t("today.editHint"))}</p>
    ${errorBox()}
    <form id="checkinForm">
      ${levelGroup("conditionLevel", t("today.condition"), "condition", today ? today.conditionLevel : null)}
      ${levelGroup("fatigueLevel", t("today.fatigue"), "fatigue", today ? today.fatigueLevel : null, "compact")}
      ${levelGroup("sleepLevel", t("today.sleep"), "sleep", today ? today.sleepLevel : null, "compact")}
      <label class="check-row">
        <input type="checkbox" name="pem" ${today && today.pem ? "checked" : ""}>
        <span>${escapeHtml(t("today.pem"))}</span>
      </label>
      <div class="field full">
        <label for="checkinNote">${escapeHtml(t("today.note"))}</label>
        <input id="checkinNote" name="note" maxlength="200" value="${today ? escapeHtml(today.note || "") : ""}"
               placeholder="${escapeHtml(t("today.notePlaceholder"))}">
      </div>
      <div class="actions">
        <button class="primary" type="submit">${escapeHtml(t("common.save"))}</button>
        <button class="secondary" type="button" data-cancel-checkin>${escapeHtml(t("common.cancel"))}</button>
      </div>
    </form>
  </section>`;
}

/* 30-day trend.
 *
 * Form: one bar per day. Bars rather than a line because days can be missing,
 * and a line would draw straight through a gap as if it were data.
 * Colour: a single hue -- bar height already carries the value, so colouring by
 * level would spend the identity channel re-encoding it. The only second colour
 * marks 労作後の悪化, which height cannot show.
 */
export function renderTrend() {
  const board = state.checkins;
  if (!board || state.checkinsFailed) return "";

  const days = board.days;
  const summary = board.summary;
  const insight = trendInsight(summary, board.windowDays);
  const width = 640;
  const height = 168;
  const padding = { top: 14, right: 10, bottom: 24, left: 38 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const slot = plotWidth / days.length;
  const barWidth = Math.max(6, slot - 3);
  const yFor = (level) => padding.top + plotHeight - (level / 5) * plotHeight;

  const marks = days
    .map((day, index) => {
      const x = padding.left + index * slot + (slot - barWidth) / 2;
      const label = new Date(`${day.date}T00:00:00`);
      const dayText = `${label.getMonth() + 1}/${label.getDate()}`;

      if (day.conditionLevel === null) {
        // A full-height blank rather than a short bar: a missing day is unknown,
        // not a bad day, and a stub at the baseline would read as the worst level.
        return `<rect class="bar-empty" x="${x.toFixed(1)}" y="${padding.top}"
          width="${barWidth.toFixed(1)}" height="${plotHeight.toFixed(1)}" rx="4"
          data-day="${index}"><title>${dayText} ${t("trend.unrecorded")}</title></rect>`;
      }

      const y = yFor(day.conditionLevel);
      const barHeight = padding.top + plotHeight - y;
      const pem = day.pem
        ? `<circle class="pem-dot" cx="${(x + barWidth / 2).toFixed(1)}" cy="${(y - 7).toFixed(1)}" r="3.2"/>`
        : "";
      return `<g data-day="${index}"><title>${dayText} ${escapeHtml(t(`level.condition.${day.conditionLevel}`))}${day.pem ? `${t("common.dotSeparator")}${escapeHtml(t("today.pemShort"))}` : ""}</title>
        <rect class="bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}"
          height="${barHeight.toFixed(1)}" rx="4"/>${pem}</g>`;
    })
    .join("");

  const first = new Date(`${days[0].date}T00:00:00`);
  const delta =
    summary.average !== null && summary.previousAverage !== null
      ? Number((summary.average - summary.previousAverage).toFixed(1))
      : null;
  const deltaText =
    delta === null
      ? t("trend.noCompare", { n: board.windowDays })
      : Math.abs(delta) < 0.2
        ? t("trend.about", { n: board.windowDays })
        : t("trend.delta", { n: board.windowDays, sign: delta > 0 ? "+" : "", value: delta });

  const cohort = board.cohort;
  const cohortText = !cohort
    ? ""
    : cohort.average !== null
      ? `<p class="cohort">${escapeHtml(t("trend.cohort", { disease: optLabel(cohort.disease), n: cohort.contributors, average: cohort.average }))}</p>`
      : `<p class="cohort muted">${escapeHtml(t("trend.cohortPending", { min: cohort.minContributors, n: cohort.contributors }))}</p>`;

  const windowSwitch = board.windowOptions
    .map(
      (option) => `<button class="window-option${option === board.windowDays ? " on" : ""}"
        data-window="${option}" aria-pressed="${option === board.windowDays}">${escapeHtml(t("common.days", { n: option }))}</button>`
    )
    .join("");

  return `<section class="card trend-card">
    <div class="card-head">
      <h2>${escapeHtml(t("trend.title", { n: board.windowDays }))}</h2>
      <div class="window-switch" role="group" aria-label="${escapeHtml(t("trend.title", { n: board.windowDays }))}">${windowSwitch}</div>
    </div>

    ${insight.length ? `<p class="insight">${escapeHtml(insight.join(" "))}</p>` : ""}

    <div class="stat-row">
      <div class="stat"><span>${escapeHtml(t("trend.average"))}</span><strong>${summary.average === null ? "—" : summary.average}</strong><small>${escapeHtml(deltaText)}</small></div>
      <div class="stat"><span>${escapeHtml(t("trend.recordedDays"))}</span><strong>${summary.recordedDays}<small class="unit">${escapeHtml(t("trend.ofDays", { n: board.windowDays }))}</small></strong><small>${Math.round((summary.recordedDays / board.windowDays) * 100)}%</small></div>
      <div class="stat"><span>${escapeHtml(t("trend.streak"))}</span><strong>${summary.streak}<small class="unit">${escapeHtml(t("trend.dayUnit"))}</small></strong><small>${escapeHtml(t("trend.streakNote"))}</small></div>
    </div>

    <div class="chart-wrap">
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img"
           aria-label="${escapeHtml(t("trend.chartAlt", { n: board.windowDays, recorded: summary.recordedDays, average: summary.average === null ? t("common.none") : summary.average, insight: insight.join(" ") }))}">
        <line class="axis" x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}"/>
        <line class="reference" x1="${padding.left}" y1="${yFor(3).toFixed(1)}" x2="${width - padding.right}" y2="${yFor(3).toFixed(1)}"/>
        <text class="tick" x="${padding.left - 8}" y="${(yFor(5) + 4).toFixed(1)}" text-anchor="end">${escapeHtml(t("trend.axisGood"))}</text>
        <text class="tick" x="${padding.left - 8}" y="${(yFor(3) + 4).toFixed(1)}" text-anchor="end">${escapeHtml(t("trend.axisNormal"))}</text>
        <text class="tick" x="${padding.left - 8}" y="${(yFor(1) + 4).toFixed(1)}" text-anchor="end">${escapeHtml(t("trend.axisBad"))}</text>
        ${marks}
        <text class="tick" x="${padding.left}" y="${height - 6}">${first.getMonth() + 1}/${first.getDate()}</text>
        <text class="tick" x="${width - padding.right}" y="${height - 6}" text-anchor="end">${escapeHtml(t("trend.today"))}</text>
      </svg>
      <p class="chart-readout" id="chartReadout" aria-live="polite"></p>
      <p class="chart-legend">
        <span class="legend-item"><span class="swatch bar"></span>${escapeHtml(t("trend.legendCondition"))}</span>
        <span class="legend-item"><span class="swatch dot"></span>${escapeHtml(t("trend.legendPem"))}</span>
        <span class="legend-item"><span class="swatch empty"></span>${escapeHtml(t("trend.legendEmpty"))}</span>
      </p>
    </div>
    ${cohortText}
  </section>`;
}

export function renderToday() {
  return frame(`<h1 class="visually-hidden">${escapeHtml(t("nav.today"))}</h1>
  <div class="page-stack">
    ${renderCheckinCard()}
    ${renderTrend()}
  </div>`);
}
