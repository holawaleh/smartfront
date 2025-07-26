// Students management JavaScript

let studentsData = [];
let currentEditingStudent = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeStudentsPage();
});

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
        
        const response = await apiCall('/students', 'GET');
        
        if (response.success) {
            studentsData = response.data || [];
            displayStudents(studentsData);
        } else {
            throw new Error(response.error || 'Failed to load students');
        }
        
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('Error loading students: ' + error.message, 'danger');
        
        document.getElementById('studentsTableBody').innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading students
                </td>
            </tr>
        `;
    }
}

function displayStudents(students) {
    const tableBody = document.getElementById('studentsTableBody');
    
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
            <td>${escapeHtml(student.matricNo || '')}</td>
            <td>${escapeHtml(student.email || '')}</td>
            <td>${escapeHtml(student.level || '')}</td>
            <td>${escapeHtml(student.phone || '')}</td>
            <td>${escapeHtml(student.department || '')}</td>
            <td>
                <span class="badge bg-secondary">
                    ${escapeHtml(student.uid || 'Not Set')}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary" 
                            onclick="editStudent('${student.id}')" 
                            title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" 
                            onclick="deleteStudent('${student.id}', '${escapeHtml(student.name)}')" 
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
    const saveBtn = document.getElementById('saveStudentBtn');
    const saveSpinner = document.getElementById('saveSpinner');
    
    setLoading('saveStudentBtn', true);
    saveSpinner.classList.remove('d-none');
    
    try {
        const response = await apiCall('/students', 'POST', formData);
        
        if (response.success) {
            showAlert('Student added successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
            modal.hide();
            
            // Reload students
            await loadStudents();
            
        } else {
            throw new Error(response.error || 'Failed to add student');
        }
        
    } catch (error) {
        console.error('Error adding student:', error);
        showAlert('Error adding student: ' + error.message, 'danger');
    } finally {
        setLoading('saveStudentBtn', false);
        saveSpinner.classList.add('d-none');
    }
}

async function handleEditStudent(event) {
    event.preventDefault();
    
    if (!validateForm('editStudentForm')) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    
    const formData = getFormData('editStudentForm');
    const studentId = formData.id;
    
    const updateBtn = document.getElementById('updateStudentBtn');
    const updateSpinner = document.getElementById('updateSpinner');
    
    setLoading('updateStudentBtn', true);
    updateSpinner.classList.remove('d-none');
    
    try {
        const response = await apiCall(`/students/${studentId}`, 'PUT', formData);
        
        if (response.success) {
            showAlert('Student updated successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editStudentModal'));
            modal.hide();
            
            // Reload students
            await loadStudents();
            
        } else {
            throw new Error(response.error || 'Failed to update student');
        }
        
    } catch (error) {
        console.error('Error updating student:', error);
        showAlert('Error updating student: ' + error.message, 'danger');
    } finally {
        setLoading('updateStudentBtn', false);
        updateSpinner.classList.add('d-none');
    }
}

function editStudent(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) {
        showAlert('Student not found!', 'danger');
        return;
    }
    
    currentEditingStudent = student;
    
    // Populate edit form
    populateForm('editStudentForm', student);
    
    // Show edit modal
    const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
    modal.show();
}

async function deleteStudent(studentId, studentName) {
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/students/${studentId}`, 'DELETE');
        
        if (response.success) {
            showAlert('Student deleted successfully!', 'success');
            await loadStudents();
        } else {
            throw new Error(response.error || 'Failed to delete student');
        }
        
    } catch (error) {
        console.error('Error deleting student:', error);
        showAlert('Error deleting student: ' + error.message, 'danger');
    }
}

async function captureLatestUid() {
    const captureBtn = document.getElementById('captureUidBtn');
    const uidField = document.getElementById('uid');
    
    // Set loading state
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';
    
    try {
        // Try the endpoint you mentioned for getting latest UID
        const response = await apiCall('/get-latest-uid', 'GET', null, false);
        
        if (response.success && response.data && response.data.uid) {
            uidField.value = response.data.uid;
            showAlert('UID captured successfully!', 'success');
        } else {
            // If that doesn't work, generate a temporary UID for testing
            const tempUid = 'UID' + Date.now().toString().slice(-8);
            uidField.value = tempUid;
            showAlert('Generated temporary UID for testing. Please ensure your hardware is connected.', 'warning');
        }
        
    } catch (error) {
        console.error('Error capturing UID:', error);
        // Generate a temporary UID for testing
        const tempUid = 'UID' + Date.now().toString().slice(-8);
        uidField.value = tempUid;
        showAlert('Could not connect to UID hardware. Generated temporary UID for testing.', 'warning');
    } finally {
        // Reset button state
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-sync me-2"></i>Capture Latest UID';
    }
}

// Search and filter functions
function searchStudents(searchTerm) {
    const filteredStudents = studentsData.filter(student => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (student.name && student.name.toLowerCase().includes(searchLower)) ||
            (student.matricNo && student.matricNo.toLowerCase().includes(searchLower)) ||
            (student.email && student.email.toLowerCase().includes(searchLower)) ||
            (student.department && student.department.toLowerCase().includes(searchLower))
        );
    });
    
    displayStudents(filteredStudents);
}

function filterStudentsByLevel(level) {
    if (!level) {
        displayStudents(studentsData);
        return;
    }
    
    const filteredStudents = studentsData.filter(student => student.level === level);
    displayStudents(filteredStudents);
}

function filterStudentsByDepartment(department) {
    if (!department) {
        displayStudents(studentsData);
        return;
    }
    
    const filteredStudents = studentsData.filter(student => 
        student.department && student.department.toLowerCase().includes(department.toLowerCase())
    );
    displayStudents(filteredStudents);
}

// Export functions
function exportStudentsToCSV() {
    if (!studentsData || studentsData.length === 0) {
        showAlert('No students data to export.', 'warning');
        return;
    }
    
    const csvHeaders = ['Name', 'Matric No', 'Email', 'Level', 'Phone', 'Department', 'UID'];
    const csvRows = studentsData.map(student => [
        student.name || '',
        student.matricNo || '',
        student.email || '',
        student.level || '',
        student.phone || '',
        student.department || '',
        student.uid || ''
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showAlert('Students data exported successfully!', 'success');
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}
