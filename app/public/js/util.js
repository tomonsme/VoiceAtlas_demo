import { getLang } from "./i18n.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[match]));
}

/* 日付は言語に合わせて綴る。JAは「2026年3月31日」、ENは「31 March 2026」。
 * 端末のロケールではなくアプリの言語に従わせたいので、明示的に渡す。 */
export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  if (getLang() === "ja") {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "long", day: "numeric" }).format(date);
}
