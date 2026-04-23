// --- STATE & DATA ---
const STATE = {
  currentUser: null,
  activePage: "dashboard",
  patients: [
    {
      id: "EMG-2024-001",
      name: "Shreya",
      age: 45,
      condition: "Stroke",
      muscle: "Forearm",
      strength: 65,
      status: "active",
      lastSession: "2024-03-10",
    },
    {
      id: "EMG-2024-002",
      name: "Aayusha",
      age: 32,
      condition: "Muscle Injury",
      muscle: "Shoulder",
      strength: 82,
      status: "inactive",
      lastSession: "2024-03-08",
    },
    {
      id: "EMG-2024-003",
      name: "Sakshi",
      age: 58,
      condition: "Paralysis",
      muscle: "Hand",
      strength: 20,
      status: "active",
      lastSession: "2024-03-11",
    },
  ],
  alerts: [
    {
      type: "warning",
      msg: "Low signal quality detected for Jane Smith",
      time: "10 mins ago",
      critical: false,
    },
    {
      type: "danger",
      msg: "Abnormal spike in channel 4 (John Doe)",
      time: "1 hour ago",
      critical: true,
    },
  ],
  monitoring: {
    active: false,
    patientId: null,
    timer: null,
    seconds: 0,
    dataGenerator: null,
    chartCanvas: null,
    chartCtx: null,
    dataSeries: Array(8)
      .fill()
      .map(() => []),
    timeLabels: [],
  },
};

const GESTURES = [
  "Rest",
  "Fist",
  "Flex",
  "Extend",
  "Radial",
  "Ulnar",
  "Open Palm",
];
const GESTURE_EMOJIS = ["✋", "✊", "🤛", "🤜", "👋", "🖖", "🖐️"];

// --- INITIALIZATION ---
function initLogin() {
  // Allow pressing Enter to login
  document.getElementById("loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
  document.getElementById("loginUsername").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initCharts();
  renderPatientsList();
  renderDashTables();
  populateDropdowns();
  renderAlerts();
  renderHistory();
});

// --- LOGIN SYSTEM ---
let loginRole = "doctor";
function switchLoginTab(role) {
  loginRole = role;
  document
    .getElementById("doctorTabBtn")
    .classList.toggle("active", role === "doctor");
  document
    .getElementById("patientTabBtn")
    .classList.toggle("active", role === "patient");
  document.getElementById("loginHint").innerHTML =
    role === "doctor"
      ? "<span>Demo: <b>doctor</b> / <b>1234</b></span>"
      : "<span>Demo: <b>patient</b> / <b>1234</b></span>";
}

function doLogin() {
  const u = document.getElementById("loginUsername").value;
  const p = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");

  if (!u || !p) {
    err.textContent = "Please enter credentials";
    return;
  }

  if (
    (loginRole === "doctor" && u === "doctor" && p === "1234") ||
    (loginRole === "patient" && u === "patient" && p === "1234")
  ) {
    STATE.currentUser = {
      role: loginRole,
      name: loginRole === "doctor" ? "Dr. Krutika" : "John Doe",
    };

    // Update UI for user
    document.getElementById("sidebarUserName").textContent =
      STATE.currentUser.name;
    document.getElementById("topbarName").textContent = STATE.currentUser.name;
    document.getElementById("sidebarUserRole").textContent =
      loginRole === "doctor" ? "Lead Neurologist" : "Patient";
    document.getElementById("sidebarAvatar").textContent =
      STATE.currentUser.name.charAt(0);
    document.getElementById("topbarAvatar").textContent =
      STATE.currentUser.name.charAt(0);

    // Hide patient-specific navs if patient logs in (simplified access control)
    if (loginRole === "patient") {
      document.getElementById("nav-patients").style.display = "none";
      document.getElementById("nav-monitor").style.display = "none";
    } else {
      document.getElementById("nav-patients").style.display = "flex";
      document.getElementById("nav-monitor").style.display = "flex";
    }

    const login = document.getElementById("loginScreen");
    login.classList.remove("active");
    login.classList.add("hidden");

    const app = document.getElementById("mainApp");
    app.classList.remove("hidden");
    app.classList.add("active");
    document.getElementById("mainApp").classList.remove("hidden");
    showPage("dashboard");
    showToast(
      "Login Successful",
      `Welcome back, ${STATE.currentUser.name}`,
      "success",
    );
  } else {
    err.textContent = "Invalid credentials. Try the demo ones.";
  }
}

function doLogout() {
  stopMonitor();
  document.getElementById("mainApp").classList.add("hidden");
  const login = document.getElementById("loginScreen");
  login.classList.remove("hidden");
  login.classList.add("active");
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").textContent = "";
}

// --- NAVIGATION ---
function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

  const pageMap = {
    dashboard: "Dashboard Overview",
    patients: "Patient Directory",
    monitor: "Live EMG Monitor",
    history: "Session History",
    progress: "Recovery Progress",
    alerts: "System Alerts",
    report: "Generate Reports",
  };

  document.getElementById(`page-${pageId}`).classList.add("active");
  document.getElementById(`nav-${pageId}`).classList.add("active");
  document.getElementById("pageTitle").textContent = pageMap[pageId];

  const d = new Date();
  document.getElementById("pageDate").textContent = d.toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  if (window.innerWidth <= 768) toggleSidebar();

  // Trigger re-renders if needed
  if (pageId === "progress") renderProgress();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// --- CHARTS & UI COMPONENTS ---
function initCharts() {
  drawGauge(67);
  initDashMiniChart();
  initDashChart();
  initLiveChart();
}

// Gauge Chart for Strength
function drawGauge(val) {
  const c = document.getElementById("gaugeCanvas");
  if (!c) return;
  const ctx = c.getContext("2d");
  const w = c.width;
  const h = c.height;
  const cx = w / 2,
    cy = h;
  const r = 80;

  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 15;
  ctx.lineCap = "round";

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.stroke();

  // Value arc
  let color = "#ef4444"; // weak
  let label = "Weak";
  if (val > 20) {
    color = "#f59e0b";
    label = "Moderate";
  }
  if (val > 60) {
    color = "#10b981";
    label = "Strong";
  }

  document.getElementById("gaugeValue").textContent = val;
  document.getElementById("gaugeLabel").textContent = label;
  document.getElementById("gaugeLabel").style.color = color;

  const endAngle = Math.PI + Math.PI * (val / 100);

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, endAngle);
  ctx.strokeStyle = color;
  ctx.stroke();
}

// Mini Bar chart for Dashboard
function initDashMiniChart() {
  const bars = document.getElementById("dashChannelBars");
  if (!bars) return;
  bars.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const b = document.createElement("div");
    b.className = "mini-bar";
    b.id = `minibar-${i}`;
    bars.appendChild(b);
  }

  // Simulate mini chart activity
  setInterval(() => {
    for (let i = 0; i < 8; i++) {
      const h = 10 + Math.random() * 30;
      const b = document.getElementById(`minibar-${i}`);
      if (b) b.style.height = `${h}px`;
    }
  }, 200);
}

// --- LIVE MONITORING LOGIC ---
function initLiveChart() {
  const c = document.getElementById("liveChart");
  if (!c) return;
  STATE.monitoring.chartCtx = c.getContext("2d");

  // Setup Channel Grid UI
  const grid = document.getElementById("channelGrid");
  grid.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    grid.innerHTML += `
      <div class="channel-card">
        <div class="ch-header"><span>CH ${i + 1}</span><span id="chVal${i}" class="ch-val">0.0</span></div>
        <canvas id="chCanvas${i}" height="40" style="width:100%"></canvas>
      </div>
    `;
  }
}

function startMonitor() {
  const pId = document.getElementById("monitorPatientSelect").value;
  if (!pId) {
    showToast("Error", "Please select a patient first", "error");
    return;
  }

  STATE.monitoring.active = true;
  document.getElementById("startBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;
  document
    .getElementById("startBtn")
    .classList.replace("btn-primary", "btn-secondary");
  document
    .getElementById("stopBtn")
    .classList.replace("btn-secondary", "btn-danger");

  // Reset Timer
  STATE.monitoring.seconds = 0;
  STATE.monitoring.timer = setInterval(updateTimer, 1000);

  // Start Data Generation
  STATE.monitoring.dataGenerator = setInterval(generateSimulatedData, 50);

  showToast("Session Started", "Live EMG monitoring active", "success");
  document.getElementById("movIndicator").textContent = "🟢";
  document.getElementById("movStatus").textContent = "Active Muscle";
}

function stopMonitor() {
  if (!STATE.monitoring.active) return;
  STATE.monitoring.active = false;

  clearInterval(STATE.monitoring.timer);
  clearInterval(STATE.monitoring.dataGenerator);

  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
  document
    .getElementById("startBtn")
    .classList.replace("btn-secondary", "btn-primary");
  document
    .getElementById("stopBtn")
    .classList.replace("btn-danger", "btn-secondary");

  document.getElementById("movIndicator").textContent = "⚫";
  document.getElementById("movStatus").textContent = "Session Stopped";

  showToast("Session Stopped", "Data saved to history", "warning");
}

function updateTimer() {
  STATE.monitoring.seconds++;
  const s = STATE.monitoring.seconds;
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  document.getElementById("sessionTimer").textContent = `${h}:${m}:${sec}`;
}

// Simulate realistic EMG data
function generateSimulatedData() {
  // Randomly simulate a gesture every few seconds
  const isAction = Math.random() > 0.8;
  const gestureIdx = isAction
    ? Math.floor(Math.random() * (GESTURES.length - 1)) + 1
    : 0; // 0 is rest

  updateGestureUI(gestureIdx);

  let rmsSum = 0;

  // Generate data for 8 channels
  for (let i = 0; i < 8; i++) {
    // Base noise + signal
    const noise = (Math.random() - 0.5) * 5;
    const signalMultiplier = isAction ? Math.random() * 40 + 20 : 5; // Higher amp during action
    const val =
      noise + Math.sin(Date.now() / (100 + i * 10)) * signalMultiplier;

    STATE.monitoring.dataSeries[i].push(val);
    if (STATE.monitoring.dataSeries[i].length > 50) {
      STATE.monitoring.dataSeries[i].shift();
    }

    // Update Channel Text
    const el = document.getElementById(`chVal${i}`);
    if (el) el.textContent = Math.abs(val).toFixed(1);

    rmsSum += val * val;
  }

  const rms = Math.sqrt(rmsSum / 8).toFixed(1);
  document.getElementById("liveRMS").textContent = rms;

  // Calculate fake strength based on RMS
  const str = Math.min(100, Math.max(0, Math.floor(rms * 1.5)));
  document.getElementById("liveStrengthVal").textContent = str + "%";

  drawLiveChart();
}

function drawLiveChart() {
  const c = document.getElementById("liveChart");
  if (!c) return;
  const ctx = STATE.monitoring.chartCtx;
  const w = (c.width = c.offsetWidth);
  const h = (c.height = c.offsetHeight);

  ctx.clearRect(0, 0, w, h);

  // Colors for 8 channels
  const colors = [
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#d946ef",
  ];

  const step = w / 50;
  const zoom = parseInt(document.getElementById("zoomRange")?.value || 2);
  const scaleY = zoom;

  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;

    // Offset each channel vertically to separate them
    const yOffset = (h / 8) * i + h / 16;

    const data = STATE.monitoring.dataSeries[i];
    for (let j = 0; j < data.length; j++) {
      const x = j * step;
      const y = yOffset - data[j] * scaleY;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Also draw mini canvases
    drawMiniCanvas(i, data, colors[i]);
  }
}

function drawMiniCanvas(idx, data, color) {
  const c = document.getElementById(`chCanvas${idx}`);
  if (!c) return;
  const ctx = c.getContext("2d");
  const w = (c.width = c.offsetWidth);
  const h = (c.height = c.offsetHeight);

  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const step = w / 50;

  for (let j = 0; j < data.length; j++) {
    const x = j * step;
    const y = h / 2 - data[j] * 0.5; // scaled down
    if (j === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function changeZoom(val) {
  document.getElementById("zoomLabel").textContent = val + "x";
}

function updateGestureUI(idx) {
  const name = GESTURES[idx];
  const emoji = GESTURE_EMOJIS[idx];
  const conf = Math.floor(Math.random() * 20) + 80; // 80-99%

  // Dashboard
  const gIcon = document.getElementById("gestureIcon");
  if (gIcon) gIcon.textContent = emoji;
  const gName = document.getElementById("gestureName");
  if (gName) gName.textContent = name;
  const gConf = document.getElementById("gestureConf");
  if (gConf) gConf.textContent = `Confidence: ${conf}%`;

  // Live Monitor
  const lGest = document.getElementById("liveGesture");
  if (lGest) lGest.textContent = `${emoji} ${name}`;

  // Update Chips
  for (let i = 0; i < 7; i++) {
    const chip = document.getElementById(`gchip${i}`);
    if (chip) {
      if (i === idx) chip.classList.add("active");
      else chip.classList.remove("active");
    }
  }

  // Fake Voice Alert for Demo (if no movement for a bit)
  if (idx === 0 && Math.random() > 0.98 && STATE.monitoring.active) {
    playVoiceAlert("No movement detected. Please try to flex.");
  }
}

// --- PATIENT MANAGEMENT ---
function renderPatientsList(filter = "") {
  const grid = document.getElementById("patientCardsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = STATE.patients.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );

  filtered.forEach((p) => {
    const sClass = p.status === "active" ? "status-active" : "status-inactive";
    const sText = p.status === "active" ? "Active" : "Inactive";

    grid.innerHTML += `
      <div class="patient-card">
        <div class="pc-header">
          <div class="patient-cell">
            <div class="p-avatar">${p.name.charAt(0)}</div>
            <div class="p-info">
              <span class="p-name">${p.name}</span>
              <span class="p-id">${p.id}</span>
            </div>
          </div>
          <span class="status-badge ${sClass}">${sText}</span>
        </div>
        <div class="pc-details">
          <div><div class="pc-label">Condition</div><div class="pc-val">${p.condition}</div></div>
          <div><div class="pc-label">Affected Area</div><div class="pc-val">${p.muscle}</div></div>
          <div><div class="pc-label">Age</div><div class="pc-val">${p.age}</div></div>
          <div><div class="pc-label">Strength Score</div><div class="pc-val text-success">${p.strength}%</div></div>
        </div>
        <div class="pc-footer">
          <span style="font-size:0.8rem; color:#94a3b8">Last: ${p.lastSession}</span>
          <button class="btn-sm btn-primary" onclick="monitorPatient('${p.id}')">Monitor →</button>
        </div>
      </div>
    `;
  });
}

function renderDashTables() {
  const tbody = document.getElementById("dashPatientTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  STATE.patients.slice(0, 3).forEach((p) => {
    const sClass = p.status === "active" ? "status-active" : "status-inactive";
    tbody.innerHTML += `
      <tr>
        <td>
          <div class="patient-cell">
            <div class="p-avatar" style="width:28px;height:28px;font-size:0.8rem">${p.name.charAt(0)}</div>
            <div class="p-info">
              <span class="p-name" style="font-size:0.9rem">${p.name}</span>
            </div>
          </div>
        </td>
        <td>${p.condition}</td>
        <td><span class="text-success" style="font-weight:600">${p.strength}%</span></td>
        <td>${p.lastSession}</td>
        <td><span class="status-badge ${sClass}" style="font-size:0.65rem">${p.status}</span></td>
        <td><button class="btn-sm btn-secondary" onclick="monitorPatient('${p.id}')">Monitor</button></td>
      </tr>
    `;
  });

  document.getElementById("statTotalPatients").textContent =
    STATE.patients.length;
}

function populateDropdowns() {
  const sels = [
    "monitorPatientSelect",
    "progressPatientSelect",
    "historyPatientFilter",
    "reportPatient",
  ];
  sels.forEach((sid) => {
    const el = document.getElementById(sid);
    if (el) {
      el.innerHTML = '<option value="">Select Patient...</option>';
      STATE.patients.forEach((p) => {
        el.innerHTML += `<option value="${p.id}">${p.name} (${p.id})</option>`;
      });
    }
  });
}

function filterPatients(val) {
  renderPatientsList(val);
}
function searchPatients(val) {
  showPage("patients");
  renderPatientsList(val);
  document.getElementById("patientSearch").value = val;
}

function monitorPatient(id) {
  showPage("monitor");
  document.getElementById("monitorPatientSelect").value = id;
}

// Modal logic
function openPatientModal() {
  document.getElementById("patientModal").classList.remove("hidden");
}
function closePatientModal() {
  document.getElementById("patientModal").classList.add("hidden");
}
function savePatient() {
  const name = document.getElementById("pName").value;
  const id =
    document.getElementById("pId").value ||
    `EMG-${Math.floor(Math.random() * 10000)}`;
  if (!name) {
    showToast("Error", "Name is required", "error");
    return;
  }

  STATE.patients.push({
    id: id,
    name: name,
    age: document.getElementById("pAge").value || 30,
    condition: document.getElementById("pCondition").value,
    muscle: document.getElementById("pMuscle").value,
    strength: 0,
    status: "active",
    lastSession: "Never",
  });

  closePatientModal();
  renderPatientsList();
  renderDashTables();
  populateDropdowns();
  showToast("Success", "Patient added successfully", "success");
}

// --- ALERTS ---
function renderAlerts() {
  const dCont = document.getElementById("dashAlerts");
  const pCont = document.getElementById("alertsContainer");
  if (dCont) dCont.innerHTML = "";
  if (pCont) pCont.innerHTML = "";

  document.getElementById("statAlerts").textContent = STATE.alerts.length;
  document.getElementById("alertBadge").textContent = STATE.alerts.length;
  document.getElementById("alertBadge").style.display =
    STATE.alerts.length > 0 ? "block" : "none";
  document.getElementById("alertDot").style.display =
    STATE.alerts.length > 0 ? "block" : "none";

  STATE.alerts.forEach((a) => {
    const html = `
      <div class="alert-item ${a.critical ? "critical" : ""}">
        <div class="alert-icon">${a.type === "danger" ? "🛑" : "⚠️"}</div>
        <div class="alert-content">
          <h4>${a.critical ? "Critical Alert" : "System Warning"}</h4>
          <p>${a.msg}</p>
        </div>
        <div class="alert-time">${a.time}</div>
      </div>
    `;
    if (dCont) dCont.innerHTML += html;
    if (pCont) pCont.innerHTML += html;
  });
}
function clearAllAlerts() {
  STATE.alerts = [];
  renderAlerts();
  showToast("Cleared", "All alerts cleared", "success");
}

// --- UI UTILS ---
function showToast(title, msg, type = "info") {
  const cont = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</div>
    <div class="toast-content"><h4>${title}</h4><p>${msg}</p></div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  cont.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function playVoiceAlert(text) {
  const va = document.getElementById("voiceAlert");
  document.getElementById("voiceAlertText").textContent = text;
  va.classList.remove("hidden");

  // Use Web Speech API if available
  if ("speechSynthesis" in window) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }

  setTimeout(() => va.classList.add("hidden"), 3000);
}

// --- EXPORT & REPORTS ---
function exportSession() {
  if (STATE.monitoring.active) {
    showToast("Warning", "Stop session before exporting", "warning");
    return;
  }
  showToast("Exporting", "Generating CSV file...", "info");
  setTimeout(
    () =>
      showToast("Success", "Data downloaded as session_data.csv", "success"),
    1500,
  );
}

function generateReport() {
  const pId = document.getElementById("reportPatient").value;
  if (!pId) {
    showToast("Error", "Select a patient", "error");
    return;
  }

  const p = STATE.patients.find((x) => x.id === pId);
  const out = document.getElementById("reportOutput");
  out.classList.remove("hidden");
  out.innerHTML = `
    <div style="background:white;color:black;padding:40px;border-radius:8px;font-family:sans-serif">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #ccc;padding-bottom:20px">
        <h2>NeuroSync EMG Report</h2>
        <div style="text-align:right">
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p>Doctor: Dr. Admin</p>
        </div>
      </div>
      <div style="margin-top:20px">
        <h3>Patient Info</h3>
        <p><b>Name:</b> ${p.name} | <b>ID:</b> ${p.id} | <b>Age:</b> ${p.age}</p>
        <p><b>Condition:</b> ${p.condition} | <b>Area:</b> ${p.muscle}</p>
      </div>
      <div style="margin-top:20px;padding:20px;background:#f0fdf4;border-left:5px solid #22c55e">
        <h3>Recovery Summary</h3>
        <p>Current Strength Score: <b>${p.strength}%</b></p>
        <p>Trend: <span style="color:#22c55e">Positive Improvement</span></p>
        <p>AI Prediction: Expected full recovery of motor unit in 28 days based on current trajectory.</p>
      </div>
    </div>
  `;
}
function printReport() {
  window.print();
}

// --- PROGRESS CHART ---
function renderProgress() {
  const c = document.getElementById("progressChart");
  if (!c) return;
  const ctx = c.getContext("2d");
  const w = (c.width = c.parentElement.offsetWidth - 40);
  const h = (c.height = 200);

  ctx.clearRect(0, 0, w, h);

  // Fake progress data
  const days = [
    "Day 1",
    "Day 3",
    "Day 5",
    "Day 7",
    "Day 10",
    "Day 12",
    "Day 15",
  ];
  const values = [20, 25, 35, 45, 60, 62, 75]; // Ascending trend

  // Draw grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * (h / 4));
    ctx.lineTo(w, i * (h / 4));
    ctx.stroke();
  }

  // Draw Line
  ctx.beginPath();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 3;

  const step = w / (days.length - 1);
  const scale = h / 100;

  values.forEach((v, i) => {
    const x = i * step;
    const y = h - v * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill gradient
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(16, 185, 129, 0.4)");
  grad.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = grad;
  ctx.fill();

  // Also render milestones and stats
  renderMilestones();
  renderProgressStats();
}

// --- SESSION HISTORY ---
function renderHistory() {
  const container = document.getElementById("historyTimeline");
  if (!container) return;

  const sessions = [
    {
      date: "2024-03-11",
      patient: "John Doe",
      duration: "25 min",
      strength: 65,
      gesture: "Fist",
    },
    {
      date: "2024-03-10",
      patient: "Robert King",
      duration: "18 min",
      strength: 20,
      gesture: "Rest",
    },
    {
      date: "2024-03-09",
      patient: "John Doe",
      duration: "30 min",
      strength: 58,
      gesture: "Flex",
    },
    {
      date: "2024-03-08",
      patient: "Jane Smith",
      duration: "22 min",
      strength: 82,
      gesture: "Extend",
    },
    {
      date: "2024-03-07",
      patient: "John Doe",
      duration: "20 min",
      strength: 50,
      gesture: "Fist",
    },
    {
      date: "2024-03-05",
      patient: "Robert King",
      duration: "15 min",
      strength: 15,
      gesture: "Rest",
    },
  ];

  container.innerHTML = "";
  sessions.forEach((s) => {
    container.innerHTML += `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="tl-info">
            <span class="tl-date">${s.date}</span>
            <span class="tl-details">${s.patient} — ${s.duration} session</span>
          </div>
          <div class="tl-stats">
            <span>💪 ${s.strength}%</span>
            <span>✋ ${s.gesture}</span>
          </div>
        </div>
      </div>
    `;
  });
}

function filterHistory() {
  // Simplified: just re-render for demo
  renderHistory();
}
function clearHistoryFilter() {
  document.getElementById("historyPatientFilter").value = "";
  document.getElementById("historyDateFilter").value = "";
  renderHistory();
}

// --- MILESTONES & STATS ---
function renderMilestones() {
  const el = document.getElementById("progressMilestones");
  if (!el) return;

  const milestones = [
    {
      day: "Day 1",
      label: "First EMG session recorded",
      icon: "🏁",
      done: true,
    },
    { day: "Day 5", label: "Weak fist detected", icon: "✊", done: true },
    { day: "Day 10", label: "Moderate wrist flexion", icon: "💪", done: true },
    { day: "Day 15", label: "Strong grip strength", icon: "🎯", done: false },
    { day: "Day 30", label: "Full recovery target", icon: "🏆", done: false },
  ];

  el.innerHTML = "";
  milestones.forEach((m) => {
    el.innerHTML += `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(0,0,0,0.2);border-radius:8px;margin-bottom:8px;border-left:3px solid ${m.done ? "var(--success)" : "var(--border)"}">
        <span style="font-size:1.3rem">${m.icon}</span>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.9rem;${m.done ? "" : "opacity:0.5"}">${m.label}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${m.day}</div>
        </div>
        <span style="font-size:0.8rem;color:${m.done ? "var(--success)" : "var(--text-muted)"}">${m.done ? "✅" : "⏳"}</span>
      </div>
    `;
  });
}

function renderProgressStats() {
  const el = document.getElementById("progressStats");
  if (!el) return;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
      <div style="background:rgba(0,0,0,0.2);padding:15px;border-radius:10px;text-align:center">
        <div style="font-size:2rem;font-weight:800;font-family:var(--font-display);color:var(--secondary)">6</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Total Sessions</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:15px;border-radius:10px;text-align:center">
        <div style="font-size:2rem;font-weight:800;font-family:var(--font-display);color:var(--success)">+55%</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Improvement</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:15px;border-radius:10px;text-align:center">
        <div style="font-size:2rem;font-weight:800;font-family:var(--font-display);color:var(--warning)">22 min</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Avg Duration</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);padding:15px;border-radius:10px;text-align:center">
        <div style="font-size:2rem;font-weight:800;font-family:var(--font-display);color:var(--primary-light)">75%</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Latest Score</div>
      </div>
    </div>
  `;
}

// --- DASHBOARD MINI CHART (canvas) ---
function initDashChart() {
  const c = document.getElementById("dashChart");
  if (!c) return;
  const ctx = c.getContext("2d");

  let offset = 0;
  setInterval(() => {
    const w = (c.width = c.offsetWidth);
    const h = (c.height = 130);
    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    offset += 0.05;

    for (let x = 0; x < w; x++) {
      const y =
        h / 2 +
        Math.sin(x * 0.02 + offset) * 30 +
        Math.sin(x * 0.05 + offset * 2) * 15;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(99, 102, 241, 0.3)");
    grad.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = grad;
    ctx.fill();
  }, 50);
}
