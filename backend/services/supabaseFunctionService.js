const axios = require('axios');
require('dotenv').config();

function getMailerConfig() {
  return {
    url: process.env.SUPABASE_APPROVAL_MAILER_URL,
    token: process.env.SUPABASE_FUNCTION_AUTH_TOKEN
  };
}

async function invokeApprovalMailer(payload) {
  const { url, token } = getMailerConfig();
  const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
  const body = { dashboardLink, ...payload };

  if (!url) {
    console.log('--- [MOCK SUPABASE APPROVAL MAILER] ---');
    console.log('Payload:', JSON.stringify(body, null, 2));
    console.log('---------------------------------------');
    return { mock: true, triggered: true };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(url, body, { headers });
    console.log(`Supabase approval mailer triggered: ${payload.eventType}`);
    return { mock: false, status: response.status };
  } catch (error) {
    console.error('Error invoking Supabase approval mailer:', error.response?.data || error.message);
    return { error: true, message: error.message };
  }
}

function triggerApprovalNotification({ requestId, level, filePath, submittedBy, approverEmail, deadline }) {
  return invokeApprovalMailer({
    eventType: 'approval_requested',
    requestId,
    level,
    filePath,
    submittedBy,
    approverEmail,
    deadline
  });
}

function triggerFinalStatusNotification({ requestId, status, filePath, submittedBy, levelRejected = null }) {
  return invokeApprovalMailer({
    eventType: 'final_status',
    requestId,
    status,
    filePath,
    submittedBy,
    levelRejected
  });
}

module.exports = {
  triggerApprovalNotification,
  triggerFinalStatusNotification
};
