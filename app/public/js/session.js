import { state, setState } from "./state.js";

// Where a signed-in user lands depends on how far they got last time: the
// session survives, so the walkthrough can be resumed rather than restarted.
export function applyProfile(profile) {
  state.profile = profile;
  if (!profile.termsAccepted) {
    state.termsAccepted = false;
    state.screen = "terms";
  } else if (!profile.registered) {
    state.termsAccepted = true;
    state.screen = "register";
  } else {
    state.screen = "main";
    state.active = "today";
  }
}

export function resetSessionState() {
  setState({
    ...state,
    screen: "auth",
    authMode: "login",
    active: "today",
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
    checkins: null,
    checkinsLoading: false,
    checkinsFailed: false,
    checkinEditing: false,
    checkinSaved: false,
    checkinWindow: 30,
    profile: null
  });
}
