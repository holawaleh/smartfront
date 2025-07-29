// students.js - Safe & Fixed

document.addEventListener("DOMContentLoaded", () => {
    

    const API_BASE_URL = 'https://bravetosmart.onrender.com/api';

    function getAuthToken() {
        return localStorage.getItem('authToken'); 
    }

    function checkAuth() {
        const token = getAuthToken();
        if (!token) {
            alert("Not logged in");
            window.location.href = "login.html";
            return false;
        }
        return true;
    }

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
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                localStorage.removeItem('authToken'); // or TOKEN_KEY
                showAlert("Session expired. Please log in again.", "warning");
                setTimeout(() => window.location.href = "login.html", 1000);
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error: ${response.status}`);
            }

            return await response.json();
        } catch (err) {
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
                    <div class="spinner-border"></div> Loading students...
                </td>
            </tr>
        `;

        try {
            const data = await apiCall('/'); // ✅ GET /api returns students
            const students = Array.isArray(data) ? data : (data?.data || []);

            if (students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted">No students found</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = students.map(s => `
                <tr>
                    <td>${s.name || 'Unknown'}</td>
                    <td>${s.matricNo || s.matric || 'N/A'}</td>
                    <td>${s.email || 'N/A'}</td>
                    <td>${s.level || 'N/A'}</td>
                    <td>${s.phone || 'N/A'}</td>
                    <td>${s.department || 'N/A'}</td>
                    <td><code>${s.uid || 'N/A'}</code></td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="editStudent('${s._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${s._id}', '${s.name || 'this student'}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        Failed to load: ${err.message}
                    </td>
                </tr>
            `;
            showAlert("Failed to load students", "danger");
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

            saveSpinner.classList.remove("d-none");
            saveBtn.disabled = true;

            try {
                const formData = new FormData(addStudentForm);
                const studentData = Object.fromEntries(formData);

                if (!studentData.name || !studentData.matricNo || !studentData.uid) {
                    throw new Error("Please fill all fields");
                }

                const result = await apiCall('/register', 'POST', studentData);

                if (result) {
                    showAlert("✅ Student added!", "success");
                    addStudentForm.reset();
                    bootstrap.Modal.getInstance(document.getElementById("addStudentModal")).hide();
                    await loadStudents();
                }
            } catch (err) {
                showAlert("❌ Error: " + err.message, "danger");
            } finally {
                saveSpinner.classList.add("d-none");
                saveBtn.disabled = false;
            }
        });
    }

    // === Capture UID Button ===
    const captureUidBtn = document.getElementById("captureUidBtn");
    if (captureUidBtn) {
        captureUidBtn.addEventListener("click", async () => {
            const uidInput = document.getElementById("uid");
            const token = getAuthToken();

            if (!token) {
                alert("Not logged in");
                window.location.href = "login.html";
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/get-latest-uid`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401) {
                    alert("Session expired");
                    localStorage.removeItem('authToken');
                    window.location.href = "login.html";
                    return;
                }

                if (!response.ok) {
                    throw new Error("No UID scanned yet");
                }

                const data = await response.json();
                if (data.uid) {
                    uidInput.value = data.uid;
                    showAlert(`✅ UID: ${data.uid}`, "success");
                }
            } catch (err) {
                alert("Scan a card first or check connection");
            }
        });
    }

    window.editStudent = (id) => alert("Edit: " + id);
    window.deleteStudent = async (id, name) => {
        if (confirm(`Delete ${name}?`)) {
            try {
                await apiCall(`/student/${id}`, 'DELETE');
                showAlert("✅ Deleted");
                await loadStudents();
            } catch (err) {
                showAlert("❌ Delete failed", "danger");
            }
        }
    };

    if (checkAuth()) {
        loadStudents();
    }
});