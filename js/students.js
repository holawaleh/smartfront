document.addEventListener("DOMContentLoaded", () => {
  // Use the same token key as your auth system
  const token = localStorage.getItem("authToken"); // Changed from "token" to "authToken"
  if (!token) return window.location.href = "login.html"; // Removed leading slash

  fetch("https://bravetosmart.onrender.com/api/student/", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => {
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("authToken"); // Changed from "token" to "authToken"
      window.location.href = "login.html"; // Removed leading slash
    }
    return res.json();
  })
  .then(data => {
    const tbody = document.getElementById("studentsTableBody");
    tbody.innerHTML = "";

    // Check if data is an array or has a data property
    const students = Array.isArray(data) ? data : (data.data || []);

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">No students found</td>
        </tr>
      `;
      return;
    }

    students.forEach(student => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${student.name || ''}</td>
        <td>${student.matricNo || student.matric || ''}</td>
        <td>${student.email || ''}</td>
        <td>${student.level || ''}</td>
        <td>${student.phone || ''}</td>
        <td>${student.department || ''}</td>
        <td>${student.uid || ''}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editStudent('${student.id || student._id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student.id || student._id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  })
  .catch(err => {
    console.error("Failed to load students:", err);
    const tbody = document.getElementById("studentsTableBody");
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Failed to load students
        </td>
      </tr>
    `;
  });
});

// Add student form handler
document.addEventListener("DOMContentLoaded", () => {
  const addStudentForm = document.getElementById("addStudentForm");
  if (addStudentForm) {
    addStudentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const saveBtn = document.getElementById("saveStudentBtn");
      const saveSpinner = document.getElementById("saveSpinner");
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        alert("No authentication token found. Please login again.");
        window.location.href = "login.html";
        return;
      }
      
      // Show loading state
      saveSpinner.classList.remove("d-none");
      saveBtn.disabled = true;
      
      try {
        const formData = new FormData(addStudentForm);
        const studentData = {};
        for (const [key, value] of formData.entries()) {
          studentData[key] = value;
        }
        
        const response = await fetch("https://bravetosmart.onrender.com/api/student/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(studentData)
        });
        
        if (response.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.removeItem("authToken");
          window.location.href = "login.html";
          return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
          // Show success message
          const alertContainer = document.getElementById("alertContainer");
          if (alertContainer) {
            alertContainer.innerHTML = `
              <div class="alert alert-success alert-dismissible fade show" role="alert">
                Student added successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
            `;
          }
          
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById("addStudentModal"));
          modal.hide();
          
          // Reset form
          addStudentForm.reset();
          
          // Reload page to show new student
          window.location.reload();
          
        } else {
          alert(result.message || "Failed to add student");
        }
        
      } catch (error) {
        console.error("Error adding student:", error);
        alert("Failed to add student. Please try again.");
      } finally {
        // Hide loading state
        saveSpinner.classList.add("d-none");
        saveBtn.disabled = false;
      }
    });
  }
});

// Placeholder functions for edit and delete (you can implement these later)
function editStudent(studentId) {
  console.log("Edit student:", studentId);
  // TODO: Implement edit functionality
}

function deleteStudent(studentId) {
  if (confirm("Are you sure you want to delete this student?")) {
    console.log("Delete student:", studentId);
    // TODO: Implement delete functionality
  }
}