import {
  state,
  installDismissKey,
  installPrompt,
  setInstallPrompt,
  setSuppressHistory
} from "./state.js";
import { escapeHtml, formatDate } from "./util.js";
import { t, getLang, setLang, applyDocumentLanguage } from "./i18n.js";
import { api } from "./api.js";
import { setRenderer } from "./render-bus.js";
import { applyProfile, resetSessionState } from "./session.js";
import { pathForState, syncHistory, applyRoute } from "./router.js";
import { initPwa } from "./pwa.js";
import {
  loadUserStats,
  loadConsents,
  loadResearchStudies,
  loadResearchOverview,
  loadCheckins,
  switchCheckinWindow,
  invalidateResearchOverview
} from "./data.js";
import { renderAuth, renderTerms, renderRegister, renderLoading, renderOffline } from "./views/auth.js";
import { renderToday } from "./views/today.js";
import { renderMyPage, renderProfileEdit, renderConsents, renderFuture } from "./views/account.js";
import { renderStudyConsent, renderIdentity, renderResearchList, renderResearch } from "./views/research.js";
import { offlineBanner } from "./views/shell.js";

const app = document.getElementById("app");

let lastScreenKey = "";

// The whole app is replaced on every render, so focus falls back to <body>.
// Moving it to the new screen's heading is what makes the change perceivable
// to screen reader and keyboard users now that #app is no longer a live region.
function focusScreen() {
  const screenKey = `${state.screen}:${state.active}:${state.authMode}`;
  if (screenKey === lastScreenKey) return;
  lastScreenKey = screenKey;
  const target = app.querySelector("h1") || app.querySelector("main");
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.focus();
}

function screenHtml() {
  if (state.screen === "offline") return renderOffline();
  if (state.screen === "auth") return renderAuth();
  if (state.screen === "terms") return renderTerms();
  if (state.screen === "register") return renderRegister();
  if (state.screen === "studyConsent") return renderStudyConsent();
  if (state.screen === "identity") return renderIdentity();
  if (state.screen === "profileEdit") return renderProfileEdit();
  if (state.screen === "consents") return renderConsents();
  if (state.screen === "researchDetail") return renderResearch();
  if (state.screen === "main") {
    if (state.active === "today") return renderToday();
    if (state.active === "mypage") return renderMyPage();
    if (state.active === "search") return renderFuture(t("search.title"), "search");
    if (state.active === "community") return renderFuture(t("community.title"), "community");
    if (state.active === "research") return renderResearchList();
  }
  return renderLoading();
}

function render() {
  app.innerHTML = offlineBanner() + screenHtml();
  syncHistory();
  bind();
  focusScreen();
  // The class is already in the freshly built DOM, so the entry animation has
  // played; clear the flag so later renders do not replay it.
  state.specimenJustAdvancedTo = null;
  if (state.screen === "main" && state.active === "today" && state.checkins === null) loadCheckins();
  if (state.screen === "main" && state.active === "search" && state.totalUsers === null) loadUserStats();
  if (state.screen === "consents" && state.consents === null) loadConsents();
  if (state.screen === "main" && state.active === "research" && state.researchStudies === null) {
    loadResearchStudies();
  }
  if (state.screen === "researchDetail" && state.researchOverview === null) loadResearchOverview();
}

// A readout under the chart rather than a floating tooltip: it works the same
// on touch, where there is no hover, and it needs no positioning maths.
function bindChartReadout() {
  const chart = document.querySelector(".trend-chart");
  const readout = document.getElementById("chartReadout");
  if (!chart || !readout || !state.checkins) return;

  const describe = (day) => {
    if (!day) return "";
    const date = new Date(`${day.date}T00:00:00`);
    const head = `${date.getMonth() + 1}/${date.getDate()}`;
    if (day.conditionLevel === null) return `${head}${t("common.dotSeparator")}${t("trend.unrecorded")}`;
    const parts = [`${t("today.conditionShort")} ${t(`level.condition.${day.conditionLevel}`)}`];
    if (day.fatigueLevel) parts.push(`${t("today.fatigueShort")} ${t(`level.fatigue.${day.fatigueLevel}`)}`);
    if (day.sleepLevel) parts.push(`${t("today.sleepShort")} ${t(`level.sleep.${day.sleepLevel}`)}`);
    if (day.pem) parts.push(t("today.pemShort"));
    return `${head}${t("common.dotSeparator")}${parts.join(t("common.dotSeparator"))}`;
  };

  const days = state.checkins.days;
  const latest = [...days].reverse().find((day) => day.conditionLevel !== null);
  readout.textContent = describe(latest || days[days.length - 1]);

  chart.querySelectorAll("[data-day]").forEach((mark) => {
    const show = () => {
      readout.textContent = describe(days[Number(mark.dataset.day)]);
    };
    mark.addEventListener("mouseenter", show);
    mark.addEventListener("focus", show);
    mark.addEventListener("touchstart", show, { passive: true });
  });
}

function goToMyPage() {
  state.error = "";
  state.screen = "main";
  state.active = "mypage";
  render();
}

function bindAuth() {
  const authForm = document.getElementById("authForm");
  if (!authForm) return;

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      state.error = "";
      render();
    });
  });

  document.querySelectorAll("[data-demo-email]").forEach((button) => {
    button.addEventListener("click", () => {
      const email = document.getElementById("authEmail");
      if (email) {
        email.value = button.dataset.demoEmail;
        email.focus();
      }
    });
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(authForm);
    const path = state.authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    try {
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
      });
      state.error = "";
      applyProfile(data.profile);
    } catch (error) {
      state.error = error.message;
    }
    render();
  });
}

function bind() {
  bindAuth();

  document.querySelectorAll("[data-retry-boot]").forEach((button) => {
    button.addEventListener("click", () => boot());
  });

  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!installPrompt) return;
      const prompt = installPrompt;
      setInstallPrompt(null);
      await prompt.prompt();
      await prompt.userChoice.catch(() => {});
      render();
    });
  });

  const checkinForm = document.getElementById("checkinForm");
  if (checkinForm) {
    checkinForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(checkinForm);
      if (!form.get("conditionLevel")) {
        state.error = t("error.conditionRequired");
        render();
        return;
      }
      try {
        const data = await api("/api/checkins", {
          method: "POST",
          body: JSON.stringify({
            conditionLevel: Number(form.get("conditionLevel")),
            fatigueLevel: form.get("fatigueLevel") ? Number(form.get("fatigueLevel")) : null,
            sleepLevel: form.get("sleepLevel") ? Number(form.get("sleepLevel")) : null,
            pem: form.get("pem") === "on",
            note: form.get("note"),
            days: state.checkinWindow
          })
        });
        state.checkins = data.board;
        state.checkinEditing = false;
        state.checkinSaved = true;
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  }

  document.querySelectorAll("[data-quick-level]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const data = await api("/api/checkins", {
          method: "POST",
          body: JSON.stringify({ conditionLevel: Number(button.dataset.quickLevel), days: state.checkinWindow })
        });
        state.checkins = data.board;
        state.checkinSaved = true;
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  });

  document.querySelectorAll("[data-open-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      state.checkinEditing = true;
      state.error = "";
      render();
    });
  });

  document.querySelectorAll("[data-window]").forEach((button) => {
    button.addEventListener("click", () => switchCheckinWindow(Number(button.dataset.window)));
  });

  document.querySelectorAll("[data-edit-checkin]").forEach((button) => {
    button.addEventListener("click", () => {
      state.checkinEditing = true;
      state.checkinSaved = false;
      state.error = "";
      render();
    });
  });

  document.querySelectorAll("[data-cancel-checkin]").forEach((button) => {
    button.addEventListener("click", () => {
      state.checkinEditing = false;
      state.error = "";
      render();
    });
  });

  bindChartReadout();

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.lang;
      if (next === getLang()) return;
      setLang(next);
      // 保存済みのエラー文は前の言語のままなので捨てる。
      state.error = "";
      render();
    });
  });

  document.querySelectorAll("[data-dismiss-install]").forEach((button) => {
    button.addEventListener("click", () => {
      state.installDismissed = true;
      localStorage.setItem(installDismissKey, "1");
      render();
    });
  });

  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.userStatsFailed = false;
      state.screen = "main";
      state.active = button.dataset.nav;
      render();
    });
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch (_error) {
        // Logging out is best effort: drop the local state either way.
      }
      resetSessionState();
      render();
    });
  });

  document.querySelectorAll("[data-go-mypage]").forEach((button) => {
    button.addEventListener("click", goToMyPage);
  });

  document.querySelectorAll("[data-edit-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.screen = "profileEdit";
      render();
    });
  });

  document.querySelectorAll("[data-show-consents]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.consents = null;
      state.consentsFailed = false;
      state.screen = "consents";
      render();
    });
  });

  const termsCheck = document.getElementById("termsCheck");
  const acceptTerms = document.getElementById("acceptTerms");
  if (termsCheck && acceptTerms) {
    termsCheck.addEventListener("change", () => {
      acceptTerms.disabled = !termsCheck.checked;
    });
    acceptTerms.addEventListener("click", () => {
      state.termsAccepted = true;
      state.screen = "register";
      render();
    });
  }

  const lightForm = document.getElementById("lightForm");
  if (lightForm) {
    lightForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(lightForm);
      try {
        const data = await api("/api/light-registration", {
          method: "POST",
          body: JSON.stringify({
            termsAccepted: state.termsAccepted,
            nickname: form.get("nickname"),
            disease: form.get("disease"),
            ageRange: form.get("ageRange"),
            gender: form.get("gender"),
            conditionStatusText: form.get("conditionStatusText")
          })
        });
        state.profile = data.profile;
        state.screen = "main";
        state.active = "today";
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  }

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(profileForm);
      try {
        const data = await api("/api/profile", {
          method: "PUT",
          body: JSON.stringify({
            nickname: form.get("nickname"),
            disease: form.get("disease"),
            ageRange: form.get("ageRange"),
            gender: form.get("gender"),
            conditionStatusText: form.get("conditionStatusText")
          })
        });
        state.profile = data.profile;
        state.error = "";
        state.screen = "main";
        state.active = "mypage";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  }

  document.querySelectorAll("[data-start-research]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.screen = "main";
      state.active = "research";
      render();
    });
  });

  document.querySelectorAll("[data-study]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.selectedStudyId = button.dataset.study;
      invalidateResearchOverview();
      state.researchStudies = null;
      state.screen = "researchDetail";
      state.active = "research";
      render();
    });
  });

  document.querySelectorAll("[data-back-to-studies]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.selectedStudyId = null;
      state.screen = "main";
      state.active = "research";
      render();
    });
  });

  document.querySelectorAll("[data-join-study]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.consentPdfOpened = false;
      state.screen = "studyConsent";
      state.active = "research";
      render();
    });
  });

  document.querySelectorAll("[data-rejoin-research]").forEach((button) => {
    button.addEventListener("click", () => {
      state.error = "";
      state.consentPdfOpened = false;
      state.screen = "studyConsent";
      state.active = "research";
      render();
    });
  });

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      state.stepModal = button.dataset.step;
      render();
    });
  });

  const stepModal = document.getElementById("stepModal");
  if (stepModal) {
    if (!stepModal.open) stepModal.showModal();
    // Esc and the backdrop both route through close(), so state is cleared once.
    stepModal.addEventListener("close", () => {
      state.stepModal = null;
      render();
    });
    stepModal.addEventListener("click", (event) => {
      if (event.target === stepModal) stepModal.close();
    });
    stepModal.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => stepModal.close());
    });
  }

  document.querySelectorAll("[data-advance-specimen]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const data = await api("/api/research/specimen/advance", { method: "POST" });
        state.specimenJustAdvancedTo = data.overview.specimen.status;
        state.researchOverview = data.overview;
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  });

  const studyChecks = [...document.querySelectorAll(".study-check")];
  const studyNext = document.getElementById("studyNext");
  if (studyChecks.length && studyNext) {
    const pdfStatus = document.getElementById("pdfStatus");
    const updateStudyNext = () => {
      studyNext.disabled = !state.consentPdfOpened || !studyChecks.every((item) => item.checked);
      if (pdfStatus) {
        pdfStatus.textContent = state.consentPdfOpened ? t("consentFlow.checked") : t("consentFlow.unchecked");
        pdfStatus.classList.toggle("done", state.consentPdfOpened);
      }
    };
    studyChecks.forEach((check) => {
      check.addEventListener("change", updateStudyNext);
    });
    document.querySelectorAll("[data-consent-pdf-link]").forEach((link) => {
      link.addEventListener("click", () => {
        state.consentPdfOpened = true;
        updateStudyNext();
      });
    });
    updateStudyNext();
    studyNext.addEventListener("click", () => {
      state.studyConsentAccepted = true;
      state.screen = "identity";
      render();
    });
  }

  const identityForm = document.getElementById("identityForm");
  if (identityForm) {
    identityForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(identityForm);
      try {
        const data = await api("/api/research/enroll", {
          method: "POST",
          body: JSON.stringify({
            researchConsentAccepted: state.studyConsentAccepted,
            studyId: state.selectedStudyId,
            legalName: form.get("legalName"),
            postalCode: form.get("postalCode"),
            prefecture: form.get("prefecture"),
            city: form.get("city"),
            addressLine1: form.get("addressLine1"),
            addressLine2: form.get("addressLine2")
          })
        });
        state.profile = data.profile;
        state.consentPdfOpened = false;
        invalidateResearchOverview();
        state.screen = "researchDetail";
        state.active = "research";
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  }

  document.querySelectorAll("[data-withdraw-research]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm(t("withdraw.confirm"))) return;
      try {
        const data = await api("/api/research/withdraw", {
          method: "POST",
          body: JSON.stringify({ studyId: state.selectedStudyId })
        });
        state.profile = data.profile;
        state.studyConsentAccepted = false;
        // Stay on the research page: the point of withdrawing here is to see
        // what it did to the specimen and to the withdrawal phase.
        invalidateResearchOverview();
        state.screen = "researchDetail";
        state.active = "research";
        state.error = "";
      } catch (error) {
        state.error = error.message;
      }
      render();
    });
  });
}

/* Resume where the session left off: the profile decides which screen is
 * reachable, and only then is a deep link honoured. */
async function boot() {
  try {
    const data = await api("/api/me");
    applyProfile(data.profile);
    applyRoute(window.location.pathname, { deepLinkOnly: true });
  } catch (error) {
    state.profile = null;
    state.screen = error.offline ? "offline" : "auth";
  }
  setSuppressHistory(true);
  render();
  setSuppressHistory(false);
  window.history.replaceState({ path: pathForState() }, "", pathForState() || "/");
}

setRenderer(render);
applyDocumentLanguage();
initPwa();
boot();
