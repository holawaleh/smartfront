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
            const students = await apiCall('/students');
            
            if (!Array.isArray(students)) {
                throw new Error('Invalid response format from server');
            }

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

                const result = await apiCall('/students/register', 'POST', studentData);

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
            const response = await fetch(`${API_BASE_URL}/students/get-latest-uid`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
            } else {
                showAlert("No UID returned", "warning");
            }
        } catch (err) {
            alert("Scan a card first or check connection");
            console.error("Capture UID Error:", err);
        }
    });
}


    if (checkAuth()) {
        loadStudents();
    }
    
    // === Edit Student Handler (exposed globally for inline onclick) ===
    // Attach to window so inline `onclick="editStudent(id)"` works
    window.editStudent = async function (studentId) {
        if (!studentId) return;
        if (!checkAuth()) return;

        try {
            const student = await apiCall(`/students/${studentId}`);
            if (!student || !student._id) throw new Error('Student not found');

            document.getElementById('editStudentId').value = student._id || student.id || '';
            document.getElementById('editStudentName').value = student.name || '';
            document.getElementById('editMatricNo').value = student.matricNo || student.matric || '';
            document.getElementById('editEmail').value = student.email || '';
            document.getElementById('editLevel').value = student.level || '';
            document.getElementById('editPhone').value = student.phone || '';
            document.getElementById('editDepartment').value = student.department || '';
            document.getElementById('editUid').value = student.uid || '';

            const modalEl = document.getElementById('editStudentModal');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } catch (err) {
            console.error('Edit fetch error:', err);
            showAlert('Failed to load student for editing', 'danger');
        }
    };

    // === Edit Student Form Submit ===
    const editForm = document.getElementById('editStudentForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!checkAuth()) return;

            const updateBtn = document.getElementById('updateStudentBtn');
            const updateSpinner = document.getElementById('updateSpinner');
            updateSpinner.classList.remove('d-none');
            updateBtn.disabled = true;

            try {
                const id = document.getElementById('editStudentId').value;
                const formData = new FormData(editForm);
                const payload = Object.fromEntries(formData);

                // Clean up payload
                delete payload.id;
                delete payload.editStudentId; // Remove any form field names that don't match backend
                
                // Ensure required fields
                if (!payload.name || !payload.matricNo || !payload.email) {
                    throw new Error('Name, Matric Number and Email are required');
                }

                await apiCall(`/students/${id}`, 'PUT', payload);
                showAlert('✅ Student updated', 'success');
                bootstrap.Modal.getInstance(document.getElementById('editStudentModal')).hide();
                await loadStudents();
            } catch (err) {
                console.error('Update error:', err);
                showAlert('Failed to update student: ' + (err.message || ''), 'danger');
            } finally {
                updateSpinner.classList.add('d-none');
                updateBtn.disabled = false;
            }
        });
    }

    // === Delete Student Handler (exposed globally for inline onclick) ===
    window.deleteStudent = async function (studentId, studentName) {
        if (!studentId) return;
        if (!checkAuth()) return;

        const confirmed = confirm(`Delete ${studentName || 'this student'}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            await apiCall(`/students/${studentId}`, 'DELETE');
            showAlert('✅ Student deleted', 'success');
            await loadStudents();
        } catch (err) {
            console.error('Delete error:', err);
            showAlert('Failed to delete student: ' + (err.message || ''), 'danger');
        }
    };

    if (checkAuth()) {
        loadStudents();
    }
});