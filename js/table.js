// Table model. Holds data and header flag; no DOM access.
const blankRow = n => Array(n).fill("");

export class Table {
  constructor() {
    this.data = [["Name","Role","Status"], blankRow(3), blankRow(3)];
    this.hasHeader = true;
  }

  get cols() { return this.data[0].length; }

  setCell(r, c, value) { this.data[r][c] = value; }

  addRow() { this.data.push(blankRow(this.cols)); }

  addCol() { this.data.forEach(r => r.push("")); }

  // Remove methods return false when nothing was removed (last row/column is kept).
  removeRow(r) {
    if (this.data.length <= 1) return false;
    this.data.splice(r, 1); return true;
  }

  removeCol(c) {
    if (this.cols <= 1) return false;
    this.data.forEach(r => r.splice(c, 1)); return true;
  }

  snapshot() { return this.data.map(r => r.slice()); }

  restore(data) { this.data = data.map(r => r.slice()); }

  // Move a row/column so it lands before index `slot` (0..length).
  moveRow(from, slot) {
    const to = slot > from ? slot - 1 : slot;
    if (to === from) return;
    const [row] = this.data.splice(from, 1);
    this.data.splice(to, 0, row);
  }

  moveCol(from, slot) {
    const to = slot > from ? slot - 1 : slot;
    if (to === from) return;
    this.data.forEach(r => {
      const [v] = r.splice(from, 1);
      r.splice(to, 0, v);
    });
  }

  clear() { this.data = Array.from({ length: 3 }, () => blankRow(3)); return true; }

  load(rows) { this.data = [[""]]; this.fill(rows); }

  // Write rows into the grid at (r0, c0), growing the grid as needed.
  fill(rows, r0 = 0, c0 = 0) {
    const needW = c0 + Math.max(...rows.map(r => r.length));
    const needH = r0 + rows.length;
    this.data.forEach(r => { while (r.length < needW) r.push(""); });
    while (this.data.length < needH) this.addRow();
    rows.forEach((r, i) => r.forEach((v, j) => { this.data[r0 + i][c0 + j] = v; }));
  }

  // Rows with fully empty trailing rows/columns removed.
  trimmed() {
    let rows = this.data.map(r => r.slice());
    while (rows.length && rows[rows.length - 1].every(c => !c.trim())) rows.pop();
    let w = 0;
    rows.forEach(r => r.forEach((c, i) => { if (c.trim()) w = Math.max(w, i + 1); }));
    return rows.map(r => r.slice(0, w));
  }
}
