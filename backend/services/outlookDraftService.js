function getPublicApiUrl() {
  return (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_API_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

function buildApproveUrl(actionToken) {
  return `${getPublicAppUrl()}/a/${actionToken}`;
}

function buildBackendApproveUrl(actionToken) {
  return `${getPublicApiUrl()}/api/approvals/a/${actionToken}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildApprovalEmailDraft({
  requestId,
  level,
  filePath,
  submittedBy,
  approverEmail,
  deadline,
  approveUrl
}) {
  const subject = `HankoFlow Approval Request #${requestId}`;
  const body = [
    `Hello,`,
    ``,
    `Please approve this Excel document request.`,
    ``,
    `Request ID: #${requestId}`,
    `Submitted by: ${submittedBy}`,
    `Excel file path: ${filePath}`,
    `Approval level: ${level}`,
    `Deadline: ${new Date(deadline).toLocaleString()}`,
    ``,
    `Steps:`,
    `1. Open the Excel file path above.`,
    `2. Apply your Hanko/signature and save the file.`,
    `3. Click the approval link after saving.`,
    ``,
    `Approval Link`,
    ``,
    approveUrl,
    ``,
    `Thank you.`
  ].join('\n');

  const htmlBody = `
    <div>
      <p>Hello,</p>
      <p>Please approve this Excel document request.</p>
      <p>
        Request ID: #${requestId}<br>
        Submitted by: ${escapeHtml(submittedBy)}<br>
        Excel file path: ${escapeHtml(filePath)}<br>
        Approval level: ${level}<br>
        Deadline: ${escapeHtml(new Date(deadline).toLocaleString())}
      </p>
      <p>
        Steps:<br>
        1. Open the Excel file path above.<br>
        2. Apply your Hanko/signature and save the file.<br>
        3. Click the approval link after saving.
      </p>
      <p><a href="${escapeHtml(approveUrl)}">Approval Link</a></p>
      <p>${escapeHtml(approveUrl)}</p>
      <p>Thank you.</p>
    </div>
  `;

  const mailto = `mailto:${encodeURIComponent(approverEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookWebUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(approverEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to: approverEmail,
    subject,
    body,
    htmlBody,
    approveUrl,
    mailto,
    outlookWebUrl
  };
}

module.exports = {
  buildApproveUrl,
  buildBackendApproveUrl,
  buildApprovalEmailDraft
};
