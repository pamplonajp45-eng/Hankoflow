import { useCallback, useState, useEffect } from 'react';
import StatusTracker from './StatusTracker';
import { getLevelRole } from '../config/approvers';
import { apiFetch } from '../utils/apiClient';

export default function AdminDashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected request for detail audit logs modal
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/requests', {
        headers: {
          'X-Admin-Token': user.adminToken
        }
      });
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.adminToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
  }, [fetchRequests]);

  const getStatusBadgeClass = (status) => {
    if (status === 'approved') return 'badge-approved';
    if (status === 'rejected') return 'badge-rejected';
    return 'badge-pending';
  };

  const getLevelLabel = (req) => {
    if (req.status === 'approved') return 'Completed';
    if (req.status === 'rejected') {
      const rejectedLog = req.logs.find(l => l.action === 'rejected');
      return `Rejected at Level ${rejectedLog ? rejectedLog.level : req.current_level}`;
    }
    return `Pending: ${getLevelRole(req.current_level)}`;
  };

  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const draftCount = requests.filter((request) => request.status === 'draft').length;

  const handleDeleteRequest = async (req) => {
    const confirmed = window.confirm(`Delete request #${req.id}? This will remove its approval logs and reminders.`);
    if (!confirmed) return;

    try {
      await apiFetch(`/api/requests/${req.id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': user.adminToken
        }
      });

      if (selectedRequest?.id === req.id) {
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Admin Audit Trail</h1>
          <p>Full tracking history of all document approval requests</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={fetchRequests}>
            🔄 Refresh Logs
          </button>
          <button className="btn btn-secondary" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="notification-strip">
        {pendingCount > 0 && (
          <div className="notification-pill">
            <span className="notify-dot"></span>
            {pendingCount} pending workflow{pendingCount === 1 ? '' : 's'}
          </div>
        )}
        {draftCount > 0 && (
          <div className="notification-pill urgent">
            <span className="notify-dot"></span>
            {draftCount} draft not yet sent
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading audit trail data...</div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '3rem' }}>
          Error: {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">📂</div>
          <h3>No Requests Logged</h3>
          <p>No document approval requests have been submitted yet.</p>
        </div>
      ) : (
        <div className="glass-panel admin-card">
          <div className="table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submitted By</th>
                  <th>Excel File Path</th>
                  <th>Date Submitted</th>
                  <th>Current Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td data-label="ID">
                      {(req.status === 'pending' || req.status === 'draft') && (
                        <span className="table-dot" title={req.status === 'draft' ? 'Draft not sent' : 'Pending approval'}></span>
                      )}
                      #{req.id}
                    </td>
                    <td data-label="Submitted By">{req.submitted_by}</td>
                    <td data-label="Excel File Path" style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={req.file_path}>
                      <code>{req.file_path}</code>
                    </td>
                    <td data-label="Date Submitted">{new Date(req.created_at).toLocaleString()}</td>
                    <td data-label="Current Level">{getLevelLabel(req)}</td>
                    <td data-label="Status">
                      <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                        onClick={() => setSelectedRequest(req)}
                      >
                        Inspect Workflow
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'hsl(345, 85%, 65%)' }}
                        onClick={() => handleDeleteRequest(req)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Detail Modal Drawer */}
      {selectedRequest && (
        <div className="audit-details-modal" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Audit Details: Request #{selectedRequest.id}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Submitted by {selectedRequest.submitted_by}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div style={{ margin: '1.5rem 0 1rem 0' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Workflow Stepper:</strong>
              <StatusTracker 
                currentLevel={selectedRequest.current_level} 
                status={selectedRequest.status}
                logs={selectedRequest.logs}
              />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                Per-Level Approval Logs
              </h3>
              
              <div className="logs-timeline">
                {selectedRequest.logs && selectedRequest.logs.length > 0 ? (
                  selectedRequest.logs.map((log) => {
                    const statusClass = log.action; // pending, approved, rejected
                    
                    return (
                      <div key={log.id} className={`log-item ${statusClass}`}>
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

                        {/* Reminders section */}
                        {log.reminders && log.reminders.length > 0 && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {log.reminders.map((rem, idx) => (
                              <span key={idx} className="reminder-pill">
                                🔔 Reminder Sent ({new Date(rem).toLocaleString()})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No approval logs generated yet.</p>
                )}
              </div>
            </div>

            <div className="actions-row" style={{ marginTop: '2.5rem' }}>
              <button className="btn btn-primary" onClick={() => setSelectedRequest(null)}>
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
