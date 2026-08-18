/* サーバ／モックが返す「コード」を、表示用の文言に変換する層。
 *
 * 文言をサーバ側に持つと言語を切り替えても日本語のままになるため、
 * 表示文字列はすべてここで辞書から引き直す。辞書にキーがない値
 * （本番DBの自由記述など）はサーバが返した文字列をそのまま使う。
 */

import { t, pick, dictionary, getLang } from "./i18n.js";

function has(key) {
  return Object.prototype.hasOwnProperty.call(dictionary[getLang()] || {}, key);
}

function fromKey(key, fallback) {
  return has(key) ? t(key) : pick(fallback);
}

export function stepLabel(step) {
  return fromKey(`step.${step.status}`, step.label);
}

export function stepDescription(step) {
  return fromKey(`step.${step.status}.desc`, step.description);
}

/** 記録済みの工程は「実際に起きたこと」、未達の工程は工程の説明を出す。 */
export function stepNote(step) {
  if (!step.done) return stepDescription(step);
  return has(`note.${step.status}`) ? t(`note.${step.status}`) : pick(step.note) || stepDescription(step);
}

// 場所はDB上は自由記述なので、既知の値だけ辞書に寄せる。
const placeKeys = {
  配送センター: "place.shipping",
  お届け先: "place.home",
  集荷: "place.pickup",
  検査機関: "place.lab",
  研究代表機関: "place.institution",
  デモ操作: "place.demo"
};

export function placeLabel(value) {
  const text = pick(value);
  if (!text) return "";
  const key = placeKeys[text];
  return key && has(key) ? t(key) : text;
}

export function studyStatusLabel(study) {
  const keys = {
    recruiting: "research.statusRecruiting",
    active: "research.statusActive",
    closed: "research.statusClosed"
  };
  return fromKey(keys[study.status] || "", study.statusLabel);
}

export function specimenTypeLabel(specimen) {
  const keys = { blood: "research.specimenBlood" };
  return fromKey(keys[specimen.type] || "", specimen.typeLabel);
}

/** 撤回可能範囲の見出しと説明。撤回済みは解析開始の有無で内容が変わる。 */
export function withdrawalCopy(withdrawal, specimen) {
  if (withdrawal.phase === "withdrawn") {
    const analysed = Boolean(
      specimen && specimen.steps.some((step) => step.status === "analyzing" && step.done)
    );
    return {
      label: t("phase.withdrawn"),
      summary: t(analysed ? "phase.withdrawnAfter.summary" : "phase.withdrawnBefore.summary")
    };
  }
  return {
    label: fromKey(`phase.${withdrawal.phase}`, withdrawal.label),
    summary: fromKey(`phase.${withdrawal.phase}.summary`, withdrawal.summary)
  };
}

export function policyNote(withdrawal) {
  if (!withdrawal.policyNote) return "";
  return has("phase.policyNote") ? t("phase.policyNote") : pick(withdrawal.policyNote);
}

/* 推移の講評。数値はサーバが出すが、文章は言語ごとに組み立て直す。 */
export function trendInsight(summary, windowDays) {
  const { recordedDays, average, previousAverage, deviation, pemDays } = summary;
  if (recordedDays < 5) return [t("trend.insightTooFew", { n: recordedDays })];

  const out = [];
  const delta = previousAverage === null ? null : Number((average - previousAverage).toFixed(1));
  if (delta === null) out.push(t("trend.insightNoPrev", { n: windowDays, average }));
  else if (Math.abs(delta) < 0.2) out.push(t("trend.insightSame", { n: windowDays }));
  else out.push(t(delta > 0 ? "trend.insightBetter" : "trend.insightWorse", { n: windowDays, delta: Math.abs(delta) }));

  if (deviation !== null) {
    if (deviation < 0.6) out.push(t("trend.stabilityCalm"));
    else if (deviation < 1.1) out.push(t("trend.stabilityMixed"));
    else out.push(t("trend.stabilityVolatile"));
  }
  if (pemDays > 0) out.push(t("trend.pemDays", { n: pemDays }));
  return out;
}
