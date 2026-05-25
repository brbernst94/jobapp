// JobApp Gmail Tracker — Background Service Worker
// Polls Gmail every 15 minutes for emails matching tracked company domains

const JOBAPP_API = "http://localhost:3000";
const POLL_INTERVAL_MINUTES = 15;

// Get OAuth token via Chrome Identity API
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError?.message || "Not authenticated");
      } else {
        resolve(token);
      }
    });
  });
}

// Fetch recent Gmail messages from a specific domain
async function fetchGmailMessages(token, afterTimestamp) {
  const query = encodeURIComponent(`after:${afterTimestamp} -from:me`);
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Gmail API error: " + res.status);
  const data = await res.json();
  return data.messages || [];
}

// Fetch full message details
async function fetchMessageDetail(token, messageId) {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const msg = await res.json();

  const headers = msg.payload?.headers || [];
  const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  return {
    threadId: msg.threadId,
    messageId: msg.id,
    subject: get("Subject"),
    from: get("From"),
    snippet: msg.snippet || "",
    receivedAt: new Date(parseInt(msg.internalDate)).toISOString(),
  };
}

// Main sync function: poll Gmail and POST to JobApp
async function syncEmails() {
  let token;
  try {
    token = await getAuthToken();
  } catch {
    console.log("Not authenticated — skipping sync");
    return;
  }

  // Get last sync timestamp (default: 24 hours ago)
  const stored = await chrome.storage.local.get(["lastSyncTimestamp"]);
  const lastSync = stored.lastSyncTimestamp || Math.floor((Date.now() - 86400000) / 1000);

  let messages;
  try {
    messages = await fetchGmailMessages(token, lastSync);
  } catch (err) {
    console.error("Failed to fetch Gmail messages:", err);
    return;
  }

  if (!messages.length) {
    await chrome.storage.local.set({ lastSyncTimestamp: Math.floor(Date.now() / 1000) });
    return;
  }

  // Fetch details for each message (in batches of 10)
  const emailDetails = [];
  for (let i = 0; i < messages.length; i += 10) {
    const batch = messages.slice(i, i + 10);
    const details = await Promise.all(batch.map((m) => fetchMessageDetail(token, m.id)));
    emailDetails.push(...details.filter(Boolean));
  }

  // POST to JobApp API
  try {
    const res = await fetch(`${JOBAPP_API}/api/gmail/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: emailDetails }),
    });
    const result = await res.json();

    if (result.matched > 0) {
      // Badge with count of status changes
      const changes = result.statusUpdates?.length || 0;
      if (changes > 0) {
        chrome.action.setBadgeText({ text: String(changes) });
        chrome.action.setBadgeBackgroundColor({ color: "#4F46E5" });

        // Show notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "JobApp Update",
          message: `${changes} application status${changes > 1 ? "es" : ""} updated from email activity!`,
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync with JobApp:", err);
  }

  await chrome.storage.local.set({ lastSyncTimestamp: Math.floor(Date.now() / 1000) });
}

// Set up periodic alarm
chrome.alarms.create("gmailSync", { periodInMinutes: POLL_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "gmailSync") syncEmails();
});

// Run immediately on install/startup
chrome.runtime.onInstalled.addListener(() => syncEmails());
chrome.runtime.onStartup.addListener(() => syncEmails());

// Listen for manual sync trigger from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MANUAL_SYNC") {
    syncEmails().then(() => sendResponse({ success: true }));
    return true; // keep channel open for async response
  }
  if (message.type === "CLEAR_BADGE") {
    chrome.action.setBadgeText({ text: "" });
    sendResponse({ success: true });
  }
  if (message.type === "GET_AUTH_TOKEN") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      sendResponse({ token: token || null, error: chrome.runtime.lastError?.message });
    });
    return true;
  }
});
