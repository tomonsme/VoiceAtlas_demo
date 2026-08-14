import { state, levelLabels } from "../state.js";
import { escapeHtml, formatDate } from "../util.js";
import { errorBox, frame } from "./shell.js";

export function levelGroup(name, label, scale, selected, size = "") {
  const options = [1, 2, 3, 4, 5]
    .map(
      (level) => `<label class="level-option${size ? " " + size : ""}">
        <input type="radio" name="${name}" value="${level}" ${selected === level ? "checked" : ""}>
        <span><b>${level}</b><em>${escapeHtml(levelLabels[scale][level])}</em></span>
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
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
  return `${now.getMonth() + 1}月${now.getDate()}日（${weekday}）`;
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
    return `<section class="card checkin-card"><h2>今日の記録</h2><p class="muted">記録を取得できませんでした。</p></section>`;
  }
  if (!board) {
    return `<section class="card checkin-card"><h2>今日の記録</h2><p class="muted">読み込み中です。</p></section>`;
  }

  const today = board.today;
  if (state.checkinEditing) return renderCheckinForm(today);
  return today ? renderCheckinDone(today) : renderCheckinQuick();
}

export function renderCheckinQuick() {
  const options = [1, 2, 3, 4, 5]
    .map(
      (level) => `<button class="level-quick" data-quick-level="${level}">
        <b>${level}</b><em>${escapeHtml(levelLabels.condition[level])}</em>
      </button>`
    )
    .join("");

  return `<section class="card checkin-card">
    <div class="card-head">
      <h2>今日の体調はいかがですか？</h2>
      <span class="muted">${escapeHtml(todayLabel())}</span>
    </div>
    <p class="muted">選ぶだけで記録できます。あとから直せます。</p>
    ${errorBox()}
    <div class="level-options quick" role="group" aria-label="今日の体調">${options}</div>
    <p class="quick-more">
      <button class="linklike" data-open-detail>疲労感・睡眠なども記録する</button>
    </p>
  </section>`;
}

export function renderCheckinDone(today) {
  const extras = [
    today.fatigueLevel ? `疲労感 ${levelLabels.fatigue[today.fatigueLevel]}` : "",
    today.sleepLevel ? `睡眠 ${levelLabels.sleep[today.sleepLevel]}` : "",
    today.pem ? "動いた後の悪化あり" : ""
  ].filter(Boolean);

  const scale = [1, 2, 3, 4, 5]
    .map((level) => `<span class="${level === today.conditionLevel ? "on" : ""}"></span>`)
    .join("");

  return `<section class="card checkin-card is-done">
    <div class="card-head">
      <h2>今日の記録</h2>
      <span class="recorded-chip">${escapeHtml(todayLabel())} 記録済み</span>
    </div>
    ${state.checkinSaved ? `<p class="save-note" role="status">記録しました。明日もこの画面から続けられます。</p>` : ""}
    <div class="hero">
      <span class="hero-label">体調</span>
      <strong class="hero-value">${escapeHtml(levelLabels.condition[today.conditionLevel])}</strong>
      <span class="hero-scale" aria-hidden="true">${scale}</span>
    </div>
    ${extras.length ? `<p class="hero-sub">${escapeHtml(extras.join(" ・ "))}</p>` : ""}
    ${today.note ? `<p class="recorded-note">${escapeHtml(today.note)}</p>` : ""}
    <div class="actions">
      <button class="secondary" data-edit-checkin>${extras.length || today.note ? "記録を修正する" : "詳しく記録する"}</button>
    </div>
  </section>`;
}

export function renderCheckinForm(today) {
  return `<section class="card checkin-card">
    <div class="card-head">
      <h2>今日の記録</h2>
      <span class="muted">${escapeHtml(todayLabel())}</span>
    </div>
    <p class="muted">体調以外はすべて任意です。</p>
    ${errorBox()}
    <form id="checkinForm">
      ${levelGroup("conditionLevel", "体調", "condition", today ? today.conditionLevel : null)}
      ${levelGroup("fatigueLevel", "疲労感（任意）", "fatigue", today ? today.fatigueLevel : null, "compact")}
      ${levelGroup("sleepLevel", "睡眠（任意）", "sleep", today ? today.sleepLevel : null, "compact")}
      <label class="check-row">
        <input type="checkbox" name="pem" ${today && today.pem ? "checked" : ""}>
        <span>動いた後に、症状が悪化した</span>
      </label>
      <div class="field full">
        <label for="checkinNote">ひとこと（任意）</label>
        <input id="checkinNote" name="note" maxlength="200" value="${today ? escapeHtml(today.note || "") : ""}"
               placeholder="例：午前中は横になっていた">
      </div>
      <div class="actions">
        <button class="primary" type="submit">保存する</button>
        <button class="secondary" type="button" data-cancel-checkin>キャンセル</button>
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
      const dayText = `${label.getMonth() + 1}月${label.getDate()}日`;

      if (day.conditionLevel === null) {
        // A full-height blank rather than a short bar: a missing day is unknown,
        // not a bad day, and a stub at the baseline would read as the worst level.
        return `<rect class="bar-empty" x="${x.toFixed(1)}" y="${padding.top}"
          width="${barWidth.toFixed(1)}" height="${plotHeight.toFixed(1)}" rx="4"
          data-day="${index}"><title>${dayText} 未記録</title></rect>`;
      }

      const y = yFor(day.conditionLevel);
      const barHeight = padding.top + plotHeight - y;
      const pem = day.pem
        ? `<circle class="pem-dot" cx="${(x + barWidth / 2).toFixed(1)}" cy="${(y - 7).toFixed(1)}" r="3.2"/>`
        : "";
      return `<g data-day="${index}"><title>${dayText} 体調${escapeHtml(levelLabels.condition[day.conditionLevel])}${day.pem ? " ・労作後の悪化あり" : ""}</title>
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
      ? `前の${board.windowDays}日と比較できません`
      : Math.abs(delta) < 0.2
        ? `前の${board.windowDays}日とほぼ同じ`
        : `前の${board.windowDays}日より ${delta > 0 ? "+" : ""}${delta}`;

  const cohort = board.cohort;
  const cohortText = !cohort
    ? ""
    : cohort.average !== null
      ? `<p class="cohort">同じ疾患（${escapeHtml(cohort.disease)}）を記録している ${cohort.contributors} 人の平均は <strong>${cohort.average}</strong> です。</p>`
      : `<p class="cohort muted">同じ疾患の記録が ${cohort.minContributors} 人分たまると、平均との比較を表示します（現在 ${cohort.contributors} 人）。</p>`;

  const windowSwitch = board.windowOptions
    .map(
      (option) => `<button class="window-option${option === board.windowDays ? " on" : ""}"
        data-window="${option}" aria-pressed="${option === board.windowDays}">${option}日</button>`
    )
    .join("");

  return `<section class="card trend-card">
    <div class="card-head">
      <h2>この${board.windowDays}日の推移</h2>
      <div class="window-switch" role="group" aria-label="表示する期間">${windowSwitch}</div>
    </div>

    ${board.insight.length ? `<p class="insight">${escapeHtml(board.insight.join(" "))}</p>` : ""}

    <div class="stat-row">
      <div class="stat"><span>平均</span><strong>${summary.average === null ? "—" : summary.average}</strong><small>${escapeHtml(deltaText)}</small></div>
      <div class="stat"><span>記録した日</span><strong>${summary.recordedDays}<small class="unit">/${board.windowDays}日</small></strong><small>${Math.round((summary.recordedDays / board.windowDays) * 100)}%</small></div>
      <div class="stat"><span>連続記録</span><strong>${summary.streak}<small class="unit">日</small></strong><small>今日を含む</small></div>
    </div>

    <div class="chart-wrap">
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img"
           aria-label="直近${board.windowDays}日の体調。記録した日は${summary.recordedDays}日、平均は${summary.average === null ? "なし" : summary.average}。${escapeHtml(board.insight.join(" "))}">
        <line class="axis" x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}"/>
        <line class="reference" x1="${padding.left}" y1="${yFor(3).toFixed(1)}" x2="${width - padding.right}" y2="${yFor(3).toFixed(1)}"/>
        <text class="tick" x="${padding.left - 8}" y="${(yFor(5) + 4).toFixed(1)}" text-anchor="end">良い</text>
        <text class="tick" x="${padding.left - 8}" y="${(yFor(3) + 4).toFixed(1)}" text-anchor="end">ふつう</text>
        <text class="tick" x="${padding.left - 8}" y="${(yFor(1) + 4).toFixed(1)}" text-anchor="end">悪い</text>
        ${marks}
        <text class="tick" x="${padding.left}" y="${height - 6}">${first.getMonth() + 1}月${first.getDate()}日</text>
        <text class="tick" x="${width - padding.right}" y="${height - 6}" text-anchor="end">今日</text>
      </svg>
      <p class="chart-readout" id="chartReadout" aria-live="polite"></p>
      <p class="chart-legend">
        <span class="legend-item"><span class="swatch bar"></span>体調</span>
        <span class="legend-item"><span class="swatch dot"></span>労作後の悪化</span>
        <span class="legend-item"><span class="swatch empty"></span>未記録</span>
      </p>
    </div>
    ${cohortText}
  </section>`;
}

export function renderToday() {
  return frame(`<h1 class="visually-hidden">本日の記録</h1>
  <div class="page-stack">
    ${renderCheckinCard()}
    ${renderTrend()}
  </div>`);
}
