let subjectsData = [];

document.addEventListener('DOMContentLoaded', function () {
  checkAuth();
  initializeSubjectsPage();
});

function initializeSubjectsPage() {
  setupEventListeners();
  loadSubjects();
}

function setupEventListeners() {
  const addSubjectForm = document.getElementById('addSubjectForm');
  if (addSubjectForm) {
    addSubjectForm.addEventListener('submit', handleAddSubject);
  }
}

async function loadSubjects() {
  const tableBody = document.getElementById('subjectsTableBody');

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center">
        <div class="spinner-border" role="status"></div>
        <p>Loading courses...</p>
      </td>
    </tr>
  `;

  try {
    const response = await apiCall('/subjects', 'GET');
    if (Array.isArray(response)) {
      subjectsData = response;
      displaySubjects(subjectsData);
    } else {
      throw new Error('Unexpected format');
    }
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading courses</td></tr>`;
    showAlert(error.message, 'danger');
  }
}

function displaySubjects(subjects) {
  const tableBody = document.getElementById('subjectsTableBody');

  if (!subjects.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="fas fa-book me-2"></i>No courses found
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = subjects.map(sub => `
    <tr>
      <td><strong>${escapeHtml(sub.code)}</strong></td>
      <td>${escapeHtml(sub.name)}</td>
      <td>—</td> <!-- Level not available -->
      <td>—</td> <!-- Credit Units not available -->
      <td>—</td> <!-- Semester not available -->
      <td>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteSubject('${sub._id}', '${sub.name}')">
          <i class="fas fa-trash me-1"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleAddSubject(e) {
  e.preventDefault();

  const form = document.getElementById('addSubjectForm');
  const formData = getFormData('addSubjectForm');

  if (!formData.code || !formData.name) {
    showAlert('Please fill in all required fields.', 'warning');
    return;
  }

  try {
    setLoading('saveSubjectBtn', true);

    const res = await apiCall('/subjects/create', 'POST', formData);
    if (res && res._id) {
      showAlert('Course added successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
      loadSubjects();
    } else {
      throw new Error('Failed to add subject.');
    }

  } catch (err) {
    showAlert(err.message, 'danger');
  } finally {
    setLoading('saveSubjectBtn', false);
  }
}

async function deleteSubject(id, name) {
  if (!confirm(`Delete ${name}? This action cannot be undone.`)) return;

  try {
    const res = await apiCall(`/subjects/${id}`, 'DELETE');
    if (res.success) {
      showAlert('Course deleted successfully.', 'success');
      loadSubjects();
    } else {
      throw new Error(res.message || 'Failed to delete.');
    }
  } catch (err) {
    showAlert(err.message, 'danger');
  }
}

// 🔧 Utils
function getFormData(formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

async function apiCall(endpoint, method = 'GET', data = null) {
  const url = `https://bravetosmart.onrender.com/api${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  return await res.json();
}

function escapeHtml(text) {
  return text?.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) || '';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = loading;
}

function showAlert(msg, type = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) return;
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${msg}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  container.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}
