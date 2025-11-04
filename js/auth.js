// ===========================
// Authentication JavaScript
// ===========================

const TOKEN_KEY = "authToken";
const USER_KEY = "currentUser";
const LOGIN_TIME_KEY = "loginTime";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const API_BASE = "https://bravetosmart.onrender.com/api";

let sessionTimeoutId = null;
let authToken = localStorage.getItem(TOKEN_KEY);
let currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "{}");

// ✅ Expose token getter globally
function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// === UTILITIES ===
function getFormData(formId) {
    const form = document.getElementById(formId);
    const data = new FormData(form);
    const obj = {};
    for (const [key, val] of data.entries()) {
        obj[key] = val;
    }
    return obj;
}

function setLoading(buttonId, isLoading, defaultText = "Login") {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (isLoading) {
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Loading...`;
        button.disabled = true;
    } else {
        button.innerHTML = `<i class="fas fa-sign-in-alt me-2"></i>${defaultText}`;
        button.disabled = false;
    }
}

function showAlert(message, type = "info") {
    const alertContainer = document.getElementById("alertContainer");
    if (!alertContainer) return;

    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// === SESSION TIMEOUT ===
function resetSessionTimeout() {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    sessionTimeoutId = setTimeout(() => {
        showAlert("Session expired. Logging out...", "warning");
        setTimeout(logout, 2000);
    }, SESSION_TIMEOUT);
}

// === AUTH CHECK ===
function checkAuth() {
    const token = getAuthToken();
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "{}");

    if (!token || !user || !user.username) {
        showAlert("You must be logged in to access this page.", "warning");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
    } else {
        const displayName = document.getElementById("userDisplayName");
        if (displayName) displayName.textContent = user.username;
        resetSessionTimeout();
    }
}

// === LOGOUT ===
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOGIN_TIME_KEY);
    window.location.href = "login.html";
}

// === API CALL ===
async function apiCall(endpoint, method = "GET", body = null) {
    const token = getAuthToken();
    const fullUrl = `${API_BASE}${endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(fullUrl, options);
        const contentType = res.headers.get("Content-Type");

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            return data;
        } else {
            throw new Error("Response is not JSON");
        }
    } catch (err) {
        console.error("API call error:", err);
        return { success: false, message: err.message || "API request failed" };
    }
}

// === LOGIN HANDLER ===
async function handleLogin(e) {
    e.preventDefault();
    setLoading("loginBtn", true);
    const formData = getFormData("loginForm");

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok && result.token) {
            // Store credentials and redirect immediately to reduce perceived delay
            localStorage.setItem(TOKEN_KEY, result.token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.user || { username: formData.username }));
            localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
            showAlert("Login successful! Redirecting...", "success");
            // immediate redirect (no artificial delay)
            window.location.href = "dashboard.html";
        } else {
            showAlert(result.message || "Invalid credentials", "danger");
        }
    } catch (error) {
        console.error("Login error:", error);
        showAlert("An error occurred during login.", "danger");
    } finally {
        setLoading("loginBtn", false);
    }
}

// === TOGGLE PASSWORD VISIBILITY ===
document.addEventListener("DOMContentLoaded", () => {
    const togglePassword = document.getElementById("togglePassword");
    if (togglePassword) {
        togglePassword.addEventListener("click", () => {
            const passwordInput = document.getElementById("password");
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            togglePassword.innerHTML = `<i class="fas fa-${type === "password" ? "eye" : "eye-slash"}"></i>`;
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    if (document.body.classList.contains("protected")) checkAuth();
});

// === AUTO LOGIN ===
function autoLoginCheck() {
    const token = getAuthToken();
    const user = localStorage.getItem(USER_KEY);

    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        resetSessionTimeout();
    }
}
autoLoginCheck();

document.addEventListener("click", resetSessionTimeout);
document.addEventListener("keypress", resetSessionTimeout);
document.addEventListener("scroll", resetSessionTimeout);
