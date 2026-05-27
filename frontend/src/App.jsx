import { useState } from 'react';
import Login from './components/Login';
import ApproverDashboard from './components/ApproverDashboard';
import AdminDashboard from './components/AdminDashboard';

function restoreSession() {
  const savedUser = localStorage.getItem('approvals_session');
  if (!savedUser) return null;

  try {
    const parsedUser = JSON.parse(savedUser);
    const isInvalidAdminSession = parsedUser?.role === 'admin' && !parsedUser?.adminToken;

    if (!parsedUser?.email || isInvalidAdminSession) {
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
              <span>{user.role === 'admin' ? 'Administrator' : 'Employee'}</span>
            </div>
          )}
        </div>
      </header>

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : user.role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <ApproverDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
