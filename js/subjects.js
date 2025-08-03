// Subjects management JavaScript

let subjectsData = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeSubjectsPage();
});

function initializeSubjectsPage() {
    // Set up event listeners
    setupEventListeners();
    
    // Load subjects data
    loadSubjects();
}

function setupEventListeners() {
    // Add subject form
    const addSubjectForm = document.getElementById('addSubjectForm');
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', handleAddSubject);
    }
    
    // Modal events
    const addSubjectModal = document.getElementById('addSubjectModal');
    if (addSubjectModal) {
        addSubjectModal.addEventListener('hidden.bs.modal', function() {
            clearForm('addSubjectForm');
        });
    }
}

async function loadSubjects() {
    try {
        const tableBody = document.getElementById('subjectsTableBody');
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading subjects...</p>
                </td>
            </tr>
        `;
        
        const response = await apiCall('/subjects', 'GET');

// If response is an array, we assume it is the list of subjects
if (Array.isArray(response)) {
    subjectsData = response;
    displaySubjects(subjectsData);
} else {
    throw new Error('Unexpected response format while loading subjects');
}

        
    } catch (error) {
        console.error('Error loading subjects:', error);
        showAlert('Error loading subjects: ' + error.message, 'danger');
        
        document.getElementById('subjectsTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading subjects
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
                    <i class="fas fa-book me-2"></i>
                    No subjects found
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = subjects.map(subject => `
        <tr>
            <td>
                <strong>${escapeHtml(subject.code || '')}</strong>
            </td>
            <td>${escapeHtml(subject.name || '')}</td>
            <td>
                <span class="badge bg-info">
                    ${subject.creditUnits || 0} ${(subject.creditUnits || 0) === 1 ? 'Unit' : 'Units'}
                </span>
            </td>
            <td>${escapeHtml(subject.department || '')}</td>
            <td>
                <span class="badge bg-secondary">
                    ${subject.level || ''} Level
                </span>
            </td>
            <td>
                <button type="button" class="btn btn-outline-danger btn-sm" 
                        onclick="deleteSubject('${subject.id}', '${escapeHtml(subject.name)}')" 
                        title="Delete Subject">
                    <i class="fas fa-trash me-1"></i>
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleAddSubject(event) {
    event.preventDefault();
    
    if (!validateForm('addSubjectForm')) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    
    const formData = getFormData('addSubjectForm');
    const saveBtn = document.getElementById('saveSubjectBtn');
    const saveSpinner = document.getElementById('saveSpinner');
    
    // Validate subject code format
    if (!isValidSubjectCode(formData.code)) {
        showAlert('Subject code should be in format like CSC101, MTH201, etc.', 'danger');
        return;
    }
    
    setLoading('saveSubjectBtn', true);
    saveSpinner.classList.remove('d-none');
    
    try {
        const response = await apiCall('/subjects', 'POST', formData);
        
        if (response.success) {
            showAlert('Subject added successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addSubjectModal'));
            modal.hide();
            
            // Reload subjects
            await loadSubjects();
            
        } else {
            throw new Error(response.error || 'Failed to add subject');
        }
        
    } catch (error) {
        console.error('Error adding subject:', error);
        showAlert('Error adding subject: ' + error.message, 'danger');
    } finally {
        setLoading('saveSubjectBtn', false);
        saveSpinner.classList.add('d-none');
    }
}

async function deleteSubject(subjectId, subjectName) {
    if (!confirm(`Are you sure you want to delete subject "${subjectName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/subjects/${subjectId}`, 'DELETE');
        
        if (response.success) {
            showAlert('Subject deleted successfully!', 'success');
            await loadSubjects();
        } else {
            throw new Error(response.error || 'Failed to delete subject');
        }
        
    } catch (error) {
        console.error('Error deleting subject:', error);
        showAlert('Error deleting subject: ' + error.message, 'danger');
    }
}

// Validation functions
function isValidSubjectCode(code) {
    // Subject code should be like CSC101, MTH201, etc.
    const codeRegex = /^[A-Z]{2,4}\d{3}$/;
    return codeRegex.test(code.toUpperCase());
}

// Search and filter functions
function searchSubjects(searchTerm) {
    const filteredSubjects = subjectsData.filter(subject => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (subject.code && subject.code.toLowerCase().includes(searchLower)) ||
            (subject.name && subject.name.toLowerCase().includes(searchLower)) ||
            (subject.department && subject.department.toLowerCase().includes(searchLower))
        );
    });
    
    displaySubjects(filteredSubjects);
}

function filterSubjectsByLevel(level) {
    if (!level) {
        displaySubjects(subjectsData);
        return;
    }
    
    const filteredSubjects = subjectsData.filter(subject => subject.level === level);
    displaySubjects(filteredSubjects);
}

function filterSubjectsByDepartment(department) {
    if (!department) {
        displaySubjects(subjectsData);
        return;
    }
    
    const filteredSubjects = subjectsData.filter(subject => 
        subject.department && subject.department.toLowerCase().includes(department.toLowerCase())
    );
    displaySubjects(filteredSubjects);
}

function filterSubjectsByCreditUnits(creditUnits) {
    if (!creditUnits) {
        displaySubjects(subjectsData);
        return;
    }
    
    const filteredSubjects = subjectsData.filter(subject => 
        subject.creditUnits == creditUnits
    );
    displaySubjects(filteredSubjects);
}

// Statistics functions
function getSubjectsStatistics() {
    if (!subjectsData || subjectsData.length === 0) {
        return {
            totalSubjects: 0,
            totalCreditUnits: 0,
            departmentCount: 0,
            levelDistribution: {}
        };
    }
    
    const stats = {
        totalSubjects: subjectsData.length,
        totalCreditUnits: subjectsData.reduce((sum, subject) => sum + (subject.creditUnits || 0), 0),
        departmentCount: new Set(subjectsData.map(s => s.department)).size,
        levelDistribution: {}
    };
    
    // Calculate level distribution
    subjectsData.forEach(subject => {
        const level = subject.level || 'Unknown';
        stats.levelDistribution[level] = (stats.levelDistribution[level] || 0) + 1;
    });
    
    return stats;
}

function displaySubjectsStatistics() {
    const stats = getSubjectsStatistics();
    
    const statsHtml = `
        <div class="row">
            <div class="col-md-3">
                <div class="text-center">
                    <h4 class="text-primary">${stats.totalSubjects}</h4>
                    <p class="mb-0">Total Subjects</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="text-center">
                    <h4 class="text-success">${stats.totalCreditUnits}</h4>
                    <p class="mb-0">Total Credit Units</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="text-center">
                    <h4 class="text-info">${stats.departmentCount}</h4>
                    <p class="mb-0">Departments</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="text-center">
                    <h4 class="text-warning">${Object.keys(stats.levelDistribution).length}</h4>
                    <p class="mb-0">Levels</p>
                </div>
            </div>
        </div>
    `;
    
    // You can display this in a modal or dedicated section
    console.log('Subjects Statistics:', stats);
    return statsHtml;
}

// Export functions
function exportSubjectsToCSV() {
    if (!subjectsData || subjectsData.length === 0) {
        showAlert('No subjects data to export.', 'warning');
        return;
    }
    
    const csvHeaders = ['Subject Code', 'Subject Name', 'Credit Units', 'Department', 'Level'];
    const csvRows = subjectsData.map(subject => [
        subject.code || '',
        subject.name || '',
        subject.creditUnits || '',
        subject.department || '',
        subject.level || ''
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subjects_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showAlert('Subjects data exported successfully!', 'success');
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
