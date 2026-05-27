import { useState } from 'react';
import { ADMIN_USER } from '../config/approvers';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('pamplonajeypii.45@outlook.com');

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      alert('Please enter a valid Outlook email address.');
      return;
    }

    onLogin({
      email: normalizedEmail,
      role: normalizedEmail === ADMIN_USER.email.toLowerCase() ? 'admin' : 'employee'
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
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Enter HankoFlow
          </button>
        </form>
      </div>
    </div>
  );
}
