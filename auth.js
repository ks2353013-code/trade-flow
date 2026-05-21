const API_BASE = "http://localhost:5000";

async function signupUser(name, email, password, companyName) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
      companyName,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Signup failed");
    return;
  }

  localStorage.setItem("tradeflowUser", JSON.stringify(data));
  alert("Signup successful");
  window.location.href = "index.html";
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Login failed");
    return;
  }

  localStorage.setItem("tradeflowUser", JSON.stringify(data));
  alert("Login successful");
  window.location.href = "index.html";
}

function logoutUser() {
  localStorage.removeItem("tradeflowUser");
  window.location.href = "login.html";
}

function protectDashboard() {
  const user = localStorage.getItem("tradeflowUser");

  if (!user) {
    window.location.href = "login.html";
  }
}