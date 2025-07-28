// Students management JavaScript
// Updated to work with https://bravetosmart.onrender.com/api/students
const API_BASE_URL = 'https://bravetosmart.onrender.com/api';
let studentsData = [];
let currentEditingStudent = null;

document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;
    initializeStudentsPage();
});

// Authentication functions
function getAuthToken() {
    return localStorage.getItem('authToken');
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDisplayName');
    window.location.href = 'login.html';
}

// API call function with authentication
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = getAuthToken();
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (response.status === 401) {
            logout();
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {}
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Alert function
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.log(`Alert: ${message}`);
        return;
    }
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Utility functions
function setLoading(buttonId, isLoading, loadingText = 'Loading...') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Submit';
    }
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value.trim();
    }
    return data;
}

function initializeStudentsPage() {
    setupEventListeners();
    loadStudents();
}

function setupEventListeners() {
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }

    const editStudentForm = document.getElementById('editStudentForm');
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', handleEditStudent);
    }

    const captureUidBtn = document.getElementById('captureUidBtn');
    if (captureUidBtn) {
        captureUidBtn.addEventListener('click', captureLatestUid);
    }

    const addStudentModal = document.getElementById('addStudentModal');
    if (addStudentModal) {
        addStudentModal.addEventListener('hidden.bs.modal', () => clearForm('addStudentForm'));
    }

    const editStudentModal = document.getElementById('editStudentModal');
    if (editStudentModal) {
        editStudentModal.addEventListener('hidden.bs.modal', () => {
            clearForm('editStudentForm');
            currentEditingStudent = null;
        });
    }
}

// ✅ Fixed: Uses GET /api/students
async function loadStudents() {
    try {
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="spinner-border"></div> Loading students...
                    </td>
                </tr>
            `;
        }

        const response = await apiCall('/students', 'GET');

        studentsData = Array.isArray(response) ? response : response.data || [];
        displayStudents(studentsData);
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('Failed to load students: ' + error.message, 'danger');
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle"></i> Load failed
                    </td>
                </tr>
            `;
        }
    }
}

function displayStudents(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return;

    if (!students.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-users"></i> No students found
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = students.map(s => `
        <tr>
            <td>${escapeHtml(s.name || '')}</td>
            <td>${escapeHtml(s.matricNo || s.matricNumber || '')}</td>
            <td>${escapeHtml(s.email || '')}</td>
            <td>${escapeHtml(s.level || '')}</td>
            <td>${escapeHtml(s.phone || s.phoneNumber || '')}</td>
            <td>${escapeHtml(s.department || '')}</td>
            <td><span class="badge bg-secondary">${escapeHtml(s.uid || 'Not Set')}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editStudent('${s._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteStudent('${s._id}', '${escapeHtml(s.name || '')}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ✅ Fixed: Use POST /api/students/register
async function handleAddStudent(event) {
    event.preventDefault();
    if (!validateForm('addStudentForm')) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    const formData = getFormData('addStudentForm');
    setLoading('saveStudentBtn', true, 'Saving...');
    try {
        // ✅ Fixed: Use /students instead of /register
        const response = await apiCall('/students', 'POST', formData);
        if (response) {
            showAlert('Student added successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
            if (modal) modal.hide();
            await loadStudents();
        } else {
            throw new Error('Failed to add student');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        showAlert('Error adding student: ' + error.message, 'danger');
    } finally {
        setLoading('saveStudentBtn', false, 'Save Student');
    }
}

// ✅ Uses PUT /students/:id
async function handleEditStudent(event) {
    event.preventDefault();
    if (!validateForm('editStudentForm')) {
        showAlert('Please fill all fields correctly.', 'danger');
        return;
    }
    const formData = getFormData('editStudentForm');
    const id = formData.id || currentEditingStudent?._id;
    if (!id) return showAlert('Student ID missing', 'danger');

    setLoading('updateStudentBtn', true, 'Updating...');
    try {
        await apiCall(`/students/${id}`, 'PUT', formData);
        showAlert('Updated successfully!', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('editStudentModal'));
        if (modal) modal.hide();
        await loadStudents();
    } catch (error) {
        showAlert('Update failed: ' + error.message, 'danger');
    } finally {
        setLoading('updateStudentBtn', false, 'Update Student');
    }
}

function editStudent(id) {
    const student = studentsData.find(s => s._id === id);
    if (!student) return showAlert('Not found', 'danger');
    currentEditingStudent = student;
    populateForm('editStudentForm', student);
    new bootstrap.Modal(document.getElementById('editStudentModal')).show();
}

// ✅ Uses DELETE /students/:id
async function deleteStudent(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
        await apiCall(`/students/${id}`, 'DELETE');
        showAlert('Deleted!', 'success');
        await loadStudents();
    } catch (error) {
        showAlert('Delete failed: ' + error.message, 'danger');
    }
}

// ✅ Uses GET /students/get-latest-uid
async function captureLatestUid() {
    const captureBtn = document.getElementById('captureUidBtn');
    const uidField = document.getElementById('uid');
    if (!captureBtn || !uidField) return;

    // Set loading state
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';

    try {
        // Correct endpoint: GET /students/get-latest-uid
        const response = await apiCall('/students/get-latest-uid', 'GET');

        if (response && response.uid) {
            uidField.value = response.uid;
            showAlert('UID captured successfully!', 'success');
        } else {
            showAlert('No UID available. Tap a card to capture.', 'info');
        }
    } catch (error) {
        console.error('Error capturing UID:', error);
        showAlert('Could not capture UID. Please check backend or enter manually.', 'warning');
    } finally {
        // Reset button state
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-sync me-2"></i>Capture Latest UID';
    }
}

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    const req = form.querySelectorAll('[required]');
    for (let f of req) {
        if (!f.value.trim()) {
            f.focus();
            showAlert(`Fill ${f.name || f.id}`, 'danger');
            return false;
        }
        if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) {
            f.focus();
            showAlert('Valid email required', 'danger');
            return false;
        }
    }
    return true;
}

function populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form || !data) return;
    Object.keys(data).forEach(key => {
        let field = form.querySelector(`[name="${key}"]`) || form.querySelector(`#${key}`);
        if (!field && key === 'matricNo') field = form.querySelector('[name="matricNumber"]');
        if (field) field.value = data[key] || '';
    });
    const idField = form.querySelector('[name="id"]') || form.querySelector('#id');
    if (idField) idField.value = data._id || '';
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

// Search & Filter
function searchStudents(q) {
    displayStudents(!q ? studentsData : studentsData.filter(s =>
        s.name?.toLowerCase().includes(q.toLowerCase()) ||
        s.matricNo?.includes(q)
    ));
}

function filterStudentsByLevel(level) {
    displayStudents(level ? studentsData.filter(s => s.level == level) : studentsData);
}

function filterStudentsByDepartment(dept) {
    displayStudents(dept ? studentsData.filter(s => s.department?.toLowerCase().includes(dept.toLowerCase())) : studentsData);
}

// Export CSV
function exportStudentsToCSV() {
    if (!studentsData.length) return showAlert('No data', 'warning');
    const csv = [
        ['Name', 'Matric No', 'Email', 'Level', 'Phone', 'Department', 'UID'],
        ...studentsData.map(s => [
            s.name || '',
            s.matricNo || '',
            s.email || '',
            s.level || '',
            s.phone || '',
            s.department || '',
            s.uid || ''
        ])
    ].map(r => r.map(f => `"${f.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('Exported!', 'success');
}

// Utility
function escapeHtml(s) {
    const m = { '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#039;' };
    return String(s || '').replace(/[&<>"']/g, m => m[m]);
}