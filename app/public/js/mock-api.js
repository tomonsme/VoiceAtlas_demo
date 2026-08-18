/* サーバなしで配信するためのモック API。
 *
 * 本物のバックエンドと同じ応答の形を返すので、画面側のコードは一切変えずに動く。
 * 変更（記録・工程送り・参加・撤回・プロフィール編集）はブラウザの localStorage
 * に残るため、デモ中の操作はリロードしても消えない。
 *
 * 検体の工程と撤回可能範囲の判定は app/src/domain/research.js の写し。
 * 片方を変えたらもう片方も直すこと。
 */

import {
  profile as baseProfile,
  consents as baseConsents,
  studies,
  withdrawalPolicyNote,
  initialEnrolment,
  buildCheckinHistory,
  startOfToday,
  daysAgo,
  dateKey
} from "./mock-data.js";

const STORE_KEY = "voiceatlas-mock-state";
const DAY_MS = 24 * 60 * 60 * 1000;

const specimenSteps = [
  { status: "kit_shipped", label: "採取キット発送", description: "登録いただいた住所へ採取キットを発送します。", group: "delivery", icon: "package" },
  { status: "kit_delivered", label: "キット到着", description: "お手元にキットが届いた状態です。", group: "delivery", icon: "home" },
  { status: "specimen_returned", label: "検体を返送", description: "同梱の伝票で検体を返送します。", group: "lab", icon: "truck" },
  { status: "lab_received", label: "検査機関が受領", description: "検査機関に検体が届いた状態です。", group: "lab", icon: "building" },
  { status: "accepted", label: "受付・検品完了", description: "検品を終え、解析を待っている状態です。", group: "lab", icon: "clipboard" },
  { status: "analyzing", label: "解析中", description: "解析が始まると、検体とデータの全面的な撤回はできなくなります。", group: "analysis", icon: "flask", milestone: true, locked: true },
  { status: "analysis_completed", label: "解析完了", description: "解析結果が確定した状態です。", group: "analysis", icon: "check", locked: true },
  { status: "data_registered", label: "研究データベースに登録", description: "解析結果が研究データとして登録された状態です。", group: "analysis", icon: "database", locked: true }
];

const disposedStep = {
  status: "disposed",
  label: "検体を破棄",
  description: "同意撤回、または保管期間の終了により破棄した状態です。",
  group: "disposed",
  icon: "trash"
};

// ---------------------------------------------------------------- 保存

function emptyState() {
  return { signedIn: false, profile: null, checkins: {}, enrolments: [], nextCode: 2 };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
  } catch (_error) {
    return emptyState();
  }
}

function save(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (_error) {
    /* プライベートブラウジングなどで書けない場合は諦める */
  }
}

let store = load();

function reset() {
  store = emptyState();
  save(store);
}

/** 初回ログイン時に、ティッピーの状態を土台として展開する。 */
function seedSignedInState() {
  store.profile = { ...baseProfile };
  store.enrolments = [initialEnrolment()];
  store.checkins = {};
  store.signedIn = true;
  save(store);
}

// ---------------------------------------------------------------- 補助

const fail = (status, code, message) => {
  const error = new Error(message || code);
  error.status = status;
  error.code = code;
  return error;
};

function requireSession() {
  if (!store.signedIn) throw fail(401, "not_authenticated", "ログインが必要です。");
}

function checkinHistory() {
  const history = buildCheckinHistory();
  for (const [key, entry] of Object.entries(store.checkins)) history.set(key, entry);
  return history;
}

function enrolmentFor(studyId) {
  return store.enrolments.find((e) => e.studyId === studyId) || null;
}

function stepIndex(status) {
  return specimenSteps.findIndex((s) => s.status === status);
}

function buildTimeline(specimen) {
  const byStatus = new Map(specimen.events.map((e) => [e.status, e]));
  const reached = stepIndex(specimen.status);
  const steps = specimenSteps.map((step, index) => {
    const event = byStatus.get(step.status);
    return {
      ...step,
      occurredAt: event ? event.occurredAt : null,
      location: event ? event.location : null,
      note: event ? event.note : null,
      done: Boolean(event),
      current: index === reached
    };
  });
  const disposed = byStatus.get("disposed");
  if (disposed) {
    steps.push({
      ...disposedStep,
      occurredAt: disposed.occurredAt,
      location: disposed.location,
      note: disposed.note,
      done: true,
      current: specimen.status === "disposed"
    });
  }
  return steps;
}

function toDeadline(value) {
  if (!value) return null;
  const at = new Date(value);
  const diff = at.getTime() - Date.now();
  return { at: at.toISOString(), passed: diff <= 0, daysLeft: Math.max(0, Math.ceil(diff / DAY_MS)) };
}

function withdrawalState(enrolment) {
  const specimen = enrolment.specimen;
  const analysisStarted = specimen.events.find((e) => e.status === "analyzing") || null;
  const dataLock = toDeadline(daysAgo(-180).toISOString());

  if (enrolment.withdrawnAt) {
    return {
      phase: "withdrawn",
      label: "撤回済みです",
      summary: analysisStarted
        ? "検体は破棄し、以後の利用は停止しています。撤回の時点で解析を終えていたデータは、研究の性質上、削除できない場合があります。"
        : "解析が始まる前に撤回されたため、検体を破棄し、この研究のために提供いただいた情報を削除しました。",
      policyNote: withdrawalPolicyNote,
      fullWithdrawal: null,
      dataLock: null
    };
  }

  let phase = "full";
  if (dataLock && dataLock.passed) phase = "locked";
  else if (analysisStarted) phase = "partial";

  const copy = {
    full: {
      label: "全面撤回できます",
      summary: "いま撤回すると、検体を破棄し、この研究のために提供いただいた情報をすべて削除します。解析はまだ始まっていません。"
    },
    partial: {
      label: "撤回できる範囲に制限があります",
      summary: "検体の破棄と、これ以降の利用停止はできます。すでに解析を終えたデータは、研究の性質上、削除できない場合があります。"
    },
    locked: {
      label: "撤回できる範囲が限られます",
      summary: "データ固定日を過ぎています。統計処理に含まれたデータは取り出せないため、これ以降の利用停止のみ行えます。"
    }
  }[phase];

  const scheduled = toDeadline(specimen.analysisScheduledAt);
  return {
    phase,
    label: copy.label,
    summary: copy.summary,
    policyNote: withdrawalPolicyNote,
    fullWithdrawal: {
      at: analysisStarted ? analysisStarted.occurredAt : scheduled ? scheduled.at : null,
      passed: analysisStarted ? true : scheduled ? scheduled.passed : false,
      daysLeft: analysisStarted ? 0 : scheduled ? scheduled.daysLeft : null,
      basis: analysisStarted ? "解析開始日（実績）" : "解析開始予定日"
    },
    dataLock: dataLock ? { ...dataLock, basis: "データ固定日" } : null
  };
}

function overviewFor(studyId) {
  const study = studies.find((s) => s.id === studyId) || studies.find((s) => enrolmentFor(s.id));
  if (!study) return null;
  const enrolment = enrolmentFor(study.id);
  return {
    study: {
      id: study.id,
      title: study.title,
      summary: study.summary,
      institution: study.institution,
      targetSummary: study.targetSummary,
      status: study.status,
      statusLabel: study.statusLabel
    },
    enrollment: enrolment
      ? {
          status: enrolment.status,
          participantCode: enrolment.participantCode,
          enrolledAt: enrolment.enrolledAt,
          verifiedAt: enrolment.verifiedAt,
          withdrawnAt: enrolment.withdrawnAt
        }
      : null,
    specimen: enrolment
      ? {
          code: enrolment.specimen.code,
          type: "blood",
          typeLabel: "血液",
          status: enrolment.specimen.status,
          steps: buildTimeline(enrolment.specimen),
          canAdvance: Boolean(nextStatus(enrolment.specimen.status))
        }
      : null,
    dataUses: study.dataUses,
    withdrawal: enrolment ? withdrawalState(enrolment) : null
  };
}

function nextStatus(current) {
  if (current === "disposed") return null;
  const i = stepIndex(current);
  return i < 0 || i >= specimenSteps.length - 1 ? null : specimenSteps[i + 1].status;
}

const round2 = (n) => (n === null || Number.isNaN(n) ? null : Number(n.toFixed(2)));

function checkinBoard(windowDays) {
  const history = checkinHistory();
  const days = [];
  for (let back = windowDays - 1; back >= 0; back -= 1) {
    const key = dateKey(daysAgo(back));
    days.push(
      history.get(key) || { date: key, conditionLevel: null, fatigueLevel: null, sleepLevel: null, pem: false, note: null }
    );
  }

  const inWindow = days.filter((d) => d.conditionLevel !== null);
  const previous = [];
  for (let back = windowDays * 2 - 1; back >= windowDays; back -= 1) {
    const entry = history.get(dateKey(daysAgo(back)));
    if (entry) previous.push(entry);
  }

  const mean = (list) => (list.length ? list.reduce((a, d) => a + d.conditionLevel, 0) / list.length : null);
  const average = round2(mean(inWindow));
  const previousAverage = previous.length >= windowDays / 3 ? round2(mean(previous)) : null;
  const deviation =
    inWindow.length > 1
      ? round2(Math.sqrt(inWindow.reduce((a, d) => a + (d.conditionLevel - mean(inWindow)) ** 2, 0) / (inWindow.length - 1)))
      : null;

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].conditionLevel !== null) streak += 1;
    else if (i !== days.length - 1) break;
  }

  const todayEntry = days[days.length - 1];
  const summary = {
    recordedDays: inWindow.length,
    average,
    previousAverage,
    deviation,
    pemDays: inWindow.filter((d) => d.pem).length,
    streak
  };

  return {
    windowDays,
    windowOptions: [30, 90],
    today: todayEntry.conditionLevel === null ? null : todayEntry,
    days,
    summary,
    // 記録している人が自分ひとりなので、平均は伏せられる側の分岐になる
    cohort: { disease: store.profile.disease, contributors: 1, minContributors: 5, average: null }
  };
}

// ---------------------------------------------------------------- 経路

const routes = [
  ["GET", /^\/api\/health$/, () => ({ ok: true })],

  ["GET", /^\/api\/me$/, () => {
    requireSession();
    return { profile: store.profile };
  }],

  ["POST", /^\/api\/auth\/login$/, (_m, body) => {
    if (!body.email || !body.password) throw fail(400, "request_error", "入力してください。");
    if (String(body.email).toLowerCase() !== baseProfile.email) {
      throw fail(401, "login_failed", "アカウントが見つかりません。");
    }
    seedSignedInState();
    return { profile: store.profile };
  }],

  ["POST", /^\/api\/auth\/signup$/, (_m, body) => {
    if (!body.email || !body.password) throw fail(400, "request_error", "入力してください。");
    if (String(body.email).toLowerCase() === baseProfile.email) {
      throw fail(409, "email_taken", "このメールアドレスは既に登録されています。");
    }
    reset();
    store.signedIn = true;
    store.profile = {
      ...baseProfile,
      email: String(body.email).toLowerCase(),
      nickname: String(body.email).split("@")[0],
      disease: "",
      conditionStatusText: "",
      ageRange: "",
      gender: "",
      registered: false,
      termsAccepted: false,
      researchVerified: false,
      researchEnrolled: false,
      badges: []
    };
    save(store);
    return { profile: store.profile };
  }],

  ["POST", /^\/api\/auth\/logout$/, () => {
    reset();
    return { ok: true };
  }],

  ["POST", /^\/api\/light-registration$/, (_m, body) => {
    requireSession();
    if (!body.termsAccepted) throw fail(400, "terms_required", "利用規約への同意が必要です。");
    store.profile = {
      ...store.profile,
      nickname: body.nickname,
      disease: body.disease,
      ageRange: body.ageRange || "",
      gender: body.gender || "",
      conditionStatusText: body.conditionStatusText,
      registered: true,
      termsAccepted: true
    };
    save(store);
    return { profile: store.profile };
  }],

  ["PUT", /^\/api\/profile$/, (_m, body) => {
    requireSession();
    store.profile = {
      ...store.profile,
      nickname: body.nickname,
      disease: body.disease,
      ageRange: body.ageRange || "",
      gender: body.gender || "",
      conditionStatusText: body.conditionStatusText
    };
    save(store);
    return { profile: store.profile };
  }],

  ["GET", /^\/api\/consents$/, () => {
    requireSession();
    const extra = store.enrolments
      .filter((e) => e.withdrawnAt)
      .map((e) => ({
        documentType: "research_participation",
        version: "1.0.0",
        title: "VoiceAtlas 研究参加同意",
        acceptedAt: e.enrolledAt,
        withdrawnAt: e.withdrawnAt
      }));
    const base = store.profile.email === baseProfile.email ? baseConsents : [
      { documentType: "terms", version: "1.1.0", title: "VoiceAtlas 利用規約・プライバシーポリシー", acceptedAt: new Date().toISOString(), withdrawnAt: null }
    ];
    return { consents: [...extra, ...base] };
  }],

  ["GET", /^\/api\/search\/summary$/, () => {
    requireSession();
    return { totalUsers: 1 };
  }],

  ["GET", /^\/api\/checkins$/, (_m, _b, query) => {
    requireSession();
    const days = Number(query.get("days") || 30);
    if (![30, 90].includes(days)) throw fail(400, "invalid_window", "days must be 30 or 90");
    return { board: checkinBoard(days) };
  }],

  ["POST", /^\/api\/checkins$/, (_m, body) => {
    requireSession();
    const level = Number(body.conditionLevel);
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      throw fail(400, "invalid_level", "体調は1〜5で選んでください。");
    }
    const key = dateKey(startOfToday());
    store.checkins[key] = {
      date: key,
      conditionLevel: level,
      fatigueLevel: body.fatigueLevel ? Number(body.fatigueLevel) : null,
      sleepLevel: body.sleepLevel ? Number(body.sleepLevel) : null,
      pem: Boolean(body.pem),
      note: (body.note || "").trim().slice(0, 200) || null
    };
    save(store);
    return { board: checkinBoard(Number(body.days) || 30) };
  }],

  ["GET", /^\/api\/research\/studies$/, () => {
    requireSession();
    return {
      studies: studies
        .map((s) => {
          const e = enrolmentFor(s.id);
          return {
            id: s.id,
            title: s.title,
            summary: s.summary,
            institution: s.institution,
            targetSummary: s.targetSummary,
            status: s.status,
            statusLabel: s.statusLabel,
            enrollmentStatus: e ? e.status : null,
            enrolledAt: e ? e.enrolledAt : null,
            specimenStatus: e ? e.specimen.status : null,
            specimenDone: e ? stepIndex(e.specimen.status) + 1 : 0,
            specimenTotal: specimenSteps.length
          };
        })
        .sort((a, b) => (a.enrollmentStatus ? 0 : 1) - (b.enrollmentStatus ? 0 : 1))
    };
  }],

  ["GET", /^\/api\/research\/overview$/, (_m, _b, query) => {
    requireSession();
    const overview = overviewFor(query.get("studyId"));
    if (!overview) throw fail(404, "enrollment_not_found", "研究参加の登録が見つかりませんでした。");
    return { overview };
  }],

  ["POST", /^\/api\/research\/enroll$/, (_m, body) => {
    requireSession();
    if (!body.researchConsentAccepted) throw fail(400, "research_consent_required", "研究参加への同意が必要です。");
    const study = studies.find((s) => s.id === body.studyId) || studies.find((s) => s.status === "recruiting");
    if (!study || !["recruiting", "active"].includes(study.status)) {
      throw fail(404, "study_not_available", "この研究は募集していません。");
    }
    const existing = enrolmentFor(study.id);
    const enrolment = existing || {
      studyId: study.id,
      participantCode: `VA-DEMO${String(store.nextCode++).padStart(4, "0")}`,
      specimen: {
        code: `VA-SPC-DEMO${String(store.nextCode).padStart(4, "0")}`,
        status: "kit_shipped",
        analysisScheduledAt: daysAgo(-21).toISOString(),
        events: [
          {
            status: "kit_shipped",
            occurredAt: new Date().toISOString(),
            location: "配送センター",
            note: "登録住所へ採取キットを発送しました"
          }
        ]
      }
    };
    enrolment.status = "verified";
    enrolment.enrolledAt = enrolment.enrolledAt || new Date().toISOString();
    enrolment.verifiedAt = new Date().toISOString();
    enrolment.withdrawnAt = null;
    if (!existing) store.enrolments.push(enrolment);

    store.profile = {
      ...store.profile,
      researchVerified: true,
      researchEnrolled: true,
      badges: baseProfile.badges
    };
    save(store);
    return { profile: store.profile };
  }],

  ["POST", /^\/api\/research\/withdraw$/, (_m, body) => {
    requireSession();
    const targets = body.studyId ? store.enrolments.filter((e) => e.studyId === body.studyId) : store.enrolments;
    for (const e of targets) {
      if (e.status !== "verified") continue;
      e.status = "withdrawn";
      e.withdrawnAt = new Date().toISOString();
      if (e.specimen.status !== "disposed") {
        e.specimen.status = "disposed";
        e.specimen.events.push({
          status: "disposed",
          occurredAt: new Date().toISOString(),
          location: "検査機関",
          note: "同意撤回のため検体を破棄しました"
        });
      }
    }
    const stillIn = store.enrolments.some((e) => e.status === "verified");
    store.profile = { ...store.profile, researchVerified: stillIn, badges: stillIn ? baseProfile.badges : [] };
    save(store);
    return { profile: store.profile };
  }],

  ["POST", /^\/api\/research\/specimen\/advance$/, () => {
    requireSession();
    const enrolment = [...store.enrolments].reverse().find((e) => nextStatus(e.specimen.status));
    if (!enrolment) throw fail(409, "specimen_final_stage", "検体はすでに最終工程です。");
    const next = nextStatus(enrolment.specimen.status);
    const step = specimenSteps.find((s) => s.status === next);
    enrolment.specimen.status = next;
    enrolment.specimen.events.push({
      status: next,
      occurredAt: new Date().toISOString(),
      location: "デモ操作",
      note: step ? step.description : null
    });
    save(store);
    return { overview: overviewFor(enrolment.studyId) };
  }]
];

/** 画面側から見ると fetch と同じ形で応答する。 */
export function mockApi(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "https://mock.local");
  const body = options.body ? JSON.parse(options.body) : {};

  const route = routes.find(([m, pattern]) => m === method && pattern.test(url.pathname));
  if (!route) throw fail(404, "not_found", "見つかりませんでした。");

  return route[2](url.pathname.match(route[1]), body, url.searchParams);
}
