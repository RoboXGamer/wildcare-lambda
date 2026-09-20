const toast = document.querySelector("#toast");
const channel =
  "BroadcastChannel" in window
    ? new BroadcastChannel("wildcare:reports")
    : null;
const apiBase =
  window.WILDCARE_API_URL ||
  "https://hnhgrqhm2xjl2amch5o6i3ddqe0orsoe.lambda-url.ap-south-1.on.aws";
const authScreen = document.querySelector("#auth-screen");
const authError = document.querySelector("#auth-error");
const registerError = document.querySelector("#register-error");
let currentUser = null;
let filter = "assigned";
let searchTerm = "";
let memoryReports = [];
function storeReports(reports) {
  memoryReports = reports;
}
function notify(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("visible"), 2600);
}
async function authRequest(path, options = {}) {
  const response = await fetch(`${apiBase}/api/auth${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.message || body.error?.message || "Authentication failed. Please try again.",
    );
  }
  return body.data ?? body;
}
function setAuthError(message = "") {
  authError.textContent = message;
  authError.hidden = !message;
}
function showAuthForm(form) {
  const isLogin = form === "login";
  document.querySelector("#login-form").hidden = !isLogin;
  document.querySelector("#register-form").hidden = isLogin;
  setAuthError();
  registerError.textContent = "";
  registerError.hidden = true;
  window.setTimeout(
    () => document.querySelector(isLogin ? "#login-email" : "#register-name").focus(),
    0,
  );
}
function showLogin(message = "") {
  currentUser = null;
  document.body.classList.remove("auth-loading");
  document.body.classList.add("auth-required");
  authScreen.hidden = false;
  document.querySelector("#profile-menu").hidden = true;
  showAuthForm("login");
  setAuthError(message);
}
function showDashboard(user) {
  currentUser = user;
  const name = user.name || "WildCare Responder";
  const email = user.email || "Responder";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  document.querySelector(".profile-copy b").textContent = name;
  document.querySelector(".profile-copy small").textContent = email;
  document.querySelector(".avatar").textContent = initials || "WC";
  document.querySelector("#menu-user-name").textContent = name;
  document.querySelector("#menu-user-email").textContent = email;
  authScreen.hidden = true;
  document.body.classList.remove("auth-loading", "auth-required");
  setAuthError();
}
async function loadCurrentUser() {
  try {
    const session = await authRequest("/get-session", { method: "GET" });
    const user = session?.user;
    if (!user) {
      showLogin();
      return false;
    }
    showDashboard(user);
    return true;
  } catch (error) {
    showLogin(
      error.message === "Authentication failed. Please try again."
        ? "Unable to reach the authentication service."
        : "",
    );
    return false;
  }
}
async function loadBackendReports() {
  try {
    const response = await fetch(`${apiBase}/api/reports`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const { data } = await response.json();
    if (!Array.isArray(data)) return;
    const mapped = data.map((item) => ({
      id: item.id,
      title: item.incidentType || "Wildlife report",
      location: item.locationLabel || "Location not shared",
      time: new Date(item.createdAt || Date.now()).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      status: item.status || "New",
      urgency: (item.status || "New") === "New" ? "Urgent" : "",
      assigned: true,
    }));
    storeReports(mapped);
  } catch {
    /* offline — keep local seeds */
  }
}
function readReports() {
  return memoryReports;
}
function saveReports(reports) {
  storeReports(reports);
  channel?.postMessage(reports);
}
function statusClass(status) {
  return (
    {
      New: "peach",
      "In Progress": "amber",
      Assigned: "blue",
      Accepted: "blue",
      Resolved: "mint",
    }[status] || "blue"
  );
}
function animalIcon(title = "") {
  const value = title.toLowerCase();
  if (value.includes("bird")) return "fa-solid fa-dove";
  if (value.includes("snake")) return "fa-solid fa-worm";
  if (value.includes("monkey") || value.includes("macaque")) return "fa-solid fa-paw";
  return "fa-solid fa-paw";
}
function render() {
  const reports = readReports();
  const scoped =
    filter === "assigned"
      ? reports.filter((report) => report.assigned || report.status === "New")
      : reports.filter((report) => report.status !== "Resolved");
  const visible = scoped.filter((report) =>
    `${report.id} ${report.title} ${report.location} ${report.status}`
      .toLowerCase()
      .includes(searchTerm),
  );
  document.querySelector("#report-list").innerHTML = visible.length
    ? visible
        .map(
          (report) =>
            `<article class="report ${report.urgency ? "urgent" : ""}" data-id="${report.id}"><div class="animal"><i class="${animalIcon(report.title)}" aria-hidden="true"></i></div><div class="report-info"><b>${report.title}</b><small><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${report.location}</small><small><i class="fa-regular fa-clock" aria-hidden="true"></i> ${report.time}</small></div>${report.urgency ? `<span class="badge red">${report.urgency}</span>` : ""}<span class="badge ${statusClass(report.status)}">${report.status}</span><button class="view" type="button">View</button><button class="action ${report.status === "New" ? "accept" : "update"}" type="button">${report.status === "New" ? "Accept" : report.status === "In Progress" ? "Resolve" : "Update"}</button></article>`,
        )
        .join("")
    : '<p class="empty-state">No reports in this view.</p>';
  document.querySelector("#list-count").textContent = visible.length;
  const assignedCount = reports.filter(
    (r) => r.assigned || r.status === "New",
  ).length;
  document.querySelector("#assigned-count").textContent = assignedCount;
  document.querySelector("#sidebar-assigned-count").textContent = assignedCount;
  document.querySelector("#progress-count").textContent = reports.filter(
    (r) => r.status === "In Progress",
  ).length;
  document.querySelector("#resolved-count").textContent = reports.filter(
    (r) => r.status === "Resolved",
  ).length;
  document.querySelector("#total-count").textContent = reports.length;
}
async function updateReport(id) {
  const reports = readReports();
  const report = reports.find((item) => item.id === id);
  if (!report) return;
  const next =
    report.status === "New"
      ? "Accepted"
      : report.status === "In Progress"
        ? "Resolved"
        : "In Progress";
  try {
    const response = await fetch(`${apiBase}/api/reports/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (response.status === 401) {
      showLogin("Your session has expired. Please sign in again.");
      return;
    }
  } catch {
    /* offline — local update rakho */
  }
  report.assigned = true;
  report.status = next;
  if (next !== "New") report.urgency = "";
  saveReports(reports);
  notify(`${report.title} updated successfully.`);
  render();
}
function showWorkspace(view) {
  const details = {
    messages: ["Messages", "No unread responder messages.", "Start a message"],
    coverage: [
      "Coverage Area",
      "New Delhi coverage is active. Add or edit service zones here.",
      "Edit coverage",
    ],
    resources: [
      "Resources",
      "Safety guides and field checklists will appear here.",
      "Open safety guide",
    ],
  }[view];
  document.querySelector("#filter-menu").hidden = true;
  document.querySelector("#filter-button").hidden = true;
  document.querySelector("#list-count").textContent = "";
  document.querySelector("#report-subtitle").textContent = details[1];
  document.querySelector("#report-list").innerHTML =
    `<div class="workspace-panel"><h3>${details[0]}</h3><p>${details[1]}</p><button type="button" data-workspace-action>${details[2]}</button></div>`;
}
document.querySelectorAll("nav a").forEach((link) =>
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document
      .querySelectorAll("nav a")
      .forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    const view = link.dataset.view;
    if (view === "all" || view === "assigned" || view === "dashboard") {
      filter = view === "all" ? "all" : "assigned";
      document.querySelector("#filter-button").hidden = false;
      document.querySelector("#report-subtitle").textContent =
        filter === "all"
          ? "All active wildlife reports."
          : "Prioritised wildlife reports requiring attention.";
      render();
      return;
    }
    showWorkspace(view);
  }),
);
document.querySelector("#filter-button").addEventListener("click", () => {
  const menu = document.querySelector("#filter-menu");
  menu.hidden = !menu.hidden;
});
document.querySelector("#filter-menu").addEventListener("click", (event) => {
  if (!event.target.dataset.filter) return;
  filter = event.target.dataset.filter;
  event.currentTarget.hidden = true;
  render();
});
document.querySelector("#report-search").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  if (searchTerm) {
    filter = "all";
    document
      .querySelectorAll("nav a")
      .forEach((item) => item.classList.remove("active"));
    document.querySelector('[data-view="all"]').classList.add("active");
    document.querySelector("#filter-button").hidden = false;
    document.querySelector("#report-subtitle").textContent =
      `Results for “${event.target.value.trim()}”`;
  } else {
    document.querySelector("#report-subtitle").textContent =
      "All active wildlife reports.";
  }
  render();
});
document
  .querySelector("#profile-button")
  .addEventListener("click", () => {
    const menu = document.querySelector("#profile-menu");
    menu.hidden = !menu.hidden;
  });
document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#sign-in-button");
  const label = button.querySelector("span");
  setAuthError();
  button.disabled = true;
  label.textContent = "Signing in…";
  try {
    const result = await authRequest("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#login-email").value.trim(),
        password: document.querySelector("#login-password").value,
        rememberMe: document.querySelector("#remember-me").checked,
      }),
    });
    const user = result?.user;
    if (!user) throw new Error("Sign-in succeeded but no user profile was returned.");
    showDashboard(user);
    await loadBackendReports();
    render();
    notify(`Welcome back, ${user.name || "Responder"}.`);
    document.querySelector("#login-form").reset();
    document.querySelector("#remember-me").checked = true;
  } catch (error) {
    setAuthError(error.message);
  } finally {
    button.disabled = false;
    label.textContent = "Sign in";
  }
});
document.querySelector("#show-register").addEventListener("click", () => showAuthForm("register"));
document.querySelector("#show-login").addEventListener("click", () => showAuthForm("login"));
document.querySelector("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#register-button");
  const label = button.querySelector("span");
  registerError.hidden = true;
  button.disabled = true;
  label.textContent = "Creating account…";
  try {
    const result = await authRequest("/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: document.querySelector("#register-name").value.trim(),
        email: document.querySelector("#register-email").value.trim(),
        password: document.querySelector("#register-password").value,
      }),
    });
    const user = result?.user;
    if (!user) throw new Error("Account created, but the session could not be started.");
    showDashboard(user);
    await loadBackendReports();
    render();
    notify(`Welcome to WildCare, ${user.name || "Responder"}.`);
    document.querySelector("#register-form").reset();
  } catch (error) {
    registerError.textContent = error.message;
    registerError.hidden = false;
  } finally {
    button.disabled = false;
    label.textContent = "Create account";
  }
});
document.querySelector("#password-toggle").addEventListener("click", (event) => {
  const input = document.querySelector("#login-password");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  event.currentTarget.innerHTML = `<i class="fa-regular fa-eye${showing ? "" : "-slash"}" aria-hidden="true"></i>`;
  event.currentTarget.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});
document.querySelector("#sign-out-button").addEventListener("click", async () => {
  const button = document.querySelector("#sign-out-button");
  button.disabled = true;
  try {
    await authRequest("/sign-out", { method: "POST", body: "{}" });
  } catch {
    /* Clear the local UI even if the server session has already expired. */
  } finally {
    button.disabled = false;
    showLogin();
    notify("You have been signed out.");
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-actions")) {
    document.querySelector("#profile-menu").hidden = true;
  }
});
document.querySelector("#report-list").addEventListener("click", (event) => {
  if (event.target.dataset.workspaceAction !== undefined) {
    notify(`${event.target.textContent} selected.`);
    return;
  }
  const card = event.target.closest(".report");
  if (!card) return;
  const report = readReports().find((item) => item.id === card.dataset.id);
  if (event.target.classList.contains("view")) {
    document.querySelector("#dialog-title").textContent = report.title;
    document.querySelector("#dialog-details").textContent =
      `${report.status} · ${report.location} · Reported ${report.time}`;
    document.querySelector("#report-dialog").showModal();
  }
  if (event.target.classList.contains("action")) updateReport(report.id);
});
document
  .querySelector(".dialog-close")
  .addEventListener("click", () =>
    document.querySelector("#report-dialog").close(),
  );
channel?.addEventListener("message", async () => {
  await loadBackendReports();
  render();
  notify("Dashboard updated in real time.");
});
void (async () => {
  const authenticated = await loadCurrentUser();
  if (!authenticated) return;
  await loadBackendReports();
  render();
})();
