# Tailo Supabase auth email templates

Tailo’s mobile app uses **8-digit OTP codes** in the app, not magic links. Every verification email must show `{{ .Token }}` prominently.

Local stack: paths and subjects are wired in [../config.toml](../config.toml) (`otp_length = 8`).

Hosted project: copy each HTML file into **Supabase Dashboard → Authentication → Email Templates**.

---

## Template map (app flow → Supabase template)

| File                                                                       | Dashboard template name             | Subject (suggested)                  | Mobile flow                                                                                             |
| -------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [confirmation.html](./confirmation.html)                                   | **Confirm signup**                  | Welcome to Tailo — verify your email | Future direct email signup (`signUp`). Not used while `enable_confirmations = false`.                   |
| [email_change.html](./email_change.html)                                   | **Change email address**            | Your Tailo verification code         | **Save your memories** / **Create account** — `updateUser({ email })` + `verifyOtp` type `email_change` |
| [magic_link.html](./magic_link.html)                                       | **Magic Link**                      | Your Tailo sign-in code              | **Log in with code** — `signInWithOtp` + `verifyOtp` type `email`                                       |
| [recovery.html](./recovery.html)                                           | **Reset password**                  | Reset your Tailo password            | **Forgot password** — `resetPasswordForEmail` + `verifyOtp` type `recovery`                             |
| [invite.html](./invite.html)                                               | **Invite user**                     | You're invited to Tailo              | Admin invites (optional; keep OTP-ready)                                                                |
| [reauthentication.html](./reauthentication.html)                           | **Reauthentication**                | Confirm it's you — Tailo             | Sensitive actions if `secure_password_change` is enabled later                                          |
| [password_changed_notification.html](./password_changed_notification.html) | **Password changed** (notification) | Your Tailo password was changed      | Informational only — no OTP                                                                             |

---

## Hosted setup (one-time per environment)

**Automated (recommended, linked CLI):**

```bash
npx supabase login
npx supabase link --project-ref sgxtyxvithlmuuofkzlk
npm run push:supabase:email-templates
```

Uses `npm run push:supabase:email-templates` (`supabase config push --workdir supabase`) to upload subjects, HTML bodies, and `otp_length = 8` from [config.toml](../config.toml). Template HTML lives in this directory; `content_path` in config is `templates/*.html` relative to the Supabase project dir.

**Manual (dashboard):**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**.
2. For each row in the table above:
   - Open the template.
   - Set **Subject** to the suggested subject (or match `config.toml`).
   - Paste the full HTML from the matching file (body only is fine if the editor strips `<html>`).
   - Ensure the template includes **`{{ .Token }}`** for OTP templates (not only `{{ .ConfirmationURL }}`).
3. **Authentication → Providers → Email**: keep Email enabled for account upgrade and sign-in.
4. **Authentication → Providers → Anonymous**: enabled (Tailo anonymous-first bootstrap).
5. Confirm **OTP length** is **8** under Auth settings (matches app + `otp_length` in `config.toml`).

### Auth settings that must match the app

Hosted URL configuration:

| Setting              | Value                       |
| -------------------- | --------------------------- |
| Site URL             | `https://tailo.mtxforge.com` |
| Redirect URLs        | `https://tailo.mtxforge.com` |
| Local redirect URLs  | `http://127.0.0.1:3000`, `https://127.0.0.1:3000`, `http://localhost:3000`, `https://localhost:3000` |

| Setting                    | Recommended     | Why                                                              |
| -------------------------- | --------------- | ---------------------------------------------------------------- |
| OTP length                 | **8**           | App inputs and validation expect 8 digits                        |
| Enable email confirmations | **Off** for MVP | Anonymous-first; linking uses `email_change`, not signup confirm |
| Secure password change     | **Off** for MVP | Avoid extra reauth email until Settings supports it              |

---

## Local testing (Inbucket)

```bash
npx supabase start
# Trigger flows from the app, then open:
open http://127.0.0.1:54324
```

Emails appear in Inbucket; confirm each message shows an **8-digit code** and calm Tailo copy.

---

## QA checklist (dev + prod)

Run after pasting templates into the dashboard:

- [ ] **Change email address** — Settings → Account → send code → email shows `{{ .Token }}` as 8 digits, subject “Your Tailo verification code”
- [ ] **Magic Link** — Log in → “Use a sign-in code instead” → email shows 8-digit code, subject “Your Tailo sign-in code”
- [ ] **Reset password** — Forgot password → email shows 8-digit code, subject “Reset your Tailo password”
- [ ] **Confirm signup** — (if enabled later) signup email shows 8-digit code, not link-only
- [ ] No template relies on **link-only** copy for a flow the app implements as OTP
- [ ] **Password changed** notification sends after `setAccountPassword` (optional sanity check)

Verify templates in repo:

```bash
node scripts/verify-supabase-email-templates.mjs
```

---

## Variables (Go template)

| Variable                 | Used in                                                  |
| ------------------------ | -------------------------------------------------------- |
| `{{ .Token }}`           | All OTP templates (**required**)                         |
| `{{ .Email }}`           | Sign-in, recovery, invite, reauth                        |
| `{{ .NewEmail }}`        | Email change (new address)                               |
| `{{ .ConfirmationURL }}` | **Do not use** as the primary CTA for Tailo mobile flows |

---

## Change log

| Date       | Change                                                          |
| ---------- | --------------------------------------------------------------- |
| 2026-05-20 | Full OTP template set for Tailo auth flows + hosted setup guide |
