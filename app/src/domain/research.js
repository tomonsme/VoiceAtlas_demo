/* Specimen pipeline and withdrawal rules.
 *
 * The step list is the single source of truth for both the participant-facing
 * tracking timeline and the question "what can still be withdrawn". It is
 * served to the client rather than duplicated there, so the two cannot drift.
 */

/* `group` drives the colour band in the UI, and `locked` marks the steps from
 * which a full withdrawal is no longer possible. */
const specimenSteps = [
  {
    status: "kit_shipped",
    label: "採取キット発送",
    description: "登録いただいた住所へ採取キットを発送します。",
    group: "delivery",
    groupLabel: "お届け",
    icon: "package"
  },
  {
    status: "kit_delivered",
    label: "キット到着",
    description: "お手元にキットが届いた状態です。",
    group: "delivery",
    groupLabel: "お届け",
    icon: "home"
  },
  {
    status: "specimen_returned",
    label: "検体を返送",
    description: "同梱の伝票で検体を返送します。",
    group: "lab",
    groupLabel: "検査機関",
    icon: "truck"
  },
  {
    status: "lab_received",
    label: "検査機関が受領",
    description: "検査機関に検体が届いた状態です。",
    group: "lab",
    groupLabel: "検査機関",
    icon: "building"
  },
  {
    status: "accepted",
    label: "受付・検品完了",
    description: "検品を終え、解析を待っている状態です。",
    group: "lab",
    groupLabel: "検査機関",
    icon: "clipboard"
  },
  {
    status: "analyzing",
    label: "解析中",
    description: "解析が始まると、検体とデータの全面的な撤回はできなくなります。",
    group: "analysis",
    groupLabel: "解析",
    icon: "flask",
    milestone: true,
    locked: true
  },
  {
    status: "analysis_completed",
    label: "解析完了",
    description: "解析結果が確定した状態です。",
    group: "analysis",
    groupLabel: "解析",
    icon: "check",
    locked: true
  },
  {
    status: "data_registered",
    label: "研究データベースに登録",
    description: "解析結果が研究データとして登録された状態です。",
    group: "analysis",
    groupLabel: "解析",
    icon: "database",
    locked: true
  }
];

const disposedStep = {
  status: "disposed",
  label: "検体を破棄",
  description: "同意撤回、または保管期間の終了により破棄した状態です。",
  group: "disposed",
  groupLabel: "破棄",
  icon: "trash"
};

const specimenTypeLabels = {
  blood: "血液"
};

const phaseCopy = {
  full: {
    label: "全面撤回できます",
    summary:
      "いま撤回すると、検体を破棄し、この研究のために提供いただいた情報をすべて削除します。解析はまだ始まっていません。"
  },
  partial: {
    label: "撤回できる範囲に制限があります",
    summary:
      "検体の破棄と、これ以降の利用停止はできます。すでに解析を終えたデータは、研究の性質上、削除できない場合があります。"
  },
  locked: {
    label: "撤回できる範囲が限られます",
    summary:
      "データ固定日を過ぎています。統計処理に含まれたデータは取り出せないため、これ以降の利用停止のみ行えます。"
  },
  withdrawnBeforeAnalysis: {
    label: "撤回済みです",
    summary:
      "解析が始まる前に撤回されたため、検体を破棄し、この研究のために提供いただいた情報を削除しました。"
  },
  withdrawnAfterAnalysis: {
    label: "撤回済みです",
    summary:
      "検体は破棄し、以後の利用は停止しています。撤回の時点で解析を終えていたデータは、研究の性質上、削除できない場合があります。"
  }
};

const dayInMs = 24 * 60 * 60 * 1000;

function toDeadline(value, now) {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;
  const diff = at.getTime() - now.getTime();
  return {
    at: at.toISOString(),
    passed: diff <= 0,
    daysLeft: Math.max(0, Math.ceil(diff / dayInMs))
  };
}

/** Merge the canonical step list with the events recorded for one specimen. */
function buildTimeline(specimenStatus, events) {
  const byStatus = new Map(events.map((event) => [event.status, event]));
  const reachedIndex = specimenSteps.findIndex((step) => step.status === specimenStatus);

  const steps = specimenSteps.map((step, index) => {
    const event = byStatus.get(step.status);
    return {
      ...step,
      occurredAt: event ? event.occurredAt : null,
      location: event ? event.location : null,
      note: event ? event.note : null,
      done: Boolean(event),
      current: index === reachedIndex
    };
  });

  const disposedEvent = byStatus.get(disposedStep.status);
  if (disposedEvent) {
    steps.push({
      ...disposedStep,
      occurredAt: disposedEvent.occurredAt,
      location: disposedEvent.location,
      note: disposedEvent.note,
      done: true,
      current: specimenStatus === disposedStep.status
    });
  }

  return steps;
}

function nextStatus(currentStatus) {
  if (currentStatus === disposedStep.status) return null;
  const index = specimenSteps.findIndex((step) => step.status === currentStatus);
  if (index < 0 || index >= specimenSteps.length - 1) return null;
  return specimenSteps[index + 1].status;
}

/**
 * Which parts of a withdrawal are still possible. Analysis start is the point
 * of no return for the specimen; the study's data lock date is the point of no
 * return for the results derived from it.
 */
function withdrawalState(
  { events, analysisScheduledAt, dataLockAt, policyNote, withdrawnAt },
  now = new Date()
) {
  const analysisStarted = events.find((event) => event.status === "analyzing") || null;
  const dataLock = toDeadline(dataLockAt, now);

  // Already withdrawn: no deadline is actionable any more, and what matters is
  // whether analysis had begun at the time -- that decides what could be erased.
  if (withdrawnAt) {
    const copy = analysisStarted ? phaseCopy.withdrawnAfterAnalysis : phaseCopy.withdrawnBeforeAnalysis;
    return {
      phase: "withdrawn",
      label: copy.label,
      summary: copy.summary,
      policyNote: policyNote || null,
      fullWithdrawal: null,
      dataLock: null
    };
  }

  let phase = "full";
  if (dataLock && dataLock.passed) phase = "locked";
  else if (analysisStarted) phase = "partial";

  const scheduled = toDeadline(analysisScheduledAt, now);

  return {
    phase,
    label: phaseCopy[phase].label,
    summary: phaseCopy[phase].summary,
    policyNote: policyNote || null,
    fullWithdrawal: {
      // Once analysis has begun the window is closed, and the date that matters
      // is when it actually started rather than when it was planned.
      at: analysisStarted ? analysisStarted.occurredAt : scheduled ? scheduled.at : null,
      passed: analysisStarted ? true : scheduled ? scheduled.passed : false,
      daysLeft: analysisStarted ? 0 : scheduled ? scheduled.daysLeft : null,
      basis: analysisStarted ? "解析開始日（実績）" : "解析開始予定日"
    },
    dataLock: dataLock ? { ...dataLock, basis: "データ固定日" } : null
  };
}

module.exports = {
  specimenSteps,
  disposedStep,
  specimenTypeLabels,
  buildTimeline,
  nextStatus,
  withdrawalState
};
