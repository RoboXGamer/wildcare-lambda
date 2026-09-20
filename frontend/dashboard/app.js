const toast = document.querySelector('#toast');
const storageKey = 'wildcare:reports';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('wildcare:reports') : null;
const apiBase = window.WILDCARE_API_URL || 'https://hnhgrqhm2xjl2amch5o6i3ddqe0orsoe.lambda-url.ap-south-1.on.aws';
let filter = 'assigned';
let searchTerm = '';
const seedReports = [
  { id: 'seed-1', title: 'Injured Rhesus Macaque', animal: '🐒', location: 'Rajouri Garden, New Delhi', time: '19 Sep 2026, 11:24 AM', status: 'New', urgency: 'Urgent', assigned: false },
  { id: 'seed-2', title: 'Trapped Bird', animal: '🦚', location: 'Dwarka Sector 10, New Delhi', time: '19 Sep 2026, 09:12 AM', status: 'In Progress', urgency: '', assigned: true },
  { id: 'seed-3', title: 'Snake in Residential Area', animal: '🐍', location: 'Janakpuri, New Delhi', time: '18 Sep 2026, 06:45 PM', status: 'Assigned', urgency: '', assigned: true },
];
let memoryReports = null;
function loadStoredReports() { try { return localStorage.getItem(storageKey); } catch { return null; } }
function storeReports(reports) { memoryReports = reports; try { localStorage.setItem(storageKey, JSON.stringify(reports)); } catch { /* Static previews can block storage; keep the dashboard usable in memory. */ } }
if (!loadStoredReports()) storeReports(seedReports);
function notify(message) { toast.textContent = message; toast.classList.add('visible'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('visible'), 2600); }
async function loadCurrentUser() { try { const response = await fetch(`${apiBase}/api/auth/get-session`, { credentials: 'include' }); if (!response.ok) return; const body = await response.json(); const user = body.user || (body.data && body.data.user); if (!user) return; document.querySelector('.profile-copy b').textContent = user.name; document.querySelector('.profile-copy small').textContent = user.email; } catch { /* Dashboard remains usable when the API is offline. */ } }
async function loadBackendReports() { try { const response = await fetch(`${apiBase}/api/reports`); if (!response.ok) return; const { data } = await response.json(); if (!Array.isArray(data)) return; const mapped = data.map((item) => ({ id: item.id, title: item.incidentType || 'Wildlife report', animal: '🐾', location: item.locationLabel || 'Location not shared', time: new Date(item.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), status: item.status || 'New', urgency: (item.status || 'New') === 'New' ? 'Urgent' : '', assigned: true })); const local = readReports().filter((r) => !mapped.some((m) => m.id === r.id)); storeReports([...mapped, ...local]); } catch { /* offline — keep local seeds */ } }
function readReports() { try { return JSON.parse(loadStoredReports()) || memoryReports || seedReports; } catch { return memoryReports || seedReports; } }
function saveReports(reports) { storeReports(reports); channel?.postMessage(reports); }
function statusClass(status) { return ({ New: 'peach', 'In Progress': 'amber', Assigned: 'blue', Accepted: 'blue', Resolved: 'mint' })[status] || 'blue'; }
function render() {
  const reports = readReports();
  const scoped = filter === 'assigned' ? reports.filter((report) => report.assigned || report.status === 'New') : reports.filter((report) => report.status !== 'Resolved');
  const visible = scoped.filter((report) => `${report.id} ${report.title} ${report.location} ${report.status}`.toLowerCase().includes(searchTerm));
  document.querySelector('#report-list').innerHTML = visible.length ? visible.map((report) => `<article class="report ${report.urgency ? 'urgent' : ''}" data-id="${report.id}"><div class="animal">${report.animal || '🐾'}</div><div class="report-info"><b>${report.title}</b><small>⌖ ${report.location}</small><small>◷ ${report.time}</small></div>${report.urgency ? `<span class="badge red">${report.urgency}</span>` : ''}<span class="badge ${statusClass(report.status)}">${report.status}</span><button class="view" type="button">View</button><button class="action ${report.status === 'New' ? 'accept' : 'update'}" type="button">${report.status === 'New' ? 'Accept' : report.status === 'In Progress' ? 'Resolve' : 'Update'}</button></article>`).join('') : '<p class="empty-state">No reports in this view.</p>';
  document.querySelector('#list-count').textContent = visible.length;
  document.querySelector('#assigned-count').textContent = reports.filter((r) => r.assigned || r.status === 'New').length;
  document.querySelector('#progress-count').textContent = reports.filter((r) => r.status === 'In Progress').length;
  document.querySelector('#resolved-count').textContent = reports.filter((r) => r.status === 'Resolved').length;
  document.querySelector('#total-count').textContent = reports.length;
}
async function updateReport(id) { const reports = readReports(); const report = reports.find((item) => item.id === id); if (!report) return; const next = report.status === 'New' ? 'Accepted' : report.status === 'In Progress' ? 'Resolved' : 'In Progress'; try { const response = await fetch(`${apiBase}/api/reports/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) }); if (response.status === 401) { notify('Sign in karo — mobile app me login karo pehle.'); return; } } catch { /* offline — local update rakho */ } report.assigned = true; report.status = next; if (next !== 'New') report.urgency = ''; saveReports(reports); notify(`${report.title} updated successfully.`); render(); }
function showWorkspace(view) {
  const details = {
    messages: ['Messages', 'No unread responder messages.', 'Start a message'],
    coverage: ['Coverage Area', 'New Delhi coverage is active. Add or edit service zones here.', 'Edit coverage'],
    resources: ['Resources', 'Safety guides and field checklists will appear here.', 'Open safety guide'],
  }[view];
  document.querySelector('#filter-menu').hidden = true;
  document.querySelector('#filter-button').hidden = true;
  document.querySelector('#list-count').textContent = '';
  document.querySelector('#report-subtitle').textContent = details[1];
  document.querySelector('#report-list').innerHTML = `<div class="workspace-panel"><h3>${details[0]}</h3><p>${details[1]}</p><button type="button" data-workspace-action>${details[2]}</button></div>`;
}
document.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); document.querySelectorAll('nav a').forEach((item) => item.classList.remove('active')); link.classList.add('active'); const view = link.dataset.view; if (view === 'all' || view === 'assigned' || view === 'dashboard') { filter = view === 'all' ? 'all' : 'assigned'; document.querySelector('#filter-button').hidden = false; document.querySelector('#report-subtitle').textContent = filter === 'all' ? 'All active wildlife reports.' : 'Prioritised wildlife reports requiring attention.'; render(); return; } showWorkspace(view); }));
document.querySelector('#filter-button').addEventListener('click', () => { const menu = document.querySelector('#filter-menu'); menu.hidden = !menu.hidden; });
document.querySelector('#filter-menu').addEventListener('click', (event) => { if (!event.target.dataset.filter) return; filter = event.target.dataset.filter; event.currentTarget.hidden = true; render(); });
document.querySelector('#report-search').addEventListener('input', (event) => { searchTerm = event.target.value.trim().toLowerCase(); if (searchTerm) { filter = 'all'; document.querySelectorAll('nav a').forEach((item) => item.classList.remove('active')); document.querySelector('[data-view="all"]').classList.add('active'); document.querySelector('#filter-button').hidden = false; document.querySelector('#report-subtitle').textContent = `Results for “${event.target.value.trim()}”`; } else { document.querySelector('#report-subtitle').textContent = 'All active wildlife reports.'; } render(); });
document.querySelector('#notifications-button').addEventListener('click', () => notify('You have 3 reports requiring attention.'));
document.querySelector('#profile-button').addEventListener('click', () => notify('Signed in as Wildlife SOS · Responder.'));
document.querySelector('#report-list').addEventListener('click', (event) => { if (event.target.dataset.workspaceAction !== undefined) { notify(`${event.target.textContent} selected.`); return; } const card = event.target.closest('.report'); if (!card) return; const report = readReports().find((item) => item.id === card.dataset.id); if (event.target.classList.contains('view')) { document.querySelector('#dialog-title').textContent = report.title; document.querySelector('#dialog-details').textContent = `${report.status} · ${report.location} · Reported ${report.time}`; document.querySelector('#report-dialog').showModal(); } if (event.target.classList.contains('action')) updateReport(report.id); });
document.querySelector('.dialog-close').addEventListener('click', () => document.querySelector('#report-dialog').close());
window.addEventListener('storage', async (event) => { if (event.key === storageKey) { await loadBackendReports(); render(); notify('A new report was received.'); } });
channel?.addEventListener('message', async () => { await loadBackendReports(); render(); notify('Dashboard updated in real time.'); });
void (async () => { await loadBackendReports(); render(); })();
void loadCurrentUser();
