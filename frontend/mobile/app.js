const phone = document.querySelector('.phone');
const toast = document.querySelector('#toast');
const locationButton = document.querySelector('#use-location');
const locationLabel = document.querySelector('.map-label');
const assessmentLocation = document.querySelector('#assessment-location');
const storageKey = 'wildcare:reports';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('wildcare:reports') : null;
const apiBase = window.WILDCARE_API_URL || 'http://localhost:3000';
let currentStep = 1;
let photoUrl = null;
let photoFile = null;
function readReports() { try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; } }
function publishReports(reports) { try { localStorage.setItem(storageKey, JSON.stringify(reports)); } catch { /* The submitted state still completes in restricted static previews. */ } channel?.postMessage(reports); }
async function authRequest(path, options = {}) { const response = await fetch(`${apiBase}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || (body.error && body.error.message) || 'Request failed. Please try again.'); return body.data !== undefined ? body.data : body; }
function showAuthPanel(panel) { document.querySelectorAll('#auth-dialog > div').forEach((item) => { item.hidden = item.id !== panel; }); }
function signedIn(user) { document.querySelector('#have-account').textContent = `Signed in as ${user.name}`; document.querySelector('#auth-dialog').close(); notify(`Welcome, ${user.name}.`); }

function notify(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function showScreen(name) {
  phone.classList.remove('show-report', 'show-assessment', 'show-review', 'show-success');
  if (name) phone.classList.add(`show-${name}`);
}
function showFormStep(step) { currentStep = step; document.querySelectorAll('.form-step').forEach((screen) => { screen.hidden = Number(screen.dataset.step) !== step; }); document.querySelector('#step-number').textContent = step; document.querySelector('#progress-bar').style.width = `${(step / 6) * 100}%`; }

function useLocation(label) {
  locationLabel.textContent = label;
  assessmentLocation.textContent = label;
  locationButton.textContent = `✓  Location captured: ${label}`;
  locationButton.classList.add('captured');
}

document.querySelector('#get-started').addEventListener('click', () => { showFormStep(1); showScreen('report'); });
document.querySelector('#have-account').addEventListener('click', () => { showAuthPanel('login-form'); document.querySelector('#auth-dialog').showModal(); });
document.querySelector('#auth-close').addEventListener('click', () => document.querySelector('#auth-dialog').close());
document.querySelector('#show-register').addEventListener('click', () => showAuthPanel('register-form'));
document.querySelector('#show-login').addEventListener('click', () => showAuthPanel('login-form'));
document.querySelector('#login-request').addEventListener('submit', async (event) => { event.preventDefault(); try { const result = await authRequest('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email: document.querySelector('#login-email').value, password: document.querySelector('#login-password').value }) }); signedIn(result.user || result); } catch (error) { notify(error.message); } });
document.querySelector('#register-request').addEventListener('submit', async (event) => { event.preventDefault(); try { const result = await authRequest('/api/auth/sign-up/email', { method: 'POST', body: JSON.stringify({ name: document.querySelector('#register-name').value, email: document.querySelector('#register-email').value, password: document.querySelector('#register-password').value }) }); signedIn(result.user); } catch (error) { notify(error.message); } });
// OTP step removed — better-auth email+password signs you in directly after register.
document.querySelector('#incident-photo').addEventListener('change', (event) => { const [file] = event.target.files; if (!file) return; photoFile = file; if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = URL.createObjectURL(file); const preview = document.querySelector('#photo-preview'); preview.src = photoUrl; preview.hidden = false; document.querySelector('.photo-upload span').textContent = file.name; document.querySelector('#analyse-photo').disabled = false; document.querySelector('#ai-photo-result').hidden = true; });
document.querySelector('#analyse-photo').addEventListener('click', () => { const observation = document.querySelector('#observation').value; const incident = document.querySelector('#incident-type').value; const condition = observation === 'Animal is trapped' || incident === 'Animal is trapped' ? 'Possible entanglement or trapping' : observation === 'Human-wildlife conflict' || incident === 'Human-wildlife conflict' ? 'Possible human-wildlife conflict' : 'Possible visible injury'; const result = document.querySelector('#ai-photo-result'); result.innerHTML = `<b>AI photo assessment</b>${condition}. Keep a safe distance and wait for a trained responder. This is preliminary guidance, not a diagnosis.`; result.hidden = false; document.querySelector('#assessment-condition').textContent = condition; });
document.querySelector('#header-back').addEventListener('click', () => currentStep === 1 ? showScreen() : showFormStep(currentStep - 1));
document.querySelector('#go-back').addEventListener('click', () => currentStep === 1 ? showScreen() : showFormStep(currentStep - 1));
document.querySelectorAll('#assessment-back, #edit-report').forEach((button) => button.addEventListener('click', () => { showFormStep(3); showScreen('report'); }));

locationButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    useLocation('Rajouri Garden, New Delhi');
    notify('Location services are unavailable; using the selected area.');
    return;
  }
  locationButton.disabled = true;
  locationButton.textContent = 'Locating you…';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      useLocation(`Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      locationButton.disabled = false;
      notify('Your current location was added to this report.');
    },
    () => {
      useLocation('Rajouri Garden, New Delhi');
      locationButton.disabled = false;
      notify('We could not access your location; using the selected area.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
  );
});

document.querySelector('#next-step').addEventListener('click', () => {
  if (currentStep < 3) { showFormStep(currentStep + 1); return; }
  const observation = document.querySelector('#observation').value;
  const description = document.querySelector('#description').value.trim();
  if (!description && observation === 'Select an option') {
    notify('Add a short description or select what you observed first.');
    return;
  }
  document.querySelector('#assessment-condition').textContent = observation === 'Select an option' ? 'Possible injury' : observation;
  showScreen('assessment');
});

document.querySelector('#continue-report').addEventListener('click', () => { document.querySelector('#review-incident').textContent = document.querySelector('#incident-type').value; document.querySelector('#review-location').textContent = locationLabel.textContent; showScreen('review'); });
document.querySelector('#review-back').addEventListener('click', () => showScreen('assessment'));
document.querySelector('#review-edit').addEventListener('click', () => { showFormStep(2); showScreen('report'); });
document.querySelector('#submit-report').addEventListener('click', async () => {
  const incidentType = document.querySelector('#incident-type').value;
  const description = document.querySelector('#description').value.trim();
  const location = locationLabel.textContent;
  let photoS3Key = null;
  try {
    if (photoFile) {
      const { uploadUrl, s3Key } = await authRequest('/api/upload/url', { method: 'POST', body: JSON.stringify({ fileName: photoFile.name, contentType: photoFile.type || 'image/jpeg' }) });
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': photoFile.type || 'image/jpeg' }, body: photoFile });
      if (!put.ok) throw new Error('Photo upload failed.');
      photoS3Key = s3Key;
    }
    const saved = await authRequest('/api/reports', { method: 'POST', body: JSON.stringify({ incidentType, description, locationLabel: location, photoS3Key }) });
    const reports = readReports();
    reports.unshift({ id: saved.id || `report-${Date.now()}`, title: saved.incidentType || incidentType, animal: '🐾', location: saved.locationLabel || location, time: new Date(saved.createdAt || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), status: saved.status || 'New', urgency: 'Urgent', assigned: false });
    publishReports(reports);
    notify('Report sent to responders.');
  } catch (error) {
    const reports = readReports();
    const now = new Date();
    reports.unshift({ id: `report-${now.getTime()}`, title: incidentType, animal: '🐾', location, time: now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), status: 'New', urgency: 'Urgent', assigned: false });
    publishReports(reports);
    notify('Saved offline — sign in karo taaki backend pe jaye.');
  }
  showScreen('success');
});
document.querySelector('#new-report').addEventListener('click', () => { document.querySelector('#description').value = ''; document.querySelector('#observation').selectedIndex = 0; document.querySelector('#incident-photo').value = ''; document.querySelector('#photo-preview').hidden = true; document.querySelector('#analyse-photo').disabled = true; document.querySelector('#ai-photo-result').hidden = true; document.querySelector('.photo-upload span').textContent = 'Choose a photo'; if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null; photoFile = null; showFormStep(1); showScreen('report'); });
