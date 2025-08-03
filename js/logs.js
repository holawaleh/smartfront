// Logs management JavaScript

let logsData = [];
let filteredLogsData = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeLogsPage();
});

function initializeLogsPage() {
    // Set up event listeners
    setupEventListeners();
    
    // Load logs data
    loadLogs();
    
    // Set default date values
    setDefaultDateRange();
}

function setupEventListeners() {
    // Filter event listeners
    document.getElementById('dateFrom')?.addEventListener('change', applyFilters);
    document.getElementById('dateTo')?.addEventListener('change', applyFilters);
    document.getElementById('studentFilter')?.addEventListener('input', applyFilters);
    document.getElementById('CourseFilter')?.addEventListener('input', applyFilters);
}

function setDefaultDateRange() {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    
    if (dateFromInput) {
        dateFromInput.value = lastWeek.toISOString().split('T')[0];
    }
    if (dateToInput) {
        dateToInput.value = today.toISOString().split('T')[0];
    }
}

async function loadLogs() {
    try {
        const tableBody = document.getElementById('logsTableBody');
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading scan logs...</p>
                </td>
            </tr>
        `;
        
        const response = await apiCall('/logs', 'GET');
        
        if (response.success) {
            logsData = response.data || [];
            filteredLogsData = [...logsData];
            displayLogs(filteredLogsData);
            applyFilters(); // Apply any existing filters
        } else {
            throw new Error(response.error || 'Failed to load logs');
        }
        
    } catch (error) {
        console.error('Error loading logs:', error);
        showAlert('Error loading logs: ' + error.message, 'danger');
        
        document.getElementById('logsTableBody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading scan logs
                </td>
            </tr>
        `;
    }
}

function displayLogs(logs) {
    const tableBody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-clipboard-list me-2"></i>
                    No scan logs found
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort logs by timestamp (most recent first)
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tableBody.innerHTML = sortedLogs.map(log => `
        <tr>
            <td>
                <div>
                    <strong>${formatDateTime(log.timestamp)}</strong>
                </div>
                <small class="text-muted">${formatDate(log.timestamp)}</small>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <i class="fas fa-user me-2 text-primary"></i>
                    <div>
                        <strong>${escapeHtml(log.studentName || 'Unknown Student')}</strong>
                        ${log.matricNo ? `<br><small class="text-muted">${escapeHtml(log.matricNo)}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <i class="fas fa-book me-2 text-success"></i>
                    <div>
                        <strong>${escapeHtml(log.Course|| 'Unknown Course')}</strong>
                        ${log.CourseCode ? `<br><small class="text-muted">${escapeHtml(log.CourseCode)}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <span class="badge bg-secondary font-monospace">
                    ${escapeHtml(log.uid || 'N/A')}
                </span>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(log.status)}">
                    <i class="fas ${getStatusIcon(log.status)} me-1"></i>
                    ${escapeHtml(log.status || 'Success')}
                </span>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    const statusLower = (status || 'success').toLowerCase();
    switch (statusLower) {
        case 'success':
        case 'scanned':
        case 'present':
            return 'bg-success';
        case 'failed':
        case 'error':
            return 'bg-danger';
        case 'warning':
        case 'duplicate':
            return 'bg-warning text-dark';
        default:
            return 'bg-info';
    }
}

function getStatusIcon(status) {
    const statusLower = (status || 'success').toLowerCase();
    switch (statusLower) {
        case 'success':
        case 'scanned':
        case 'present':
            return 'fa-check-circle';
        case 'failed':
        case 'error':
            return 'fa-times-circle';
        case 'warning':
        case 'duplicate':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

function applyFilters() {
    let filtered = [...logsData];
    
    // Date range filter
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }
    
    // Student name filter
    const studentFilter = document.getElementById('studentFilter')?.value?.toLowerCase();
    if (studentFilter) {
        filtered = filtered.filter(log => 
            (log.studentName && log.studentName.toLowerCase().includes(studentFilter)) ||
            (log.matricNo && log.matricNo.toLowerCase().includes(studentFilter))
        );
    }
    
    // Coursefilter
    const CourseFilter = document.getElementById('CourseFilter')?.value?.toLowerCase();
    if (CourseFilter) {
        filtered = filtered.filter(log => 
            (log.Course&& log.Course.toLowerCase().includes(CourseFilter)) ||
            (log.CourseCode && log.CourseCode.toLowerCase().includes(CourseFilter))
        );
    }
    
    filteredLogsData = filtered;
    displayLogs(filteredLogsData);
}

function clearFilters() {
    // Clear filter inputs
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('studentFilter').value = '';
    document.getElementById('CourseFilter').value = '';
    
    // Reset default date range
    setDefaultDateRange();
    
    // Display all logs
    filteredLogsData = [...logsData];
    displayLogs(filteredLogsData);
    
    showAlert('Filters cleared successfully!', 'info');
}

async function loadLogsSummary() {
    try {
        const summaryContent = document.getElementById('summaryContent');
        
        // Show loading state
        summaryContent.innerHTML = `
            <div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading summary data...</p>
            </div>
        `;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('summaryModal'));
        modal.show();
        
        const response = await apiCall('/logs/summary', 'GET');
        
        if (response.success) {
            displayLogsSummary(response.data);
        } else {
            throw new Error(response.error || 'Failed to load logs summary');
        }
        
    } catch (error) {
        console.error('Error loading logs summary:', error);
        document.getElementById('summaryContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading summary: ${error.message}
            </div>
        `;
    }
}

function displayLogsSummary(summaryData) {
    const summaryContent = document.getElementById('summaryContent');
    
    // If API doesn't provide summary, generate from logs data
    const summary = summaryData || generateSummaryFromLogs();
    
    const summaryHtml = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <h3>${summary.totalScans || filteredLogsData.length}</h3>
                        <p class="mb-0">Total Scans</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <h3>${summary.uniqueStudents || getUniqueStudentsCount()}</h3>
                        <p class="mb-0">Unique Students</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <h3>${summary.uniqueCourses || getUniqueCoursesCount()}</h3>
                        <p class="mb-0">Unique Courses</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-dark">
                    <div class="card-body text-center">
                        <h3>${summary.todayScans || getTodayScansCount()}</h3>
                        <p class="mb-0">Today's Scans</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <h5><i class="fas fa-users me-2"></i>Top Students</h5>
                <div class="list-group">
                    ${getTopStudents().map(student => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${escapeHtml(student.name)}</strong>
                                <br><small class="text-muted">${escapeHtml(student.matricNo || '')}</small>
                            </div>
                            <span class="badge bg-primary rounded-pill">${student.count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="col-md-6">
                <h5><i class="fas fa-book me-2"></i>Popular Courses</h5>
                <div class="list-group">
                    ${getPopularCourses().map(Course=> `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${escapeHtml(Course.name)}</strong>
                                <br><small class="text-muted">${escapeHtml(Course.code || '')}</small>
                            </div>
                            <span class="badge bg-success rounded-pill">${Course.count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <h5><i class="fas fa-chart-line me-2"></i>Activity Timeline</h5>
                <div class="card">
                    <div class="card-body">
                        ${generateActivityTimeline()}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    summaryContent.innerHTML = summaryHtml;
}

function generateSummaryFromLogs() {
    return {
        totalScans: filteredLogsData.length,
        uniqueStudents: getUniqueStudentsCount(),
        uniqueCourses: getUniqueCoursesCount(),
        todayScans: getTodayScansCount()
    };
}

function getUniqueStudentsCount() {
    const uniqueStudents = new Set();
    filteredLogsData.forEach(log => {
        if (log.studentName || log.matricNo) {
            uniqueStudents.add(log.studentName || log.matricNo);
        }
    });
    return uniqueStudents.size;
}

function getUniqueCoursesCount() {
    const uniqueCourses = new Set();
    filteredLogsData.forEach(log => {
        if (log.Course|| log.CourseCode) {
            uniqueCourses.add(log.Course|| log.CourseCode);
        }
    });
    return uniqueCourses.size;
}

function getTodayScansCount() {
    const today = new Date().toDateString();
    return filteredLogsData.filter(log => 
        new Date(log.timestamp).toDateString() === today
    ).length;
}

function getTopStudents(limit = 5) {
    const studentCounts = {};
    
    filteredLogsData.forEach(log => {
        const key = log.studentName || log.matricNo || 'Unknown';
        const matricNo = log.matricNo || '';
        
        if (!studentCounts[key]) {
            studentCounts[key] = {
                name: log.studentName || 'Unknown Student',
                matricNo: matricNo,
                count: 0
            };
        }
        studentCounts[key].count++;
    });
    
    return Object.values(studentCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function getPopularCourses(limit = 5) {
    const CourseCounts = {};
    
    filteredLogsData.forEach(log => {
        const key = log.Course|| log.CourseCode || 'Unknown';
        const code = log.CourseCode || '';
        
        if (!CourseCounts[key]) {
            CourseCounts[key] = {
                name: log.Course|| 'Unknown Course',
                code: code,
                count: 0
            };
        }
        CourseCounts[key].count++;
    });
    
    return Object.values(CourseCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function generateActivityTimeline() {
    const dailyActivity = {};
    
    filteredLogsData.forEach(log => {
        const date = new Date(log.timestamp).toDateString();
        dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });
    
    const sortedDates = Object.keys(dailyActivity)
        .sort((a, b) => new Date(a) - new Date(b))
        .slice(-7); // Last 7 days
    
    if (sortedDates.length === 0) {
        return '<p class="text-muted text-center">No activity data available</p>';
    }
    
    const maxActivity = Math.max(...Object.values(dailyActivity));
    
    return sortedDates.map(date => {
        const count = dailyActivity[date];
        const percentage = (count / maxActivity) * 100;
        
        return `
            <div class="d-flex align-items-center mb-2">
                <div class="me-3" style="width: 100px;">
                    <small>${formatDate(date)}</small>
                </div>
                <div class="progress flex-grow-1 me-3" style="height: 20px;">
                    <div class="progress-bar bg-primary" 
                         style="width: ${percentage}%" 
                         title="${count} scans">
                    </div>
                </div>
                <div style="width: 50px;">
                    <small><strong>${count}</strong></small>
                </div>
            </div>
        `;
    }).join('');
}

// Export functions
function exportLogsToCSV() {
    if (!filteredLogsData || filteredLogsData.length === 0) {
        showAlert('No logs data to export.', 'warning');
        return;
    }
    
    const csvHeaders = ['Timestamp', 'Student Name', 'Matric No', 'Course', 'CourseCode', 'UID', 'Status'];
    const csvRows = filteredLogsData.map(log => [
        log.timestamp || '',
        log.studentName || '',
        log.matricNo || '',
        log.Course|| '',
        log.CourseCode || '',
        log.uid || '',
        log.status || ''
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showAlert('Logs data exported successfully!', 'success');
}

// Real-time updates (if needed)
function startRealTimeUpdates() {
    // Check for new logs every 30 seconds
    setInterval(async () => {
        try {
            const response = await apiCall('/logs', 'GET');
            if (response.success && response.data.length > logsData.length) {
                logsData = response.data;
                applyFilters();
                showAlert('New scan logs detected and updated!', 'info');
            }
        } catch (error) {
            console.error('Error checking for new logs:', error);
        }
    }, 30000);
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

// Initialize real-time updates when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Uncomment if you want real-time updates
    // startRealTimeUpdates();
});
