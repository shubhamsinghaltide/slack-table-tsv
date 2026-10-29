// UI wiring: renders the Table into the DOM and connects buttons to the model.
import { Table } from "./table.js";
import { parse } from "./parse.js";
import { parseJson } from "./json.js";
import { toTsv, toAligned, toHtml } from "./format.js";
import { copyText, copyRichTable, downloadText } from "./clipboard.js";
import { toast } from "./toast.js";

const $ = id => document.getElementById(id);
const table = new Table();

const g = $("grid");
let drag = null; // { type: "row" | "col", from: index } while a handle is being dragged

// Runs a change that can be undone from the toast. `change` returns false if nothing changed.
function changeWithUndo(message, change) {
  const before = table.snapshot();
  if (!change()) return;
  render();
  toast(message, {
    action: { label: "Undo", run: () => { table.restore(before); render(); } },
    duration: 5000
  });
}

function removeButton(title, onClick) {
  const b = document.createElement("button");
  b.className = "x"; b.textContent = "✕"; b.title = title; b.onclick = onClick;
  return b;
}

function gripHandle(type, index) {
  const s = document.createElement("span");
  s.className = "grip"; s.textContent = "⋮⋮"; s.draggable = true;
  s.title = type === "row" ? "Drag to move row" : "Drag to move column";
  s.ondragstart = e => {
    drag = { type, from: index };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");  // Firefox needs data to start a drag
    e.dataTransfer.setDragImage(s.closest(type === "row" ? "tr" : "td"), 0, 0);
  };
  s.ondragend = clearDrag;
  return s;
}

function clearHints() {
  g.querySelectorAll(".row-before,.row-after,.col-before,.col-after")
    .forEach(el => el.classList.remove("row-before", "row-after", "col-before", "col-after"));
}

function clearDrag() { drag = null; clearHints(); }

// Works out where the dragged row/column would land under the pointer.
// Returns { slot, mark } where slot is the insert index and mark() shows the drop line.
function dropTarget(e) {
  if (drag.type === "row") {
    const tr = e.target.closest("tr");
    if (!tr || tr.rowIndex === 0) return null;   // top row holds column handles, not rows
    const r = tr.rowIndex - 1, box = tr.getBoundingClientRect();
    const after = e.clientY > box.top + box.height / 2;
    return { slot: r + (after ? 1 : 0), mark: () => tr.classList.add(after ? "row-after" : "row-before") };
  }
  const td = e.target.closest("td,th");
  if (!td || td.cellIndex === 0) return null;     // row handle column is not a drop target
  const c = td.cellIndex - 1, box = td.getBoundingClientRect();
  const after = e.clientX > box.left + box.width / 2;
  const cls = after ? "col-after" : "col-before";
  return {
    slot: c + (after ? 1 : 0),
    mark: () => { for (const row of g.rows) row.cells[c + 1]?.classList.add(cls); }
  };
}

g.ondragover = e => {
  if (!drag) return;
  const t = dropTarget(e); if (!t) return;
  e.preventDefault(); e.dataTransfer.dropEffect = "move";
  clearHints(); t.mark();
};

g.ondrop = e => {
  if (!drag) return;
  const t = dropTarget(e); if (!t) return;
  e.preventDefault();
  if (drag.type === "row") table.moveRow(drag.from, t.slot);
  else table.moveCol(drag.from, t.slot);
  clearDrag(); render();
};

function render() {
  g.innerHTML = "";

  // top row: column handle and column remove
  const top = g.insertRow();
  top.insertCell().className = "rm";
  for (let c = 0; c < table.cols; c++) {
    const td = top.insertCell(); td.style.textAlign = "center"; td.style.background = "#faf9f7";
    td.append(gripHandle("col", c), removeButton("Remove column", () => changeWithUndo("Column removed", () => table.removeCol(c))));
  }

  table.data.forEach((row, r) => {
    const tr = g.insertRow(); if (table.hasHeader && r === 0) tr.className = "hdr";
    const rm = tr.insertCell(); rm.className = "rm";
    rm.append(gripHandle("row", r), removeButton("Remove row", () => changeWithUndo("Row removed", () => table.removeRow(r))));
    row.forEach((val, c) => {
      const td = tr.insertCell(); const inp = document.createElement("input");
      inp.value = val; inp.dataset.r = r; inp.dataset.c = c;
      inp.oninput = () => { table.setCell(r, c, inp.value); updateOut(); };
      inp.onpaste = e => onPaste(e, r, c);
      inp.onkeydown = e => {
        if (e.key === "Enter") { e.preventDefault(); focusCell(r + (e.shiftKey ? -1 : 1), c); }
      };
      td.appendChild(inp);
    });
  });
  updateOut();
}

function focusCell(r, c) {
  if (r >= table.data.length && r > 0) { table.addRow(); render(); }
  const el = document.querySelector(`input[data-r="${r}"][data-c="${c}"]`); if (el) el.focus();
}

// Accepts JSON first, then TSV/CSV. Returns null for plain text.
const parseInput = t => parseJson(t) ?? parse(t);

function onPaste(e, r, c) {
  const t = (e.clipboardData || window.clipboardData).getData("text");
  const json = parseJson(t);
  if (!json && !/[\t\n]/.test(t.trim())) return; // single value: normal paste
  e.preventDefault(); table.fill(json ?? parse(t), r, c); render();
}

function updateOut() { $("out").value = toTsv(table); }

$("copyTsv").onclick = async () => { await copyText(toTsv(table)); toast("TSV copied"); };
$("copyCode").onclick = async () => { await copyText(toAligned(table)); toast("Aligned table copied"); };
$("copyRich").onclick = async () => {
  const text = toTsv(table);
  if (await copyRichTable(toHtml(table), text)) toast("Rich table copied");
  else { await copyText(text); toast("Rich copy unsupported – TSV copied"); }
};
$("dlTsv").onclick = () => downloadText(toTsv(table), "table.tsv", "text/tab-separated-values");
$("addRow").onclick = () => { table.addRow(); render(); };
$("addCol").onclick = () => { table.addCol(); render(); };
$("clear").onclick = () => changeWithUndo("Table cleared", () => table.clear());
$("hasHeader").onchange = e => { table.hasHeader = e.target.checked; render(); };
$("load").onclick = () => {
  const t = $("imp").value; if (!t.trim()) return;
  table.load(parseInput(t)); render(); toast("Loaded");
};

render();
