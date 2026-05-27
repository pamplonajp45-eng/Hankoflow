function getPublicApiUrl() {
  return (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

function buildApproveUrl(actionToken) {
  return `${getPublicApiUrl()}/api/approvals/a/${actionToken}`;
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
    approveUrl,
    ``,
    `Thank you.`
  ].join('\n');

  const mailto = `mailto:${encodeURIComponent(approverEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookWebUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(approverEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to: approverEmail,
    subject,
    body,
    approveUrl,
    mailto,
    outlookWebUrl
  };
}

module.exports = {
  buildApproveUrl,
  buildApprovalEmailDraft
};
