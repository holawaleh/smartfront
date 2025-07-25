let students = JSON.parse(localStorage.getItem('students') || '[]');
let editingIndex = null;

const tableBody = document.querySelector('#student-table tbody');
const form = document.getElementById('student-form');
const modal = document.getElementById('student-modal');
const addBtn = document.getElementById('add-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search');
const modalTitle = document.getElementById('modal-title');

function renderTable(list = students) {
  tableBody.innerHTML = '';
  list.forEach((s, i) => {
    tableBody.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.matric}</td>
        <td>${s.level}</td>
        <td>${s.department}</td>
        <td>
          <button onclick="editStudent(${i})">Edit</button>
          <button onclick="deleteStudent(${i})">Delete</button>
        </td>
      </tr>`;
  });
}
renderTable();

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  form.reset();
  modal.classList.add('hidden');
  editingIndex = null;
  modalTitle.textContent = 'Add Student';
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const newStudent = {
    name: document.getElementById('name').value,
    matric: document.getElementById('matric').value,
    level: document.getElementById('level').value,
    department: document.getElementById('department').value,
  };

  if (editingIndex !== null) {
    students[editingIndex] = newStudent;
  } else {
    students.push(newStudent);
  }

  localStorage.setItem('students', JSON.stringify(students));
  renderTable();
  closeModal();
});

addBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);

function editStudent(index) {
  const s = students[index];
  document.getElementById('name').value = s.name;
  document.getElementById('matric').value = s.matric;
  document.getElementById('level').value = s.level;
  document.getElementById('department').value = s.department;
  editingIndex = index;
  modalTitle.textContent = 'Edit Student';
  openModal();
}

function deleteStudent(index) {
  if (confirm('Delete this student?')) {
    students.splice(index, 1);
    localStorage.setItem('students', JSON.stringify(students));
    renderTable();
  }
}

searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(term) ||
    s.matric.toLowerCase().includes(term) ||
    s.level.toLowerCase().includes(term) ||
    s.department.toLowerCase().includes(term)
  );
  renderTable(filtered);
});

window.sortBy = function (key) {
  students.sort((a, b) => a[key].localeCompare(b[key]));
  renderTable();
};
