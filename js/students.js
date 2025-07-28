// Students management JavaScript
// Updated to work with https://bravetosmart.onrender.com/api/
// Configuration
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
        method: method,
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
            // Token expired or invalid
            logout();
            return null;
        }
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Ignore
            }
            throw new Error(errorMessage);
        }
        const result = await response.json();
        return result;
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
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Utility functions
function setLoading(buttonId, isLoading, loadingText = 'Loading...') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>${loadingText}`;
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
        addStudentModal.addEventListener('hidden.bs.modal', () => {
            clearForm('addStudentForm');
        });
    }

    const editStudentModal = document.getElementById('editStudentModal');
    if (editStudentModal) {
        editStudentModal.addEventListener('hidden.bs.modal', () => {
            clearForm('editStudentForm');
            currentEditingStudent = null;
        });
    }
}

// ✅ Fixed: Use GET / to load all students
async function loadStudents() {
    try {
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="spinner-border" role="status"></div>
                        <p class="mt-2">Loading students...</p>
                    </td>
                </tr>
            `;
        }

        // ✅ Correct endpoint: GET /
        const response = await apiCall('/', 'GET');

        if (Array.isArray(response)) {
            studentsData = response;
        } else if (response && Array.isArray(response.data)) {
            studentsData = response.data;
        } else if (response?.students && Array.isArray(response.students)) {
            studentsData = response.students;
        } else {
            throw new Error('Invalid data format from server');
        }

        displayStudents(studentsData);
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('Failed to load students: ' + error.message, 'danger');
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Load failed: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

function displayStudents(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return;

    if (!students || students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-users me-2"></i>
                    No students found
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = students.map(student => `
        <tr>
            <td>${escapeHtml(student.name || '')}</td>
            <td>${escapeHtml(student.matricNo || student.matricNumber || '')}</td>
            <td>${escapeHtml(student.email || '')}</td>
            <td>${escapeHtml(student.level || '')}</td>
            <td>${escapeHtml(student.phone || student.phoneNumber || '')}</td>
            <td>${escapeHtml(student.department || '')}</td>
            <td>
                <span class="badge bg-secondary">
                    ${escapeHtml(student.uid || 'Not Set')}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary" 
                            onclick="editStudent('${student._id || student.id}')" 
                            title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" 
                            onclick="deleteStudent('${student._id || student.id}', '${escapeHtml(student.name || '')}')" 
                            title="Delete Student">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ✅ Uses POST /register
async function handleAddStudent(event) {
    event.preventDefault();
    if (!validateForm('addStudentForm')) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    const formData = getFormData('addStudentForm');
    setLoading('saveStudentBtn', true, 'Saving...');

    try {
        const response = await apiCall('/register', 'POST', formData);
        if (response) {
            showAlert('Student registered successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
            if (modal) modal.hide();
            await loadStudents();
        } else {
            throw new Error('Registration failed');
        }
    } catch (error) {
        console.error('Error registering student:', error);
        showAlert('Error: ' + error.message, 'danger');
    } finally {
        setLoading('saveStudentBtn', false, 'Save Student');
    }
}

// ✅ Uses PUT /students/:id (ensure backend supports this)
async function handleEditStudent(event) {
    event.preventDefault();
    if (!validateForm('editStudentForm')) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    const formData = getFormData('editStudentForm');
    const studentId = formData.id || currentEditingStudent?._id || currentEditingStudent?.id;
    if (!studentId) {
        showAlert('Student ID not found', 'danger');
        return;
    }

    setLoading('updateStudentBtn', true, 'Updating...');
    try {
        const response = await apiCall(`/students/${studentId}`, 'PUT', formData);
        if (response) {
            showAlert('Student updated successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editStudentModal'));
            if (modal) modal.hide();
            await loadStudents();
        } else {
            throw new Error('Update failed');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showAlert('Update failed: ' + error.message, 'danger');
    } finally {
        setLoading('updateStudentBtn', false, 'Update Student');
    }
}

function editStudent(studentId) {
    const student = studentsData.find(s => (s._id || s.id) === studentId);
    if (!student) {
        showAlert('Student not found!', 'danger');
        return;
    }
    currentEditingStudent = student;
    populateForm('editStudentForm', student);
    const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
    modal.show();
}

// ✅ Uses DELETE /students/:id (ensure backend supports this)
async function deleteStudent(studentId, studentName) {
    if (!confirm(`Delete "${studentName}"? This cannot be undone.`)) return;
    try {
        const response = await apiCall(`/students/${studentId}`, 'DELETE');
        if (response) {
            showAlert('Student deleted!', 'success');
            await loadStudents();
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showAlert('Delete failed: ' + error.message, 'danger');
    }
}

// ✅ Correct: GET /students/get-latest-uid
async function captureLatestUid() {
    const captureBtn = document.getElementById('captureUidBtn');
    const uidField = document.getElementById('uid');
    if (!captureBtn || !uidField) return;

    captureBtn.disabled = true;
    captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';

    try {
        const response = await apiCall('/students/get-latest-uid', 'GET');
        if (response && response.uid) {
            uidField.value = response.uid;
            showAlert('UID captured: ' + response.uid, 'success');
        } else {
            showAlert('No UID available. Tap a card.', 'info');
        }
    } catch (error) {
        console.error('Error capturing UID:', error);
        showAlert('Failed to get UID. Check connection.', 'warning');
    } finally {
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-sync me-2"></i>Capture Latest UID';
    }
}

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    const requiredFields = form.querySelectorAll('[required]');
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            const name = field.getAttribute('name') || field.id || 'this field';
            showAlert(`Please fill in ${name}.`, 'danger');
            return false;
        }
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
            field.focus();
            showAlert('Enter a valid email.', 'danger');
            return false;
        }
        if ((field.name === 'phone' || field.name === 'phoneNumber') && !/^[\d\s\-\+\(\)]{10,}$/.test(field.value.trim())) {
            field.focus();
            showAlert('Enter a valid phone number.', 'danger');
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
        if (!field && key === 'matricNo') {
            field = form.querySelector('[name="matricNumber"]') || form.querySelector('#matricNumber');
        } else if (!field && key === 'phoneNumber') {
            field = form.querySelector('[name="phone"]') || form.querySelector('#phone');
        }
        if (field) field.value = data[key] || '';
    });
    const idField = form.querySelector('[name="id"]') || form.querySelector('#id');
    if (idField) idField.value = data._id || data.id || '';
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        form.querySelectorAll('.is-invalid, .is-valid').forEach(f => f.classList.remove('is-invalid', 'is-valid'));
    }
}

// Search & Filter
function searchStudents(term) {
    if (!term) return displayStudents(studentsData);
    const filtered = studentsData.filter(s =>
        (s.name || '').toLowerCase().includes(term.toLowerCase()) ||
        (s.matricNo || '').includes(term) ||
        (s.email || '').toLowerCase().includes(term.toLowerCase())
    );
    displayStudents(filtered);
}

function filterStudentsByLevel(level) {
    displayStudents(level ? studentsData.filter(s => s.level == level) : studentsData);
}

function filterStudentsByDepartment(dept) {
    displayStudents(dept ? studentsData.filter(s => (s.department || '').toLowerCase().includes(dept.toLowerCase())) : studentsData);
}

// Export to CSV
function exportStudentsToCSV() {
    if (!studentsData.length) return showAlert('No data to export.', 'warning');
    const headers = ['Name', 'Matric No', 'Email', 'Level', 'Phone', 'Department', 'UID'];
    const rows = studentsData.map(s => [
        s.name || '',
        s.matricNo || '',
        s.email || '',
        s.level || '',
        s.phone || '',
        s.department || '',
        s.uid || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${f.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('Exported successfully!', 'success');
}

// Utility
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#039;' };
    return text?.toString().replace(/[&<>"']/g, m => map[m]) || '';
}

// Helpers
function refreshStudents() { loadStudents(); }
function getStudentById(id) { return studentsData.find(s => s._id === id); }
async function bulkDelete(ids) {
    if (!ids.length || !confirm(`Delete ${ids.length} student(s)?`)) return;
    try {
        await Promise.all(ids.map(id => apiCall(`/students/${id}`, 'DELETE')));
        showAlert('Deleted!', 'success');
        await loadStudents();
    } catch (e) {
        showAlert('Bulk delete failed: ' + e.message, 'danger');
    }
}