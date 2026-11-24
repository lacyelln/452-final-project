# Web app

React + TypeScript (Vite) front end for the AI Use Tracker. It talks directly to Supabase; there is no backend of our own.

To run you have to fill in VITE_SUPABASE_ANON_KEY in your own `.env` file
```
npm install
npm run dev            # http://localhost:5173
```

## How sign-in works

Only staff can use the site. Staff sign in with a one-time code emailed to their BYU address (no passwords).

```mermaid
sequenceDiagram
    actor TA
    participant App as React app
    participant Auth as Supabase Auth
    participant DB as Postgres
    participant Mail as Gmail SMTP

    TA->>App: enter BYU email
    App->>Auth: signInWithOtp(email)
    Auth->>DB: before-user-created hook: is this email in the staff table (with staff.active = True)?
    DB-->>Auth: yes / no (no rejects with "not permitted")
    Auth->>DB: create auth.users row, trigger links staff.user_id
    Auth->>Mail: send code
    Mail-->>TA: email with 8-digit code
    TA->>App: enter code
    App->>Auth: verifyOtp(email, code)
    Auth-->>App: session (JWT + refresh token)
    App->>DB: queries carry the JWT
    DB-->>App: rows allowed by RLS (is_active_staff)
```

Codes are sent from `cs110.aiflagtracker@gmail.com` and often land in Junk Email in Outlook.

