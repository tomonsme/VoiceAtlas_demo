/* サーバなしで動かすためのデータ。
 *
 * 日付は常に「今日」からの相対で組み立てる。固定値を焼き込むと、時間が経つほど
 * グラフの日付と実際の日付がずれていくため。
 *
 * 検体の工程定義は app/src/domain/research.js の写し。表示に必要な最小限だけを
 * 持ち、片方を変えたらもう片方も直す。
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysAgo(n) {
  return new Date(startOfToday().getTime() - n * DAY_MS);
}

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* 同じ日には必ず同じ値が出るようにする（再読み込みでグラフが変わらない）。 */
function noise(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 256;
}

const clamp = (n) => Math.max(1, Math.min(5, Math.round(n)));

/** 直近200日ぶんの記録。6日に1日ほど空けて、記録率が100%にならないようにする。 */
export function buildCheckinHistory() {
  const history = new Map();
  const span = 200;
  for (let back = span; back >= 1; back -= 1) {
    const day = daysAgo(back);
    const key = dateKey(day);
    const n = noise(`tippy:${key}`);
    if (n % 6 === 0) continue;
    const progress = (span - back) / span;
    const condition = clamp(2.4 + 0.2 * progress + ((n % 5) - 2));
    history.set(key, {
      date: key,
      conditionLevel: condition,
      fatigueLevel: clamp(condition + ((Math.floor(n / 8) % 3) - 1)),
      sleepLevel: clamp(condition + ((Math.floor(n / 32) % 3) - 1)),
      pem: n % 7 === 0,
      note: null
    });
  }
  return history;
}

export const profile = {
  id: "demo-user-tippy",
  email: "tippy@example.jp",
  nickname: "ティッピー",
  ageRange: "40代",
  gender: "男性",
  disease: "筋痛性脳脊髄炎",
  conditionStatusText:
    "3年前、コロナワクチン接種後に強い倦怠感から日常生活が困難になりました。筋痛性脳脊髄炎と診断されるまで2年かかり、現在も症状は改善しません。",
  registered: true,
  termsAccepted: true,
  researchVerified: true,
  researchEnrolled: true,
  badges: [
    {
      code: "research_verified",
      label: "研究認証",
      description: "研究参加同意と本人情報登録が完了したユーザーに表示するバッジ。",
      granted_at: daysAgo(149).toISOString()
    }
  ]
};

export const consents = [
  {
    documentType: "terms",
    version: "1.1.0",
    title: "VoiceAtlas 利用規約・プライバシーポリシー",
    acceptedAt: daysAgo(29).toISOString(),
    withdrawnAt: null
  },
  {
    documentType: "research_participation",
    version: "1.0.0",
    title: "VoiceAtlas 研究参加同意",
    acceptedAt: daysAgo(150).toISOString(),
    withdrawnAt: null
  },
  {
    documentType: "terms",
    version: "1.0.0",
    title: "VoiceAtlas 利用規約・プライバシーポリシー",
    acceptedAt: daysAgo(389).toISOString(),
    withdrawnAt: null
  }
];

const commonUses = [
  {
    purpose: "研究目的での解析",
    detail: "研究計画に記載された解析にのみ使用します。",
    dataItems: "血液検体、症状・治療の記録、年代・性別",
    recipient: "研究代表機関",
    retention: "研究終了後5年",
    withdrawable: true,
    appliesFrom: "analyzing"
  },
  {
    purpose: "検体・結果の送付",
    detail: "採取キットの発送と、希望者への結果返却に使います。解析には使用しません。",
    dataItems: "氏名、住所",
    recipient: "VoiceAtlas運営（発送業務のみ）",
    retention: "送付完了後1年",
    withdrawable: true,
    appliesFrom: "kit_shipped"
  },
  {
    purpose: "研究成果の公表",
    detail: "論文・学会発表に使用します。個人が特定できない統計処理後の形のみを扱います。",
    dataItems: "統計処理後のデータ（個人を特定できない形）",
    recipient: "学術論文、学会発表",
    retention: "公表後は削除できません",
    withdrawable: false,
    appliesFrom: "data_registered"
  }
];

export const studies = [
  {
    id: "study-initial",
    title: "VoiceAtlas 初期研究",
    summary:
      "疾患経験者のプロフィール、状態、研究参加意思を安全に扱うための初期研究。血液検体と日々の記録から、症状の重さに関わる要因を調べます。",
    institution: "国内の大学医学部（研究代表機関）",
    targetSummary: "筋痛性脳脊髄炎、Long COVID、線維筋痛症",
    status: "active",
    statusLabel: "実施中",
    dataUses: [
      {
        purpose: "疾患メカニズムの解明",
        detail: "発症の仕組みや、症状の重さに関わる要因を調べます。",
        dataItems: "血液検体（DNA・血漿）、症状・治療の記録、年代・性別",
        recipient: "研究代表機関（国内の大学医学部）",
        retention: "研究終了後5年",
        withdrawable: true,
        appliesFrom: "analyzing"
      },
      {
        purpose: "診断マーカーの探索",
        detail: "血液中の指標から、診断や重症度の判定に使える指標を探します。",
        dataItems: "血液検体（血漿）、症状の経過記録",
        recipient: "研究代表機関および共同研究機関（国内）",
        retention: "研究終了後5年",
        withdrawable: true,
        appliesFrom: "analyzing"
      },
      commonUses[1],
      commonUses[2]
    ]
  },
  {
    id: "study-mecfs",
    title: "筋痛性脳脊髄炎の重症度指標に関する研究",
    summary: "日々の体調記録と血液検体から、重症度を判定できる指標を探します。通院の負担を減らすことを目指しています。",
    institution: "国内の大学病院 神経内科",
    targetSummary: "筋痛性脳脊髄炎と診断されている方",
    status: "recruiting",
    statusLabel: "募集中",
    dataUses: commonUses
  },
  {
    id: "study-longcovid",
    title: "Long COVIDの回復経過に関する長期観察",
    summary: "感染後の症状がどのように変化するかを2年間かけて観察します。検体の提供は年1回です。",
    institution: "国内の研究機関",
    targetSummary: "Long COVIDの症状が3か月以上続いている方",
    status: "recruiting",
    statusLabel: "募集中",
    dataUses: commonUses
  },
  {
    id: "study-sleep",
    title: "慢性疲労と睡眠の関連調査",
    summary: "睡眠の質と日中の疲労感の関連を調べた調査です。募集は終了しました。",
    institution: "国内の大学 睡眠医科学講座",
    targetSummary: "慢性的な疲労のある方",
    status: "closed",
    statusLabel: "終了",
    dataUses: commonUses
  }
];

export const withdrawalPolicyNote =
  "解析が始まる前に撤回した場合は、検体を破棄し、提供いただいた情報をすべて削除します。解析が始まった後は、検体の破棄と以後の利用停止はできますが、既に解析を終えたデータの削除はできない場合があります。データ固定日を過ぎると、統計処理に含まれたデータは取り出せません。";

/** 初期研究への参加。検体は解析・データベース登録まで終わっている状態。 */
export function initialEnrolment() {
  return {
    studyId: "study-initial",
    status: "verified",
    participantCode: "VA-DEMO0001",
    enrolledAt: daysAgo(150).toISOString(),
    verifiedAt: daysAgo(149).toISOString(),
    withdrawnAt: null,
    specimen: {
      code: "VA-SPC-DEMO0001",
      status: "data_registered",
      analysisScheduledAt: daysAgo(140).toISOString(),
      events: [
        ["kit_shipped", 148, "配送センター", "登録住所へ採取キットを発送しました"],
        ["kit_delivered", 146, "お届け先", "キットが届きました"],
        ["specimen_returned", 143, "集荷", "同梱の伝票で返送されました"],
        ["lab_received", 142, "検査機関", "検査機関が受領しました"],
        ["accepted", 141, "検査機関", "検品を完了し、受付が確定しました"],
        ["analyzing", 140, "検査機関", "解析を開始しました。この時点以降、全面撤回はできません"],
        ["analysis_completed", 120, "検査機関", "解析が完了しました"],
        ["data_registered", 118, "研究代表機関", "研究データベースに登録されました"]
      ].map(([status, back, location, note]) => ({
        status,
        occurredAt: daysAgo(back).toISOString(),
        location,
        note
      }))
    }
  };
}
