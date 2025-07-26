// Authentication JavaScript

// Make sure global variables are available
if (typeof authToken === 'undefined') {
    var authToken = localStorage.getItem('authToken');
}
if (typeof currentUser === 'undefined') {
    var currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check if already authenticated
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
});

async function handleLogin(event) {
    event.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const loginSpinner = document.getElementById('loginSpinner');
    
    // Simple form validation
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showAlert('Please fill in all required fields correctly.', 'danger');
        return;
    }
    
    // Get form data
    const formData = getFormData('loginForm');
    
    // Set loading state
    setLoading('loginBtn', true);
    loginSpinner.classList.remove('d-none');
    
    try {
        // For demo purposes, create a simple login validation
        // You can replace this with your actual authentication endpoint when ready
        if (formData.username && formData.password) {
            // Generate a demo token for testing
            authToken = 'demo_token_' + Date.now();
            currentUser = {
                username: formData.username,
                role: 'superadmin'
            };
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showAlert('Login successful! Redirecting to dashboard...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            showAlert('Please enter both username and password.', 'danger');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login. Please try again.', 'danger');
    } finally {
        // Reset loading state
        setLoading('loginBtn', false);
        loginSpinner.classList.add('d-none');
    }
}

// Register function (if needed for admin registration)
async function handleRegister(formData) {
    try {
        const response = await apiCall('/register', 'POST', formData);
        
        if (response.success) {
            showAlert('Registration successful!', 'success');
            return true;
        } else {
            showAlert(response.error || 'Registration failed.', 'danger');
            return false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred during registration.', 'danger');
        return false;
    }
}

// Token refresh function (if needed)
async function refreshToken() {
    try {
        const response = await apiCall('/refresh', 'POST', {}, true);
        
        if (response.success && response.data.token) {
            authToken = response.data.token;
            localStorage.setItem('authToken', authToken);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

// Check authentication status
function isAuthenticated() {
    return authToken && authToken !== 'null' && authToken !== 'undefined';
}

// Get current user info
function getCurrentUser() {
    return currentUser;
}

// Update user session
function updateUserSession(userData) {
    currentUser = { ...currentUser, ...userData };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// Session timeout handler
let sessionTimeoutId;

function resetSessionTimeout() {
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
    }
    
    // Set session timeout to 30 minutes
    sessionTimeoutId = setTimeout(() => {
        showAlert('Session expired. Please login again.', 'warning');
        setTimeout(logout, 3000);
    }, 30 * 60 * 1000); // 30 minutes
}

// Reset session timeout on user activity
document.addEventListener('click', resetSessionTimeout);
document.addEventListener('keypress', resetSessionTimeout);
document.addEventListener('scroll', resetSessionTimeout);

// Initialize session timeout when user is logged in
if (isAuthenticated()) {
    resetSessionTimeout();
}

// Handle authentication errors globally
function handleAuthError(error) {
    if (error.includes('401') || error.includes('unauthorized') || error.includes('token')) {
        showAlert('Your session has expired. Please login again.', 'warning');
        setTimeout(logout, 2000);
        return true;
    }
    return false;
}

// Auto-login check on page load
function autoLoginCheck() {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');
    
    if (storedToken && storedUser) {
        authToken = storedToken;
        currentUser = JSON.parse(storedUser);
        
        // Verify token is still valid by making a test API call
        apiCall('/students', 'GET').then(response => {
            if (!response.success) {
                // Token is invalid, clear storage
                logout();
            }
        });
    }
}

// Call auto-login check on page load
document.addEventListener('DOMContentLoaded', autoLoginCheck);
