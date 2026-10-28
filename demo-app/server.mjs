// Dummy login app used as a target for the generated Playwright tests.
// Implements the sample login requirement: required fields, 8-character
// minimum password, lockout after 5 failed attempts, redirect to the
// dashboard, and a 30-day "Remember me" cookie.
//
// Run with: npm run demo   (http://localhost:4000)
// All state is in memory, so restarting the server resets it.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 4000);
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES ?? 15);
const REMEMBER_ME_DAYS = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USERS = new Map([["user@example.com", "Passw0rd!"]]);

const failedAttempts = new Map(); // email -> { count, lockedUntil }
const sessions = new Map(); // session id -> email

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} · Demo App</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 64px auto; padding: 0 16px; color: #111; }
    form { display: flex; flex-direction: column; gap: 12px; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
    label.checkbox { flex-direction: row; align-items: center; gap: 8px; }
    input[type=text], input[type=password] { padding: 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
    button { padding: 8px 12px; border: 0; border-radius: 6px; background: #111; color: #fff; font-size: 14px; cursor: pointer; }
    .error { background: #fde8e8; color: #9b1c1c; border-radius: 6px; padding: 8px 12px; font-size: 14px; margin: 0; }
    .hint { color: #666; font-size: 12px; }
    button.secondary { background: #fff; color: #111; border: 1px solid #ccc; margin-top: 8px; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function loginPage({ errors = [], email = "" } = {}) {
  const errorHtml = errors
    .map((e) => `<p class="error" role="alert">${escapeHtml(e)}</p>`)
    .join("\n");
  return layout(
    "Log in",
    `<h1>Log in</h1>
<form method="post" action="/login" novalidate>
  ${errorHtml}
  <label>Email
    <input type="text" name="email" value="${escapeHtml(email)}" autocomplete="username">
  </label>
  <label>Password
    <input type="password" name="password" autocomplete="current-password">
  </label>
  <label class="checkbox">
    <input type="checkbox" name="remember"> Remember me
  </label>
  <button type="submit">Log in</button>
</form>
<p class="hint">Test account: user@example.com / Passw0rd!</p>
<form method="post" action="/__reset?redirect=1">
  <button type="submit" class="secondary">Reset demo (unlock account)</button>
</form>`,
  );
}

function dashboardPage(email) {
  return layout(
    "Dashboard",
    `<h1>Dashboard</h1>
<p>Welcome, ${escapeHtml(email)}.</p>
<form method="post" action="/logout">
  <button type="submit">Log out</button>
</form>`,
  );
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k]) => k),
  );
}

async function readForm(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return new URLSearchParams(body);
}

function send(res, status, html, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...headers });
  res.end(html);
}

function redirect(res, location, headers = {}) {
  res.writeHead(303, { Location: location, ...headers });
  res.end();
}

function currentUser(req) {
  const sid = parseCookies(req).sid;
  return sid ? sessions.get(sid) : undefined;
}

function handleLogin(form) {
  const email = (form.get("email") ?? "").trim();
  const password = form.get("password") ?? "";
  const remember = form.get("remember") === "on";

  const errors = [];
  if (!email) errors.push("Email is required.");
  else if (!EMAIL_PATTERN.test(email)) errors.push("Enter a valid email address.");
  if (!password) errors.push("Password is required.");
  else if (password.length < 8) errors.push("Password must be at least 8 characters.");
  if (errors.length > 0) return { errors, email };

  const key = email.toLowerCase();
  const record = failedAttempts.get(key) ?? { count: 0, lockedUntil: 0 };

  if (record.lockedUntil > Date.now()) {
    return {
      errors: [`Your account is locked. Try again in ${LOCKOUT_MINUTES} minutes.`],
      email,
    };
  }

  if (USERS.get(key) !== password) {
    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.count = 0;
      record.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60_000;
      failedAttempts.set(key, record);
      return {
        errors: [`Your account is locked. Try again in ${LOCKOUT_MINUTES} minutes.`],
        email,
      };
    }
    failedAttempts.set(key, record);
    return { errors: ["Invalid email or password."], email };
  }

  failedAttempts.delete(key);
  return { user: key, remember };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = `${req.method} ${url.pathname}`;

  switch (route) {
    case "GET /":
      return redirect(res, currentUser(req) ? "/dashboard" : "/login");

    case "GET /login":
      if (currentUser(req)) return redirect(res, "/dashboard");
      return send(res, 200, loginPage());

    case "POST /login": {
      const result = handleLogin(await readForm(req));
      if (result.errors) return send(res, 200, loginPage(result));

      const sid = randomUUID();
      sessions.set(sid, result.user);
      const maxAge = result.remember ? `; Max-Age=${REMEMBER_ME_DAYS * 24 * 60 * 60}` : "";
      return redirect(res, "/dashboard", {
        "Set-Cookie": `sid=${sid}; Path=/; HttpOnly; SameSite=Lax${maxAge}`,
      });
    }

    case "GET /dashboard": {
      const user = currentUser(req);
      if (!user) return redirect(res, "/login");
      return send(res, 200, dashboardPage(user));
    }

    case "POST /logout": {
      sessions.delete(parseCookies(req).sid);
      return redirect(res, "/login", { "Set-Cookie": "sid=; Path=/; Max-Age=0" });
    }

    // Test helper: clears lockouts and sessions. Used by tests before each run
    // and by the "Reset demo" button on the login page.
    case "POST /__reset":
      failedAttempts.clear();
      sessions.clear();
      if (url.searchParams.has("redirect")) return redirect(res, "/login");
      res.writeHead(204);
      return res.end();

    default:
      return send(res, 404, layout("Not found", "<h1>Not found</h1>"));
  }
});

server.listen(PORT, () => {
  console.log(`Demo app running at http://localhost:${PORT}`);
});
