import { useState } from 'react';
import { ADMIN_USER } from '../config/approvers';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('pamplonajeypii.45@outlook.com');
  const [adminToken, setAdminToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      alert('Please enter a valid Outlook email address.');
      return;
    }

    const isAdmin = normalizedEmail === ADMIN_USER.email.toLowerCase();

    if (isAdmin && !adminToken.trim()) {
      alert('Please enter the admin tester token.');
      return;
    }

    onLogin({
      email: normalizedEmail,
      role: isAdmin ? 'admin' : 'employee',
      adminToken: isAdmin ? adminToken.trim() : undefined
    });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="logo-icon">HF</span>
          <h2>Employee Sign In</h2>
          <p>Use the Outlook email that will send the approval request.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="employee-email-input">Employee Outlook Email</label>
            <input
              id="employee-email-input"
              type="email"
              className="form-input"
              placeholder="employee@outlook.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
              Admin tester: <code>{ADMIN_USER.email}</code>
            </small>
          </div>

          {email.trim().toLowerCase() === ADMIN_USER.email.toLowerCase() && (
            <div className="form-group">
              <label htmlFor="admin-token-input">Admin Tester Token</label>
              <input
                id="admin-token-input"
                type="password"
                className="form-input"
                placeholder="Enter admin token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Enter HankoFlow
          </button>
        </form>
      </div>
    </div>
  );
}
