import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/apiClient';
import StatusTracker from './StatusTracker';
import { getLevelRole } from '../config/approvers';

function buildOutlookWebUrl({ to, subject, body }) {
  return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRichDraftBody(body, approveUrl) {
  const safeLines = body.split(/\r?\n/).map((line) => escapeHtml(line));
  const htmlLines = safeLines.map((line) => {
    if (approveUrl && line === escapeHtml(approveUrl)) {
      return `<a href="${escapeHtml(approveUrl)}">Approval Link</a>`;
    }
    return line;
  });

  return `<div>${htmlLines.join('<br>')}</div>`;
}

function getStatusLabel(request) {
  if (request.status === 'approved') return 'Completed';
  if (request.status === 'rejected') return 'Stopped';
  return `Level ${request.current_level} pending`;
}

function getStatusBadgeClass(status) {
  if (status === 'approved') return 'badge-approved';
  if (status === 'rejected') return 'badge-rejected';
  return 'badge-pending';
}

export default function ApproverDashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filePath, setFilePath] = useState('\\\\company-share\\finance\\April_Invoices_v2.xlsx');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [assistantManagerEmail, setAssistantManagerEmail] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);
  const [draftRequestId, setDraftRequestId] = useState(null);
  const [draftTo, setDraftTo] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftApproveUrl, setDraftApproveUrl] = useState('');
  const [draftReviewed, setDraftReviewed] = useState(false);
  const [outlookOpened, setOutlookOpened] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchMyRequests = useCallback(async () => {
    setRequests([]);
    setSelectedRequest(null);
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/requests', {
        headers: {
          'X-User-Email': user.email
        }
      });
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyRequests();
  }, [fetchMyRequests]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const editableOutlookUrl = useMemo(() => {
    if (!draftTo || !draftSubject || !draftBody) return '';
    return buildOutlookWebUrl({
      to: draftTo,
      subject: draftSubject,
      body: draftBody
    });
  }, [draftTo, draftSubject, draftBody]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setCreating(true);
    setEmailDraft(null);
    setDraftRequestId(null);
    setDraftReviewed(false);
    setOutlookOpened(false);

    try {
      const result = await apiFetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': user.email
        },
        body: JSON.stringify({
          file_path: filePath,
          submitted_by: user.email,
          supervisor_email: supervisorEmail,
          assistant_manager_email: assistantManagerEmail,
          manager_email: managerEmail
        })
      });

      setEmailDraft(result.email_draft);
      setDraftRequestId(result.request.id);
      setDraftTo(result.email_draft.to);
      setDraftSubject(result.email_draft.subject);
      setDraftBody(result.email_draft.body);
      setDraftApproveUrl(result.email_draft.approveUrl);
      showToast(`Draft #${result.request.id} created. It will appear in My Requests after you confirm the Outlook email was sent.`);
    } catch (err) {
      alert(`Create Request Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyDraft = async () => {
    const draftText = [
      `To: ${draftTo}`,
      `Subject: ${draftSubject}`,
      '',
      draftBody
    ].join('\n');

    await navigator.clipboard.writeText(draftText);
    showToast('Outlook draft copied.');
  };

  const handleCopyRichDraft = async () => {
    const html = buildRichDraftBody(draftBody, draftApproveUrl);
    const text = [
      `To: ${draftTo}`,
      `Subject: ${draftSubject}`,
      '',
      draftBody
    ].join('\n');

    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }

    showToast('Rich email copied. Paste it into the Outlook message body.');
  };

  const handleOpenOutlook = () => {
    if (!draftReviewed) {
      alert('Please review the draft first.');
      return;
    }

    window.open(editableOutlookUrl, '_blank', 'noopener,noreferrer');
    setOutlookOpened(true);
  };

  const handleMarkSent = async () => {
    if (!draftRequestId) return;

    const confirmed = window.confirm('Confirm that you sent this Outlook email to the first approver?');
    if (!confirmed) return;

    setMarkingSent(true);
    try {
      await apiFetch(`/api/requests/${draftRequestId}/sent`, {
        method: 'POST',
        headers: {
          'X-User-Email': user.email
        }
      });

      showToast(`Request #${draftRequestId} is now pending approval.`);
      setEmailDraft(null);
      setDraftRequestId(null);
      setDraftTo('');
      setDraftSubject('');
      setDraftBody('');
      setDraftApproveUrl('');
      setDraftReviewed(false);
      setOutlookOpened(false);
      fetchMyRequests();
    } catch (err) {
      alert(`Mark Sent Error: ${err.message}`);
    } finally {
      setMarkingSent(false);
    }
  };

  return (
    <div className="main-content">
      {toast && (
        <div
          className="toast-msg glass-panel"
          style={{
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
            color: '#fff'
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Employee Request</h1>
          <p>Logged in as: <strong>{user.email}</strong></p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout}>
          Sign Out
        </button>
      </div>

      <div className="employee-grid">
        <form className="glass-panel employee-request-panel" onSubmit={handleCreateRequest}>
          <h2>Create Approval Request</h2>

          <div className="form-group">
            <label>Excel File Path</label>
            <input
              type="text"
              className="form-input"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              required
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Example: <code>\\\\server\\share\\docs\\document.xlsx</code>
            </small>
          </div>

          <div className="form-group">
            <label>Supervisor Outlook Email</label>
            <input
              type="email"
              className="form-input"
              value={supervisorEmail}
              onChange={(e) => setSupervisorEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Assistant Manager Outlook Email</label>
            <input
              type="email"
              className="form-input"
              value={assistantManagerEmail}
              onChange={(e) => setAssistantManagerEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Manager Outlook Email</label>
            <input
              type="email"
              className="form-input"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create Request and Draft'}
          </button>
        </form>

        <div className="glass-panel employee-request-panel">
          <h2>Editable Outlook Draft</h2>
          {!emailDraft ? (
            <div className="empty-state compact-empty">
              <h3>No draft yet</h3>
              <p>Create a request to generate an editable Outlook email.</p>
            </div>
          ) : (
            <div className="email-draft-box">
              <div className="draft-safety-note">
                Draft created. It is hidden from My Requests until you open Outlook and confirm the email was sent.
              </div>

              <div className="form-group">
                <label>To</label>
                <input
                  type="email"
                  className="form-input"
                  value={draftTo}
                  onChange={(e) => {
                    setDraftTo(e.target.value);
                    setDraftReviewed(false);
                  }}
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={draftSubject}
                  onChange={(e) => {
                    setDraftSubject(e.target.value);
                    setDraftReviewed(false);
                  }}
                />
              </div>

              <div className="form-group">
                <label>Email Body</label>
                <textarea
                  className="form-input draft-preview"
                  value={draftBody}
                  onChange={(e) => {
                    setDraftBody(e.target.value);
                    setDraftReviewed(false);
                  }}
                />
              </div>

              <label className="review-check">
                <input
                  type="checkbox"
                  checked={draftReviewed}
                  onChange={(e) => setDraftReviewed(e.target.checked)}
                />
                <span>I reviewed this draft and I am ready to open it in Outlook.</span>
              </label>

              <div className="actions-row">
                <button type="button" className="btn btn-secondary" onClick={handleCopyDraft}>
                  Copy Draft
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCopyRichDraft}>
                  Copy Rich Email
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleOpenOutlook}
                  disabled={!draftReviewed || !editableOutlookUrl}
                >
                  Open in Outlook
                </button>
              </div>

              {outlookOpened && (
                <div className="sent-confirm-panel">
                  <div>
                    <strong>Sent from Outlook?</strong>
                    <p>After you click Send in Outlook, confirm here to move this request into My Requests.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleMarkSent}
                    disabled={markingSent}
                  >
                    {markingSent ? 'Saving...' : 'I Sent This Email'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-controls">
          <h2 style={{ margin: 0 }}>My Requests</h2>
          <button className="btn btn-secondary" onClick={fetchMyRequests}>Refresh</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading requests...</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '2rem' }}>Error: {error}</div>
        ) : requests.length === 0 ? (
          <div className="empty-state compact-empty">
            <h3>No requests yet</h3>
            <p>Your submitted approval requests will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Excel File Path</th>
                  <th>Current Level</th>
                  <th>Status</th>
                  <th>Date Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td style={{ maxWidth: '360px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={request.file_path}>
                      <code>{request.file_path}</code>
                    </td>
                    <td>{getStatusLabel(request)}</td>
                    <td><span className={`badge ${getStatusBadgeClass(request.status)}`}>{request.status}</span></td>
                    <td>{new Date(request.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                        onClick={() => setSelectedRequest(request)}
                      >
                        Inspect Workflow
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="audit-details-modal" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Workflow: Request #{selectedRequest.id}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Submitted by {selectedRequest.submitted_by}
                </p>
              </div>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>x</button>
            </div>

            <div className="workflow-summary">
              <div>
                <span>Excel File Path</span>
                <code>{selectedRequest.file_path}</code>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedRequest.status}</strong>
              </div>
              <div>
                <span>Current Step</span>
                <strong>{getStatusLabel(selectedRequest)}</strong>
              </div>
            </div>

            <div style={{ margin: '1.5rem 0 1rem 0' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Workflow Progress</strong>
              <StatusTracker
                currentLevel={selectedRequest.current_level}
                status={selectedRequest.status}
                logs={selectedRequest.logs}
              />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                Approval History
              </h3>

              <div className="logs-timeline">
                {selectedRequest.logs && selectedRequest.logs.length > 0 ? (
                  selectedRequest.logs.map((log) => (
                    <div key={log.id} className={`log-item ${log.action}`}>
                      <div className="log-title">
                        <span>Level {log.level}: {getLevelRole(log.level)}</span>
                        <span className={`badge ${getStatusBadgeClass(log.action)}`} style={{ fontSize: '0.65rem' }}>
                          {log.action}
                        </span>
                      </div>
                      <div className="log-desc">
                        Approver: <code>{log.approver_email}</code>
                      </div>
                      <div className="log-time">
                        {log.confirmed_at ? (
                          <span>Confirmed at: {new Date(log.confirmed_at).toLocaleString()}</span>
                        ) : (
                          <span>Deadline: {new Date(log.deadline).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No approval logs generated yet.</p>
                )}
              </div>
            </div>

            <div className="actions-row" style={{ marginTop: '2.5rem' }}>
              <button className="btn btn-primary" onClick={() => setSelectedRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
