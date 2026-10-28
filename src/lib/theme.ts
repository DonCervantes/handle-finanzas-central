export function applyStoredTheme() {
  const t = localStorage.getItem("handle-theme");
  const dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("handle-theme", dark ? "dark" : "light");
}
