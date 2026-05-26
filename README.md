# HankoFlow Document Approval System

Simple implementation of the diagram, without n8n:

1. Employee sends or submits an Excel file path.
2. The backend creates a request and the first approval log.
3. A Supabase Edge Function sends email notifications through Resend.
4. Supervisor, Assistant Manager, then Manager open the Excel file, affix Hanko, save, and click Approve in the email.
5. Supabase `pg_cron` calls the Edge Function hourly to send overdue reminders and extend deadlines by 2 days.

## Fastest Demo Setup

Use the simulator first. It proves the workflow without needing a deployed email function.

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run migrate
npm start
```

Open another terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Demo Flow

1. Sign in as `Supervisor`.
2. Click `Simulate Email Request` and submit a sample Excel path.
3. Confirm the Supervisor step.
4. Sign out and sign in as `Assistant Manager`; confirm.
5. Sign out and sign in as `Manager`; confirm.
6. Sign in as `System Admin` to view the audit trail.

## Production Wiring

Keep the app small:

- React dashboard for employee submission and admin audit trail.
- Node/Express API for request creation, email approval links, rejection, and audit reads.
- Supabase Postgres for `requests`, `approval_logs`, and `reminders`.
- Supabase Edge Function `approval-mailer` for approval, final status, and reminder emails.
- Supabase `pg_cron` + `pg_net` for hourly overdue reminder checks.
- Resend for low-friction email delivery to Outlook/Gmail/company inboxes.

## Supabase Setup

Deploy the Edge Function:

```powershell
supabase functions deploy approval-mailer --no-verify-jwt
```

Set Edge Function secrets:

```powershell
supabase secrets set APPROVAL_MAILER_TOKEN=replace-with-a-long-random-token
supabase secrets set HANKOFLOW_SUPABASE_URL=https://lcfadiceswkkokyvvgoc.supabase.co
supabase secrets set HANKOFLOW_SERVICE_ROLE_KEY=replace-with-service-role-key
supabase secrets set FRONTEND_URL=https://your-dashboard-url
supabase secrets set RESEND_API_KEY=replace-with-resend-api-key
supabase secrets set RESEND_FROM_EMAIL="HankoFlow <onboarding@resend.dev>"
```

Run the SQL in [supabase/migrations/202605260001_pg_cron_reminders.sql](C:/Users/acer/.gemini/antigravity-ide/scratch/document-approval-system/supabase/migrations/202605260001_pg_cron_reminders.sql:1), replacing `REPLACE_WITH_APPROVAL_MAILER_TOKEN` in the cron block first.

Then set the backend to call the Edge Function:

```env
SUPABASE_APPROVAL_MAILER_URL=https://lcfadiceswkkokyvvgoc.functions.supabase.co/approval-mailer
SUPABASE_FUNCTION_AUTH_TOKEN=replace-with-the-same-approval-mailer-token
PUBLIC_API_URL=https://your-public-backend-url
```

For local testing, `PUBLIC_API_URL=http://localhost:5000` works only if the approver opens the email on the same machine running the backend. For client testing, deploy the backend first and use that public URL.

## Configuration

Set the real approver emails in both env files:

```env
APPROVER_LEVEL_1_EMAIL=supervisor@client.co.jp
APPROVER_LEVEL_2_EMAIL=assistant.manager@client.co.jp
APPROVER_LEVEL_3_EMAIL=manager@client.co.jp
```

```env
VITE_APPROVER_LEVEL_1_EMAIL=supervisor@client.co.jp
VITE_APPROVER_LEVEL_2_EMAIL=assistant.manager@client.co.jp
VITE_APPROVER_LEVEL_3_EMAIL=manager@client.co.jp
```
