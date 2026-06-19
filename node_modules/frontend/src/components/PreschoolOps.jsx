import React, { useState, useEffect } from 'react';
import { getEnquiries, getChildren, getFees, getClassrooms, addEnquiry, enrollChild, logRoutine, payFee, getFeePayments } from '../api';

export default function PreschoolOps({ triggerNotification }) {
  const [subTab, setSubTab] = useState('enquiries');
  const [children, setChildren] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);

  // New enquiry form state
  const [enqChildName, setEnqChildName] = useState('');
  const [enqParentName, setEnqParentName] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqSource, setEnqSource] = useState('Website');
  const [enqNotes, setEnqNotes] = useState('');

  // Daily Routine modal/form state
  const [selectedChildForRoutine, setSelectedChildForRoutine] = useState(null);
  const [routineType, setRoutineType] = useState('Play');
  const [routineNotes, setRoutineNotes] = useState('');

  // Fee payment state
  const [selectedFeeRecord, setSelectedFeeRecord] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // New student enrollment form state (inside enquiries promotion flow)
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollChildName, setEnrollChildName] = useState('');
  const [enrollParentName, setEnrollParentName] = useState('');
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollClassroom, setEnrollClassroom] = useState('2'); // default nursery
  const [enrollDob, setEnrollDob] = useState('2021-01-01');
  const [enrollGender, setEnrollGender] = useState('Female');

  const fetchEnquiries = async () => {
    try {
      const data = await getEnquiries();
      setEnquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      setEnquiries([]);
    }
  };

  const fetchChildrenData = async () => {
    try {
      const data = await getChildren();
      setChildren(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching children:', err);
      setChildren([]);
    }
  };

  const fetchFees = async () => {
    try {
      const data = await getFees();
      setFees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching fees:', err);
      setFees([]);
    }
  };

  const fetchPayments = async () => {
    try {
      const data = await getFeePayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setPayments([]);
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

  useEffect(() => {
    if (subTab === 'enquiries') fetchEnquiries();
    if (subTab === 'attendance') fetchChildrenData();
    if (subTab === 'fees') {
      fetchFees();
      fetchPayments();
    }
    if (subTab === 'classrooms') fetchClassrooms();
  }, [subTab]);

  // Handle Enquiry Submit
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await addEnquiry({
        child_name: enqChildName,
        parent_name: enqParentName,
        email: enqEmail,
        phone: enqPhone,
        source: enqSource,
        notes: enqNotes
      });
      if (data.success) {
        triggerNotification('📞 Lead enquiry created successfully. Counseling follow-up scheduled.');
        // Reset form
        setEnqChildName('');
        setEnqParentName('');
        setEnqEmail('');
        setEnqPhone('');
        setEnqNotes('');
        fetchEnquiries();
      }
    } catch (err) {
      console.error('Error submitting enquiry:', err);
    }
  };

  // Promote Enquiry to Enrollment (Open details form)
  const handlePromoteClick = (enq) => {
    setEnrollChildName(enq.child_name);
    setEnrollParentName(enq.parent_name);
    setEnrollPhone(enq.phone);
    setEnrollEmail(enq.email);
    setShowEnrollForm(true);
  };

  // Submit actual enrollment
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    const splitName = enrollChildName.trim().split(' ');
    const firstName = splitName[0] || '';
    const lastName = splitName.slice(1).join(' ') || 'Student';

    try {
      const data = await enrollChild({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: enrollDob,
        gender: enrollGender,
        classroom_id: Number(enrollClassroom),
        parent_name: enrollParentName,
        email: enrollEmail,
        phone: enrollPhone,
        amount_due: 12000.00
      });
      if (data.success) {
        triggerNotification(`🎓 Successfully enrolled ${enrollChildName} into preschool!`);
        setShowEnrollForm(false);
        setSubTab('attendance'); // view active kids list
      }
    } catch (err) {
      console.error('Error enrolling child:', err);
    }
  };

  // Log Child Routine
  const handleRoutineSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChildForRoutine) return;
    try {
      const data = await logRoutine(selectedChildForRoutine.id, routineType, routineNotes);
      if (data.success) {
        triggerNotification(`🧸 Routine logged for ${selectedChildForRoutine.first_name}`);
        setSelectedChildForRoutine(null);
        setRoutineNotes('');
      }
    } catch (err) {
      console.error('Error logging routine:', err);
    }
  };

  // Record Fee Payment
  const handleFeePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeeRecord) return;
    try {
      const data = await payFee(selectedFeeRecord.id, Number(paymentAmount));
      if (data.success) {
        triggerNotification(`💰 Payment of ₹${paymentAmount} recorded! Receipt message sent.`);
        setSelectedFeeRecord(null);
        setPaymentAmount('');
        fetchFees();
        fetchPayments();
      }
    } catch (err) {
      console.error('Error paying fee:', err);
    }
  };

  return (
    <div>
      <div className="header-row">
        <div className="welcome-msg">
          <h1>Preschool Centre Operations</h1>
          <p>Manage admissions lead funnel, log routines, register fee receipts, and view class plans.</p>
        </div>
      </div>

      {/* Sub tabs header */}
      <div className="tabs-header" style={{ marginBottom: '20px' }}>
        <button className={`tab-btn ${subTab === 'enquiries' ? 'active' : ''}`} onClick={() => setSubTab('enquiries')}>
          📞 Enquiries & Leads
        </button>
        <button className={`tab-btn ${subTab === 'attendance' ? 'active' : ''}`} onClick={() => setSubTab('attendance')}>
          📅 Daily Attendance & Routines
        </button>
        <button className={`tab-btn ${subTab === 'fees' ? 'active' : ''}`} onClick={() => setSubTab('fees')}>
          💰 Fee Invoices
        </button>
        <button className={`tab-btn ${subTab === 'classrooms' ? 'active' : ''}`} onClick={() => setSubTab('classrooms')}>
          🏫 Classrooms & Lesson Plans
        </button>
      </div>

      {/* 1. Enquiries View */}
      {subTab === 'enquiries' && (
        <div className="dashboard-layout">
          
          {/* New enquiry form */}
          <div className="glass-card">
            <h3>Add Prospective Parent Enquiry</h3>
            <form onSubmit={handleEnquirySubmit} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Child Name</label>
                <input type="text" className="form-input" required value={enqChildName} onChange={e => setEnqChildName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Parent Name</label>
                <input type="text" className="form-input" required value={enqParentName} onChange={e => setEnqParentName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-input" required value={enqEmail} onChange={e => setEnqEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" className="form-input" required value={enqPhone} onChange={e => setEnqPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Enquiry Channel Source</label>
                <select className="form-select" value={enqSource} onChange={e => setEnqSource(e.target.value)}>
                  <option value="Website">Website Form</option>
                  <option value="Walk-in">Direct Walk-in</option>
                  <option value="Instagram">Instagram/Social Media</option>
                  <option value="Referral">Parent Referral</option>
                </select>
              </div>
              <div className="form-group">
                <label>Discussion Notes</label>
                <textarea rows="3" className="form-textarea" value={enqNotes} onChange={e => setEnqNotes(e.target.value)} placeholder="Timings, child temperament, focus on phonics..."></textarea>
              </div>
              <button type="submit" className="btn btn-primary">Save Enquiry Lead</button>
            </form>
          </div>

          {/* Enquiries Lead Funnel List */}
          <div className="recent-logs-section">
            <div className="glass-card">
              <h3>Active Enquiry Leads</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {enquiries.map(enq => (
                  <div key={enq.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '15px' }}>{enq.child_name}</h4>
                      <span className={`badge ${enq.status === 'New' ? 'badge-danger' : (enq.status === 'Contacted' ? 'badge-warning' : 'badge-success')}`}>
                        {enq.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--dark-light)' }}>
                      Parent: {enq.parent_name} | Phone: {enq.phone}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--dark)', marginTop: '6px', fontStyle: 'italic' }}>
                      "{enq.notes}"
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--dark-light)' }}>Source: {enq.source} | Lead Date: {enq.date}</span>
                      {enq.status !== 'Enrolled' && (
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => handlePromoteClick(enq)}>
                          🎓 Enrol Student
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enroll child sub-modal */}
            {showEnrollForm && (
              <div className="glass-card" style={{ borderLeft: '6px solid var(--secondary)', background: 'var(--secondary-light)' }}>
                <h3>Complete Admission Form</h3>
                <form onSubmit={handleEnrollSubmit} style={{ marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Child Full Name</label>
                      <input type="text" className="form-input" required value={enrollChildName} onChange={e => setEnrollChildName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" className="form-input" required value={enrollDob} onChange={e => setEnrollDob(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select className="form-select" value={enrollGender} onChange={e => setEnrollGender(e.target.value)}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Target Classroom</label>
                      <select className="form-select" value={enrollClassroom} onChange={e => setEnrollClassroom(e.target.value)}>
                        <option value="1">Playgroup (1.5 - 2.5 yrs)</option>
                        <option value="2">Nursery (2.5 - 3.5 yrs)</option>
                        <option value="3">LKG (3.5 - 4.5 yrs)</option>
                        <option value="4">UKG (4.5 - 6.0 yrs)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button type="submit" className="btn btn-secondary">Submit Admission</button>
                    <button type="button" className="btn btn-outline" onClick={() => setShowEnrollForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 2. Attendance & Routines */}
      {subTab === 'attendance' && (
        <div className="glass-card">
          <h3>Daily Logbook & Student Routines</h3>
          <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginBottom: '16px' }}>
            Check students in and out or record daily logs (naps, toilet, activity details).
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)', height: '40px', color: 'var(--dark-light)' }}>
                <th style={{ padding: '8px' }}>Student</th>
                <th>Classroom</th>
                <th>Routine Logger</th>
              </tr>
            </thead>
            <tbody>
              {children.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', height: '52px' }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{c.first_name} {c.last_name}</td>
                  <td>{c.classroom_name}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedChildForRoutine(c)}>
                      🧸 Log Routine
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Routine modal builder */}
          {selectedChildForRoutine && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="glass-card" style={{ width: '400px', background: 'white', padding: '24px' }}>
                <h3>Log Daily Routine</h3>
                <p style={{ fontSize: '13px', color: 'var(--dark-light)' }}>Child: <strong>{selectedChildForRoutine.first_name}</strong></p>
                <form onSubmit={handleRoutineSubmit} style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label>Activity Category</label>
                    <select className="form-select" value={routineType} onChange={e => setRoutineType(e.target.value)}>
                      <option value="Play">🧸 Play / Activity</option>
                      <option value="Nap">💤 Nap / Rest</option>
                      <option value="Meal">🍎 Meal / Food</option>
                      <option value="Toilet">🚻 Toilet / Diaper</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description Notes</label>
                    <textarea rows="3" className="form-textarea" required value={routineNotes} onChange={e => setRoutineNotes(e.target.value)} placeholder="Describe detail: e.g. Slept for 30 mins, finished entire bowl of oats..."></textarea>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary">Save Routine</button>
                    <button type="button" className="btn btn-outline" onClick={() => setSelectedChildForRoutine(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Fee Ledgers */}
      {subTab === 'fees' && (
        <div className="glass-card">
          <h3>Fee Invoices & Payments</h3>
          <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginBottom: '16px' }}>
            List billing records and record payments received.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)', height: '40px', color: 'var(--dark-light)' }}>
                <th style={{ padding: '8px' }}>Child</th>
                <th>Classroom</th>
                <th>Fees Due</th>
                <th>Fees Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', height: '52px' }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{f.first_name} {f.last_name}</td>
                  <td>{f.classroom_name}</td>
                  <td>₹{f.amount_due}</td>
                  <td>₹{f.amount_paid}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: '600' }}>₹{f.amount_due - f.amount_paid}</td>
                  <td>
                    <span className={`badge ${f.status === 'Paid' ? 'badge-success' : (f.status === 'Partial' ? 'badge-warning' : 'badge-danger')}`}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    {f.status !== 'Paid' && (
                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedFeeRecord(f)}>
                        💰 Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Fee Payment Modal */}
          {selectedFeeRecord && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="glass-card" style={{ width: '400px', background: 'white', padding: '24px' }}>
                <h3>Record Fee Payment</h3>
                <p style={{ fontSize: '13px', color: 'var(--dark-light)' }}>
                  Student: <strong>{selectedFeeRecord.first_name} {selectedFeeRecord.last_name}</strong>
                </p>
                <p style={{ fontSize: '12px', color: 'var(--primary)' }}>
                  Remaining Balance: <strong>₹{selectedFeeRecord.amount_due - selectedFeeRecord.amount_paid}</strong>
                </p>
                <form onSubmit={handleFeePaymentSubmit} style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label>Receipt Amount (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      required 
                      value={paymentAmount} 
                      onChange={e => setPaymentAmount(e.target.value)} 
                      max={selectedFeeRecord.amount_due - selectedFeeRecord.amount_paid}
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary">Confirm Receipt</button>
                    <button type="button" className="btn btn-outline" onClick={() => setSelectedFeeRecord(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Recent Payments History */}
          <div style={{ marginTop: '32px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧾 Recent Payment Transaction History
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginBottom: '16px' }}>
              Review the detailed transaction records of fees collected.
            </p>
            {payments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--dark-light)', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                No payment transactions recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)', height: '36px', color: 'var(--dark-light)' }}>
                      <th style={{ padding: '8px' }}>Transaction Date</th>
                      <th>Student Name</th>
                      <th>Classroom</th>
                      <th>Amount Paid</th>
                      <th>Payment Notes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(pay => (
                      <tr key={pay.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', height: '44px' }}>
                        <td style={{ padding: '8px', fontWeight: '500' }}>{pay.payment_date}</td>
                        <td style={{ fontWeight: '600' }}>{pay.first_name} {pay.last_name}</td>
                        <td>{pay.classroom_name}</td>
                        <td style={{ color: 'var(--secondary)', fontWeight: '600' }}>₹{pay.amount_paid}</td>
                        <td style={{ fontStyle: 'italic', color: 'var(--dark-light)' }}>{pay.notes}</td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🟢 Receipt Sent
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Classroom Schedules & Lesson Plans */}
      {subTab === 'classrooms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Classrooms summary list */}
          <div className="glass-card">
            <h3>Preschool Classrooms Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {classrooms.map(c => (
                <div key={c.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <h4 style={{ fontSize: '16px', color: 'var(--primary)' }}>{c.name}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginTop: '4px' }}>Teacher: <strong>{c.teacher_name}</strong></p>
                  <p style={{ fontSize: '12px', color: 'var(--dark-light)' }}>Age Group: {c.age_group}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px' }}>
                    <span>Capacity Occupancy:</span>
                    <strong>{c.enrolled_count} / {c.capacity}</strong>
                  </div>
                  <div className="progress-bar-container" style={{ height: '6px', marginTop: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: `${(c.enrolled_count / c.capacity) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson planning overview */}
          <div className="glass-card">
            <h3>Preschool Phonics & Reading Lesson Plans</h3>
            <p style={{ fontSize: '13px', color: 'var(--dark-light)', marginBottom: '16px' }}>
              Current weekly lesson plans targeted at literacy growth milestones:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>Nursery (Age 2.5 - 3.5 yrs) - Week 23</strong>
                  <span className="badge badge-success">Approved</span>
                </div>
                <p style={{ fontSize: '13px' }}><strong>Phonics/Reading Topic:</strong> Introduction to Digraphs & Sight Words</p>
                <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginTop: '4px' }}>
                  <strong>Activities:</strong> Flashcard matching games for letter sounds, learning common sight words (the, of, is).
                </p>
              </div>

              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>LKG (Age 3.5 - 4.5 yrs) - Week 23</strong>
                  <span className="badge badge-success">Approved</span>
                </div>
                <p style={{ fontSize: '13px' }}><strong>Phonics/Reading Topic:</strong> Three-letter CVC Blending</p>
                <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginTop: '4px' }}>
                  <strong>Activities:</strong> Slider word boards, interactive spelling drills (c-a-t, p-i-n, d-o-g).
                </p>
              </div>

              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>UKG (Age 4.5 - 6.0 yrs) - Week 23</strong>
                  <span className="badge badge-warning">Draft</span>
                </div>
                <p style={{ fontSize: '13px' }}><strong>Phonics/Reading Topic:</strong> Silent E Rules & Short Paragraph Stories</p>
                <p style={{ fontSize: '12px', color: 'var(--dark-light)', marginTop: '4px' }}>
                  <strong>Activities:</strong> Storybook circles, word sliders mapping vowel change logic (cap -&gt; cape).
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
