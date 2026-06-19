import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ChildTracker from './components/ChildTracker';
import ParentPortal from './components/ParentPortal';
import PreschoolOps from './components/PreschoolOps';
import { checkBackendStatus } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // Toast notifier helper
  const triggerNotification = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove toast after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  useEffect(() => {
    const checkConnection = async () => {
      const online = await checkBackendStatus();
      if (online) {
        triggerNotification('🟢 Connected to local MySQL Backend server successfully!', 'success');
      } else {
        triggerNotification('⚠️ MySQL Backend offline. Running in local sandbox mode with simulated data.', 'info');
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="glass-container">
      
      {/* Sidebar Navigation */}
      <aside className="glass-sidebar">
        <div className="logo-area">
          <div className="logo-icon">F</div>
          <div className="logo-text">
            <h2>FirstCry</h2>
            <p>Intellitots Tracker</p>
          </div>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span> Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
          >
            <span className="nav-icon">🎓</span> Phonics Tracker
          </button>
          <button 
            className={`nav-item ${activeTab === 'portal' ? 'active' : ''}`}
            onClick={() => setActiveTab('portal')}
          >
            <span className="nav-icon">🏡</span> Parent Portal
          </button>
          <button 
            className={`nav-item ${activeTab === 'ops' ? 'active' : ''}`}
            onClick={() => setActiveTab('ops')}
          >
            <span className="nav-icon">🏫</span> Centre Ops
          </button>
        </nav>

        <div className="sidebar-profile-card">
          <div style={{ fontSize: '12px', color: 'var(--dark-light)', fontWeight: '500' }}>Logged in user</div>
          <strong>Ms. Priya Sharma</strong>
          <p>Role: Primary Teacher</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="glass-content">
        {activeTab === 'dashboard' && (
          <Dashboard setActiveTab={setActiveTab} triggerNotification={triggerNotification} />
        )}
        
        {activeTab === 'tracker' && (
          <ChildTracker triggerNotification={triggerNotification} />
        )}

        {activeTab === 'portal' && (
          <ParentPortal />
        )}

        {activeTab === 'ops' && (
          <PreschoolOps triggerNotification={triggerNotification} />
        )}
      </main>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
