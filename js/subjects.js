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

    const addSubjectModal = document.getElementById('addSubjectModal');
    if (addSubjectModal) {
        addSubjectModal.addEventListener('hidden.bs.modal', () => clearForm('addSubjectForm'));
    }
}

async function loadSubjects() {
    const tableBody = document.getElementById('subjectsTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <div class="spinner-border" role="status"></div>
                <p class="mt-2">Loading subjects...</p>
            </td>
        </tr>
    `;

    try {
        const response = await apiCall('/subjects', 'GET');

        if (Array.isArray(response)) {
            subjectsData = response;
            displaySubjects(subjectsData);
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (err) {
        console.error(err);
        showAlert('Failed to load subjects.', 'danger');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Could not load subjects.
                </td>
            </tr>
        `;
    }
}

function displaySubjects(subjects) {
    const tableBody = document.getElementById('subjectsTableBody');

    if (!subjects || subjects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-book me-2"></i>No courses available.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = subjects.map(subject => `
        <tr>
            <td><strong>${escapeHtml(subject.code)}</strong></td>
            <td>${escapeHtml(subject.name)}</td>
            <td><span class="badge bg-info">${subject.creditUnits} ${subject.creditUnits == 1 ? 'Unit' : 'Units'}</span></td>
            <td><span class="badge bg-secondary">${subject.level}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSubject('${subject.id}', '${escapeHtml(subject.name)}')">
                    <i class="fas fa-trash me-1"></i>Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleAddSubject(e) {
    e.preventDefault();

    if (!validateForm('addSubjectForm')) {
        showAlert('Please complete all fields.', 'warning');
        return;
    }

    const formData = getFormData('addSubjectForm');
    const btn = document.getElementById('saveSubjectBtn');
    const spinner = document.getElementById('saveSpinner');

    if (!isValidSubjectCode(formData.code)) {
        showAlert('Course code must be like CSC101, MTH201.', 'danger');
        return;
    }

    setLoading('saveSubjectBtn', true);
    spinner.classList.remove('d-none');

    try {
        const response = await apiCall('/subjects', 'POST', formData);
        if (response.success) {
            showAlert('Course added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
            await loadSubjects();
        } else {
            throw new Error(response.error || 'Failed to add subject');
        }
    } catch (err) {
        showAlert('Error: ' + err.message, 'danger');
    } finally {
        setLoading('saveSubjectBtn', false);
        spinner.classList.add('d-none');
    }
}

async function deleteSubject(subjectId, name) {
    if (!confirm(`Delete course "${name}"? This cannot be undone.`)) return;

    try {
        const response = await apiCall(`/subjects/${subjectId}`, 'DELETE');
        if (response.success) {
            showAlert('Course deleted.', 'success');
            await loadSubjects();
        } else {
            throw new Error(response.error || 'Delete failed');
        }
    } catch (err) {
        showAlert('Delete error: ' + err.message, 'danger');
    }
}

function isValidSubjectCode(code) {
    return /^[A-Z]{2,4}\d{3}$/.test(code.trim().toUpperCase());
}

// Search & Filter
function searchSubjects(term) {
    const s = term.toLowerCase();
    const filtered = subjectsData.filter(sub =>
        sub.code?.toLowerCase().includes(s) ||
        sub.name?.toLowerCase().includes(s)
    );
    displaySubjects(filtered);
}

function filterSubjectsByLevel(level) {
    if (!level) return displaySubjects(subjectsData);
    const filtered = subjectsData.filter(sub => sub.level == level);
    displaySubjects(filtered);
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;'
    };
    return text?.replace(/[&<>"']/g, m => map[m]) || '';
}

// ✅ Helper functions you should include globally
function getFormData(formId) {
    const form = document.getElementById(formId);
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
}

function validateForm(formId) {
    const form = document.getElementById(formId);
    return form.checkValidity();
}

function clearForm(formId) {
    document.getElementById(formId).reset();
}

function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    btn.disabled = isLoading;
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer') || document.body;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

async function apiCall(path, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        }
    };
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`https://bravetosmart.onrender.com${path}`, options);
    return await response.json();
}
