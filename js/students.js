// Students management JavaScript
// Updated to work with https://bravetosmart.onrender.com/api/
// Configuration
const API_BASE_URL = 'https://bravetosmart.onrender.com/api';
let studentsData = [];
let currentEditingStudent = null;

document.addEventListener('DOMContentLoaded', function() {
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
    // Set up event listeners
    setupEventListeners();
    // Load students data
    loadStudents();
}

function setupEventListeners() {
    // Add student form
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }
    // Edit student form
    const editStudentForm = document.getElementById('editStudentForm');
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', handleEditStudent);
    }
    // Capture UID button
    const captureUidBtn = document.getElementById('captureUidBtn');
    if (captureUidBtn) {
        captureUidBtn.addEventListener('click', captureLatestUid);
    }
    // Modal events
    const addStudentModal = document.getElementById('addStudentModal');
    if (addStudentModal) {
        addStudentModal.addEventListener('hidden.bs.modal', function() {
            clearForm('addStudentForm');
        });
    }
    const editStudentModal = document.getElementById('editStudentModal');
    if (editStudentModal) {
        editStudentModal.addEventListener('hidden.bs.modal', function() {
            clearForm('editStudentForm');
            currentEditingStudent = null;
        });
    }
}

async function loadStudents() {
    try {
        const tableBody = document.getElementById('studentsTableBody');
        // Show loading state
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading students...</p>
                    </td>
                </tr>
            `;
        }
        // Call the real API
        const response = await apiCall('/students');
        if (response) {
            studentsData = response.data || response || [];
            displayStudents(studentsData);
        } else {
            throw new Error('Failed to load students');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('Error loading students: ' + error.message, 'danger');
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error loading students: ${error.message}
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

async function handleAddStudent(event) {
    event.preventDefault();
    if (!validateForm('addStudentForm')) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    const formData = getFormData('addStudentForm');
    setLoading('saveStudentBtn', true, 'Saving...');
    try {
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
            throw new Error('Failed to update student');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showAlert('Error updating student: ' + error.message, 'danger');
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

async function deleteStudent(studentId, studentName) {
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
        return;
    }
    try {
        const response = await apiCall(`/students/${studentId}`, 'DELETE');
        if (response) {
            showAlert('Student deleted successfully!', 'success');
            await loadStudents();
        } else {
            throw new Error('Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showAlert('Error deleting student: ' + error.message, 'danger');
    }
}

/**
 * ✅ Corrected: Capture the latest UID from the backend
 * Uses GET /students/get-latest-uid to retrieve the last scanned UID
 */
async function captureLatestUid() {
    const captureBtn = document.getElementById('captureUidBtn');
    const uidField = document.getElementById('uid');
    if (!captureBtn || !uidField) return;

    // Set loading state
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';

    try {
        // ✅ Correct endpoint: GET /students/get-latest-uid
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

// Form validation and utility functions
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    const requiredFields = form.querySelectorAll('[required]');
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            const fieldName = field.getAttribute('name') || field.getAttribute('id') || 'required';
            showAlert(`Please fill in the ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`, 'danger');
            return false;
        }
        // Email validation
        if (field.type === 'email' && field.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value.trim())) {
                field.focus();
                showAlert('Please enter a valid email address.', 'danger');
                return false;
            }
        }
        // Phone validation (basic)
        if ((field.name === 'phone' || field.name === 'phoneNumber') && field.value.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
            if (!phoneRegex.test(field.value.trim())) {
                field.focus();
                showAlert('Please enter a valid phone number.', 'danger');
                return false;
            }
        }
    }
    return true;
}

function populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form || !data) return;
    Object.keys(data).forEach(key => {
        let field = form.querySelector(`[name="${key}"]`) || 
                   form.querySelector(`#${key}`) ||
                   form.querySelector(`[name="${key.toLowerCase()}"]`) ||
                   form.querySelector(`#${key.toLowerCase()}`);
        
        // Handle common variations
        if (!field) {
            const variations = {
                'matricNo': ['matricNumber', 'matric_no', 'matric_number'],
                'phoneNumber': ['phone', 'phone_number'],
                'matricNumber': ['matricNo', 'matric_no', 'matric_number']
            };
            if (variations[key]) {
                for (let variation of variations[key]) {
                    field = form.querySelector(`[name="${variation}"]`) || form.querySelector(`#${variation}`);
                    if (field) break;
                }
            }
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
        const fields = form.querySelectorAll('.is-invalid, .is-valid');
        fields.forEach(field => field.classList.remove('is-invalid', 'is-valid'));
    }
}

// Search and filter functions
function searchStudents(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) {
        displayStudents(studentsData);
        return;
    }
    const filtered = studentsData.filter(student => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (student.name && student.name.toLowerCase().includes(searchLower)) ||
            (student.matricNo && student.matricNo.toLowerCase().includes(searchLower)) ||
            (student.matricNumber && student.matricNumber.toLowerCase().includes(searchLower)) ||
            (student.email && student.email.toLowerCase().includes(searchLower)) ||
            (student.department && student.department.toLowerCase().includes(searchLower)) ||
            (student.phone && student.phone.includes(searchTerm)) ||
            (student.phoneNumber && student.phoneNumber.includes(searchTerm))
        );
    });
    displayStudents(filtered);
}

function filterStudentsByLevel(level) {
    if (!level) {
        displayStudents(studentsData);
        return;
    }
    const filtered = studentsData.filter(s => s.level && s.level.toString() === level.toString());
    displayStudents(filtered);
}

function filterStudentsByDepartment(department) {
    if (!department) {
        displayStudents(studentsData);
        return;
    }
    const filtered = studentsData.filter(s => 
        s.department && s.department.toLowerCase().includes(department.toLowerCase())
    );
    displayStudents(filtered);
}

// Export to CSV
function exportStudentsToCSV() {
    if (!studentsData || studentsData.length === 0) {
        showAlert('No students data to export.', 'warning');
        return;
    }
    try {
        const csvHeaders = ['Name', 'Matric No', 'Email', 'Level', 'Phone', 'Department', 'UID'];
        const csvRows = studentsData.map(s => [
            s.name || '',
            s.matricNo || s.matricNumber || '',
            s.email || '',
            s.level || '',
            s.phone || s.phoneNumber || '',
            s.department || '',
            s.uid || ''
        ]);
        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showAlert('Students data exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showAlert('Error exporting data: ' + error.message, 'danger');
    }
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '<',
        '>': '>',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Additional helpers
function refreshStudents() {
    loadStudents();
}

function getStudentById(studentId) {
    return studentsData.find(s => (s._id || s.id) === studentId);
}

async function bulkDeleteStudents(studentIds) {
    if (!studentIds || studentIds.length === 0) return;
    if (!confirm(`Delete ${studentIds.length} student(s)? This cannot be undone.`)) return;
    try {
        const promises = studentIds.map(id => apiCall(`/students/${id}`, 'DELETE'));
        await Promise.all(promises);
        showAlert(`${studentIds.length} student(s) deleted!`, 'success');
        await loadStudents();
    } catch (error) {
        console.error('Bulk delete error:', error);
        showAlert('Error deleting students: ' + error.message, 'danger');
    }
}