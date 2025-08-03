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
  try {
    const res = await apiCall("/logs");
    const logs = Array.isArray(res) ? res : (res?.data || []);

    const tableBody = document.querySelector("#logsTable tbody");
    tableBody.innerHTML = "";

    if (logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No logs found</td></tr>`;
      return;
    }

    logs.forEach((log, index) => {
      const row = document.createElement("tr");

      const studentName = log.student?.name || "N/A";
      const matricNo = log.student?.matricNo || "N/A";
      const action = log.action || "—";
      const status = log.status || "—";
      const time = formatDateTime(log.createdAt);
      const user = log.user?.username || "System";

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${studentName}</td>
        <td>${matricNo}</td>
        <td>${action}</td>
        <td><span class="badge bg-${status === 'success' ? 'success' : 'danger'}">${status}</span></td>
        <td>${time}</td>
        <td>${user}</td>
      `;

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading logs:", err);
    showAlert("Failed to load logs", "danger");
  }
}

// Helper functions (assuming these are available globally or imported)
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
  if (!timestamp) return "Unknown";
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return then.toLocaleString();
}
