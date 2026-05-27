import { useState } from 'react';
import Login from './components/Login';
import ApproverDashboard from './components/ApproverDashboard';
import ApprovalRedirect from './components/ApprovalRedirect';

function restoreSession() {
  const savedUser = localStorage.getItem('approvals_session');
  if (!savedUser) return null;

  try {
    const parsedUser = JSON.parse(savedUser);

    if (!parsedUser?.email || parsedUser?.role !== 'employee') {
      localStorage.removeItem('approvals_session');
      return null;
    }

    return parsedUser;
  } catch {
    localStorage.removeItem('approvals_session');
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(restoreSession);
  const isApprovalRedirect = window.location.pathname.startsWith('/a/');

  const handleLogin = (userInfo) => {
    setUser(userInfo);
    localStorage.setItem('approvals_session', JSON.stringify(userInfo));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('approvals_session');
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">HF</span>
          <span>HankoFlow</span>
        </div>
        <div className="nav-links">
          {user && (
            <div className="user-badge">
              <span className="badge-dot"></span>
              <span>Employee</span>
            </div>
          )}
        </div>
      </header>

      {isApprovalRedirect ? (
        <ApprovalRedirect />
      ) : !user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <ApproverDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
