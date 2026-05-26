import { useState } from 'react';
import { getLevelRole } from '../config/approvers';

export default function RequestCard({ request, onConfirm, onReject }) {
  const [copied, setCopied] = useState(false);
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [checkedHanko, setCheckedHanko] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(request.file_path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmAction = async () => {
    if (!checkedOpen || !checkedHanko) {
      alert('Please complete all Hanko confirmation steps before approving.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(request.approval_log_id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAction = async () => {
    const confirmed = window.confirm('Are you sure you want to reject this request? This will halt the entire workflow.');
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await onReject(request.approval_log_id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deadlineDate = new Date(request.deadline);

  return (
    <div className="request-card glass-panel">
      <div className="request-card-header">
        <div className="request-meta">
          <h3>Request #{request.request_id}</h3>
          <div className="employee-email">Submitted by: {request.submitted_by}</div>
        </div>
        <span className="badge badge-pending">
          Level {request.level}: {getLevelRole(request.level)}
        </span>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Excel File Path (copy to open on local machine)</label>
        <div className="file-path-box">
          <span className="file-path-text" title={request.file_path}>
            {request.file_path}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyPath}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
          >
            {copied ? 'Copied' : 'Copy Path'}
          </button>
        </div>
      </div>

      <div className="hanko-instructions">
        <h4>Hanko Confirmation Checklist</h4>
        <ul className="instruction-list">
          <li className={`instruction-item ${checkedOpen ? 'checked' : ''}`}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checkedOpen}
                onChange={(e) => setCheckedOpen(e.target.checked)}
              />
              <span>I have opened the Excel file at the path above</span>
            </label>
          </li>
          <li className={`instruction-item ${checkedHanko ? 'checked' : ''}`}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checkedHanko}
                onChange={(e) => setCheckedHanko(e.target.checked)}
              />
              <span>I have manually affixed my Hanko (digital stamp) and saved the Excel file</span>
            </label>
          </li>
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div>Deadline: {deadlineDate.toLocaleString()}</div>
        <div>Created: {new Date(request.request_created_at).toLocaleDateString()}</div>
      </div>

      <div className="actions-row">
        <button
          onClick={handleRejectAction}
          className="btn btn-secondary"
          disabled={isSubmitting}
          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'hsl(345, 85%, 65%)' }}
        >
          Reject Request
        </button>
        <button
          onClick={handleConfirmAction}
          className="btn btn-success"
          disabled={!checkedOpen || !checkedHanko || isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Confirm Approval'}
        </button>
      </div>
    </div>
  );
}
