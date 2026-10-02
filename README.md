# Marketing Ticket Hub

A three-pane React dashboard for the marketing ticket system you are building across:

- Qualicare
- Tutor Doctor
- Code Wiz

It reads live ticket metadata from `tickets`, conversation messages from `ticket_threads`, and sends replies through a protected Supabase Edge Function that calls Zoho Desk.

## Included

- Supabase magic-link login
- Unified ticket list
- Brand filters
- Open / Waiting / Overdue / Unassigned views
- Search
- Ticket details
- Full thread timeline
- Live Supabase Realtime refresh
- Reply composer
- `reply-to-zoho-ticket` Edge Function template
- Netlify config
- SQL for authenticated read policies

## 1. Local setup

Install Node.js 20+.

```bash
npm install
cp .env.example .env
```

Fill `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Use the **anon/publishable** key in the browser. Never put the Supabase service-role/secret key in `.env` for the frontend.

Start:

```bash
npm run dev
```

## 2. Supabase Auth

In Supabase:

**Authentication → URL Configuration**

Add your local URL:

```text
http://localhost:5173
```

Later add the Netlify production URL too.

The app uses magic-link login. Make sure the team members who should access the dashboard can receive Supabase auth emails.

## 3. RLS / database access

Open:

`supabase/setup.sql`

Review it, then run it in Supabase SQL Editor.

It enables RLS and gives authenticated users read-only access to:

- `tickets`
- `ticket_threads`

Your sync Edge Functions use the service role and continue to write normally.

If either table is already in the Realtime publication, the final `alter publication` statement may report that it already exists. In that case, skip that line.

## 4. Deploy reply Edge Function

Create/deploy:

```text
supabase/functions/reply-to-zoho-ticket/index.ts
```

The frontend calls the function using the logged-in Supabase user's JWT. Do **not** disable JWT verification for this function.

The function requires your existing Zoho secrets plus one new `from` address per brand:

```text
ZOHO_QUALICARE_FROM_EMAIL
ZOHO_TUTORDOCTOR_FROM_EMAIL
ZOHO_CODEWIZ_FROM_EMAIL
```

Only configure the brands that are ready to send replies.

Each value must be an email address that is configured/allowed as a **From Address** in that specific Zoho Desk portal.

Example:

```text
ZOHO_QUALICARE_FROM_EMAIL = marketing-support@your-qualicare-domain.com
```

Do not guess this value. Check the actual Qualicare Zoho Desk configured From Addresses.

The Edge Function also uses your existing:

```text
ZOHO_QUALICARE_CLIENT_ID
ZOHO_QUALICARE_CLIENT_SECRET
ZOHO_QUALICARE_REFRESH_TOKEN
ZOHO_QUALICARE_ORG_ID

ZOHO_TUTORDOCTOR_CLIENT_ID
ZOHO_TUTORDOCTOR_CLIENT_SECRET
ZOHO_TUTORDOCTOR_REFRESH_TOKEN
ZOHO_TUTORDOCTOR_ORG_ID

ZOHO_CODEWIZ_CLIENT_ID
ZOHO_CODEWIZ_CLIENT_SECRET
ZOHO_CODEWIZ_REFRESH_TOKEN
ZOHO_CODEWIZ_ORG_ID
```

Your OAuth scope needs permission to send/update ticket replies. The `Desk.tickets.ALL` token you generated for Tutor Doctor/Qualicare is suitable for the ticket operations we are using.

## 5. Reply flow

When someone clicks **Send reply**:

1. Browser invokes `reply-to-zoho-ticket` using the logged-in Supabase JWT.
2. Function looks up the ticket in Supabase.
3. It selects the correct Zoho credentials based on `source`.
4. It POSTs to:
   `https://desk.zoho.com/api/v1/tickets/{ticketId}/sendReply`
5. The reply is sent through the configured Zoho Desk From Address.
6. The function invokes your existing `sync-zoho-ticket`.
7. The new outgoing thread appears in `ticket_threads`.
8. Supabase Realtime refreshes the conversation.

Zoho requires `fromEmailAddress` to be a From Address configured in that Desk portal.

## 6. Netlify deployment

Push the project to GitHub or drag/drop a built deployment to Netlify.

Recommended Git deployment:

- Build command: `npm run build`
- Publish directory: `dist`

Add these environment variables in Netlify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Then add the final Netlify URL to:

**Supabase → Authentication → URL Configuration → Redirect URLs**

## 7. First production test

Do the first reply test using Qualicare, since the Qualicare native webhook is already confirmed working.

1. Open a Qualicare ticket in the dashboard.
2. Confirm its email and conversation look correct.
3. Set `ZOHO_QUALICARE_FROM_EMAIL` to the real allowed Zoho From Address.
4. Send a short test reply.
5. Confirm it appears in Zoho Desk.
6. Confirm it appears as a new outgoing row in `ticket_threads`.
7. Reply back from the recipient/contact side.
8. Confirm the Qualicare webhook brings that inbound thread into the dashboard.

Only after that should you enable reply sending for Tutor Doctor and Code Wiz.

## Security

- Never put a Supabase secret/service-role key in frontend environment variables.
- Keep `sync-zoho-ticket` protected.
- Keep `reply-to-zoho-ticket` protected.
- The only public Edge Function should be the narrow native Zoho webhook receiver(s) you intentionally configured.
- Rotate any credentials/tokens that have previously been exposed outside your secrets manager before production.
