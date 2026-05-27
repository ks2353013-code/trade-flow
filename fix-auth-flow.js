const fs = require("fs");
const path = require("path");

const root = process.cwd();

function file(p) {
  return path.join(root, p);
}

function write(p, content) {
  fs.writeFileSync(file(p), content, "utf8");
  console.log("✅ Fixed:", p);
}

function read(p) {
  return fs.readFileSync(file(p), "utf8");
}

const authHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TradeFlow Login / Signup</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body{margin:0;min-height:100vh;background:linear-gradient(135deg,#020617,#0f172a);color:white;font-family:Inter,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:30px}
    .box{width:100%;max-width:900px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .card{background:rgba(15,23,42,.9);border:1px solid rgba(148,163,184,.18);border-radius:26px;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
    input{width:100%;padding:14px;border-radius:14px;border:1px solid rgba(148,163,184,.2);background:#020617;color:white;margin-bottom:14px}
    .btn{width:100%;padding:14px;border-radius:999px;border:none;font-weight:900;color:white;cursor:pointer;background:linear-gradient(135deg,#38bdf8,#8b5cf6)}
    .muted{color:#94a3b8;line-height:1.6}
    a{color:#7dd3fc;text-decoration:none}
    @media(max-width:800px){.box{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="box">
    <div class="card">
      <h1>TradeFlow™</h1>
      <p class="muted">Login to your AI Export / Import SaaS workspace.</p>
      <form onsubmit="return false;">
        <input id="loginEmail" type="email" placeholder="Email">
        <input id="loginPassword" type="password" placeholder="Password">
        <button type="button" class="btn" onclick="loginUser(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value)">Login</button>
      </form>
    </div>

    <div class="card">
      <h2>Create Account</h2>
      <p class="muted">Start your TradeFlow workspace and complete onboarding.</p>
      <form onsubmit="return false;">
        <input id="name" type="text" placeholder="Your Name">
        <input id="companyName" type="text" placeholder="Company Name">
        <input id="email" type="email" placeholder="Email">
        <input id="password" type="password" placeholder="Password">
        <button type="button" class="btn" onclick="signupUser()">Create Account</button>
      </form>
      <p class="muted"><a href="/">Back to landing page</a></p>
    </div>
  </div>

  <script src="/js/auth.js"></script>
</body>
</html>`;

write("frontend/auth.html", authHtml);

let server = read("backend/server.js");

server = server.replace(
  /app\.get\("\/login"[\s\S]*?\}\);\s*app\.get\("\/signup"[\s\S]*?\}\);/,
  `app.get("/login", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/auth.html"
    )
  );
});

app.get("/signup", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/auth.html"
    )
  );
});`
);

write("backend/server.js", server);

let landing = read("frontend/landing.html");
landing = landing.replace(/href="\/app"/g, 'href="/signup"');
landing = landing.replace(/<a class="ghost" href="\/signup">Login<\/a>/g, '<a class="ghost" href="/login">Login</a>');
landing = landing.replace(/<a class="ghost" href="\/app">Login<\/a>/g, '<a class="ghost" href="/login">Login</a>');
write("frontend/landing.html", landing);

const filesToFix = [
  "frontend/js/app.js",
  "frontend/js/auth.js",
  "frontend/index.html"
];

for (const f of filesToFix) {
  if (!fs.existsSync(file(f))) continue;

  let content = read(f);
  content = content.replace(/login\.html/g, "/login");
  content = content.replace(/signup\.html/g, "/signup");
  content = content.replace(/master-login\.html/g, "/login");

  write(f, content);
}

for (const oldFile of [
  "frontend/login.html",
  "frontend/signup.html",
  "frontend/master-login.html"
]) {
  if (fs.existsSync(file(oldFile))) {
    fs.unlinkSync(file(oldFile));
    console.log("🗑️ Deleted:", oldFile);
  }
}

console.log("✅ TradeFlow auth routing fixed completely.");