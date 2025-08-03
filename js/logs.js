const API_BASE_URL = 'https://bravetosmart.onrender.com/api';
const TOKEN_KEY = 'authToken';

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('userDisplayName');
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
}

function showAlert(message, type = "info") {
  const container = document.getElementById("alertContainer");
  if (!container) return;
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
  const date = new Date(timestamp);
  return date.toLocaleString();
}

async function apiCall(endpoint, method = 'GET', data = null) {
  const token = getAuthToken();
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || 'API call failed');
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
    console.error("Error loading logs:", err);
    showAlert("Failed to load logs", "danger");
  }
}

async function loadLogsSummary() {
  const summaryContent = document.getElementById("summaryContent");
  if (!summaryContent) return;
  summaryContent.innerHTML = `<div class="text-center"><div class="spinner-border"></div><p>Loading...</p></div>`;

  try {
    const data = await apiCall('/logs/summary');

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
      </ul>
    `;

    // Show modal
    const summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));
    summaryModal.show();
  } catch (err) {
    summaryContent.innerHTML = `<p class="text-danger">Failed to load summary</p>`;
    showAlert("Could not load summary", "danger");
  }
}

function initializeLogsPage() {
  if (!checkAuth()) return;
  document.getElementById("userDisplayName").textContent =
    localStorage.getItem("userDisplayName") || "Admin";
  loadLogs();
}

document.addEventListener("DOMContentLoaded", initializeLogsPage);
