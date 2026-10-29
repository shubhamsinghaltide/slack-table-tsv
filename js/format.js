// Converts a Table into the output formats used for copying. Pure functions; no DOM access.

const clean = s => String(s).replace(/\t/g, " ").replace(/\r?\n/g, " ");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cleanRows = table => table.trimmed().map(r => r.map(clean));

// Plain tab-separated text.
export function toTsv(table) {
  return cleanRows(table).map(r => r.join("\t")).join("\n");
}

// Monospaced, space-padded text inside a Markdown code fence.
export function toAligned(table) {
  const rows = cleanRows(table);
  if (!rows.length) return "";
  const w = rows[0].map((_, i) => Math.max(...rows.map(r => (r[i] || "").length)));
  const line = r => r.map((v, i) => v.padEnd(w[i])).join(" | ").trimEnd();
  const out = rows.map(line);
  if (table.hasHeader && rows.length > 1) out.splice(1, 0, w.map(n => "-".repeat(n)).join("-+-"));
  return "```\n" + out.join("\n") + "\n```";
}

// HTML table; header row uses <th> when the table has a header.
export function toHtml(table) {
  const cell = (v, r) => {
    const tag = table.hasHeader && r === 0 ? "th" : "td";
    return `<${tag}>${esc(v)}</${tag}>`;
  };
  const body = cleanRows(table).map((r, i) => "<tr>" + r.map(v => cell(v, i)).join("") + "</tr>").join("");
  return "<table>" + body + "</table>";
}
