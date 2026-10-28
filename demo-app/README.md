# Demo login app

A small fake app to run generated Playwright tests against. It implements the
sample login requirement:

- Email and password are required.
- Password must be at least 8 characters.
- 5 failed attempts lock the account for 15 minutes.
- A successful login redirects to the dashboard.
- "Remember me" keeps the user logged in for 30 days.

## Run it

```bash
npm run demo
```

It starts at http://localhost:4000. All state is in memory. To unlock the
account and clear sessions, click **Reset demo** on the login page, restart the
server, or `curl -X POST http://localhost:4000/__reset`. Set `LOCKOUT_MINUTES` to
change the lockout length, e.g. `LOCKOUT_MINUTES=1 npm run demo`.

Test account: `user@example.com` / `Passw0rd!`

## Use it with codegen

In the copilot, open a completed run for the login requirement, set the base
URL to `http://localhost:4000`, and paste this into **Page details**:

```
Routes: /login (login form), /dashboard (requires login; unauthenticated users are redirected to /login).
Login form fields: textbox labelled "Email", textbox labelled "Password", checkbox labelled "Remember me", button "Log in".
Validation and error messages are shown as role="alert" with this exact text:
- "Email is required."
- "Enter a valid email address."
- "Password is required."
- "Password must be at least 8 characters."
- "Invalid email or password."
- "Your account is locked. Try again in 15 minutes."
Dashboard: heading "Dashboard", text "Welcome, <email>.", button "Log out" (goes back to /login).
Test account: user@example.com / Passw0rd!
Lockouts are per account and stored in memory. POST /__reset clears all lockouts and sessions.
```
