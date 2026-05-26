import { useState } from 'react';
import { ADMIN_USER, APPROVER_LEVELS } from '../config/approvers';

const PRESETS = [
  ...APPROVER_LEVELS.map((approver) => ({ ...approver, role: 'approver' })),
  ADMIN_USER
];

export default function Login({ onLogin }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].email);
  const [customEmail, setCustomEmail] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (useCustom) {
      if (!customEmail || !customEmail.includes('@')) {
        alert('Please enter a valid email address.');
        return;
      }
      onLogin({ email: customEmail, role: 'approver' });
      return;
    }

    const preset = PRESETS.find((item) => item.email === selectedPreset);
    onLogin({ email: preset.email, role: preset.role });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="logo-icon">HF</span>
          <h2>Sign In</h2>
          <p>Document Approval Portal</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="email-source"
                checked={!useCustom}
                onChange={() => setUseCustom(false)}
                style={{ accentColor: 'var(--primary)' }}
              />
              Preset Account
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="email-source"
                checked={useCustom}
                onChange={() => setUseCustom(true)}
                style={{ accentColor: 'var(--primary)' }}
              />
              Custom Email
            </label>
          </div>

          {!useCustom ? (
            <div className="form-group">
              <label htmlFor="preset-select">Select Preset</label>
              <select
                id="preset-select"
                className="form-select"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
              >
                {PRESETS.map((preset) => (
                  <option key={preset.email} value={preset.email}>
                    {preset.label} ({preset.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="custom-email-input">Approver Email Address</label>
              <input
                id="custom-email-input"
                type="email"
                className="form-input"
                placeholder="approver@company.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Enter Portal
          </button>
        </form>
      </div>
    </div>
  );
}
