function getPublicApiUrl() {
  return (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

function buildApproveUrl(actionToken) {
  return `${getPublicApiUrl()}/api/approvals/email/${actionToken}/approve`;
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
    `3. Click this approval link after saving:`,
    approveUrl,
    ``,
    `Thank you.`
  ].join('\n');

  const mailto = `mailto:${encodeURIComponent(approverEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to: approverEmail,
    subject,
    body,
    mailto
  };
}

module.exports = {
  buildApproveUrl,
  buildApprovalEmailDraft
};
