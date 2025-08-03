const API_BASE_URL = 'https://bravetosmart.onrender.com/api';

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

async function apiCall(endpoint, method = 'GET', data = null) {
  const token = getAuthToken(); // from auth.js
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (data) config.body = JSON.stringify(data);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'API call failed');
  return json.data || json;
}

async function loadLogs() {
  const tableBody = document.getElementById("logsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr><td colspan="5" class="text-center">
      <div class="spinner-border"></div>
      <p class="mt-2">Loading scan logs...</p>
    </td></tr>`;

  try {
    const data = await apiCall('/logs');
    console.log("✅ Logs loaded:", data);

    if (!Array.isArray(data) || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No logs found</td></tr>`;
      return;
    }

    tableBody.innerHTML = data.map(log => `
      <tr>
        <td>${formatDateTime(log.createdAt)}</td>
        <td>${log.student?.name || 'Unknown'}</td>
        <td>${log.subject || '-'}</td>
        <td>${log.student?.uid || 'N/A'}</td>
        <td>
          <span class="badge bg-${log.status === 'success' ? 'success' : 'danger'}">
            ${log.status || 'N/A'}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("❌ Error loading logs:", err);
    showAlert("Failed to load logs", "danger");
  }
}

async function loadLogsSummary() {
  const summaryContent = document.getElementById("summaryContent");
  if (!summaryContent) return;

  summaryContent.innerHTML = `
    <div class="text-center">
      <div class="spinner-border"></div>
      <p>Loading...</p>
    </div>`;

  try {
    const data = await apiCall('/logs/summary');
    console.log("✅ Summary data:", data);

    summaryContent.innerHTML = `
      <p><strong>Total Logs:</strong> ${data.totalLogs}</p>
      <p><strong>Entry Logs:</strong> ${data.entryCount}</p>
      <p><strong>Exit Logs:</strong> ${data.exitCount}</p>
      <hr />
      <h5>Logs Per Student:</h5>
      <ul class="list-group">
        ${data.logsPerStudent.map(s => `
          <li class="list-group-item d-flex justify-content-between">
            <span>${s.studentName} (${s.matricNo})</span>
            <span class="badge bg-info">${s.scanCount}</span>
          </li>
        `).join('')}
      </ul>`;

    new bootstrap.Modal(document.getElementById('summaryModal')).show();
  } catch (err) {
    console.error("❌ Failed to load summary:", err);
    summaryContent.innerHTML = `<p class="text-danger">Failed to load summary</p>`;
    showAlert("Could not load summary", "danger");
  }
}

function initializeLogsPage() {
  if (!checkAuth()) return;

  const userDisplay = document.getElementById("userDisplayName");
  if (userDisplay) {
    userDisplay.textContent = localStorage.getItem("userDisplayName") || "Admin";
  }

  loadLogs();
}

document.addEventListener("DOMContentLoaded", initializeLogsPage);
