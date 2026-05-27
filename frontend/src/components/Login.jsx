import { useState } from 'react';
import { ADMIN_USER } from '../config/approvers';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('employee');
  const [email, setEmail] = useState('pamplonajeypii.45@outlook.com');
  const [adminToken, setAdminToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'admin') {
      if (!adminToken.trim()) {
        alert('Please enter the admin tester token.');
        return;
      }

      onLogin({
        email: ADMIN_USER.email,
        role: 'admin',
        adminToken: adminToken.trim()
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === ADMIN_USER.email.toLowerCase()) {
      alert('Use Admin Tester mode for admin access.');
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      alert('Please enter a valid Outlook email address.');
      return;
    }

    onLogin({
      email: normalizedEmail,
      role: 'employee'
    });
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 'employee') {
      setAdminToken('');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="logo-icon">HF</span>
          <h2>{mode === 'admin' ? 'Admin Tester' : 'Employee Sign In'}</h2>
          <p>
            {mode === 'admin'
              ? 'Enter the admin token to inspect and delete test requests.'
              : 'Use the Outlook email that will send the approval request.'}
          </p>
        </div>

        <div className="login-mode-switch">
          <button
            type="button"
            className={`mode-option ${mode === 'employee' ? 'active' : ''}`}
            onClick={() => handleModeChange('employee')}
          >
            Employee
          </button>
          <button
            type="button"
            className={`mode-option ${mode === 'admin' ? 'active' : ''}`}
            onClick={() => handleModeChange('admin')}
          >
            Admin Tester
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'employee' ? (
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
            </div>
          ) : (
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
            {mode === 'admin' ? 'Enter Admin Dashboard' : 'Enter HankoFlow'}
          </button>
        </form>
      </div>
    </div>
  );
}
