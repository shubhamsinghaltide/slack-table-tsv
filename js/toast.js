// Short status message shown at the bottom of the page.
// Optional action (e.g. { label: "Undo", run }) adds a button; the toast stays up for `duration` ms.
export function toast(message, { action, duration = 1600 } = {}) {
  const t = document.getElementById("toast");
  t.replaceChildren(message);
  if (action) {
    const b = document.createElement("button");
    b.textContent = action.label;
    b.onclick = () => { hide(); action.run(); };
    t.append(b);
  }
  t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(hide, duration);
}

function hide() {
  const t = document.getElementById("toast");
  clearTimeout(t._h); t.classList.remove("show");
}
