import React, { useState, useEffect } from 'react';
import { getDashboardSummary, getTasks, completeTask } from '../api';

export default function Dashboard({ setActiveTab, triggerNotification }) {
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dataSum = await getDashboardSummary();
      setSummary(dataSum);

      const dataTasks = await getTasks();
      setTasks(dataTasks.filter(t => t.status === 'Pending'));
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCompleteTask = async (taskId, taskTitle) => {
    try {
      const res = await completeTask(taskId);
      if (res.success) {
        triggerNotification(`✅ Task completed: "${taskTitle}"`);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        // Refresh summary count
        setSummary(prev => ({
          ...prev,
          pendingTasks: prev.pendingTasks - 1
        }));
      }
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  if (loading || !summary) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', fontSize: '18px', fontWeight: '600', color: 'var(--primary)' }}>
        ✨ Loading Intellitots Dashboard Summary...
      </div>
    );
  }

  return (
    <div>
      <div className="header-row">
        <div className="welcome-msg">
          <h1>Preschool Centre Dashboard</h1>
          <p>Real-time enrollment, curriculum tracking, and daycare operations.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setActiveTab('tracker')}>
            ✏️ New Observation
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('tracker')}>
          <div className="kpi-icon coral">👧</div>
          <div className="kpi-info">
            <p>Active Children</p>
            <h3>{summary.totalChildren}</h3>
          </div>
        </div>
        <div className="glass-card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ops')}>
          <div className="kpi-icon teal">📞</div>
          <div className="kpi-info">
            <p>Parent Enquiries</p>
            <h3>{summary.activeEnquiries}</h3>
          </div>
        </div>
        <div className="glass-card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('tracker')}>
          <div className="kpi-icon gold">🎓</div>
          <div className="kpi-info">
            <p>Milestone Rate</p>
            <h3>{summary.milestoneRate}%</h3>
          </div>
        </div>
        <div className="glass-card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ops')}>
          <div className="kpi-icon dark">💰</div>
          <div className="kpi-info">
            <p>Fees Collected</p>
            <h3>{summary.financials.collectionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="dashboard-layout">
        <div className="recent-logs-section">
          {/* Alerts / Focus Areas */}
          <div className="glass-card" style={{ borderLeft: '6px solid var(--primary)' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Reading Focus Alerts
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--dark-light)', marginBottom: '16px' }}>
              These children have active concern areas logged in their reading profiles:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {summary.recentObservations
                .filter(obs => obs.concerns && !obs.concerns.toLowerCase().includes('no specific'))
                .slice(0, 3)
                .map(obs => (
                  <div key={obs.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{obs.first_name} {obs.last_name} ({obs.classroom_name})</strong>
                      <span className="badge badge-warning">Needs Support</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--dark)' }}>
                      <strong>Concern:</strong> {obs.concerns}
                    </p>
                  </div>
                ))}
              {summary.recentObservations.filter(obs => obs.concerns && !obs.concerns.toLowerCase().includes('no specific')).length === 0 && (
                <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--dark-light)' }}>
                  No active reading support alerts. Everyone is tracking beautifully!
                </p>
              )}
            </div>
          </div>

          {/* Recent Observations */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '16px' }}>Recent Observations & AI Analysis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {summary.recentObservations.map(obs => (
                <div key={obs.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px' }}>{obs.first_name} {obs.last_name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--dark-light)' }}>
                        Logged by {obs.observer_id} on {obs.date} | Class: {obs.classroom_name}
                      </p>
                    </div>
                    <span className="badge badge-success">AI Analyzed</span>
                  </div>
                  
                  <p style={{ fontSize: '13px', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                    "{obs.notes}"
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', marginTop: '10px' }}>
                    <div>
                      <strong style={{ color: 'var(--secondary)' }}>💪 Strengths:</strong>
                      <p style={{ color: 'var(--dark-light)', marginTop: '2px' }}>{obs.strengths}</p>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)' }}>🔍 Focus Area:</strong>
                      <p style={{ color: 'var(--dark-light)', marginTop: '2px' }}>{obs.concerns}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="right-sidebar-section">
          {/* Occupancy Card */}
          <div className="glass-card">
            <h3>Preschool Occupancy</h3>
            <div style={{ margin: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                <span>Active Occupancy</span>
                <span>{summary.occupancy.enrolled} / {summary.occupancy.capacity} Students</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill teal" style={{ width: `${summary.occupancy.percentage}%` }}></div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginTop: '6px' }}>
                Center is running at {summary.occupancy.percentage}% capacity.
              </p>
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="glass-card">
            <h3>Teacher Task Checklist</h3>
            <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginBottom: '12px' }}>
              Tasks and counselor follow-up requirements:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <div key={task.id} style={{ background: 'white', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: '600' }}>{task.title}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginTop: '2px' }}>{task.description}</p>
                        <p style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', marginTop: '6px' }}>
                          Due: {task.due_date} | Assignee: {task.assigned_to}
                        </p>
                      </div>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                        onClick={() => handleCompleteTask(task.id, task.title)}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--dark-light)', padding: '10px 0' }}>
                  No pending tasks. Great job!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
