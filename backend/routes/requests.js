const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { buildApprovalEmailDraft, buildApproveUrl } = require('../services/outlookDraftService');
const { isAdminRequest, requireAdmin } = require('../middleware/adminAuth');

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getSignedInEmployeeEmail(req) {
  return normalizeEmail(req.get('x-user-email'));
}

/**
 * POST /api/requests
 * Creates a new document approval request.
 */
router.post('/', async (req, res) => {
  const {
    file_path,
    submitted_by,
    supervisor_email,
    assistant_manager_email,
    manager_email
  } = req.body;

  if (!file_path || !submitted_by) {
    return res.status(400).json({ error: 'file_path and submitted_by are required.' });
  }

  const signedInEmail = getSignedInEmployeeEmail(req);
  if (!isEmail(signedInEmail)) {
    return res.status(401).json({ error: 'Signed-in employee email required.' });
  }

  if (signedInEmail !== normalizeEmail(submitted_by)) {
    return res.status(403).json({ error: 'You can only create workflows for your signed-in email.' });
  }

  if (![submitted_by, supervisor_email, assistant_manager_email, manager_email].every(isEmail)) {
    return res.status(400).json({
      error: 'Valid submitted_by, supervisor_email, assistant_manager_email, and manager_email are required.'
    });
  }

  const client = await db.connect();
  try {
    const submittedBy = signedInEmail;
    const supervisorEmail = normalizeEmail(supervisor_email);
    const assistantManagerEmail = normalizeEmail(assistant_manager_email);
    const managerEmail = normalizeEmail(manager_email);

    await client.query('BEGIN');

    // 1. Insert request
    const requestResult = await client.query(
      `INSERT INTO requests (
         file_path,
         submitted_by,
         supervisor_email,
         assistant_manager_email,
         manager_email,
         status,
         current_level
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', 1) RETURNING id`,
      [file_path, submittedBy, supervisorEmail, assistantManagerEmail, managerEmail]
    );
    const requestId = requestResult.rows[0].id;

    // 2. Set deadline (NOW + 2 days)
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 2);

    // 3. Create Level 1 approval log
    const approverEmail = supervisorEmail;
    const actionToken = crypto.randomBytes(32).toString('hex');
    const logResult = await client.query(
      `INSERT INTO approval_logs (request_id, level, approver_email, action, action_token, deadline)
       VALUES ($1, 1, $2, 'pending', $3, $4) RETURNING id`,
      [requestId, approverEmail, actionToken, deadlineDate]
    );
    const logId = logResult.rows[0].id;

    await client.query('COMMIT');

    console.log(`Successfully created request ID ${requestId} and Level 1 approval log.`);

    // 4. Return an Outlook-ready draft. The employee sends this from their own mailbox.
    const approveUrl = buildApproveUrl(actionToken);
    const emailDraft = buildApprovalEmailDraft({
      requestId,
      level: 1,
      filePath: file_path,
      submittedBy,
      approverEmail,
      deadline: deadlineDate.toISOString(),
      approveUrl
    });

    return res.status(201).json({
      message: 'Request submitted successfully.',
      request: {
        id: requestId,
        file_path,
        submitted_by: submittedBy,
        supervisor_email: supervisorEmail,
        assistant_manager_email: assistantManagerEmail,
        manager_email: managerEmail,
        status: 'pending',
        current_level: 1,
        created_at: new Date()
      },
      approval_log: {
        id: logId,
        request_id: requestId,
        level: 1,
        approver_email: approverEmail,
        action: 'pending',
        deadline: deadlineDate
      },
      email_draft: emailDraft
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting request:', error);
    return res.status(500).json({ error: 'Failed to create request and approval logs.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/requests
 * Fetches all requests, including nested approval logs and reminder history. (Admin view audit trail)
 */
router.get('/', async (req, res) => {
  try {
    const admin = isAdminRequest(req);
    const submittedBy = getSignedInEmployeeEmail(req);

    if (!admin && !isEmail(submittedBy)) {
      return res.status(401).json({ error: 'Signed-in employee email or admin token required.' });
    }

    const requestQuery = admin
      ? {
          text: 'SELECT * FROM requests ORDER BY created_at DESC',
          values: []
        }
      : {
          text: 'SELECT * FROM requests WHERE lower(submitted_by) = $1 ORDER BY created_at DESC',
          values: [submittedBy]
        };

    const { rows: requests } = await db.query(requestQuery.text, requestQuery.values);

    if (requests.length === 0) {
      return res.json([]);
    }

    // Get all approval logs
    const { rows: logs } = await db.query(`
      SELECT l.id, l.request_id, l.level, l.approver_email, l.action, l.deadline, l.confirmed_at,
             r.sent_at AS reminder_sent_at
      FROM approval_logs l
      LEFT JOIN reminders r ON r.approval_log_id = l.id
      ORDER BY l.level ASC, r.sent_at ASC
    `);

    // Group logs by request_id
    const logsMap = {};
    logs.forEach(log => {
      const reqId = log.request_id;
      if (!logsMap[reqId]) {
        logsMap[reqId] = [];
      }
      
      // Find if we already pushed this log (due to multiple reminders left join)
      let existingLog = logsMap[reqId].find(l => l.id === log.id);
      if (!existingLog) {
        existingLog = {
          id: log.id,
          level: log.level,
          approver_email: log.approver_email,
          action: log.action,
          deadline: log.deadline,
          confirmed_at: log.confirmed_at,
          reminders: []
        };
        logsMap[reqId].push(existingLog);
      }
      
      if (log.reminder_sent_at) {
        existingLog.reminders.push(log.reminder_sent_at);
      }
    });

    // Map logs back to their requests
    const results = requests.map(req => ({
      ...req,
      logs: logsMap[req.id] || []
    }));

    return res.json(results);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    return res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

/**
 * GET /api/requests/:id
 * Fetches a single request with its full logs and reminders
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: requests } = await db.query('SELECT * FROM requests WHERE id = $1', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const signedInEmail = getSignedInEmployeeEmail(req);
    if (!isAdminRequest(req) && normalizeEmail(requests[0].submitted_by) !== signedInEmail) {
      return res.status(401).json({ error: 'You do not have access to this request.' });
    }

    const { rows: logs } = await db.query(
      `SELECT id, request_id, level, approver_email, action, deadline, confirmed_at
       FROM approval_logs
       WHERE request_id = $1
       ORDER BY level ASC`,
      [id]
    );

    const formattedLogs = await Promise.all(logs.map(async log => {
      const { rows: reminders } = await db.query('SELECT sent_at FROM reminders WHERE approval_log_id = $1 ORDER BY sent_at ASC', [log.id]);
      return {
        ...log,
        reminders: reminders.map(r => r.sent_at)
      };
    }));

    return res.json({
      ...requests[0],
      logs: formattedLogs
    });
  } catch (error) {
    console.error(`Error fetching request ${id}:`, error);
    return res.status(500).json({ error: 'Failed to fetch request details.' });
  }
});

/**
 * DELETE /api/requests/:id
 * Deletes a request and all related approval logs/reminders.
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await db.query('DELETE FROM requests WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    return res.json({ message: `Request #${id} deleted.` });
  } catch (error) {
    console.error(`Error deleting request ${id}:`, error);
    return res.status(500).json({ error: 'Failed to delete request.' });
  }
});

module.exports = router;
