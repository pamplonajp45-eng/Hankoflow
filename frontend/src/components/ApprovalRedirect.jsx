import { useMemo } from 'react';
import { apiUrl } from '../config/api';

export default function ApprovalRedirect() {
  const approvalActionUrl = useMemo(() => {
    const token = window.location.pathname.split('/a/')[1]?.split('/')[0] || '';
    return token ? apiUrl(`/api/approvals/a/${encodeURIComponent(token)}/confirm`) : '';
  }, []);

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="logo-icon">HF</span>
          <h2>Confirm Hanko Done</h2>
          <p>Please confirm only after you opened the Excel file, applied your Hanko/signature, and saved it.</p>
        </div>

        {approvalActionUrl ? (
          <form method="post" action={approvalActionUrl}>
            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              Confirm Hanko Done
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
              Opening this page alone does not approve the request.
            </p>
          </form>
        ) : (
          <div className="empty-state compact-empty">
            <h3>Invalid approval URL</h3>
            <p>Please check the approval message and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
