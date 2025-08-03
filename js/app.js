document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});

function setLoading(buttonId, isLoading, defaultText = "Login") {
    const button = document.getElementById(buttonId);
    if (!button) return;

    const spinner = button.querySelector(".spinner-border");

    if (isLoading) {
        if (spinner) spinner.classList.remove("d-none");
        button.setAttribute("disabled", "disabled");
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Loading...`;
    } else {
        if (spinner) spinner.classList.add("d-none");
        button.removeAttribute("disabled");
        button.innerHTML = `<i class="fas fa-sign-in-alt me-2"></i>${defaultText}`;
    }
}


function showAlert(message, type = "info") {
    const alertContainer = document.getElementById("alertContainer");
    if (!alertContainer) return;

    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}


function logout() {
    localStorage.removeItem('token');  // ✅ Fix key
    localStorage.removeItem('currentUser'); // If used
    window.location.href = 'login.html';
}
