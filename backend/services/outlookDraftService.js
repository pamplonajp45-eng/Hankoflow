function getPublicApiUrl() {
  return (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

function buildApproveUrl(actionToken) {
  return `${getPublicApiUrl()}/api/approvals/email/${actionToken}/approve`;
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
    `Approval link: ${approveUrl}`,
    ``,
    `Thank you.`
  ].join('\n');

  const htmlBody = `
    <p>Hello,</p>
    <p>Please approve this Excel document request.</p>
    <ul>
      <li><strong>Request ID:</strong> #${requestId}</li>
      <li><strong>Submitted by:</strong> ${escapeHtml(submittedBy)}</li>
      <li><strong>Excel file path:</strong> <code>${escapeHtml(filePath)}</code></li>
      <li><strong>Approval level:</strong> ${level}</li>
      <li><strong>Deadline:</strong> ${escapeHtml(new Date(deadline).toLocaleString())}</li>
    </ul>
    <p>Steps:</p>
    <ol>
      <li>Open the Excel file path above.</li>
      <li>Apply your Hanko/signature and save the file.</li>
      <li>Click the approval link after saving.</li>
    </ol>
    <p>
      <a href="${escapeHtml(approveUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:bold;">
        Approve Request
      </a>
    </p>
    <p>If the button does not work, open this link:<br><a href="${escapeHtml(approveUrl)}">${escapeHtml(approveUrl)}</a></p>
    <p>Thank you.</p>
  `;

  const mailto = `mailto:${encodeURIComponent(approverEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookWebUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(approverEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(htmlBody)}`;

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
  buildApprovalEmailDraft
};
