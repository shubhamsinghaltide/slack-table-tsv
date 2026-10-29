// JSON to rows. Accepts an array of objects (keys become the first row) or an array of arrays.
// Returns null when the text isn't one of those, so callers can fall back to the TSV/CSV parser.
export function parseJson(text) {
  const t = text.trim();
  if (!/^[\[{]/.test(t)) return null;

  let data;
  try { data = JSON.parse(t); } catch { return null; }
  if (!Array.isArray(data) || !data.length) return null;

  // nested objects/arrays are kept as JSON text in a single cell
  const str = v => v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);

  if (data.every(Array.isArray)) return data.map(r => r.map(str));

  if (data.every(o => o && typeof o === "object" && !Array.isArray(o))) {
    const keys = [...new Set(data.flatMap(o => Object.keys(o)))];
    return [keys, ...data.map(o => keys.map(k => str(o[k])))];
  }

  return null;
}
