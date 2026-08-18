/* Netlify Functions から Express アプリを動かす入口。
 *
 * 静的ファイルは Netlify が直接配信するので、この関数が受けるのは /api/* だけ。
 * サーバレスには「起動時」がないため、コンテナ版（server.js）が起動時に行う
 * スキーマ適用は、インスタンスごとに一度だけ遅延実行する。初期化SQLはすべて
 * 冪等なので、複数インスタンスが同時に走っても問題ない。
 */

const fs = require("fs");
const path = require("path");
const serverless = require("serverless-http");
const app = require("../../app/src/app");
const { waitForDb, applyInitScripts } = require("../../app/src/db");

const skipInit = process.env.SKIP_DB_INIT === "true";

/* included_files で同梱したSQLの位置は、バンドラの出力レイアウト次第で変わる。
 * 見つからないまま素通りするとテーブルが無いまま動いてしまうので、候補を順に
 * 当たり、どれも無ければ例外にする。 */
function resolveInitDir() {
  const candidates = [
    process.env.DB_INIT_DIR,
    path.join(process.cwd(), "db", "init"),
    path.join(__dirname, "db", "init"),
    path.join(__dirname, "..", "..", "db", "init")
  ].filter(Boolean);

  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) {
    throw new Error(`初期化SQLが見つかりません。探した場所: ${candidates.join(", ")}`);
  }
  return found;
}

let ready = null;
function ensureDatabase() {
  if (!ready) {
    ready = (async () => {
      await waitForDb(8);
      if (!skipInit) await applyInitScripts(resolveInitDir());
    })().catch((error) => {
      // 次の呼び出しでやり直せるよう、失敗は握らずに捨てる
      ready = null;
      throw error;
    });
  }
  return ready;
}

const handle = serverless(app, { basePath: "/.netlify/functions/api" });

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await ensureDatabase();
  return handle(event, context);
};
