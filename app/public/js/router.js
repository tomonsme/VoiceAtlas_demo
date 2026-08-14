import { state, routes, suppressHistory } from "./state.js";

export function pathForState() {
  if (state.screen === "loading") return null;
  const route =
    state.screen === "main"
      ? routes.find((item) => item.screen === "main" && item.active === state.active)
      : routes.find((item) => item.screen === state.screen);
  return route ? route.path : "/";
}

// One history entry per screen, so the browser back button and the iOS
// swipe-back gesture work inside the installed app.
export function syncHistory() {
  if (suppressHistory) return;
  const path = pathForState();
  if (!path || window.location.pathname === path) return;
  window.history.pushState({ path }, "", path);
}

export function routeIsReachable(route) {
  if (!route) return false;
  if (!state.profile || !state.profile.termsAccepted || !state.profile.registered) return false;
  if (route.requires && !state[route.requires]) return false;
  return true;
}

export function applyRoute(path, { deepLinkOnly = false } = {}) {
  const route = routes.find((item) => item.path === path);
  if (!route || (deepLinkOnly && !route.deepLink) || !routeIsReachable(route)) return false;
  state.screen = route.screen;
  if (route.active) state.active = route.active;
  state.error = "";
  return true;
}
