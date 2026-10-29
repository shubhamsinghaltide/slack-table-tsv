// Minimal CSV/TSV parser with quotes. Delimiter is tab if present, else comma when the first line has one.
export function parse(text) {
  text = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  const delim = text.includes("\t") ? "\t" : (text.split("\n")[0].includes(",") ? "," : "\t");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell); rows.push(row);
  return rows;
}
