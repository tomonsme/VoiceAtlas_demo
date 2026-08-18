import { errorMessages } from "./state.js";
import { mockApi } from "./mock-api.js";

/* バックエンドの有無を最初の1回で見分ける。
 * 静的配信ではどのパスもSPAのHTMLに落ちるため、JSONでない応答が返ってきたら
 * サーバがいないと判断して、以後はブラウザ内のモックで応答する。 */
let backend = "unknown";


export async function api(path, options = {}) {
  if (backend === "mock") return callMock(path, options);

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
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    if (backend === "unknown") {
      // JSON を返さない = API が配置されていない静的配信
      backend = "mock";
      return callMock(path, options);
    }
    data = {};
  }

  backend = "real";
  if (!response.ok) {
    throw new Error(errorMessages[data.error] || data.message || data.error || "通信に失敗しました。");
  }
  return data;
}

function callMock(path, options) {
  try {
    return Promise.resolve(mockApi(path, options));
  } catch (error) {
    return Promise.reject(new Error(errorMessages[error.code] || error.message || "エラーが発生しました。"));
  }
}
