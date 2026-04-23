function doLogin() {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}
