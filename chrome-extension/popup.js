const JOBAPP_API = "http://localhost:3000";

const authSection = document.getElementById("auth-section");
const mainSection = document.getElementById("main-section");
const statsContainer = document.getElementById("stats-container");
const activityContainer = document.getElementById("activity-container");
const lastSyncText = document.getElementById("last-sync-text");
const syncBtn = document.getElementById("sync-btn");
const signinBtn = document.getElementById("signin-btn");
const openDashboardBtn = document.getElementById("open-dashboard-btn");

const STATUS_LABELS = {
  saved: "Saved",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS = {
  applied: "badge-blue",
  phone_screen: "badge-blue",
  interview: "badge-amber",
  offer: "badge-green",
  rejected: "badge-red",
  saved: "badge-gray",
};

async function checkAuth() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      resolve(!!token && !chrome.runtime.lastError);
    });
  });
}

async function loadDashboardData() {
  try {
    const [clientsRes] = await Promise.all([fetch(`${JOBAPP_API}/api/clients`)]);
    const clients = await clientsRes.json();
    if (!clients.length) { showNoData(); return; }

    const clientId = clients[0].id;
    const appsRes = await fetch(`${JOBAPP_API}/api/applications?clientId=${clientId}`);
    const apps = await appsRes.json();

    renderStats(apps);
    renderActivity(apps);
  } catch {
    statsContainer.innerHTML = '<div class="empty">Could not connect to dashboard</div>';
  }
}

function renderStats(apps) {
  const counts = { applied: 0, phone_screen: 0, interview: 0, offer: 0, rejected: 0 };
  apps.forEach((a) => { if (a.status in counts) counts[a.status]++; });

  const total = apps.length;
  if (total === 0) { statsContainer.innerHTML = '<div class="empty">No applications yet</div>'; return; }

  const rows = [
    ["Total Applications", total, "badge-gray"],
    ["Phone Screen / Interview", counts.phone_screen + counts.interview, "badge-amber"],
    ["Offers", counts.offer, "badge-green"],
    ["Rejected", counts.rejected, "badge-red"],
  ];

  statsContainer.innerHTML = rows
    .map(([label, count, color]) =>
      count > 0
        ? `<div class="status-row"><span class="status-label">${label}</span><span class="status-badge ${color}">${count}</span></div>`
        : ""
    )
    .filter(Boolean)
    .join("") || '<div class="empty">No activity yet</div>';
}

function renderActivity(apps) {
  const recentApps = apps
    .filter((a) => a.lastEmailAt)
    .sort((a, b) => new Date(b.lastEmailAt) - new Date(a.lastEmailAt))
    .slice(0, 5);

  if (!recentApps.length) {
    activityContainer.innerHTML = '<div class="empty">No recent email activity</div>';
    return;
  }

  activityContainer.innerHTML = recentApps
    .map((a) => {
      const label = STATUS_LABELS[a.status] || a.status;
      const color = STATUS_COLORS[a.status] || "badge-gray";
      const date = new Date(a.lastEmailAt).toLocaleDateString();
      return `
        <div class="activity-item">
          <div class="status-row">
            <span class="activity-company">${a.jobLead.company}</span>
            <span class="status-badge ${color}">${label}</span>
          </div>
          <div class="activity-status">${a.lastEmailSubject || a.jobLead.title} · ${date}</div>
        </div>
      `;
    })
    .join("");
}

function showNoData() {
  statsContainer.innerHTML = '<div class="empty">No client data found</div>';
}

async function updateLastSync() {
  const stored = await chrome.storage.local.get(["lastSyncTimestamp"]);
  if (stored.lastSyncTimestamp) {
    const d = new Date(stored.lastSyncTimestamp * 1000);
    lastSyncText.textContent = `Last synced: ${d.toLocaleTimeString()}`;
  }
}

async function init() {
  const isAuthed = await checkAuth();

  if (!isAuthed) {
    authSection.style.display = "block";
    mainSection.style.display = "none";
  } else {
    authSection.style.display = "none";
    mainSection.style.display = "block";
    await Promise.all([loadDashboardData(), updateLastSync()]);
    // Clear badge
    chrome.runtime.sendMessage({ type: "CLEAR_BADGE" });
  }
}

signinBtn?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_AUTH_TOKEN" }, (response) => {
    if (response?.token) init();
  });
});

syncBtn?.addEventListener("click", async () => {
  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";
  chrome.runtime.sendMessage({ type: "MANUAL_SYNC" }, async () => {
    await Promise.all([loadDashboardData(), updateLastSync()]);
    syncBtn.disabled = false;
    syncBtn.textContent = "Sync Now";
  });
});

openDashboardBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: JOBAPP_API });
});

init();
