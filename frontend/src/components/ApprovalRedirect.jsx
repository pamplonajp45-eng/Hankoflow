import { useEffect, useMemo } from 'react';
import { apiUrl } from '../config/api';

export default function ApprovalRedirect() {
  const approvalUrl = useMemo(() => {
    const token = window.location.pathname.split('/a/')[1]?.split('/')[0] || '';
    return token ? apiUrl(`/api/approvals/a/${encodeURIComponent(token)}`) : '';
  }, []);

  useEffect(() => {
    if (approvalUrl) {
      window.location.replace(approvalUrl);
    }
  }, [approvalUrl]);

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="logo-icon">HF</span>
          <h2>Hanko Confirmation</h2>
          <p>Open the confirmation page after applying your Hanko/signature and saving the Excel file.</p>
        </div>

        {approvalUrl ? (
          <div className="redirect-loading" aria-label="Opening approval confirmation">
            <span className="loading-spinner"></span>
          </div>
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
