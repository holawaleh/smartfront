// Global configuration
const API_BASE_URL = 'https://bravetosmart.onrender.com/api';

// Global variables
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Utility functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Alert system
function showAlert(message, type = 'info', containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    container.innerHTML = alertHtml;
    
    // Auto-dismiss after 5 seconds for success alerts
    if (type === 'success') {
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Loading state management
function setLoading(elementId, isLoading) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const spinner = element.querySelector('.spinner-border');
    if (spinner) {
        spinner.classList.toggle('d-none', !isLoading);
    }
    
    element.disabled = isLoading;
}

// Form validation helper
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// API call wrapper
async function apiCall(endpoint, method = 'GET', data = null, requireAuth = true) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    // Add authorization header if required and token exists
    if (requireAuth && authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Add body for POST/PUT requests
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        
        // Handle non-JSON responses
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            result = { message: text };
        }

        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }

        return {
            success: true,
            data: result.data || result,
            message: result.message
        };
    } catch (error) {
        console.error('API call failed:', error);
        
        // Handle authentication errors
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            if (typeof logout === 'function') {
                logout();
            }
            return { success: false, error: 'Session expired. Please login again.' };
        }
        
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
}

// Authentication functions
function checkAuth() {
    const publicPages = ['index.html', 'login.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!authToken && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (authToken && currentPage === 'login.html') {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    // Update user display name if logged in
    if (authToken && currentUser.username) {
        const userDisplayElements = document.querySelectorAll('#userDisplayName');
        userDisplayElements.forEach(element => {
            element.textContent = currentUser.username;
        });
    }
    
    return true;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = {};
    window.location.href = 'login.html';
}

// UID capture functionality
async function captureUID() {
    try {
        const response = await fetch('https://bravetosmart.onrender.com/get-latest-uid');
        const data = await response.json();
        
        if (data.uid) {
            return data.uid;
        } else {
            // Fallback for testing
            return 'UID' + Date.now().toString().slice(-6);
        }
    } catch (error) {
        console.log('UID capture not available, using fallback');
        return 'UID' + Date.now().toString().slice(-6);
    }
}

// Form validation helpers  
function validateFormFields(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });

    // Email validation
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            field.classList.add('is-invalid');
            isValid = false;
        }
    });

    // Phone validation
    const phoneFields = form.querySelectorAll('input[type="tel"]');
    phoneFields.forEach(field => {
        if (field.value && !isValidPhone(field.value)) {
            field.classList.add('is-invalid');
            isValid = false;
        }
    });

    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Data formatting
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] = formData.entries()) {
        data[key] = value.trim();
    }
    
    return data;
}

function populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form || !data) return;

    Object.keys(data).forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field) {
            field.value = data[key] || '';
        }
    });
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.reset();
    
    // Remove validation classes
    const fields = form.querySelectorAll('.is-invalid, .is-valid');
    fields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
}

// Password toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const togglePasswordBtns = document.querySelectorAll('#togglePassword');
    
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input[type="password"], input[type="text"]');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
});

// Date utilities
function getDateRange(period) {
    const today = new Date();
    const startDate = new Date();
    
    switch (period) {
        case 'week':
            startDate.setDate(today.getDate() - 7);
            break;
        case 'month':
            startDate.setDate(today.getDate() - 30);
            break;
        case 'quarter':
            startDate.setDate(today.getDate() - 90);
            break;
        default:
            return null;
    }
    
    return {
        start: startDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
    };
}

// Local storage utilities
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

// Initialize tooltips and popovers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});

// Error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    // You can add global error reporting here
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    // You can add global error reporting here
});
