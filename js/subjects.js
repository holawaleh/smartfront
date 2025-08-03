document.addEventListener("DOMContentLoaded", async () => {
    checkAuth(); // Ensure user is authenticated

    await loadSubjects();

    const addSubjectForm = document.getElementById("addSubjectForm");
    if (addSubjectForm) {
        addSubjectForm.addEventListener("submit", handleAddSubject);
    }
});

async function loadSubjects() {
    try {
        const subjects = await apiCall("/subjects");
        displaySubjects(subjects);
    } catch (err) {
        showAlert("Failed to load subjects", "danger");
    }
}

function displaySubjects(subjects) {
    const tbody = document.getElementById("subjectsTableBody");
    if (!tbody) return;

    if (!subjects || subjects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No courses found.</td></tr>`;
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
                    <button class="btn btn-outline-secondary" data-bs-toggle="tooltip" title="Edit" onclick="editSubject('${subject._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" data-bs-toggle="tooltip" title="Delete" onclick="deleteSubject('${subject._id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 🔍 Filter subjects by level
function filterSubjectsByLevel(level) {
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

// 🔎 Search subjects by course name or code
function searchSubjects(query) {
    const term = query.toLowerCase();
    const rows = document.querySelectorAll("#subjectsTableBody tr");

    rows.forEach(row => {
        const name = row.cells[1]?.textContent?.toLowerCase() || "";
        const code = row.cells[0]?.textContent?.toLowerCase() || "";
        row.style.display = name.includes(term) || code.includes(term) ? "" : "none";
    });
}

// 🆕 Handle adding a new subject
async function handleAddSubject(e) {
    e.preventDefault();
    setLoading("addSubjectBtn", true, "Add Course");

    const data = getFormData("addSubjectForm");

    try {
        const result = await apiCall("/subjects/create", "POST", {
            name: data.name,
            code: data.code,
            level: data.level || "",
            units: data.units || "",
            semester: data.semester || "",
        });

        showAlert("Course added successfully!", "success");
        document.getElementById("addSubjectForm").reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById("addSubjectModal"));
        modal.hide();
        await loadSubjects();
    } catch (err) {
        showAlert("Failed to add course.", "danger");
    } finally {
        setLoading("addSubjectBtn", false, "Add Course");
    }
}

// 🗑 Delete subject
async function deleteSubject(id) {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
        const res = await apiCall(`/subjects/${id}`, "DELETE");
        showAlert("Course deleted successfully", "success");
        await loadSubjects();
    } catch (err) {
        showAlert("Failed to delete course", "danger");
    }
}

// ✏️ Edit subject (Not implemented in backend yet)
function editSubject(id) {
    showAlert("Edit functionality not implemented yet.", "info");
}

// ⬇️ Export subjects to CSV
function exportSubjectsToCSV() {
    const rows = Array.from(document.querySelectorAll("#subjectsTableBody tr"))
        .map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim()));

    if (rows.length === 0 || rows[0][0] === "No courses found.") {
        showAlert("No course data to export", "warning");
        return;
    }

    const headers = ["Course Code", "Course Name", "Level", "Credit Units", "Semester"];
    const csvContent = [headers, ...rows]
        .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "courses.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
