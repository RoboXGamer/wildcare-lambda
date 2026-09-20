import { Show, createSignal, onCleanup } from "solid-js";
import "./App.css";

type Screen = "welcome" | "report" | "assessment" | "review" | "success";
const apiBase =
  (window as Window & { WILDCARE_API_URL?: string }).WILDCARE_API_URL ||
  "https://hnhgrqhm2xjl2amch5o6i3ddqe0orsoe.lambda-url.ap-south-1.on.aws";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error?.message || "Request failed. Please try again.");
  return body.data ?? body;
}

export default function App() {
  const [screen, setScreen] = createSignal<Screen>("welcome");
  const [step, setStep] = createSignal(1);
  const [incident, setIncident] = createSignal("Animal needs help");
  const [description, setDescription] = createSignal("");
  const [observation, setObservation] = createSignal("Select an option");
  const [location, setLocation] = createSignal("Rajouri Garden, New Delhi");
  const [locating, setLocating] = createSignal(false);
  const [photo, setPhoto] = createSignal<File>();
  const [photoUrl, setPhotoUrl] = createSignal("");
  const [photoName, setPhotoName] = createSignal("Choose a photo");
  const [analysis, setAnalysis] = createSignal("");
  const [condition, setCondition] = createSignal("Possible injury");
  const [toast, setToast] = createSignal("");
  const [authOpen, setAuthOpen] = createSignal(false);
  const [registering, setRegistering] = createSignal(false);
  const [user, setUser] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  let timer = 0;
  onCleanup(() => { clearTimeout(timer); if (photoUrl()) URL.revokeObjectURL(photoUrl()); });
  const notify = (message: string) => { setToast(message); clearTimeout(timer); timer = window.setTimeout(() => setToast(""), 2600); };
  const back = () => step() === 1 ? setScreen("welcome") : setStep(step() - 1);
  const next = () => {
    if (step() < 3) return setStep(step() + 1);
    if (!description().trim() && observation() === "Select an option") return notify("Add a description or select what you observed.");
    setCondition(observation() === "Select an option" ? "Possible injury" : observation()); setScreen("assessment");
  };
  const selectPhoto: JSX.EventHandlerUnion<HTMLInputElement, Event> = (event) => {
    const file = event.currentTarget.files?.[0]; if (!file) return;
    if (photoUrl()) URL.revokeObjectURL(photoUrl());
    setPhoto(file); setPhotoUrl(URL.createObjectURL(file)); setPhotoName(file.name); setAnalysis("");
  };
  const analyse = () => {
    const value = observation() === "Animal is trapped" || incident() === "Animal is trapped" ? "Possible entanglement or trapping" : observation() === "Human-wildlife conflict" || incident() === "Human-wildlife conflict" ? "Possible human-wildlife conflict" : "Possible visible injury";
    setCondition(value); setAnalysis(`${value}. Keep a safe distance and wait for a trained responder. This is preliminary guidance, not a diagnosis.`);
  };
  const locate = () => {
    if (!navigator.geolocation) return notify("Location services are unavailable; using the selected area.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLocation(`Current location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`); setLocating(false); notify("Your current location was added."); }, () => { setLocating(false); notify("Location access failed; using the selected area."); }, { enableHighAccuracy: true, timeout: 10000 });
  };
  const authenticate = async (event: SubmitEvent) => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement);
    try {
      await request(`/api/auth/${registering() ? "sign-up" : "sign-in"}/email`, { method: "POST", body: JSON.stringify({ name: data.get("name"), email: data.get("email"), password: data.get("password") }) });
      const session = await request("/api/auth/get-session", { method: "GET" });
      if (!session?.user) throw new Error("Login succeeded, but the session cookie was not saved. Please try again after the backend is redeployed.");
      setUser(session.user.name || "Responder"); setAuthOpen(false); notify(`Welcome, ${session.user.name || "Responder"}.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Authentication failed."); }
  };
  const submit = async () => {
    setSubmitting(true);
    try {
      let photoS3Key = null; const file = photo();
      if (file) { const upload = await request("/api/upload/url", { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "image/jpeg" }) }); const result = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file }); if (!result.ok) throw new Error("Photo upload failed."); photoS3Key = upload.s3Key; }
      await request("/api/reports", { method: "POST", body: JSON.stringify({ incidentType: incident(), description: description().trim(), locationLabel: location(), photoS3Key }) });
      notify("Report sent to responders."); setScreen("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send report.";
      notify(message);
      if (message.toLowerCase().includes("login") || message.toLowerCase().includes("unauthorized") || !user()) {
        setUser(""); setRegistering(false); setAuthOpen(true);
      }
    }
    finally { setSubmitting(false); }
  };
  const reset = () => { if (photoUrl()) URL.revokeObjectURL(photoUrl()); setStep(1); setDescription(""); setObservation("Select an option"); setLocation("Rajouri Garden, New Delhi"); setPhoto(); setPhotoUrl(""); setPhotoName("Choose a photo"); setAnalysis(""); setScreen("report"); };

  return <>
    <main class={`phone show-${screen()}`} aria-label="WildCare citizen app">
      <Show when={screen() === "welcome"}><section class="welcome-screen"><div class="topbar"><span>9:41</span><span>●●● ▰</span></div><div class="brand-mark">♣</div><p class="brand">WildCare</p><div class="deer">🦌</div><div class="welcome-copy"><p>Report Wildlife Emergencies</p><p>Connect with Rescuers</p><p>Protect Our Wildlife</p></div><div class="welcome-actions"><button class="button button-outline" onClick={() => setScreen("report")}>Get Started <span>→</span></button><button class="button button-ghost" onClick={() => { setRegistering(false); setAuthOpen(true); }}>{user() ? `Signed in as ${user()}` : "I Already Have an Account"}</button></div><p class="tagline">“A safer tomorrow<br/>for every wild life.”</p></section></Show>
      <Show when={screen() === "report"}><section class="report-screen"><Header step={step()} back={back}/><Show when={step() === 1}><div class="form-step"><p class="eyebrow">NEW WILDLIFE REPORT</p><h1>What happened?</h1><p class="muted">Choose the incident that best describes what you see.</p><label for="incident-type">Incident type</label><select id="incident-type" value={incident()} onInput={e => setIncident(e.currentTarget.value)}><option>Animal needs help</option><option>Animal is trapped</option><option>Human-wildlife conflict</option></select></div></Show><Show when={step() === 2}><div class="form-step"><p class="eyebrow">REPORT DETAILS</p><h1>Tell us about the animal</h1><p class="muted">A short description or photo helps responders prepare.</p><label for="incident-photo">Add a photo <small>(optional)</small></label><label class="photo-upload" for="incident-photo">📷 <span>{photoName()}</span><small>JPG, PNG, or HEIC</small></label><input id="incident-photo" type="file" accept="image/*" hidden onChange={selectPhoto}/><Show when={photoUrl()}><img src={photoUrl()} class="photo-preview" alt="Selected incident"/></Show><button class="analyse-photo" disabled={!photo()} onClick={analyse}>✦ Analyse photo</button><Show when={analysis()}><div class="ai-photo-result"><b>AI photo assessment</b>{analysis()}</div></Show><label for="description">Describe the incident <small>(optional)</small></label><textarea id="description" value={description()} onInput={e => setDescription(e.currentTarget.value)} placeholder="Injured monkey near the roadside..."/><label for="observation">What did you observe?</label><select id="observation" value={observation()} onInput={e => setObservation(e.currentTarget.value)}><option>Select an option</option><option>Animal appears injured</option><option>Animal is trapped</option><option>Human-wildlife conflict</option></select></div></Show><Show when={step() === 3}><div class="form-step"><p class="eyebrow">LOCATION</p><h1>Share the location</h1><p class="muted">We’ll use your location to find nearby responders.</p><div class="map-card"><div class="roads road-one"/><div class="roads road-two"/><div class="roads road-three"/><div class="location-pin">●</div><span class="map-label">{location()}</span></div><button class={`use-location ${location().startsWith("Current") ? "captured" : ""}`} disabled={locating()} onClick={locate}>{locating() ? "Locating you…" : location().startsWith("Current") ? `✓ Location captured: ${location()}` : "⌖ Use Current Location"}</button></div></Show><footer class="form-footer"><button class="button button-light" onClick={back}>Back</button><button class="button button-primary" onClick={next}>Next</button></footer></section></Show>
      <Show when={screen() === "assessment"}><section class="assessment-screen"><Header step={4} back={() => { setStep(3); setScreen("report"); }}/><p class="eyebrow">AI-ASSISTED ASSESSMENT</p><h1>Review the assessment</h1><p class="muted">This guidance is advisory. Keep a safe distance.</p><Card incident={condition()} location={location()}/><div class="safety-card"><b>Safety advice</b><p>Stay clear of the animal, keep others away, and wait for trained responders.</p></div><footer class="form-footer"><button class="button button-light" onClick={() => { setStep(3); setScreen("report"); }}>Edit</button><button class="button button-primary" onClick={() => setScreen("review")}>Continue</button></footer></section></Show>
      <Show when={screen() === "review"}><section class="review-screen flow-screen"><Header step={5} back={() => setScreen("assessment")}/><p class="eyebrow">REVIEW REPORT</p><h1>Ready to send?</h1><p class="muted">Review the essentials before alerting responders.</p><Card incident={incident()} location={location()}/><footer class="form-footer"><button class="button button-light" onClick={() => { setStep(2); setScreen("report"); }}>Edit</button><button class="button button-primary" disabled={submitting()} onClick={submit}>{submitting() ? "Sending…" : "Send report"}</button></footer></section></Show>
      <Show when={screen() === "success"}><section class="success-screen flow-screen"><div class="success-mark">✓</div><p class="eyebrow">REPORT SENT · STEP 6 OF 6</p><h1>Help is being matched</h1><p class="muted">Your report is now visible to nearby responders.</p><button class="button button-primary" onClick={reset}>Report another incident</button></section></Show>
    </main>
    <Show when={authOpen()}><div class="dialog-backdrop" onClick={() => setAuthOpen(false)}><div class="auth-dialog" role="dialog" onClick={e => e.stopPropagation()}><button class="dialog-close" onClick={() => setAuthOpen(false)}>×</button><p class="eyebrow">{registering() ? "CREATE ACCOUNT" : "WELCOME BACK"}</p><h2>{registering() ? "Join WildCare" : "Sign in to WildCare"}</h2><form onSubmit={authenticate}><Show when={registering()}><label>Name<input name="name" required autocomplete="name"/></label></Show><label>Email<input name="email" type="email" required autocomplete="email"/></label><label>Password<input name="password" type="password" minlength="8" required autocomplete={registering() ? "new-password" : "current-password"}/></label><button class="button button-primary" type="submit">{registering() ? "Create account" : "Sign in"}</button></form><button class="auth-switch" onClick={() => setRegistering(!registering())}>{registering() ? "I already have an account" : "Create an account"}</button></div></div></Show>
    <div class={`toast ${toast() ? "visible" : ""}`}>{toast()}</div>
  </>;
}

function Header(props: { step: number; back: () => void }) { return <header class="screen-header"><button class="icon-button" onClick={props.back}>←</button><div class="step"><span>Step <b>{props.step}</b> of 6</span><div class="progress"><i style={{ width: `${(props.step / 6) * 100}%` }}/></div></div><span class="spacer"/></header>; }
function Card(props: { incident: string; location: string }) { return <div class="assessment-card"><div><span>Possible condition</span><strong>{props.incident}</strong></div><div><span>Urgency</span><strong class="urgency">High</strong></div><div><span>Location</span><strong>{props.location}</strong></div></div>; }
