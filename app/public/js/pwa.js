import { state, installDismissKey, setInstallPrompt, setSuppressHistory } from "./state.js";
import { applyRoute } from "./router.js";
import { rerender } from "./render-bus.js";

export function initPwa() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  const setOffline = (offline) => {
    if (state.offline === offline) return;
    state.offline = offline;
    rerender();
  };
  window.addEventListener("online", () => setOffline(false));
  window.addEventListener("offline", () => setOffline(true));

  // Chromium hands us the install prompt; iOS has no equivalent, so that path
  // falls back to written instructions.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    setInstallPrompt(event);
    rerender();
  });
  window.addEventListener("appinstalled", () => {
    setInstallPrompt(null);
    rerender();
  });

  window.addEventListener("popstate", () => {
    setSuppressHistory(true);
    // Falling back to the flow's entry point keeps a back gesture from
    // dropping the user into a screen whose prerequisites are not met.
    if (!applyRoute(window.location.pathname) && state.profile?.registered) {
      state.screen = "main";
      state.active = "today";
    }
    rerender();
    setSuppressHistory(false);
  });
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
