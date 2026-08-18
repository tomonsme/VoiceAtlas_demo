import { t } from "./i18n.js";

// 疾患・年代・性別は「保存される正準値」。表示だけ optLabel() で訳す。
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
// ラベルは表示時に t() を通す（辞書キーを持つ）。
export const demoAccounts = [
  { email: "tippy@example.jp", labelKey: "auth.demoName", noteKey: "auth.demoNote" }
];

/* Every scale runs 1 = worst .. 5 = best so the three items aggregate in the
 * same direction. Labels live in the dictionary as level.<scale>.<n>. */
export const levelScales = ["condition", "fatigue", "sleep"];

export function levelLabel(scale, level) {
  return level ? t(`level.${scale}.${level}`) : "";
}

const consentLabelKeys = {
  terms: "consents.terms",
  privacy: "consents.privacy",
  research_participation: "consents.research"
};

export function consentLabel(documentType) {
  const key = consentLabelKeys[documentType];
  return key ? t(key) : documentType;
}

const errorKeys = {
  server_error: "error.server",
  invalid_json: "error.invalidJson",
  payload_too_large: "error.payloadTooLarge",
  terms_required: "error.termsRequired",
  research_consent_required: "error.researchConsentRequired",
  profile_not_found: "error.profileNotFound",
  not_authenticated: "error.notAuthenticated",
  invalid_email: "error.invalidEmail",
  email_taken: "error.emailTaken",
  login_failed: "error.loginFailed",
  enrollment_not_found: "error.enrollmentNotFound",
  specimen_not_found: "error.specimenNotFound",
  specimen_final_stage: "error.specimenFinalStage",
  request_error: "error.requestError",
  invalid_level: "error.invalidLevel",
  study_not_available: "error.studyNotAvailable"
};

export function errorMessage(code) {
  const key = errorKeys[code];
  return key ? t(key) : "";
}

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
