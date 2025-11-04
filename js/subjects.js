document.addEventListener("DOMContentLoaded", async () => {
    checkAuth(); // Ensure user is authenticated

    await loadcourses();

    const addcourseForm = document.getElementById("addcourseForm");
    if (addcourseForm) {
        addcourseForm.addEventListener("submit", handleAddcourse);
    }
});

async function loadcourses() {
    try {
        const courses = await apiCall("/courses");
        displaycourses(courses);
    } catch (err) {
        showAlert("Failed to load courses", "danger");
    }
}

function displaycourses(courses) {
    const tbody = document.getElementById("coursesTableBody");
    if (!tbody) return;

    if (!courses || courses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No courses found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    courses.forEach((course, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${course.code}</td>
            <td>${course.name}</td>
            <td>${course.level || "-"}</td>
            <td>${course.units || "-"}</td>
            <td>${course.semester || "-"}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" data-bs-toggle="tooltip" title="Edit" onclick="editcourse('${course._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" data-bs-toggle="tooltip" title="Delete" onclick="deletecourse('${course._id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 🔍 Filter courses by level
function filtercoursesByLevel(level) {
    const rows = document.querySelectorAll("#coursesTableBody tr");
    rows.forEach(row => {
        const levelCell = row.cells[2];
        if (!level || (levelCell && levelCell.textContent === level)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// 🔎 Search courses by course name or code
function searchcourses(query) {
    const term = query.toLowerCase();
    const rows = document.querySelectorAll("#coursesTableBody tr");

    rows.forEach(row => {
        const name = row.cells[1]?.textContent?.toLowerCase() || "";
        const code = row.cells[0]?.textContent?.toLowerCase() || "";
        row.style.display = name.includes(term) || code.includes(term) ? "" : "none";
    });
}

// 🆕 Handle adding a new course
async function handleAddcourse(e) {
    e.preventDefault();
    setLoading("addcourseBtn", true, "Add Course");

    const data = getFormData("addcourseForm");

    try {
        const result = await apiCall("/courses/create", "POST", {
            name: data.name,
            code: data.code,
            level: data.level || "",
            units: data.units || "",
            semester: data.semester || "",
        });

        showAlert("Course added successfully!", "success");
        document.getElementById("addcourseForm").reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById("addcourseModal"));
        modal.hide();
        await loadcourses();
    } catch (err) {
        showAlert("Failed to add course.", "danger");
    } finally {
        setLoading("addcourseBtn", false, "Add Course");
    }
}

// 🗑 Delete course
async function deletecourse(id) {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
        const res = await apiCall(`/courses/${id}`, "DELETE");
        showAlert("Course deleted successfully", "success");
        await loadcourses();
    } catch (err) {
        showAlert("Failed to delete course", "danger");
    }
}

// ✏️ Edit course (Not implemented in backend yet)
function editcourse(id) {
    showAlert("Edit functionality not implemented yet.", "info");
}

// ⬇️ Export courses to CSV
function exportcoursesToCSV() {
    const rows = Array.from(document.querySelectorAll("#coursesTableBody tr"))
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
