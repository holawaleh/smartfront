// students.js - Safe & Fixed

document.addEventListener("DOMContentLoaded", () => {
    

    const API_BASE_URL = 'https://bravetosmart.onrender.com/api';

    const SEX_STORAGE_KEY = 'studentSexMap';

    function getAuthToken() {
        return localStorage.getItem('authToken'); 
    }

    function getSexMap() {
        try {
            return JSON.parse(localStorage.getItem(SEX_STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function setSexForStudent(key, sex) {
        if (!key) return;
        const map = getSexMap();
        if (sex) map[key] = sex;
        else delete map[key];
        localStorage.setItem(SEX_STORAGE_KEY, JSON.stringify(map));
    }

    function getSexForStudent(key) {
        if (!key) return '';
        const map = getSexMap();
        return map[key] || '';
    }

    // --- Ordering (local-only) ---
    const ORDER_STORAGE_KEY = 'studentOrder';
    const SORT_PREF_KEY = 'studentSortPref'; // { field: 'name', dir: 'asc' }

    function getStoredOrder() {
        try {
            return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || '[]');
        } catch (e) { return []; }
    }

    function setStoredOrder(arr) {
        if (!Array.isArray(arr)) return;
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(arr));
    }

    function getSortPref() {
        try { return JSON.parse(localStorage.getItem(SORT_PREF_KEY) || 'null'); } catch (e) { return null; }
    }

    function setSortPref(pref) {
        if (!pref) { localStorage.removeItem(SORT_PREF_KEY); return; }
        localStorage.setItem(SORT_PREF_KEY, JSON.stringify(pref));
    }

    function moveOrderItem(id, direction) {
        const order = getStoredOrder();
        const idx = order.indexOf(id);
        if (idx === -1) return order;
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= order.length) return order;
        const tmp = order[swapWith]; order[swapWith] = order[idx]; order[idx] = tmp;
        setStoredOrder(order);
        return order;
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
                // Attempt to read JSON error body; fall back to text
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    try {
                        const txt = await response.text();
                        errorData = { message: txt || `HTTP Error ${response.status}` };
                    } catch (ee) {
                        errorData = { message: `HTTP Error ${response.status}` };
                    }
                }

                const apiErr = new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
                apiErr.status = response.status;
                apiErr.statusText = response.statusText;
                apiErr.data = errorData;
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw apiErr;
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
                <td colspan="10" class="text-center">
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
                        <td colspan="10" class="text-center text-muted">No students found</td>
                    </tr>
                `;
                return;
            }

            // Apply local ordering or sorting preferences
            const storedOrder = getStoredOrder();
            const sortPref = getSortPref();

            let ordered = [];
            const byId = {};
            students.forEach(s => { byId[s._id] = s; });

            if (Array.isArray(storedOrder) && storedOrder.length > 0) {
                // build from stored order, append any new students
                storedOrder.forEach(id => { if (byId[id]) ordered.push(byId[id]); });
                students.forEach(s => { if (!storedOrder.includes(s._id)) ordered.push(s); });
            } else if (sortPref && sortPref.field) {
                // sort according to pref
                const field = sortPref.field;
                const dir = sortPref.dir === 'desc' ? -1 : 1;
                ordered = students.slice().sort((a,b) => {
                    const av = (a[field] || '').toString().toLowerCase();
                    const bv = (b[field] || '').toString().toLowerCase();
                    if (av < bv) return -1 * dir;
                    if (av > bv) return 1 * dir;
                    return 0;
                });
            } else {
                ordered = students.slice();
            }

            // Render rows with serial and local move controls
            tbody.innerHTML = ordered.map((s, idx) => {
                const sn = idx + 1;
                const key = (s.uid && s.uid !== 'N/A') ? s.uid : (s.matricNo || s.matric || s._id || '');
                const sex = getSexForStudent(key) || '';
                return `
                <tr data-student-id="${s._id}">
                    <td style="width:70px">
                        <div class="d-flex align-items-center gap-2">
                            <span class="fw-bold">${sn}</span>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-secondary move-up" data-id="${s._id}" title="Move up">↑</button>
                                <button class="btn btn-outline-secondary move-down" data-id="${s._id}" title="Move down">↓</button>
                            </div>
                        </div>
                    </td>
                    <td>${s.name || 'Unknown'}</td>
                    <td>${s.matricNo || s.matric || 'N/A'}</td>
                    <td>${s.email || 'N/A'}</td>
                    <td>${sex || ''}</td>
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
            `}).join('');

            // Update sort indicators in headers
            const currentSort = getSortPref();
            document.querySelectorAll('th.sortable').forEach(th => {
                const field = th.getAttribute('data-sort');
                const indicator = th.querySelector('.sort-indicator');
                if (!indicator) return;
                if (currentSort && currentSort.field === field) {
                    indicator.textContent = currentSort.dir === 'asc' ? ' ▲' : ' ▼';
                } else {
                    indicator.textContent = '';
                }
            });
        } catch (err) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-danger">
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

                // Build payload for backend excluding local-only fields (sex)
                const backendPayload = {
                    name: studentData.name,
                    matricNo: studentData.matricNo,
                    email: studentData.email,
                    level: studentData.level,
                    phone: studentData.phone,
                    department: studentData.department,
                    uid: studentData.uid
                };

                const result = await apiCall('/students/register', 'POST', backendPayload);

                if (result) {
                    // Save sex locally (do not send to backend)
                    const sexValue = studentData.sex || '';
                    // Prefer uid as key, fall back to matricNo, then backend returned student
                    let key = studentData.uid || studentData.matricNo || '';
                    if (!key && result.student) {
                        key = result.student.uid || result.student.matricNo || result.student._id || '';
                    }
                    if (sexValue && key) {
                        setSexForStudent(key, sexValue);
                    }

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

    // --- Sorting header clicks (persist sort pref, clear custom order) ---
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            const cur = getSortPref();
            let next = { field, dir: 'asc' };
            if (cur && cur.field === field) {
                next.dir = cur.dir === 'asc' ? 'desc' : 'asc';
            }
            setSortPref(next);
            // Clear any manual ordering when user picks a sort
            setStoredOrder([]);
            loadStudents();
        });
    });

    // --- Move up/down handler (manual ordering) ---
    const tableBody = document.getElementById('studentsTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const upBtn = e.target.closest('button.move-up');
            const downBtn = e.target.closest('button.move-down');
            if (!upBtn && !downBtn) return;
            const id = (upBtn || downBtn).getAttribute('data-id');
            if (!id) return;

            // if no stored order, derive from current DOM order
            let order = getStoredOrder();
            if (!Array.isArray(order) || order.length === 0) {
                order = Array.from(document.querySelectorAll('#studentsTableBody tr[data-student-id]')).map(r => r.getAttribute('data-student-id'));
            }

            // ensure id present
            if (!order.includes(id)) {
                // append any missing ids from DOM
                const domIds = Array.from(document.querySelectorAll('#studentsTableBody tr[data-student-id]')).map(r => r.getAttribute('data-student-id'));
                domIds.forEach(did => { if (!order.includes(did)) order.push(did); });
            }

            // perform move
            const direction = upBtn ? 'up' : 'down';
            const idx = order.indexOf(id);
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= order.length) return;
            const tmp = order[swapIdx]; order[swapIdx] = order[idx]; order[idx] = tmp;
            setStoredOrder(order);
            // clear sort pref since user created manual order
            setSortPref(null);
            loadStudents();
        });
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
            // populate local-only sex value
            try {
                const key = student.uid || student.matricNo || student._id || '';
                const sexVal = getSexForStudent(key) || '';
                const editSexEl = document.getElementById('editSex');
                if (editSexEl) editSexEl.value = sexVal;
            } catch (e) {
                console.warn('Failed to populate edit sex value', e);
            }

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
                if (!id) {
                    throw new Error('Student ID is missing');
                }

                const formData = new FormData(editForm);
                const formFields = Object.fromEntries(formData);
                
                // Create clean payload with only the fields backend expects
                const payload = {
                    name: formFields.name?.trim(),
                    matricNo: formFields.matricNo?.trim(),
                    email: formFields.email?.trim(),
                    level: formFields.level?.trim() || undefined,
                    phone: formFields.phone?.trim() || undefined,
                    department: formFields.department?.trim() || undefined
                };
                
                // Validate required fields
                const requiredFields = {
                    name: 'Name',
                    matricNo: 'Matric Number',
                    email: 'Email'
                };

                const missingFields = Object.entries(requiredFields)
                    .filter(([key]) => !payload[key])
                    .map(([, label]) => label);

                if (missingFields.length > 0) {
                    throw new Error(`Required fields missing: ${missingFields.join(', ')}`);
                }

                await apiCall(`/students/${id}`, 'PUT', payload);

                // Persist local-only sex value (do NOT send to backend)
                try {
                    const sexValue = formFields.sex || document.getElementById('editSex')?.value || '';
                    // prefer UID from the edit form, else matricNo
                    const uidKey = (document.getElementById('editUid')?.value) || formFields.matricNo || '';
                    if (uidKey) {
                        if (sexValue) setSexForStudent(uidKey, sexValue);
                        else setSexForStudent(uidKey, undefined); // remove if empty
                    }
                } catch (e) {
                    console.warn('Failed to persist local sex for student', e);
                }

                showAlert('✅ Student updated', 'success');
                bootstrap.Modal.getInstance(document.getElementById('editStudentModal')).hide();
                await loadStudents();
            } catch (err) {
                console.error('Update error:', err);

                // Prefer backend-provided message / validation errors when available
                let userMessage = err.message || 'Failed to update student';
                if (err.data) {
                    // If backend returned structured errors, show them
                    if (err.data.errors && Array.isArray(err.data.errors)) {
                        userMessage = err.data.errors.join('; ');
                    } else if (err.data.message) {
                        userMessage = err.data.message;
                    } else {
                        // Dump full object for debugging
                        userMessage = JSON.stringify(err.data);
                    }
                }

                showAlert('Failed to update student: ' + userMessage, 'danger');
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