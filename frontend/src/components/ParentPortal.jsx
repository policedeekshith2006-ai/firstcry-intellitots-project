import React, { useState, useEffect } from 'react';
import { getChildren, getChildDetails } from '../api';

export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchChildrenList = async () => {
    try {
      const data = await getChildren();
      const isArr = Array.isArray(data);
      setChildren(isArr ? data : []);
      if (isArr && data.length > 0) {
        setSelectedChildId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching children:', err);
      setChildren([]);
    }
  };

  const fetchParentViewData = async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getChildDetails(id);
      setParentData(data);
    } catch (err) {
      console.error('Error fetching parent details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildrenList();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchParentViewData(selectedChildId);
    }
  }, [selectedChildId]);

  const getLevelPercentage = (levelName) => {
    if (!parentData || !parentData.milestones) return 0;
    const skills = parentData.milestones.filter(m => m.level === levelName);
    if (skills.length === 0) return 0;
    const mastered = skills.filter(m => m.status === 'Mastered').length;
    return Math.round((mastered / skills.length) * 100);
  };

  // Determine which badges are earned
  const getEarnedBadges = () => {
    const badges = [
      { name: 'Alphabet Champ', level: 'Letter Recognition', icon: '🅰️', desc: 'Recognizes A-Z characters' },
      { name: 'Phonics Explorer', level: 'Phonics', icon: '🗣️', desc: 'Knows consonant & digraph sounds' },
      { name: 'Word Wizard', level: 'Word Reading', icon: '📝', desc: 'Reads CVC and sight words fluently' },
      { name: 'Storyteller Spark', level: 'Sentence Reading', icon: '📖', desc: 'Reads paragraphs and short stories' }
    ];

    return badges.map(badge => {
      const percent = getLevelPercentage(badge.level);
      return {
        ...badge,
        earned: percent === 100,
        percent
      };
    });
  };

  return (
    <div>
      <div className="header-row">
        <div className="welcome-msg">
          <h1>Parent Communication Portal</h1>
          <p>View your child's milestones, daily routines, fee records, and photos.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Demo Parent Profile:</span>
          <select 
            className="form-select"
            style={{ width: '180px' }}
            value={selectedChildId || ''}
            onChange={e => setSelectedChildId(Number(e.target.value))}
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading || !parentData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', fontSize: '18px', color: 'var(--primary)' }}>
          ✨ Loading parent portal updates...
        </div>
      ) : (
        <div className="dashboard-layout">
          
          {/* Left Main column */}
          <div className="recent-logs-section">
            
            {/* Reading levels progress rings/bars */}
            <div className="glass-card">
              <h3>Reading Levels Progress Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {['Letter Recognition', 'Phonics', 'Word Reading', 'Sentence Reading'].map(lvl => {
                  const percent = getLevelPercentage(lvl);
                  return (
                    <div key={lvl} style={{ background: 'white', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 12px auto' }}>
                        {/* Circular progress bar SVG */}
                        <svg width="90" height="90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="rgba(0,0,0,0.05)" strokeWidth="10" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            stroke={percent === 100 ? 'var(--secondary)' : 'var(--primary)'} 
                            strokeWidth="10" 
                            fill="transparent" 
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * percent) / 100}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' }}>
                          {percent}%
                        </div>
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{lvl}</h4>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Progress Summary Insights */}
            <div className="glass-card" style={{ borderLeft: '6px solid var(--secondary)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 Weekly Progress Insight</h3>
              {parentData.observations.length > 0 && parentData.observations[0].ai_summary ? (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--dark)', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    "{parentData.observations[0].ai_summary}"
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--secondary)' }}>🌟 My Strengths:</strong>
                      <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginTop: '4px' }}>{parentData.observations[0].strengths}</p>
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>🏠 Play & Practice At Home:</strong>
                      <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginTop: '4px' }}>{parentData.observations[0].suggestions}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--dark-light)', marginTop: '12px', fontStyle: 'italic' }}>
                  Weekly summary notes will be posted by the classroom teacher shortly.
                </p>
              )}
            </div>

            {/* Activity Photo Gallery */}
            <div className="glass-card">
              <h3>Preschool Activity Photos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
                {parentData.photos.map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <img 
                      src={p.url} 
                      alt="child activity" 
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }} 
                    />
                    <div style={{ padding: '8px 12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dark)' }}>{p.caption}</p>
                      <span style={{ fontSize: '9px', color: 'var(--dark-light)' }}>Uploaded on {p.date}</span>
                    </div>
                  </div>
                ))}
                {parentData.photos.length === 0 && (
                  <p style={{ gridColumn: 'span 3', fontSize: '13px', fontStyle: 'italic', color: 'var(--dark-light)', padding: '20px 0' }}>
                    No photos shared in the gallery yet.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Right column sidebar */}
          <div className="right-sidebar-section">
            
            {/* Gamified Badges */}
            <div className="glass-card">
              <h3>Reading Badges Unlocked</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {getEarnedBadges().map(badge => (
                  <div 
                    key={badge.name} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px', 
                      borderRadius: '12px', 
                      background: 'white', 
                      opacity: badge.earned ? 1 : 0.5,
                      border: badge.earned ? '1px solid var(--accent)' : '1px solid rgba(0,0,0,0.05)',
                      boxShadow: badge.earned ? '0 4px 10px rgba(251,189,5,0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '28px' }}>{badge.icon}</div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: badge.earned ? 'var(--dark)' : 'var(--dark-light)' }}>
                        {badge.name} {badge.earned && '⭐'}
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--dark-light)' }}>{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Routine tracker */}
            <div className="glass-card">
              <h3>Today's Daycare Routines</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {parentData.routines.map(r => (
                  <div key={r.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '16px', padding: '6px', background: 'var(--primary-light)', borderRadius: '8px' }}>
                      {r.activity_type === 'Play' ? '🧸' : r.activity_type === 'Nap' ? '💤' : r.activity_type === 'Meal' ? '🍎' : '🚻'}
                    </div>
                    <div>
                      <strong style={{ fontSize: '12px' }}>{r.activity_type} ({r.timestamp})</strong>
                      <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginTop: '2px' }}>{r.notes}</p>
                    </div>
                  </div>
                ))}
                {parentData.routines.length === 0 && (
                  <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--dark-light)', padding: '10px 0' }}>
                    No daily routines logged for today yet.
                  </p>
                )}
              </div>
            </div>

            {/* Transport status */}
            <div className="glass-card">
              <h3>School Transport</h3>
              <div style={{ marginTop: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Status:</span>
                  <span className={`badge ${parentData.transport.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                    {parentData.transport.status}
                  </span>
                </div>
                {parentData.transport.status === 'Active' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Route:</span>
                      <strong>{parentData.transport.route_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Pickup Time:</span>
                      <strong>{parentData.transport.pickup_time}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Drop Time:</span>
                      <strong>{parentData.transport.drop_time}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Fees summary */}
            <div className="glass-card">
              <h3>Fee Balance</h3>
              <div style={{ marginTop: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Status:</span>
                  <span className={`badge ${parentData.fees.status === 'Paid' ? 'badge-success' : (parentData.fees.status === 'Partial' ? 'badge-warning' : 'badge-danger')}`}>
                    {parentData.fees.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Amount Due:</span>
                  <strong>₹{parentData.fees.amount_due}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pending Balance:</span>
                  <strong style={{ color: 'var(--primary)' }}>₹{parentData.fees.amount_due - parentData.fees.amount_paid}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
