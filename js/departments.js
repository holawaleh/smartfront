// js/departments.js
// Handles department registration and management

document.addEventListener('DOMContentLoaded', () => {
  fetchDepartments();

  const form = document.getElementById('department-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('department-name').value.trim();
      if (!name) {
        showDeptAlert('Department name is required', 'danger');
        return;
      }
      try {
        const res = await fetch('/api/departments/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error registering department');
        showDeptAlert('Department registered successfully', 'success');
        form.reset();
        fetchDepartments();
      } catch (err) {
        showDeptAlert(err.message, 'danger');
      }
    });
  }
});

async function fetchDepartments() {
  const tbody = document.getElementById('departments-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
  try {
    const res = await fetch('/api/departments');
    const departments = await res.json();
    if (!Array.isArray(departments)) throw new Error('Failed to load departments');
    tbody.innerHTML = departments.length
      ? departments.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${d.name}</td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteDepartment('${d._id}')">Delete</button></td>
        </tr>
      `).join('')
      : '<tr><td colspan="3">No departments found</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">${err.message}</td></tr>`;
  }
}

async function deleteDepartment(id) {
  if (!confirm('Delete this department?')) return;
  try {
    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Error deleting department');
    showDeptAlert('Department deleted', 'success');
    fetchDepartments();
  } catch (err) {
    showDeptAlert(err.message, 'danger');
  }
}

function showDeptAlert(msg, type) {
  let alert = document.getElementById('department-alert');
  if (!alert) {
    alert = document.createElement('div');
    alert.id = 'department-alert';
    alert.className = 'alert mt-2';
    document.getElementById('department-section').prepend(alert);
  }
  alert.className = `alert alert-${type} mt-2`;
  alert.textContent = msg;
  setTimeout(() => { alert.textContent = ''; alert.className = 'alert mt-2'; }, 3000);
}
