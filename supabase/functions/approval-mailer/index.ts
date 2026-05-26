type ApprovalRequestedEvent = {
  eventType: 'approval_requested';
  requestId: number;
  level: number;
  filePath: string;
  submittedBy: string;
  approverEmail: string;
  deadline: string;
  approveUrl?: string;
};

type FinalStatusEvent = {
  eventType: 'final_status';
  requestId: number;
  status: 'approved' | 'rejected';
  filePath: string;
  submittedBy: string;
  levelRejected?: number | null;
};

type ReminderBatchEvent = {
  eventType: 'reminder_batch';
  dashboardLink?: string;
};

type MailerEvent = ApprovalRequestedEvent | FinalStatusEvent | ReminderBatchEvent;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getApproverRole(level: number) {
  if (level === 1) return 'Supervisor';
  if (level === 2) return 'Assistant Manager';
  if (level === 3) return 'Manager';
  return `Level ${level}`;
}

function isAuthorized(req: Request) {
  const expectedToken = Deno.env.get('APPROVAL_MAILER_TOKEN');
  if (!expectedToken) return true;

  const authorization = req.headers.get('authorization') || '';
  const bearerToken = authorization.replace(/^Bearer\s+/i, '');
  return bearerToken === expectedToken;
}

async function sendEmail(to: string, subject: string, htmlContent: string) {
  const resendApiKey = getRequiredEnv('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'HankoFlow <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html: htmlContent
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend send failed: ${JSON.stringify(result)}`);
  }

  return result;
}

function approvalEmail(event: ApprovalRequestedEvent) {
  if (!event.approveUrl) {
    throw new Error('approval_requested email requires approveUrl. Create approval emails through the backend request API, not by calling the mailer directly without approveUrl.');
  }

  const approveUrl = event.approveUrl;
  return {
    to: event.approverEmail,
    subject: `[Action Required] Level ${event.level} Document Approval: Request #${event.requestId}`,
    htmlContent: `
      <h2>Document Approval Request #${event.requestId}</h2>
      <p>A document approval request requires your action.</p>
      <ul>
        <li><strong>Submitted By:</strong> ${event.submittedBy}</li>
        <li><strong>File Path:</strong> <code>${event.filePath}</code></li>
        <li><strong>Level:</strong> ${event.level} (${getApproverRole(event.level)})</li>
        <li><strong>Deadline:</strong> ${new Date(event.deadline).toLocaleString()}</li>
      </ul>
      <p>Please open the Excel file path above, apply your Hanko, and save it.</p>
      <p>After saving the Excel file, click Approve below:</p>
      <p>
        <a href="${approveUrl}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;text-decoration:none;border-radius:5px;">Approve</a>
      </p>
      <p style="font-size:12px;color:#666;">If the button does not open, copy this link into your browser:<br><a href="${approveUrl}">${approveUrl}</a></p>
    `
  };
}

function finalStatusEmail(event: FinalStatusEvent) {
  const approved = event.status === 'approved';
  const rejectedCopy = event.levelRejected ? ` at Level ${event.levelRejected} (${getApproverRole(event.levelRejected)})` : '';

  return {
    to: event.submittedBy,
    subject: `[${event.status.toUpperCase()}] Your Document Approval Request #${event.requestId}`,
    htmlContent: `
      <h2>Request ${approved ? 'Approved' : 'Rejected'}</h2>
      <p>Your document approval request was ${approved ? 'completed successfully' : `rejected${rejectedCopy}`}.</p>
      <ul>
        <li><strong>Request ID:</strong> #${event.requestId}</li>
        <li><strong>File Path:</strong> <code>${event.filePath}</code></li>
        <li><strong>Status:</strong> ${event.status}</li>
      </ul>
    `
  };
}

function reminderEmail(item: Record<string, unknown>, dashboardLink: string) {
  const level = Number(item.level);
  const requestId = Number(item.request_id);

  return {
    to: String(item.approver_email),
    subject: `[Reminder] Pending Document Approval: Request #${requestId}`,
    htmlContent: `
      <h2>Approval Reminder</h2>
      <p>This request is past its current deadline. The deadline will be extended by 2 days after this reminder is recorded.</p>
      <ul>
        <li><strong>Request ID:</strong> #${requestId}</li>
        <li><strong>Submitted By:</strong> ${item.submitted_by}</li>
        <li><strong>Level:</strong> ${level} (${getApproverRole(level)})</li>
        <li><strong>Current Deadline:</strong> ${new Date(String(item.deadline)).toLocaleString()}</li>
        <li><strong>File Path:</strong> <code>${item.file_path}</code></li>
      </ul>
      <p><a href="${dashboardLink}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:#fff;text-decoration:none;border-radius:5px;">Open Dashboard</a></p>
    `
  };
}

async function callRpc<T>(name: string, payload: Record<string, unknown>) {
  const supabaseUrl = getRequiredEnv('HANKOFLOW_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('HANKOFLOW_SERVICE_ROLE_KEY');
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RPC ${name} failed: ${errorText}`);
  }

  return await response.json() as T;
}

async function processReminderBatch(event: ReminderBatchEvent) {
  const dashboardLink = event.dashboardLink || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
  const overdueItems = await callRpc<Array<Record<string, unknown>>>('get_overdue_approval_logs', {});
  const results = [];

  for (const item of overdueItems) {
    const email = reminderEmail(item, dashboardLink);
    const sendResult = await sendEmail(email.to, email.subject, email.htmlContent);
    await callRpc('record_approval_reminder', {
      p_approval_log_id: Number(item.approval_log_id)
    });
    results.push({ approvalLogId: item.approval_log_id, sendResult });
  }

  return { processed: results.length, results };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const event = await req.json() as MailerEvent;

    if (event.eventType === 'approval_requested') {
      const email = approvalEmail(event);
      const result = await sendEmail(email.to, email.subject, email.htmlContent);
      return Response.json({ ok: true, result }, { headers: corsHeaders });
    }

    if (event.eventType === 'final_status') {
      const email = finalStatusEmail(event);
      const result = await sendEmail(email.to, email.subject, email.htmlContent);
      return Response.json({ ok: true, result }, { headers: corsHeaders });
    }

    if (event.eventType === 'reminder_batch') {
      const result = await processReminderBatch(event);
      return Response.json({ ok: true, result }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Unsupported eventType' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
