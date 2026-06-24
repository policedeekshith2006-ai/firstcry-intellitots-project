import React, { useState, useEffect } from 'react';
import { getChildren, getClassrooms, getChildDetails, updateMilestone, addObservation } from '../api';

export default function ChildTracker({ triggerNotification, currentUser }) {
  const [children, setChildren] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childDetails, setChildDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  
  // Tabs for reading milestones
  const [activeMilestoneTab, setActiveMilestoneTab] = useState('Letter Recognition');
  
  // Observation logger state
  const [notes, setNotes] = useState('');
  const [observer, setObserver] = useState(currentUser || 'Ms. Priya Sharma');
  const [aiPreview, setAiPreview] = useState(null);
  const [processingAi, setProcessingAi] = useState(false);

  const fetchChildren = async () => {
    try {
      const data = await getChildren(selectedClassroom, search);
      const isArr = Array.isArray(data);
      setChildren(isArr ? data : []);
      if (isArr && data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching children:', err);
      setChildren([]);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const data = await getClassrooms();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setClassrooms([]);
    }
  };

  const fetchChildDetails = async (id) => {
    if (!id) return;
    try {
      const data = await getChildDetails(id);
      setChildDetails(data);
      // Reset AI preview & notes
      setAiPreview(null);
      setNotes('');
    } catch (err) {
      console.error('Error fetching child details:', err);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [search, selectedClassroom]);

  useEffect(() => {
    if (selectedChildId) {
      fetchChildDetails(selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (currentUser) {
      setObserver(currentUser);
    }
  }, [currentUser]);

  const handleMilestoneUpdate = async (level, skillName, newStatus) => {
    if (!selectedChildId) return;
    try {
      const data = await updateMilestone(selectedChildId, level, skillName, newStatus);
      
      if (data.success) {
        // Update local status state
        setChildDetails(prev => ({
          ...prev,
          milestones: prev.milestones.map(m => 
            (m.level === level && m.skill_name === skillName) ? { ...m, status: newStatus } : m
          )
        }));

        // Trigger notification
        triggerNotification(`Updated "${skillName}" to ${newStatus}`);

        if (data.levelCompleted) {
          triggerNotification(`🎉 Level Mastered! ${data.message || 'Milestone achieved!'}`, 'success');
        }

        // Refresh child list to update percentage
        fetchChildren();
      }
    } catch (err) {
      console.error('Error updating milestone:', err);
    }
  };

  const handleRunAiAnalysis = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;

    try {
      setProcessingAi(true);
      const data = await addObservation(selectedChildId, observer, notes);
      if (data.success) {
        setAiPreview(data.analysis);
        triggerNotification('🤖 AI parsed and structured the observation notes!');
        
        // Refresh observation history timeline
        fetchChildDetails(selectedChildId);
      }
    } catch (err) {
      console.error('Error running AI observations analysis:', err);
    } finally {
      setProcessingAi(false);
    }
  };

  const getFilteredMilestones = () => {
    if (!childDetails || !childDetails.milestones) return [];
    return childDetails.milestones.filter(m => m.level === activeMilestoneTab);
  };

  const getLevelProgress = (level) => {
    if (!childDetails || !childDetails.milestones) return 0;
    const items = childDetails.milestones.filter(m => m.level === level);
    if (items.length === 0) return 0;
    const mastered = items.filter(m => m.status === 'Mastered').length;
    return Math.round((mastered / items.length) * 100);
  };

  return (
    <div>
      <div className="header-row">
        <div className="welcome-msg">
          <h1>Reading Progress & Phonics Milestones</h1>
          <p>Track checklists, log classroom observations, and utilize the AI Assistant.</p>
        </div>
      </div>

      <div className="tracker-split">
        {/* Left pane: Children List */}
        <div>
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input 
                type="text" 
                placeholder="🔍 Search child or parent..." 
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <select 
                className="form-select"
                value={selectedClassroom}
                onChange={e => setSelectedClassroom(e.target.value)}
              >
                <option value="">All Classrooms</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="student-list">
            {children.map(child => (
              <div 
                key={child.id} 
                className={`student-card ${selectedChildId === child.id ? 'active' : ''}`}
                onClick={() => setSelectedChildId(child.id)}
              >
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{child.first_name} {child.last_name}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--dark-light)', marginTop: '2px' }}>{child.classroom_name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-info">{child.progressPercentage}%</span>
                </div>
              </div>
            ))}
            {children.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--dark-light)', padding: '20px' }}>
                No active children found matching filters.
              </p>
            )}
          </div>
        </div>

        {/* Right pane: Milestone checklists and observations details */}
        <div>
          {childDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Profile Card details */}
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px' }}>{childDetails.child.first_name} {childDetails.child.last_name}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginTop: '2px' }}>
                      Classroom: <strong>{childDetails.child.classroom_name}</strong> | Teacher: {childDetails.child.classroom_teacher}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--dark-light)' }}>
                      Date of Birth: {childDetails.child.date_of_birth} | Status: <span className="badge badge-success">{childDetails.child.status}</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Overall Progress</div>
                    <span className="badge badge-success" style={{ fontSize: '14px', padding: '6px 12px' }}>
                      {children.find(c => c.id === childDetails.child.id)?.progressPercentage || 0}% Mastered
                    </span>
                  </div>
                </div>

                {/* Progress breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px', background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '10px' }}>
                  {['Letter Recognition', 'Phonics', 'Word Reading', 'Sentence Reading'].map(lvl => (
                    <div key={lvl}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lvl}</span>
                        <span>{getLevelProgress(lvl)}%</span>
                      </div>
                      <div className="progress-bar-container" style={{ height: '6px' }}>
                        <div className="progress-bar-fill teal" style={{ width: `${getLevelProgress(lvl)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones Checklist Card */}
              <div className="glass-card">
                <div className="tabs-header">
                  {['Letter Recognition', 'Phonics', 'Word Reading', 'Sentence Reading'].map(tab => (
                    <button 
                      key={tab} 
                      className={`tab-btn ${activeMilestoneTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveMilestoneTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="checklist-grid">
                  {getFilteredMilestones().map(m => (
                    <div key={m.id} className="checklist-item">
                      <div className="checklist-info">
                        <p>{m.skill_name}</p>
                        <span>{m.checked_date ? `Checked: ${m.checked_date}` : 'Not checked'}</span>
                      </div>
                      <div className="status-toggles">
                        <button 
                          className={`status-toggle-btn not-started ${m.status === 'Not Started' ? 'active' : ''}`}
                          onClick={() => handleMilestoneUpdate(m.level, m.skill_name, 'Not Started')}
                        >
                          Not Started
                        </button>
                        <button 
                          className={`status-toggle-btn progress ${m.status === 'In Progress' ? 'active' : ''}`}
                          onClick={() => handleMilestoneUpdate(m.level, m.skill_name, 'In Progress')}
                        >
                          In Progress
                        </button>
                        <button 
                          className={`status-toggle-btn mastered ${m.status === 'Mastered' ? 'active' : ''}`}
                          onClick={() => handleMilestoneUpdate(m.level, m.skill_name, 'Mastered')}
                        >
                          Mastered
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Observation (AI Engine connected) */}
              <div className="glass-card">
                <h3>Log Teacher Observation & AI Insights</h3>
                <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginBottom: '16px' }}>
                  Write unstructured notes about today's reading activity. The AI engine will parse strengths, focus areas, and a parent-friendly report.
                </p>

                <form onSubmit={handleRunAiAnalysis}>
                  <div className="form-group">
                    <label>Observer Staff Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={observer} 
                      onChange={e => setObserver(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Daily Activity Observation Notes</label>
                    <textarea 
                      rows="4" 
                      className="form-textarea" 
                      placeholder="e.g. Aria did great identifying alphabet cards today. She easily spots letters like S and T. However, she stumbles when blending ch or sh sounds. Suggest playing blend matching games at home."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-secondary" 
                    disabled={processingAi || !notes.trim()}
                  >
                    {processingAi ? '🤖 Processing AI Summary Heuristics...' : '⚡ Analyze with AI Assistant'}
                  </button>
                </form>

                {/* AI Parsing Preview */}
                {aiPreview && (
                  <div style={{ marginTop: '24px', background: 'var(--primary-light)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--primary)' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '15px' }}>🤖 Heuristic Analysis Output</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <strong>💪 Strengths Extracted:</strong>
                        <p style={{ color: 'var(--dark)', marginTop: '2px' }}>{aiPreview.strengths}</p>
                      </div>
                      <div>
                        <strong>⚠️ Concern Areas:</strong>
                        <p style={{ color: 'var(--dark)', marginTop: '2px' }}>{aiPreview.concerns}</p>
                      </div>
                      <div>
                        <strong>💡 Suggestions for Home:</strong>
                        <p style={{ color: 'var(--dark)', marginTop: '2px' }}>{aiPreview.suggestions}</p>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--secondary)' }}>
                        <strong style={{ color: 'var(--secondary)' }}>💌 Parent Summary Narrative:</strong>
                        <p style={{ color: 'var(--dark)', marginTop: '2px', fontStyle: 'italic' }}>{aiPreview.ai_summary}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Observation Timeline History */}
              <div className="glass-card">
                <h3>Observation & Progress Log History</h3>
                <div className="timeline">
                  {childDetails.observations.map(obs => (
                    <div key={obs.id} className="timeline-item">
                      <div className="timeline-dot teal"></div>
                      <div className="timeline-content">
                        <div className="timeline-time">
                          Logged on {obs.date} by {obs.observer_id}
                        </div>
                        <p style={{ fontSize: '13px', fontStyle: 'italic', marginBottom: '8px' }}>
                          "{obs.notes}"
                        </p>
                        
                        {obs.ai_summary && (
                          <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)', fontSize: '12px', marginTop: '8px' }}>
                            <strong style={{ color: 'var(--primary)' }}>Parent Summary:</strong> {obs.ai_summary}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {childDetails.observations.length === 0 && (
                    <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--dark-light)', padding: '10px 0' }}>
                      No observation records logged yet.
                    </p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--dark-light)' }}>
              <h3>Select a child to view progress details, update checklists, and write observations.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
