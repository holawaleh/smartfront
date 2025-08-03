document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  initializeLogsPage();
});

function initializeLogsPage() {
  document.getElementById("userDisplayName").textContent =
    localStorage.getItem("userDisplayName") || "Admin";
  loadLogs();
}

async function loadLogs() {
  const tableBody = document.getElementById("logsTableBody");
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted">
        <div class="spinner-border" role="status"></div>
        <p class="mt-2">Loading scan logs...</p>
      </td>
    </tr>`;

  try {
    const logs = await apiCall("/logs");
    tableBody.innerHTML = "";

    if (!logs.length) {
      tableBody.innerHTML = `
        <tr><td colspan="5" class="text-center text-muted">No logs found</td></tr>
      `;
      return;
    }

    logs.forEach(log => {
      const row = document.createElement("tr");

      const timestamp = formatDateTime(log.createdAt);
      const name = log.student?.name || "Unknown";
      const subject = log.subject || "—";
      const uid = log.uid || "—";
      const status = log.status || "—";

      row.innerHTML = `
        <td>${timestamp}</td>
        <td>${name}</td>
        <td>${subject}</td>
        <td>${uid}</td>
        <td><span class="badge bg-${status === 'success' ? 'success' : 'danger'}">${status}</span></td>
      `;

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading logs:", err);
    showAlert("Failed to load logs", "danger");
    tableBody.innerHTML = `
      <tr><td colspan="5" class="text-center text-danger">Failed to load logs</td></tr>
    `;
  }
}

// Optional: Reuse global auth helpers
function checkAuth() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function showAlert(message, type = "info") {
  const container = document.getElementById("alertContainer");
  const alert = document.createElement("div");
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  container.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return date.toLocaleString();
}
