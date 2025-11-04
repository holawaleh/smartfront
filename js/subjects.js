document.addEventListener("DOMContentLoaded", async () => {
    checkAuth(); // Ensure user is authenticated

    await loadsubjects();

    const addsubjectForm = document.getElementById("addsubjectForm");
    if (addsubjectForm) {
        addsubjectForm.addEventListener("submit", handleAddsubject);
    }
});

async function loadsubjects() {
    try {
        const subjects = await apiCall("/subjects");
        displaysubjects(subjects);
    } catch (err) {
        showAlert("Failed to load subjects", "danger");
    }
}

function displaysubjects(subjects) {
    const tbody = document.getElementById("subjectsTableBody");
    if (!tbody) return;

    if (!subjects || subjects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No subjects found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    subjects.forEach((subject, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${subject.code}</td>
            <td>${subject.name}</td>
            <td>${subject.level || "-"}</td>
            <td>${subject.units || "-"}</td>
            <td>${subject.semester || "-"}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" data-bs-toggle="tooltip" title="Edit" onclick="editsubject('${subject._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" data-bs-toggle="tooltip" title="Delete" onclick="deletesubject('${subject._id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 🔍 Filter subjects by level
function filtersubjectsByLevel(level) {
    const rows = document.querySelectorAll("#subjectsTableBody tr");
    rows.forEach(row => {
        const levelCell = row.cells[2];
        if (!level || (levelCell && levelCell.textContent === level)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// 🔎 Search subjects by subject name or code
function searchsubjects(query) {
    const term = query.toLowerCase();
    const rows = document.querySelectorAll("#subjectsTableBody tr");

    rows.forEach(row => {
        const name = row.cells[1]?.textContent?.toLowerCase() || "";
        const code = row.cells[0]?.textContent?.toLowerCase() || "";
        row.style.display = name.includes(term) || code.includes(term) ? "" : "none";
    });
}

// 🆕 Handle adding a new subject
async function handleAddsubject(e) {
    e.preventDefault();
    setLoading("addsubjectBtn", true, "Add subject");

    const data = getFormData("addsubjectForm");

    try {
        const result = await apiCall("/subjects/create", "POST", {
            name: data.name,
            code: data.code,
            level: data.level || "",
            units: data.units || "",
            semester: data.semester || "",
        });

        showAlert("subject added successfully!", "success");
        document.getElementById("addsubjectForm").reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById("addsubjectModal"));
        modal.hide();
        await loadsubjects();
    } catch (err) {
        showAlert("Failed to add subject.", "danger");
    } finally {
        setLoading("addsubjectBtn", false, "Add subject");
    }
}

// 🗑 Delete subject
async function deletesubject(id) {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
        const res = await apiCall(`/subjects/${id}`, "DELETE");
        showAlert("subject deleted successfully", "success");
        await loadsubjects();
    } catch (err) {
        showAlert("Failed to delete subject", "danger");
    }
}

// ✏️ Edit subject (Not implemented in backend yet)
function editsubject(id) {
    showAlert("Edit functionality not implemented yet.", "info");
}

// ⬇️ Export subjects to CSV
function exportsubjectsToCSV() {
    const rows = Array.from(document.querySelectorAll("#subjectsTableBody tr"))
        .map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim()));

    if (rows.length === 0 || rows[0][0] === "No subjects found.") {
        showAlert("No subject data to export", "warning");
        return;
    }

    const headers = ["subject Code", "subject Name", "Level", "Credit Units", "Semester"];
    const csvContent = [headers, ...rows]
        .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "subjects.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
