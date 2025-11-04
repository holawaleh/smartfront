// ===========================
// Analytics JavaScript
// ===========================

let analyticsData = {
    logs: [],
    students: [],
    subjects: []
};

let charts = {};

document.addEventListener('DOMContentLoaded', function() {
    checkAuth(); // make sure auth.js is loaded before this
    initializeAnalyticsPage();
});

// === HELPERS ===

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// === INITIALIZATION ===

function initializeAnalyticsPage() {
    setupEventListeners();
    setDefaultAnalyticsDateRange();
    loadAnalyticsData();
}

function setupEventListeners() {
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
    document.getElementById('analyticsDateFrom').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('analyticsDateTo').value = today.toISOString().split('T')[0];
}

// === LOAD DATA ===

async function loadAnalyticsData() {
    try {
        showLoadingState();

        const [logsRes, studentsRes, subjectsRes] = await Promise.all([
            apiCall('/logs', 'GET'),
            apiCall('/students', 'GET'),
            apiCall('/subjects', 'GET')
        ]);

        analyticsData.logs = logsRes?.data || logsRes || [];
        analyticsData.students = studentsRes?.data || studentsRes || [];
        analyticsData.subjects = subjectsRes?.data || subjectsRes || [];

        updateCharts();
    } catch (err) {
        console.error("Error loading analytics data:", err);
        showAlert("Error loading analytics data: " + err.message, "danger");
    }
}

// === CHARTS ===

function showLoadingState() {
    const chartIds = [
        'weeklysubjectChart',
        'monthlyStudentChart',
        'subjectDistributionChart',
        'dailyActivityChart',
        'topStudentsChart',
        'departmentChart'
    ];
    chartIds.forEach(id => {
        const canvas = document.getElementById(id);
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
    const logs = getFilteredLogs();

    Object.values(charts).forEach(chart => chart?.destroy?.());
    charts = {};

    generateWeeklysubjectChart(logs);
    generateMonthlyStudentChart(logs);
    generatesubjectDistributionChart(logs);
    generateDailyActivityChart(logs);
    generateTopStudentsChart(logs);
    generateDepartmentChart(logs);

    updateAnalyticsStats(logs);
}

function getFilteredLogs() {
    const from = new Date(document.getElementById('analyticsDateFrom')?.value || '');
    const to = new Date(document.getElementById('analyticsDateTo')?.value || '');
    to.setHours(23, 59, 59, 999);

    return analyticsData.logs.filter(log => {
        const logDate = new Date(log.createdAt || log.timestamp);
        return logDate >= from && logDate <= to;
    });
}

// === INDIVIDUAL CHARTS ===

function generateWeeklysubjectChart(logs) {
    const ctx = document.getElementById('weeklysubjectChart')?.getContext('2d');
    if (!ctx) return;

    const weeklyData = {};
    logs.forEach(log => {
        const date = new Date(log.createdAt || log.timestamp);
        const week = getWeekStart(date).toISOString().split('T')[0];
        const subject = log.subject || 'Unknown';

        if (!weeklyData[week]) weeklyData[week] = {};
        weeklyData[week][subject] = (weeklyData[week][subject] || 0) + 1;
    });

    const topsubjects = [...new Set(logs.map(log => log.subject || 'Unknown'))].slice(0, 5);
    const weeks = Object.keys(weeklyData).sort().slice(-6);
    const datasets = topsubjects.map((subject, i) => ({
        label: subject,
        data: weeks.map(w => weeklyData[w]?.[subject] || 0),
        backgroundColor: getChartColor(i, 0.7),
        borderColor: getChartColor(i, 1),
        borderWidth: 2,
        tension: 0.4
    }));

    charts.weeklysubjectChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map(formatDate),
            datasets
        },
        options: chartOptions('Weekly subject Scans')
    });
}

function generateMonthlyStudentChart(logs) {
    const ctx = document.getElementById('monthlyStudentChart')?.getContext('2d');
    if (!ctx) return;

    const monthlyData = {};
    const studentCounts = {};

    logs.forEach(log => {
        const student = log.studentName || 'Unknown';
        const date = new Date(log.createdAt || log.timestamp);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[key]) monthlyData[key] = {};
        monthlyData[key][student] = (monthlyData[key][student] || 0) + 1;

        studentCounts[student] = (studentCounts[student] || 0) + 1;
    });

    const topStudents = Object.entries(studentCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([student]) => student);

    const months = Object.keys(monthlyData).sort().slice(-6);
    const datasets = topStudents.map((s, i) => ({
        label: s,
        data: months.map(m => monthlyData[m]?.[s] || 0),
        backgroundColor: getChartColor(i, 0.7),
        borderColor: getChartColor(i, 1),
        borderWidth: 2
    }));

    charts.monthlyStudentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => new Date(m + '-01').toLocaleString('en-US', { month: 'short', year: 'numeric' })),
            datasets
        },
        options: chartOptions('Monthly Student Activity')
    });
}

function generatesubjectDistributionChart(logs) {
    const ctx = document.getElementById('subjectDistributionChart')?.getContext('2d');
    if (!ctx) return;

    const subjectCounts = {};
    logs.forEach(log => {
        const subject = log.subject || 'Unknown';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    const top = Object.entries(subjectCounts).sort(([, a], [, b]) => b - a).slice(0, 10);

    charts.subjectDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: top.map(([s]) => s),
            datasets: [{
                data: top.map(([, c]) => c),
                backgroundColor: top.map((_, i) => getChartColor(i, 0.7))
            }]
        },
        options: chartOptions('subject Distribution')
    });
}

function generateDailyActivityChart(logs) {
    const ctx = document.getElementById('dailyActivityChart')?.getContext('2d');
    if (!ctx) return;

    const dailyCounts = {};
    logs.forEach(log => {
        const date = new Date(log.createdAt || log.timestamp).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    charts.dailyActivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(formatDate),
            datasets: [{
                label: 'Scans',
                data: days.map(d => dailyCounts[d] || 0),
                borderColor: 'rgba(13, 202, 240, 1)',
                backgroundColor: 'rgba(13, 202, 240, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: chartOptions('Daily Activity')
    });
}

function generateTopStudentsChart(logs) {
    const ctx = document.getElementById('topStudentsChart')?.getContext('2d');
    if (!ctx) return;

    const counts = {};
    logs.forEach(log => {
        const student = log.studentName || 'Unknown';
        counts[student] = (counts[student] || 0) + 1;
    });

    const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10);

    charts.topStudentsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top.map(([s]) => s),
            datasets: [{
                label: 'Total Scans',
                data: top.map(([, c]) => c),
                backgroundColor: 'rgba(25, 135, 84, 0.8)'
            }]
        },
        options: {
            ...chartOptions('Top Students'),
            indexAxis: 'y'
        }
    });
}

function generateDepartmentChart(logs) {
    const ctx = document.getElementById('departmentChart')?.getContext('2d');
    if (!ctx) return;

    const deptCounts = {};
    logs.forEach(log => {
        const name = log.studentName;
        const student = analyticsData.students.find(s => s.name === name);
        const dept = student?.department || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const top = Object.entries(deptCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

    charts.departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top.map(([d]) => d),
            datasets: [{
                label: 'Total Scans',
                data: top.map(([, c]) => c),
                backgroundColor: top.map((_, i) => getChartColor(i, 0.7))
            }]
        },
        options: chartOptions('Department Activity')
    });
}

// === STATS ===

function updateAnalyticsStats(logs) {
    const totalScans = logs.length;
    const students = new Set(logs.map(l => l.studentName || l.matricNo)).size;
    const subjects = new Set(logs.map(l => l.subject)).size;

    const range = getDateRangeFromLogs(logs);
    const days = range ? Math.max(1, Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24))) : 1;

    document.getElementById('totalScansCount').textContent = totalScans;
    document.getElementById('activeStudentsCount').textContent = students;
    document.getElementById('activesubjectsCount').textContent = subjects;
    document.getElementById('avgScansPerDay').textContent = Math.round(totalScans / days);
}

// === UTILS ===

function chartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                color: '#ffffff'
            },
            legend: {
                labels: { color: '#ffffff' }
            }
        },
        scales: {
            x: {
                ticks: { color: '#ffffff' },
                grid: { color: 'rgba(255,255,255,0.1)' }
            },
            y: {
                ticks: { color: '#ffffff' },
                grid: { color: 'rgba(255,255,255,0.1)' },
                beginAtZero: true
            }
        }
    };
}

function getChartColor(i, alpha = 1) {
    const colors = [
        `rgba(13, 110, 253, ${alpha})`,
        `rgba(25, 135, 84, ${alpha})`,
        `rgba(220, 53, 69, ${alpha})`,
        `rgba(255, 193, 7, ${alpha})`,
        `rgba(13, 202, 240, ${alpha})`,
        `rgba(111, 66, 193, ${alpha})`,
        `rgba(255, 87, 34, ${alpha})`,
        `rgba(233, 30, 99, ${alpha})`,
        `rgba(76, 175, 80, ${alpha})`,
        `rgba(96, 125, 139, ${alpha})`
    ];
    return colors[i % colors.length];
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getDateRangeFromLogs(logs) {
    if (!logs.length) return null;
    const dates = logs.map(l => new Date(l.createdAt || l.timestamp));
    return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
}
