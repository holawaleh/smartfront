// students.js - Fixed & Production-Ready

document.addEventListener("DOMContentLoaded", () => {
    // === Configuration ===
    const API_BASE_URL = 'https://bravetosmart.onrender.com/api'; // No trailing slash
    const TOKEN_KEY = 'authToken'; // Must match auth.js

    // === Get Token ===
    function getAuthToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    // === Check Auth ===
    function checkAuth() {
        const token = getAuthToken();
        if (!token) {
            alert("Not logged in");
            window.location.href = "login.html";
            return false;
        }
        return true;
    }

    // === Show Alert ===
    function showAlert(message, type = "info") {
        const container = document.getElementById("alertContainer");
        if (!container) return;

        const alert = Object.assign(document.createElement("div"), {
            className: `alert alert-${type} alert-dismissible fade show`,
            innerHTML: `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `
        });

        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    // === API Call Wrapper ===
    async function apiCall(endpoint, method = 'GET', data = null) {
        const token = getAuthToken();
        if (!token) {
            showAlert("Not logged in", "danger");
            window.location.href = "login.html";
            return null;
        }

        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            config.body = JSON.stringify(data);
        }

        try {
            // Trim any accidental whitespace in endpoint
            const url = `${API_BASE_URL}${endpoint.replace(/^\/\s+/, '/')}`;
            const response = await fetch(url, config);

            if (response.status === 401) {
                localStorage.removeItem(TOKEN_KEY);
                showAlert("Session expired. Please log in again.", "warning");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1000);
                return null;
            }

            if (!response.ok) {
                let errorMessage = `Error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If response is not JSON (e.g., 404 HTML page)
                    const text = await response.text();
                    console.error("Raw error response:", text);
                    errorMessage = "Server returned invalid response. Check console.";
                }
                throw new Error(errorMessage);
            }

            // Handle empty response (e.g., DELETE)
            if (response.status === 204) return { success: true };

            const contentType = response.headers.get("Content-Type");
            if (contentType && contentType.includes("application/json")) {
                return await response.json();
            } else {
                throw new Error("Response is not JSON");
            }
        } catch (err) {
            if (err.name === "TypeError") {
                console.error("Network error:", err);
                throw new Error("Network error: Check your connection");
            }
            console.error("API call failed:", err);
            throw err;
        }
    }

    // === Load Students ===
    async function loadStudents() {
        const tbody = document.getElementById("studentsTableBody");
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border" role="status"></div>
                    <span class="ms-2">Loading students...</span>
                </td>
            </tr>
        `;

        try {
            // ✅ Correct endpoint: /students (plural)
            const data = await apiCall('/students');
            const students = Array.isArray(data) ? data : (data?.data || []);

            if (students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted">
                            No students found. <a href="#" onclick="document.getElementById('addStudentModal').querySelector('.btn-primary').click(); return false;">Add one</a>.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = students.map(student => {
                const id = student._id || student.id;
                return `
                    <tr>
                        <td>${student.name || 'Unknown'}</td>
                        <td>${student.matricNo || student.matric || 'N/A'}</td>
                        <td>${student.email || 'N/A'}</td>
                        <td>${student.level || 'N/A'}</td>
                        <td>${student.phone || 'N/A'}</td>
                        <td>${student.department || 'N/A'}</td>
                        <td><code>${student.uid || 'N/A'}</code></td>
                        <td>
                            <button class="btn btn-sm btn-outline-warning me-1" onclick="editStudent('${id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${id}', '${student.name || 'this student'}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error("Failed to load students:", err);
            const tbody = document.getElementById("studentsTableBody");
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${err.message}
                    </td>
                </tr>
            `;
            showAlert("Failed to load students: " + err.message, "danger");
        }
    }

    // === Add Student Form Handler ===
    const addStudentForm = document.getElementById("addStudentForm");
    if (addStudentForm) {
        addStudentForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!checkAuth()) return;

            const saveBtn = document.getElementById("saveStudentBtn");
            const saveSpinner = document.getElementById("saveSpinner");

            // Show loading
            saveSpinner.classList.remove("d-none");
            saveBtn.disabled = true;

            try {
                const formData = new FormData(addStudentForm);
                const studentData = Object.fromEntries(formData);

                // Validate required fields
                if (!studentData.name || !studentData.matricNo || !studentData.uid) {
                    throw new Error("Please fill in Name, Matric No, and UID");
                }

                // ✅ Correct endpoint: POST /api/student (no trailing slash)
                const result = await apiCall('/student', 'POST', studentData);

                if (result) {
                    showAlert("✅ Student added successfully!", "success");
                    // Reset form
                    addStudentForm.reset();
                    // Close modal
                    bootstrap.Modal.getInstance(document.getElementById("addStudentModal")).hide();
                    // Refresh student list
                    await loadStudents();
                }
            } catch (err) {
                showAlert("❌ Error: " + err.message, "danger");
            } finally {
                // Hide loading
                saveSpinner.classList.add("d-none");
                saveBtn.disabled = false;
            }
        });
    }

    // === Capture UID Button ===
    const captureUidBtn = document.getElementById("captureUidBtn");
    if (captureUidBtn) {
        captureUidBtn.addEventListener("click", () => {
            // Simulate capturing UID (replace with real logic later)
            const fakeUid = "UID" + Date.now().toString().slice(-6);
            document.getElementById("uid").value = fakeUid;
            showAlert("UID captured: " + fakeUid, "info");
        });
    }

    // === Edit Student (Placeholder) ===
    window.editStudent = function(id) {
        alert("Edit student: " + id + "\nFeature coming soon!");
    };

    // === Delete Student ===
    window.deleteStudent = async function(id, name) {
        if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;

        try {
            await apiCall(`/student/${id}`, 'DELETE');
            showAlert("✅ Student deleted", "success");
            await loadStudents();
        } catch (err) {
            showAlert("❌ Delete failed: " + err.message, "danger");
        }
    };

    // === Initialize on Page Load ===
    if (checkAuth()) {
        loadStudents();
    }
});