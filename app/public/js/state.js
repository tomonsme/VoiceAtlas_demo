export const diseases = [
  "筋痛性脳脊髄炎",
  "Long COVID",
  "線維筋痛症",
  "がん",
  "自己免疫疾患",
  "希少疾患",
  "その他"
];

export const ageRanges = ["10代", "20代", "30代", "40代", "50代", "60代", "70代以上"];
export const genders = ["女性", "男性", "ノンバイナリー", "回答しない"];

// Shown on the login screen so a walkthrough can start without typing.
export const demoAccounts = [
  { email: "tippy@example.jp", label: "ティッピー", note: "研究参加済み・記録あり" }
];

/* Every scale runs 1 = 最も悪い .. 5 = 最も良い so the three items aggregate in
 * the same direction. Fatigue is worded accordingly (5 = 疲労がない). */
export const levelLabels = {
  condition: ["", "とても悪い", "悪い", "ふつう", "良い", "とても良い"],
  fatigue: ["", "とても強い", "強い", "ふつう", "弱い", "ない"],
  sleep: ["", "とても悪い", "悪い", "ふつう", "良い", "とても良い"]
};

export const consentLabels = {
  terms: "利用規約・プライバシーポリシー",
  privacy: "プライバシーポリシー",
  research_participation: "研究参加同意"
};

export const errorMessages = {
  server_error: "サーバーエラーが発生しました。時間をおいて再度お試しください。",
  invalid_json: "送信内容の形式が正しくありません。",
  payload_too_large: "送信内容が大きすぎます。",
  terms_required: "利用規約への同意が必要です。",
  research_consent_required: "研究参加への同意が必要です。",
  profile_not_found: "プロフィールが見つかりませんでした。",
  not_authenticated: "ログインが必要です。",
  invalid_email: "メールアドレスの形式が正しくありません。",
  email_taken: "このメールアドレスは既に登録されています。",
  login_failed: "アカウントが見つかりません。メールアドレスを確認してください。",
  enrollment_not_found: "研究参加の登録が見つかりませんでした。",
  specimen_not_found: "検体の登録が見つかりませんでした。",
  specimen_final_stage: "検体はすでに最終工程です。"
};

/* Screen <-> URL map. `deepLink` marks the screens that are safe to open
 * directly; the rest exist only so the back gesture works inside a flow. */
export const routes = [
  { path: "/", screen: "main", active: "today", deepLink: true },
  { path: "/mypage", screen: "main", active: "mypage", deepLink: true },
  { path: "/search", screen: "main", active: "search", deepLink: true },
  { path: "/research", screen: "main", active: "research", deepLink: true },
  { path: "/research/study", screen: "researchDetail", active: "research" },
  { path: "/community", screen: "main", active: "community", deepLink: true },
  { path: "/profile/edit", screen: "profileEdit", active: "mypage", deepLink: true },
  { path: "/consents", screen: "consents", active: "mypage", deepLink: true },
  { path: "/research/consent", screen: "studyConsent", active: "research", deepLink: true },
  { path: "/research/identity", screen: "identity", active: "research", requires: "studyConsentAccepted" },
  { path: "/login", screen: "auth" },
  { path: "/terms", screen: "terms" },
  { path: "/register", screen: "register" }
];

export const installDismissKey = "voiceatlas-install-dismissed";

export let installPrompt = null;
export let suppressHistory = false;

export let state = {
  screen: "loading",
  active: "mypage",
  offline: !navigator.onLine,
  installDismissed: localStorage.getItem(installDismissKey) === "1",
  authMode: "login",
  error: "",
  termsAccepted: false,
  studyConsentAccepted: false,
  consentPdfOpened: false,
  totalUsers: null,
  userStatsLoading: false,
  userStatsFailed: false,
  consents: null,
  consentsLoading: false,
  consentsFailed: false,
  researchStudies: null,
  researchStudiesLoading: false,
  researchStudiesFailed: false,
  selectedStudyId: null,
  researchOverview: null,
  researchLoading: false,
  researchFailed: false,
  specimenJustAdvancedTo: null,
  stepModal: null,
  checkins: null,
  checkinsLoading: false,
  checkinsFailed: false,
  checkinEditing: false,
  checkinSaved: false,
  checkinWindow: 30,
  profile: null
};

export function setState(next) {
  state = next;
}

export function setInstallPrompt(value) {
  installPrompt = value;
}

export function setSuppressHistory(value) {
  suppressHistory = value;
}
