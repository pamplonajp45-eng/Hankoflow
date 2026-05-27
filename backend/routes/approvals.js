const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { buildApprovalEmailDraft, buildApproveUrl } = require('../services/outlookDraftService');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function actionPage(title, message, nextDraft = null) {
  const nextDraftHtml = nextDraft
    ? `
          <hr />
          <h2>Next step</h2>
          <p>Send the next approval request from Outlook.</p>
          <p><a class="button" href="${escapeHtml(nextDraft.outlookWebUrl || nextDraft.mailto)}">Open Next Outlook Email</a></p>
          <p><strong>To:</strong> ${escapeHtml(nextDraft.to)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(nextDraft.subject)}</p>
          <textarea readonly>${escapeHtml(nextDraft.body)}</textarea>
      `
    : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 40px; color: #172033; }
          main { max-width: 620px; margin: 0 auto; background: #fff; border: 1px solid #dde2ec; border-radius: 8px; padding: 28px; }
          h1 { margin-top: 0; font-size: 24px; }
          h2 { font-size: 18px; margin-top: 24px; }
          p { line-height: 1.55; }
          hr { border: 0; border-top: 1px solid #dde2ec; margin: 24px 0; }
          .button { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 6px; font-weight: 700; }
          textarea { box-sizing: border-box; width: 100%; min-height: 220px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-family: Consolas, monospace; font-size: 13px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
          ${nextDraftHtml}
          <p>You can close this tab.</p>
        </main>
      </body>
    </html>
  `;
}

async function approveLog(client, log, request) {
  const now = new Date();

  await client.query(
    "UPDATE approval_logs SET action = 'approved', confirmed_at = $1, action_token = NULL WHERE id = $2",
    [now, log.id]
  );

  if (log.level < 3) {
    const nextLevel = log.level + 1;
    const nextApproverEmail = nextLevel === 2
      ? request.assistant_manager_email || process.env.APPROVER_LEVEL_2_EMAIL || 'assistantmanager@company.com'
      : request.manager_email || process.env.APPROVER_LEVEL_3_EMAIL || 'manager@company.com';
    const nextDeadline = new Date();
    nextDeadline.setDate(nextDeadline.getDate() + 2);
    const nextActionToken = crypto.randomBytes(32).toString('hex');

    await client.query(
      'UPDATE requests SET current_level = $1 WHERE id = $2',
      [nextLevel, request.id]
    );

    await client.query(
      `INSERT INTO approval_logs (request_id, level, approver_email, action, action_token, deadline)
       VALUES ($1, $2, $3, 'pending', $4, $5)`,
      [request.id, nextLevel, nextApproverEmail, nextActionToken, nextDeadline]
    );

    await client.query('COMMIT');

    const approveUrl = buildApproveUrl(nextActionToken);
    const nextEmailDraft = buildApprovalEmailDraft({
      requestId: request.id,
      level: nextLevel,
      filePath: request.file_path,
      submittedBy: request.submitted_by,
      approverEmail: nextApproverEmail,
      deadline: nextDeadline.toISOString(),
      approveUrl
    });

    return {
      message: 'Approval confirmed. Escalated to next level.',
      nextLevel,
      nextApprover: nextApproverEmail,
      emailDraft: nextEmailDraft
    };
  }

  await client.query(
    "UPDATE requests SET status = 'approved' WHERE id = $1",
    [request.id]
  );

  await client.query('COMMIT');

  return {
    message: 'Final approval confirmed. Request is approved.',
    status: 'approved'
  };
}

async function rejectLog(client, log, request) {
  const now = new Date();

  await client.query(
    "UPDATE approval_logs SET action = 'rejected', confirmed_at = $1, action_token = NULL WHERE id = $2",
    [now, log.id]
  );

  await client.query(
    "UPDATE requests SET status = 'rejected' WHERE id = $1",
    [request.id]
  );

  await client.query('COMMIT');

  return {
    message: 'Request rejected successfully.',
    status: 'rejected',
    levelRejected: log.level
  };
}

async function processApprovalByLogId(approvalLogId, action) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const { rows: logs } = await client.query(
      'SELECT * FROM approval_logs WHERE id = $1 FOR UPDATE',
      [approvalLogId]
    );

    if (logs.length === 0) {
      await client.query('ROLLBACK');
      return { statusCode: 404, body: { error: 'Approval log not found.' } };
    }

    const log = logs[0];
    if (log.action !== 'pending') {
      await client.query('ROLLBACK');
      return { statusCode: 400, body: { error: `Approval already processed. Current action: ${log.action}` } };
    }

    const { rows: requests } = await client.query(
      'SELECT * FROM requests WHERE id = $1 FOR UPDATE',
      [log.request_id]
    );

    if (requests.length === 0) {
      await client.query('ROLLBACK');
      return { statusCode: 404, body: { error: 'Associated request not found.' } };
    }

    const request = requests[0];
    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return { statusCode: 400, body: { error: `Request is not pending. Status: ${request.status}` } };
    }

    const body = action === 'approve'
      ? await approveLog(client, log, request)
      : await rejectLog(client, log, request);

    return { statusCode: 200, body };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error processing ${action}:`, error);
    return { statusCode: 500, body: { error: `Failed to ${action} request.` } };
  } finally {
    client.release();
  }
}

async function processApprovalByToken(token, action) {
  const { rows } = await db.query(
    'SELECT id FROM approval_logs WHERE action_token = $1 AND action = $2',
    [token, 'pending']
  );

  if (rows.length === 0) {
    return { statusCode: 404, body: { error: 'This approval link is invalid or already used.' } };
  }

  return processApprovalByLogId(rows[0].id, action);
}

router.get('/pending', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required.' });
  }

  try {
    const { rows } = await db.query(
      `SELECT l.id AS approval_log_id, l.level, l.deadline, r.id AS request_id,
              r.file_path, r.submitted_by, r.status AS request_status, r.created_at AS request_created_at
       FROM approval_logs l
       JOIN requests r ON l.request_id = r.id
       WHERE l.approver_email = $1 AND l.action = 'pending' AND r.status = 'pending'`,
      [email]
    );
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return res.status(500).json({ error: 'Failed to fetch pending approvals.' });
  }
});

router.get('/email/:token/approve', async (req, res) => {
  const result = await processApprovalByToken(req.params.token, 'approve');
  const title = result.statusCode === 200 ? 'Approval Recorded' : 'Approval Link Error';
  const message = result.body.message || result.body.error;
  return res.status(result.statusCode).send(actionPage(title, message, result.body.emailDraft));
});

router.get('/email/:token/reject', async (req, res) => {
  const result = await processApprovalByToken(req.params.token, 'reject');
  const title = result.statusCode === 200 ? 'Request Rejected' : 'Approval Link Error';
  const message = result.body.message || result.body.error;
  return res.status(result.statusCode).send(actionPage(title, message));
});

router.post('/:id/confirm', async (req, res) => {
  const result = await processApprovalByLogId(req.params.id, 'approve');
  return res.status(result.statusCode).json(result.body);
});

router.post('/:id/reject', async (req, res) => {
  const result = await processApprovalByLogId(req.params.id, 'reject');
  return res.status(result.statusCode).json(result.body);
});

router.get('/overdue', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.id AS approval_log_id, l.level, l.approver_email, l.deadline,
              r.id AS request_id, r.file_path, r.submitted_by
       FROM approval_logs l
       JOIN requests r ON l.request_id = r.id
       WHERE l.action = 'pending' AND r.status = 'pending' AND l.deadline < NOW()`
    );
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching overdue approvals:', error);
    return res.status(500).json({ error: 'Failed to fetch overdue approvals.' });
  }
});

router.post('/:id/reminder', async (req, res) => {
  const approvalLogId = req.params.id;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const { rows: logs } = await client.query(
      'SELECT deadline, action FROM approval_logs WHERE id = $1 FOR UPDATE',
      [approvalLogId]
    );

    if (logs.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approval log not found.' });
    }

    const log = logs[0];
    if (log.action !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Approval already completed. No reminder needed.' });
    }

    await client.query('INSERT INTO reminders (approval_log_id) VALUES ($1)', [approvalLogId]);

    const currentDeadline = new Date(log.deadline);
    const newDeadline = new Date(currentDeadline.getTime() + 2 * 24 * 60 * 60 * 1000);

    await client.query(
      'UPDATE approval_logs SET deadline = $1 WHERE id = $2',
      [newDeadline, approvalLogId]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Reminder logged and deadline extended.',
      newDeadline
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging reminder:', error);
    return res.status(500).json({ error: 'Failed to record reminder.' });
  } finally {
    client.release();
  }
});

module.exports = router;
