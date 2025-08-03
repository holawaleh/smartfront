// Analytics JavaScript with Chart.js integration

let analyticsData = {
    logs: [],
    students: [],
    Courses: []
};

let charts = {};

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeAnalyticsPage();
});

function initializeAnalyticsPage() {
    // Set up event listeners
    setupEventListeners();
    
    // Set default date range
    setDefaultAnalyticsDateRange();
    
    // Load analytics data
    loadAnalyticsData();
}

function setupEventListeners() {
    // Period select change
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            const period = this.value;
            if (period) {
                const dateRange = getDateRange(period);
                if (dateRange) {
                    document.getElementById('analyticsDateFrom').value = dateRange.start;
                    document.getElementById('analyticsDateTo').value = dateRange.end;
                }
            }
        });
    }
}

function setDefaultAnalyticsDateRange() {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);
    
    const dateFromInput = document.getElementById('analyticsDateFrom');
    const dateToInput = document.getElementById('analyticsDateTo');
    
    if (dateFromInput) {
        dateFromInput.value = lastMonth.toISOString().split('T')[0];
    }
    if (dateToInput) {
        dateToInput.value = today.toISOString().split('T')[0];
    }
}

async function loadAnalyticsData() {
    try {
        // Show loading state for all charts
        showLoadingState();
        
        // Load all required data
        const [logsResponse, studentsResponse, CoursesResponse] = await Promise.all([
            apiCall('/logs', 'GET'),
            apiCall('/students', 'GET'),
            apiCall('/Courses', 'GET')
        ]);
        
        if (logsResponse.success) {
            analyticsData.logs = logsResponse.data || [];
        }
        if (studentsResponse.success) {
            analyticsData.students = studentsResponse.data || [];
        }
        if (CoursesResponse.success) {
            analyticsData.Courses = CoursesResponse.data || [];
        }
        
        // Generate charts
        updateCharts();
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showAlert('Error loading analytics data: ' + error.message, 'danger');
    }
}

function showLoadingState() {
    const chartIds = [
        'weeklyCourseChart',
        'monthlyStudentChart',
        'CourseDistributionChart',
        'dailyActivityChart',
        'topStudentsChart',
        'departmentChart'
    ];
    
    chartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
        }
    });
}

function updateCharts() {
    // Filter data based on date range
    const filteredLogs = getFilteredLogs();
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};
    
    // Generate all charts
    generateWeeklyCourseChart(filteredLogs);
    generateMonthlyStudentChart(filteredLogs);
    generateCourseDistributionChart(filteredLogs);
    generateDailyActivityChart(filteredLogs);
    generateTopStudentsChart(filteredLogs);
    generateDepartmentChart(filteredLogs);
    
    // Update statistics
    updateAnalyticsStats(filteredLogs);
}

function getFilteredLogs() {
    const dateFrom = document.getElementById('analyticsDateFrom')?.value;
    const dateTo = document.getElementById('analyticsDateTo')?.value;
    
    let filtered = [...analyticsData.logs];
    
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
    
    return filtered;
}

function generateWeeklyCourseChart(logs) {
    const ctx = document.getElementById('weeklyCourseChart')?.getContext('2d');
    if (!ctx) return;
    
    // Group logs by week and Course
    const weeklyData = {};
    
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];
        const Course= log.Course|| 'Unknown Course';
        
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {};
        }
        
        weeklyData[weekKey][Course] = (weeklyData[weekKey][Course] || 0) + 1;
    });
    
    // Get all unique Courses
    const allCourses = [...new Set(logs.map(log => log.Course|| 'Unknown Course'))]
        .slice(0, 10); // Limit to top 10 Courses
    
    // Prepare data for chart
    const weeks = Object.keys(weeklyData).sort().slice(-8); // Last 8 weeks
    const datasets = allCourses.map((Course, index) => ({
        label: Course,
        data: weeks.map(week => weeklyData[week]?.[Course] || 0),
        backgroundColor: getChartColor(index, 0.7),
        borderColor: getChartColor(index, 1),
        borderWidth: 2,
        tension: 0.4
    }));
    
    charts.weeklyCourse= new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(week => formatDate(week)),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Weekly CourseScan Frequency',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                }
            }
        }
    });
}

function generateMonthlyStudentChart(logs) {
    const ctx = document.getElementById('monthlyStudentChart')?.getContext('2d');
    if (!ctx) return;
    
    // Group logs by month and student
    const monthlyData = {};
    
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const student = log.studentName || 'Unknown Student';
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {};
        }
        
        monthlyData[monthKey][student] = (monthlyData[monthKey][student] || 0) + 1;
    });
    
    // Get top 10 most active students
    const studentTotals = {};
    logs.forEach(log => {
        const student = log.studentName || 'Unknown Student';
        studentTotals[student] = (studentTotals[student] || 0) + 1;
    });
    
    const topStudents = Object.entries(studentTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([student]) => student);
    
    // Prepare data for chart
    const months = Object.keys(monthlyData).sort().slice(-6); // Last 6 months
    const datasets = topStudents.map((student, index) => ({
        label: student,
        data: months.map(month => monthlyData[month]?.[student] || 0),
        backgroundColor: getChartColor(index, 0.7),
        borderColor: getChartColor(index, 1),
        borderWidth: 2
    }));
    
    charts.monthlyStudent = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                });
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Student Activity (Top 5)',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                }
            }
        }
    });
}

function generateCourseDistributionChart(logs) {
    const ctx = document.getElementById('CourseDistributionChart')?.getContext('2d');
    if (!ctx) return;
    
    // Count scans per Course
    const CourseCounts = {};
    logs.forEach(log => {
        const Course= log.Course|| 'Unknown Course';
        CourseCounts[Course] = (CourseCounts[Course] || 0) + 1;
    });
    
    // Get top 10 Courses
    const topCourses = Object.entries(CourseCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    charts.CourseDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: topCourses.map(([Course]) => Course),
            datasets: [{
                data: topCourses.map(([, count]) => count),
                backgroundColor: topCourses.map((_, index) => getChartColor(index, 0.8)),
                borderColor: topCourses.map((_, index) => getChartColor(index, 1)),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'CourseScan Distribution',
                    color: '#ffffff'
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                }
            }
        }
    });
}

function generateDailyActivityChart(logs) {
    const ctx = document.getElementById('dailyActivityChart')?.getContext('2d');
    if (!ctx) return;
    
    // Group logs by day
    const dailyActivity = {};
    
    logs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });
    
    // Get last 30 days
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }
    
    const activityData = days.map(day => dailyActivity[day] || 0);
    
    charts.dailyActivity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(day => formatDate(day)),
            datasets: [{
                label: 'Daily Scans',
                data: activityData,
                backgroundColor: 'rgba(13, 202, 240, 0.2)',
                borderColor: 'rgba(13, 202, 240, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(13, 202, 240, 1)',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Activity Trend (Last 30 Days)',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: '#ffffff',
                        maxTicksLimit: 8
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                }
            }
        }
    });
}

function generateTopStudentsChart(logs) {
    const ctx = document.getElementById('topStudentsChart')?.getContext('2d');
    if (!ctx) return;
    
    // Count scans per student
    const studentCounts = {};
    logs.forEach(log => {
        const student = log.studentName || 'Unknown Student';
        studentCounts[student] = (studentCounts[student] || 0) + 1;
    });
    
    // Get top 10 students
    const topStudents = Object.entries(studentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    charts.topStudents = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: topStudents.map(([student]) => student.length > 20 ? student.substring(0, 20) + '...' : student),
            datasets: [{
                label: 'Total Scans',
                data: topStudents.map(([, count]) => count),
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Most Active Students',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function generateDepartmentChart(logs) {
    const ctx = document.getElementById('departmentChart')?.getContext('2d');
    if (!ctx) return;
    
    // Map students to departments and count their activity
    const departmentActivity = {};
    
    logs.forEach(log => {
        const studentName = log.studentName;
        if (studentName) {
            // Find student department
            const student = analyticsData.students.find(s => s.name === studentName);
            const department = student?.department || 'Unknown Department';
            
            departmentActivity[department] = (departmentActivity[department] || 0) + 1;
        }
    });
    
    const departments = Object.entries(departmentActivity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8); // Top 8 departments
    
    charts.department = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: departments.map(([dept]) => dept.length > 15 ? dept.substring(0, 15) + '...' : dept),
            datasets: [{
                label: 'Total Scans',
                data: departments.map(([, count]) => count),
                backgroundColor: departments.map((_, index) => getChartColor(index, 0.8)),
                borderColor: departments.map((_, index) => getChartColor(index, 1)),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Department Activity Comparison',
                    color: '#ffffff'
                },
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: '#ffffff',
                        maxRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                }
            }
        }
    });
}

function updateAnalyticsStats(logs) {
    // Calculate statistics
    const totalScans = logs.length;
    const uniqueStudents = new Set(logs.map(log => log.studentName || log.matricNo)).size;
    const uniqueCourses = new Set(logs.map(log => log.Course)).size;
    
    // Calculate average scans per day
    const dateRange = getDateRangeFromLogs(logs);
    const daysDiff = dateRange ? Math.max(1, Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))) : 1;
    const avgScansPerDay = Math.round(totalScans / daysDiff);
    
    // Update DOM elements
    document.getElementById('totalScansCount').textContent = totalScans;
    document.getElementById('activeStudentsCount').textContent = uniqueStudents;
    document.getElementById('activeCoursesCount').textContent = uniqueCourses;
    document.getElementById('avgScansPerDay').textContent = avgScansPerDay;
}

function getDateRangeFromLogs(logs) {
    if (logs.length === 0) return null;
    
    const dates = logs.map(log => new Date(log.timestamp));
    return {
        start: new Date(Math.min(...dates)),
        end: new Date(Math.max(...dates))
    };
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function getChartColor(index, alpha = 1) {
    const colors = [
        `rgba(13, 110, 253, ${alpha})`,    // Blue
        `rgba(25, 135, 84, ${alpha})`,     // Green
        `rgba(220, 53, 69, ${alpha})`,     // Red
        `rgba(255, 193, 7, ${alpha})`,     // Yellow
        `rgba(13, 202, 240, ${alpha})`,    // Cyan
        `rgba(111, 66, 193, ${alpha})`,    // Purple
        `rgba(255, 87, 34, ${alpha})`,     // Orange
        `rgba(233, 30, 99, ${alpha})`,     // Pink
        `rgba(76, 175, 80, ${alpha})`,     // Light Green
        `rgba(96, 125, 139, ${alpha})`     // Blue Grey
    ];
    
    return colors[index % colors.length];
}

// Export functions
function exportChartsData() {
    const filteredLogs = getFilteredLogs();
    
    if (filteredLogs.length === 0) {
        showAlert('No data available to export.', 'warning');
        return;
    }
    
    const analyticsExport = {
        dateRange: {
            from: document.getElementById('analyticsDateFrom')?.value,
            to: document.getElementById('analyticsDateTo')?.value
        },
        statistics: {
            totalScans: filteredLogs.length,
            uniqueStudents: new Set(filteredLogs.map(log => log.studentName)).size,
            uniqueCourses: new Set(filteredLogs.map(log => log.Course)).size
        },
        data: filteredLogs
    };
    
    const blob = new Blob([JSON.stringify(analyticsExport, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showAlert('Analytics data exported successfully!', 'success');
}

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set Chart.js global defaults for dark theme
    Chart.defaults.color = '#ffffff';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.backgroundColor = 'rgba(255, 255, 255, 0.1)';
});
