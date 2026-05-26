import { useState } from 'react';
import Login from './components/Login';
import ApproverDashboard from './components/ApproverDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('approvals_session');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem('approvals_session');
      }
    }
    return null;
  });

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
              <span>{user.role === 'admin' ? 'Administrator' : 'Approver'}</span>
            </div>
          )}
        </div>
      </header>

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : user.role === 'admin' ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <ApproverDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
