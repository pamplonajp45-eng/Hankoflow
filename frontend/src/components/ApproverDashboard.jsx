import { useCallback, useEffect, useState } from 'react';
import RequestCard from './RequestCard';
import { APPROVER_LEVELS } from '../config/approvers';

export default function ApproverDashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simFilePath, setSimFilePath] = useState('\\\\company-share\\finance\\April_Invoices_v2.xlsx');
  const [simEmployee, setSimEmployee] = useState('employee@company.com');
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/pending?email=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error('Failed to fetch pending requests.');
      const data = await response.json();
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
    fetchPending();
  }, [fetchPending]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirm = async (logId) => {
    try {
      const response = await fetch(`/api/approvals/${logId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Confirm failed');

      showToast(result.message || 'Approval logged successfully.');
      fetchPending();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleReject = async (logId) => {
    try {
      const response = await fetch(`/api/approvals/${logId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Rejection failed');

      showToast('Workflow rejected and submitter notified.', 'error');
      fetchPending();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: simFilePath,
          submitted_by: simEmployee
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Simulation submission failed');

      showToast(`Simulated request #${result.request.id} created.`);
      setShowSimulate(false);

      if (user.email === APPROVER_LEVELS[0].email) {
        fetchPending();
      }
    } catch (err) {
      alert(`Simulation Error: ${err.message}`);
    } finally {
      setSimulating(false);
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
          <h1>Pending Approvals</h1>
          <p>Logged in as: <strong>{user.email}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary submit-req-btn" onClick={() => setShowSimulate(true)}>
            Simulate Email Request
          </button>
          <button className="btn btn-secondary" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading pending tasks...</div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '3rem' }}>
          Error: {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">Clear</div>
          <h3>You are all caught up</h3>
          <p>No document approval requests are currently waiting for your level.</p>
        </div>
      ) : (
        <div className="card-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {requests.map((req) => (
            <RequestCard
              key={req.approval_log_id}
              request={req}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {showSimulate && (
        <div className="audit-details-modal">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Simulate Incoming Email Request</h3>
              <button className="close-btn" onClick={() => setShowSimulate(false)}>x</button>
            </div>
            <form onSubmit={handleSimulateSubmit}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                This simulates an employee sending an Outlook email with an Excel file path. In production, the mail intake can call this same backend API directly.
              </p>

              <div className="form-group">
                <label>Employee Email (Sender)</label>
                <input
                  type="email"
                  className="form-input"
                  value={simEmployee}
                  onChange={(e) => setSimEmployee(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Excel File Path (Copy as Path format)</label>
                <input
                  type="text"
                  className="form-input"
                  value={simFilePath}
                  onChange={(e) => setSimFilePath(e.target.value)}
                  required
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Example: <code>\\\\server\\share\\docs\\document.xlsx</code>
                </small>
              </div>

              <div className="actions-row" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSimulate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={simulating}>
                  {simulating ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
