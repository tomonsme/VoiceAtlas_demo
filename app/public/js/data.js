import { state } from "./state.js";
import { api } from "./api.js";
import { rerender } from "./render-bus.js";

export async function loadUserStats() {
  // userStatsFailed stops rerender() from re-triggering this on every repaint:
  // without it a failing request loops forever while the search tab is open.
  if (state.userStatsLoading || state.userStatsFailed) return;
  state.userStatsLoading = true;
  try {
    const data = await api("/api/search/summary");
    state.totalUsers = data.totalUsers;
  } catch (_error) {
    state.userStatsFailed = true;
  } finally {
    state.userStatsLoading = false;
    if (state.screen === "main" && state.active === "search") rerender();
  }
}

export async function loadConsents() {
  if (state.consentsLoading || state.consentsFailed) return;
  state.consentsLoading = true;
  try {
    const data = await api("/api/consents");
    state.consents = data.consents;
  } catch (_error) {
    state.consentsFailed = true;
  } finally {
    state.consentsLoading = false;
    if (state.screen === "consents") rerender();
  }
}

export async function loadResearchStudies() {
  if (state.researchStudiesLoading || state.researchStudiesFailed) return;
  state.researchStudiesLoading = true;
  try {
    const data = await api("/api/research/studies");
    state.researchStudies = data.studies;
  } catch (_error) {
    state.researchStudiesFailed = true;
  } finally {
    state.researchStudiesLoading = false;
    if (state.screen === "main" && state.active === "research") rerender();
  }
}

export async function loadResearchOverview() {
  if (state.researchLoading || state.researchFailed) return;
  state.researchLoading = true;
  try {
    const query = state.selectedStudyId ? `?studyId=${encodeURIComponent(state.selectedStudyId)}` : "";
    const data = await api(`/api/research/overview${query}`);
    state.researchOverview = data.overview;
  } catch (_error) {
    state.researchFailed = true;
  } finally {
    state.researchLoading = false;
    if (state.screen === "researchDetail") rerender();
  }
}

export async function loadCheckins() {
  if (state.checkinsLoading || state.checkinsFailed) return;
  state.checkinsLoading = true;
  try {
    const data = await api(`/api/checkins?days=${state.checkinWindow}`);
    state.checkins = data.board;
  } catch (_error) {
    state.checkinsFailed = true;
  } finally {
    state.checkinsLoading = false;
    if (state.screen === "main" && state.active === "today") rerender();
  }
}

export async function switchCheckinWindow(days) {
  if (state.checkinWindow === days) return;
  state.checkinWindow = days;
  try {
    const data = await api(`/api/checkins?days=${days}`);
    state.checkins = data.board;
    state.checkinsFailed = false;
  } catch (_error) {
    state.checkinsFailed = true;
  }
  rerender();
}

export function invalidateResearchOverview() {
  state.researchOverview = null;
  state.researchFailed = false;
  // The list shows each study's enrolment state and specimen progress, so it
  // goes stale the moment the detail changes.
  state.researchStudies = null;
  state.researchStudiesFailed = false;
}
