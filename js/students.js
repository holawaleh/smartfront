document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "/login.html";

  fetch("https://bravetosmart.onrender.com/api/student/", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => {
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    }
    return res.json();
  })
  .then(data => {
    const tbody = document.getElementById("studentsTableBody");
    tbody.innerHTML = "";

    data.forEach(student => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${student.name}</td>
        <td>${student.matric}</td>
        <td>${student.uid}</td>
        <td>${student.level}</td>
      `;
      tbody.appendChild(tr);
    });
  })
  .catch(err => {
    console.error("Failed to load students:", err);
  });
});
