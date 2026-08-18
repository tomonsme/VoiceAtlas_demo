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
  nickname: { ja: "ティッピー", en: "Tippy" },
  ageRange: "40代",
  gender: "男性",
  disease: "筋痛性脳脊髄炎",
  conditionStatusText: {
    ja: "3年前、コロナワクチン接種後に強い倦怠感から日常生活が困難になりました。筋痛性脳脊髄炎と診断されるまで2年かかり、現在も症状は改善しません。",
    en: "Three years ago, severe fatigue after a COVID vaccination made daily life difficult. It took two years to be diagnosed with ME/CFS, and the symptoms have not improved."
  },
  registered: true,
  termsAccepted: true,
  researchVerified: true,
  researchEnrolled: true,
  badges: [
    {
      code: "research_verified",
      label: { ja: "研究認証", en: "Research verified" },
      description: {
        ja: "研究参加同意と本人情報登録が完了したユーザーに表示するバッジ。",
        en: "Shown once study consent and identity registration are complete."
      },
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
    purpose: { ja: "研究目的での解析", en: "Analysis for the study" },
    detail: {
      ja: "研究計画に記載された解析にのみ使用します。",
      en: "Used only for the analyses set out in the study protocol."
    },
    dataItems: {
      ja: "血液検体、症状・治療の記録、年代・性別",
      en: "Blood sample, symptom and treatment records, age range and gender"
    },
    recipient: { ja: "研究代表機関", en: "The lead research institution" },
    retention: { ja: "研究終了後5年", en: "5 years after the study ends" },
    withdrawable: true,
    appliesFrom: "analyzing"
  },
  {
    purpose: { ja: "検体・結果の送付", en: "Sending the kit and results" },
    detail: {
      ja: "採取キットの発送と、希望者への結果返却に使います。解析には使用しません。",
      en: "Used to post the collection kit and, if you ask for them, to return your results. Never used for analysis."
    },
    dataItems: { ja: "氏名、住所", en: "Name and address" },
    recipient: {
      ja: "VoiceAtlas運営（発送業務のみ）",
      en: "The VoiceAtlas team (postage only)"
    },
    retention: { ja: "送付完了後1年", en: "1 year after delivery" },
    withdrawable: true,
    appliesFrom: "kit_shipped"
  },
  {
    purpose: { ja: "研究成果の公表", en: "Publishing the findings" },
    detail: {
      ja: "論文・学会発表に使用します。個人が特定できない統計処理後の形のみを扱います。",
      en: "Used in papers and conference talks, only in aggregated form that cannot identify you."
    },
    dataItems: {
      ja: "統計処理後のデータ（個人を特定できない形）",
      en: "Aggregated data that cannot identify an individual"
    },
    recipient: { ja: "学術論文、学会発表", en: "Academic papers and conference presentations" },
    retention: { ja: "公表後は削除できません", en: "Cannot be removed once published" },
    withdrawable: false,
    appliesFrom: "data_registered"
  }
];

export const studies = [
  {
    id: "study-initial",
    title: { ja: "VoiceAtlas 初期研究", en: "VoiceAtlas founding study" },
    summary: {
      ja: "疾患経験者のプロフィール、状態、研究参加意思を安全に扱うための初期研究。血液検体と日々の記録から、症状の重さに関わる要因を調べます。",
      en: "The first VoiceAtlas study: handling profiles, health status and consent to take part safely. It looks at what drives symptom severity, using a blood sample and your daily records."
    },
    institution: {
      ja: "国内の大学医学部（研究代表機関）",
      en: "A university medical school in Japan (lead institution)"
    },
    targetSummary: {
      ja: "筋痛性脳脊髄炎、Long COVID、線維筋痛症",
      en: "ME/CFS, Long COVID and fibromyalgia"
    },
    status: "active",
    statusLabel: { ja: "実施中", en: "In progress" },
    dataUses: [
      {
        purpose: { ja: "疾患メカニズムの解明", en: "Understanding the mechanism" },
        detail: {
          ja: "発症の仕組みや、症状の重さに関わる要因を調べます。",
          en: "Looking at how the condition begins and what makes symptoms more severe."
        },
        dataItems: {
          ja: "血液検体（DNA・血漿）、症状・治療の記録、年代・性別",
          en: "Blood sample (DNA and plasma), symptom and treatment records, age range and gender"
        },
        recipient: {
          ja: "研究代表機関（国内の大学医学部）",
          en: "The lead institution (a university medical school in Japan)"
        },
        retention: { ja: "研究終了後5年", en: "5 years after the study ends" },
        withdrawable: true,
        appliesFrom: "analyzing"
      },
      {
        purpose: { ja: "診断マーカーの探索", en: "Looking for diagnostic markers" },
        detail: {
          ja: "血液中の指標から、診断や重症度の判定に使える指標を探します。",
          en: "Searching blood measurements for markers that could support diagnosis or grade severity."
        },
        dataItems: {
          ja: "血液検体（血漿）、症状の経過記録",
          en: "Blood sample (plasma) and your symptom history"
        },
        recipient: {
          ja: "研究代表機関および共同研究機関（国内）",
          en: "The lead institution and its partner institutions in Japan"
        },
        retention: { ja: "研究終了後5年", en: "5 years after the study ends" },
        withdrawable: true,
        appliesFrom: "analyzing"
      },
      commonUses[1],
      commonUses[2]
    ]
  },
  {
    id: "study-mecfs",
    title: {
      ja: "筋痛性脳脊髄炎の重症度指標に関する研究",
      en: "Severity markers in ME/CFS"
    },
    summary: {
      ja: "日々の体調記録と血液検体から、重症度を判定できる指標を探します。通院の負担を減らすことを目指しています。",
      en: "Searching daily records and a blood sample for a way to grade severity, so fewer hospital visits are needed."
    },
    institution: { ja: "国内の大学病院 神経内科", en: "Neurology, a university hospital in Japan" },
    targetSummary: {
      ja: "筋痛性脳脊髄炎と診断されている方",
      en: "People with a diagnosis of ME/CFS"
    },
    status: "recruiting",
    statusLabel: { ja: "募集中", en: "Recruiting" },
    dataUses: commonUses
  },
  {
    id: "study-longcovid",
    title: {
      ja: "Long COVIDの回復経過に関する長期観察",
      en: "Long-term follow-up of recovery in Long COVID"
    },
    summary: {
      ja: "感染後の症状がどのように変化するかを2年間かけて観察します。検体の提供は年1回です。",
      en: "Following how symptoms change after infection over two years. One sample per year."
    },
    institution: { ja: "国内の研究機関", en: "A research institute in Japan" },
    targetSummary: {
      ja: "Long COVIDの症状が3か月以上続いている方",
      en: "People with Long COVID symptoms lasting 3 months or more"
    },
    status: "recruiting",
    statusLabel: { ja: "募集中", en: "Recruiting" },
    dataUses: commonUses
  },
  {
    id: "study-sleep",
    title: { ja: "慢性疲労と睡眠の関連調査", en: "Sleep and chronic fatigue" },
    summary: {
      ja: "睡眠の質と日中の疲労感の関連を調べた調査です。募集は終了しました。",
      en: "A survey of how sleep quality relates to daytime fatigue. Recruitment has closed."
    },
    institution: { ja: "国内の大学 睡眠医科学講座", en: "Sleep medicine, a university in Japan" },
    targetSummary: { ja: "慢性的な疲労のある方", en: "People living with chronic fatigue" },
    status: "closed",
    statusLabel: { ja: "終了", en: "Closed" },
    dataUses: commonUses
  }
];

// 文言そのものは辞書（phase.policyNote）にある。ここは「注記がある」ことだけを示す。
export const withdrawalPolicyNote = true;

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
