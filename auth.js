document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const errorBox = document.getElementById('login-error');

      try {
        const res = await fetch('https://bravetosmart.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem('auth', 'true');
          localStorage.setItem('token', data.token);
          window.location.href = 'dashboard.html';
        } else {
          errorBox.textContent = data.message || 'Login failed.';
        }
      } catch (err) {
        errorBox.textContent = 'Network error';
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }

  // Auth Guard
  const isDashboard = location.pathname.includes('dashboard.html');
  const isLoggedIn = localStorage.getItem('auth') === 'true';
  if (isDashboard && !isLoggedIn) {
    location.href = 'index.html';
  }
});
