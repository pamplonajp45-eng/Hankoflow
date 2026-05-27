import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/apiClient';

function buildOutlookWebUrl({ to, subject, body }) {
  return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
  const [supervisorEmail, setSupervisorEmail] = useState('pamplonajeypii.45@outlook.com');
  const [assistantManagerEmail, setAssistantManagerEmail] = useState('assistantmanager@company.com');
  const [managerEmail, setManagerEmail] = useState('manager@company.com');
  const [creating, setCreating] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);
  const [draftTo, setDraftTo] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [toast, setToast] = useState(null);

  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/requests');
      setRequests(data.filter((request) => request.submitted_by?.toLowerCase() === user.email.toLowerCase()));
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
    return buildOutlookWebUrl({ to: draftTo, subject: draftSubject, body: draftBody });
  }, [draftTo, draftSubject, draftBody]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setCreating(true);
    setEmailDraft(null);

    try {
      const result = await apiFetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          submitted_by: user.email,
          supervisor_email: supervisorEmail,
          assistant_manager_email: assistantManagerEmail,
          manager_email: managerEmail
        })
      });

      setEmailDraft(result.email_draft);
      setDraftTo(result.email_draft.to);
      setDraftSubject(result.email_draft.subject);
      setDraftBody(result.email_draft.body);
      showToast(`Request #${result.request.id} created. Review the draft, then open Outlook.`);
      fetchMyRequests();
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
            {creating ? 'Creating...' : 'Create Outlook Request'}
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
              <div className="form-group">
                <label>To</label>
                <input
                  type="email"
                  className="form-input"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Body</label>
                <textarea
                  className="form-input draft-preview"
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                />
              </div>

              <div className="actions-row">
                <button type="button" className="btn btn-secondary" onClick={handleCopyDraft}>
                  Copy Draft
                </button>
                <a
                  className="btn btn-success"
                  href={editableOutlookUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Outlook
                </a>
              </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
