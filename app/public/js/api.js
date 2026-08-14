import { errorMessages } from "./state.js";

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (_error) {
    // A failed fetch is a lost connection, not a rejected request: the caller
    // must be able to tell those apart before deciding what to show.
    const offline = new Error("通信できません。接続を確認してください。");
    offline.offline = true;
    throw offline;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorMessages[data.error] || data.message || data.error || "通信に失敗しました。");
  }
  return data;
}
