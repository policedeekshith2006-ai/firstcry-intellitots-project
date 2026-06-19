const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dbHelper = require('./database');
const aiEngine = require('./ai_engine');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Initialize Database on startup
dbHelper.initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FirstCry Intellitots API Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to start server due to database error:', err);
    process.exit(1);
  });

// --- API ROUTES ---

// 1. Dashboard Analytics Summary
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // Total Children
    const childCount = await dbHelper.dbGet('SELECT COUNT(*) as count FROM children WHERE status = "Active"');
    
    // Active Enquiries
    const enquiryCount = await dbHelper.dbGet('SELECT COUNT(*) as count FROM enquiries WHERE status != "Closed" AND status != "Enrolled"');
    
    // Pending Tasks
    const taskCount = await dbHelper.dbGet('SELECT COUNT(*) as count FROM teacher_tasks WHERE status = "Pending"');
    
    // Fee collections
    const fees = await dbHelper.dbGet(`
      SELECT 
        SUM(amount_due) as total_due, 
        SUM(amount_paid) as total_paid
      FROM fees
    `);
    
    // Occupancy percentage overall
    const occupancy = await dbHelper.dbGet(`
      SELECT 
        SUM(capacity) as total_cap,
        (SELECT COUNT(*) FROM children WHERE status = "Active") as active_kids
      FROM classrooms
    `);

    // Recent Teacher Observations
    const recentObservations = await dbHelper.dbAll(`
      SELECT o.*, c.first_name, c.last_name, cl.name as classroom_name
      FROM teacher_observations o
      JOIN children c ON o.child_id = c.id
      LEFT JOIN classrooms cl ON c.classroom_id = cl.id
      ORDER BY o.date DESC, o.id DESC
      LIMIT 4
    `);

    // Milestone completion rate
    // Calculate total Mastered vs total reading milestone entries
    const milestones = await dbHelper.dbGet(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Mastered' THEN 1 ELSE 0 END) as mastered
      FROM reading_milestones
    `);

    const milestoneRate = milestones.total > 0 
      ? Math.round((milestones.mastered / milestones.total) * 100) 
      : 0;

    res.json({
      totalChildren: childCount.count,
      activeEnquiries: enquiryCount.count,
      pendingTasks: taskCount.count,
      financials: {
        totalDue: fees.total_due || 0,
        totalPaid: fees.total_paid || 0,
        collectionRate: fees.total_due > 0 ? Math.round((fees.total_paid / fees.total_due) * 100) : 0
      },
      occupancy: {
        enrolled: occupancy.active_kids || 0,
        capacity: occupancy.total_cap || 0,
        percentage: occupancy.total_cap > 0 ? Math.round((occupancy.active_kids / occupancy.total_cap) * 100) : 0
      },
      recentObservations,
      milestoneRate
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: 'Server error fetching dashboard summary' });
  }
});

// 2. Get Children List (with filters)
app.get('/api/children', async (req, res) => {
  try {
    const { classroomId, search } = req.query;
    let query = `
      SELECT c.*, cl.name as classroom_name, p.parent_name, p.email, p.phone,
        (SELECT COUNT(*) FROM reading_milestones WHERE child_id = c.id) as total_milestones,
        (SELECT COUNT(*) FROM reading_milestones WHERE child_id = c.id AND status = 'Mastered') as mastered_milestones
      FROM children c
      LEFT JOIN classrooms cl ON c.classroom_id = cl.id
      LEFT JOIN parents p ON p.child_id = c.id
      WHERE c.status = 'Active'
    `;
    const params = [];

    if (classroomId) {
      query += ` AND c.classroom_id = ?`;
      params.push(classroomId);
    }

    if (search) {
      query += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR p.parent_name LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY c.first_name ASC`;

    const children = await dbHelper.dbAll(query, params);
    
    // Format progress percentage
    const formatted = children.map(child => {
      const percentage = child.total_milestones > 0
        ? Math.round((child.mastered_milestones / child.total_milestones) * 100)
        : 0;
      return {
        ...child,
        progressPercentage: percentage
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching children:', err);
    res.status(500).json({ error: 'Server error fetching children' });
  }
});

// 3. Get Single Child Full Details
app.get('/api/children/:id', async (req, res) => {
  try {
    const childId = req.params.id;
    
    // Child + Classroom
    const child = await dbHelper.dbGet(`
      SELECT c.*, cl.name as classroom_name, cl.teacher_name as classroom_teacher
      FROM children c
      LEFT JOIN classrooms cl ON c.classroom_id = cl.id
      WHERE c.id = ?
    `, [childId]);

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Parent
    const parent = await dbHelper.dbGet('SELECT * FROM parents WHERE child_id = ?', [childId]);
    
    // Allergies
    const allergies = await dbHelper.dbAll('SELECT * FROM allergies WHERE child_id = ?', [childId]);
    
    // Routines (Limit to last 10)
    const routines = await dbHelper.dbAll(`
      SELECT * FROM routines 
      WHERE child_id = ? 
      ORDER BY date DESC, timestamp DESC 
      LIMIT 10
    `, [childId]);
    
    // Meals (Limit to last 5)
    const meals = await dbHelper.dbAll(`
      SELECT * FROM meals 
      WHERE child_id = ? 
      ORDER BY date DESC 
      LIMIT 5
    `, [childId]);

    // Reading Milestones Checklist
    const milestones = await dbHelper.dbAll(`
      SELECT * FROM reading_milestones 
      WHERE child_id = ? 
      ORDER BY 
        CASE level
          WHEN 'Letter Recognition' THEN 1
          WHEN 'Phonics' THEN 2
          WHEN 'Word Reading' THEN 3
          WHEN 'Sentence Reading' THEN 4
          ELSE 5
        END, id ASC
    `, [childId]);

    // Teacher Observations
    const observations = await dbHelper.dbAll(`
      SELECT * FROM teacher_observations 
      WHERE child_id = ? 
      ORDER BY date DESC, id DESC
    `, [childId]);

    // Transport Route
    const transport = await dbHelper.dbGet('SELECT * FROM transport WHERE child_id = ?', [childId]);

    // Fees summary
    const fees = await dbHelper.dbGet('SELECT * FROM fees WHERE child_id = ?', [childId]);

    // Photos
    const photos = await dbHelper.dbAll('SELECT * FROM photos WHERE child_id = ? ORDER BY date DESC LIMIT 6', [childId]);

    res.json({
      child,
      parent,
      allergies,
      routines,
      meals,
      milestones,
      observations,
      transport: transport || { status: 'Inactive', route_name: 'None' },
      fees: fees || { amount_due: 0, amount_paid: 0, status: 'Unpaid' },
      photos
    });
  } catch (err) {
    console.error(`Error fetching child details (id: ${req.params.id}):`, err);
    res.status(500).json({ error: 'Server error fetching child details' });
  }
});

// 4. Enroll New Child
app.post('/api/children', async (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    classroom_id,
    parent_name,
    email,
    phone,
    address,
    allergies,
    amount_due,
    route_name
  } = req.body;

  if (!first_name || !last_name || !date_of_birth || !parent_name || !email || !phone) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  const enrollment_date = new Date().toISOString().split('T')[0];

  try {
    // Start transactional steps manually
    // 1. Insert child
    const childResult = await dbHelper.dbRun(`
      INSERT INTO children (first_name, last_name, date_of_birth, gender, enrollment_date, status, classroom_id)
      VALUES (?, ?, ?, ?, ?, 'Active', ?)
    `, [first_name, last_name, date_of_birth, gender, enrollment_date, classroom_id || null]);
    
    const childId = childResult.lastID;

    // 2. Insert Parent details
    const parentResult = await dbHelper.dbRun(`
      INSERT INTO parents (child_id, parent_name, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `, [childId, parent_name, email, phone, address || '']);

    const parentId = parentResult.lastID;

    // 3. Log Admission
    await dbHelper.dbRun(`
      INSERT INTO admissions (child_id, parent_id, admission_date, status)
      VALUES (?, ?, ?, 'Confirmed')
    `, [childId, parentId, enrollment_date]);

    // 4. Seed Reading Milestones as 'Not Started'
    const milestoneSkills = {
      'Letter Recognition': [
        'Recognizes Uppercase A-Z',
        'Recognizes Lowercase a-z',
        'Matches Upper & Lowercase',
        'Points to Letters on Request'
      ],
      'Phonics': [
        'Short Vowel Sounds (a, e, i, o, u)',
        'Consonant Sounds (b, c, d, f...)',
        'Digraphs (ch, sh, th, wh)',
        'Consonant Blends (bl, cl, cr, dr)'
      ],
      'Word Reading': [
        'CVC Words (cat, pin, sun)',
        'Sight Words (the, logic, of, you, is)',
        'Consonant Blend Words (frog, club)',
        'Long Vowel Silent E (cake, rope)'
      ],
      'Sentence Reading': [
        'Reads 3-Word Sentences',
        'Reads 5-Word Sentences with Sight Words',
        'Reads 2-3 Sentences Paragraph',
        'Comprehends Simple Story Meaning'
      ]
    };

    for (const [level, skills] of Object.entries(milestoneSkills)) {
      for (const skill of skills) {
        await dbHelper.dbRun(`
          INSERT INTO reading_milestones (child_id, level, skill_name, status, checked_date, teacher_id)
          VALUES (?, ?, ?, 'Not Started', NULL, 1)
        `, [childId, level, skill]);
      }
    }

    // 5. Insert Fee details
    const feeAmount = amount_due ? parseFloat(amount_due) : 12000.00; // default fee
    await dbHelper.dbRun(`
      INSERT INTO fees (child_id, amount_due, amount_paid, due_date, status)
      VALUES (?, ?, 0, ?, 'Unpaid')
    `, [childId, feeAmount, enrollment_date]);

    // 6. Insert Allergy details if any
    if (allergies && allergies.trim().length > 0) {
      await dbHelper.dbRun(`
        INSERT INTO allergies (child_id, allergy_name, severity, notes)
        VALUES (?, ?, 'Moderate', 'Registered during enrollment')
      `, [childId, allergies.trim()]);
    }

    // 7. Insert Transport route if active
    if (route_name && route_name.trim().length > 0) {
      await dbHelper.dbRun(`
        INSERT INTO transport (child_id, route_name, status, pickup_time, drop_time)
        VALUES (?, ?, 'Active', '08:00 AM', '01:30 PM')
      `, [childId, route_name.trim()]);
    }

    // 8. Log system communication record
    await dbHelper.dbRun(`
      INSERT INTO communication_history (recipient_id, recipient_type, channel, message_text, status, sent_at)
      VALUES (?, 'Parent', 'WhatsApp', 'Welcome to FirstCry Intellitots! We have successfully enrolled ${first_name} and set up their Phonics Progress Tracker.', 'Sent', ?)
    `, [parentId, new Date().toLocaleString()]);

    res.status(201).json({ success: true, childId, message: 'Child enrolled and operations initialized successfully.' });
  } catch (err) {
    console.error('Error enrolling child:', err);
    res.status(500).json({ error: 'Server error enrolling child' });
  }
});

// 5. Submit Teacher Observation (computes AI summary)
app.post('/api/observations', async (req, res) => {
  const { child_id, observer_id, notes, date } = req.body;

  if (!child_id || !notes || !observer_id) {
    return res.status(400).json({ error: 'Child ID, observer, and notes are required.' });
  }

  const obsDate = date || new Date().toISOString().split('T')[0];

  try {
    // Get child's name for parent personalization
    const child = await dbHelper.dbGet('SELECT first_name FROM children WHERE id = ?', [child_id]);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Run Heuristic Analysis
    const analysis = aiEngine.parseObservationNotes(child.first_name, notes);

    // Insert into DB
    const result = await dbHelper.dbRun(`
      INSERT INTO teacher_observations (child_id, date, observer_id, notes, strengths, concerns, suggestions, ai_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [child_id, obsDate, observer_id, notes, analysis.strengths, analysis.concerns, analysis.suggestions, analysis.ai_summary]);

    // Log communication entry to parent notification log
    const parent = await dbHelper.dbGet('SELECT id FROM parents WHERE child_id = ?', [child_id]);
    if (parent) {
      await dbHelper.dbRun(`
        INSERT INTO communication_history (recipient_id, recipient_type, channel, message_text, status, sent_at)
        VALUES (?, 'Parent', 'WhatsApp', 'New reading milestone update available for ${child.first_name}: "${analysis.ai_summary.substring(0, 70)}..." Check your portal.', 'Sent', ?)
      `, [parent.id, new Date().toLocaleString()]);
    }

    res.status(201).json({
      success: true,
      observationId: result.lastID,
      analysis
    });
  } catch (err) {
    console.error('Error adding observation:', err);
    res.status(500).json({ error: 'Server error recording observation' });
  }
});

// 6. Update Checklist Item Status
app.post('/api/milestones/update', async (req, res) => {
  const { child_id, level, skill_name, status } = req.body;

  if (!child_id || !level || !skill_name || !status) {
    return res.status(400).json({ error: 'Missing child_id, level, skill_name, or status' });
  }

  const checkDate = status !== 'Not Started' ? new Date().toISOString().split('T')[0] : null;

  try {
    await dbHelper.dbRun(`
      UPDATE reading_milestones
      SET status = ?, checked_date = ?
      WHERE child_id = ? AND level = ? AND skill_name = ?
    `, [status, checkDate, child_id, level, skill_name]);

    // Check if ALL skills in this level are now Mastered for this child
    const levelStatus = await dbHelper.dbAll(`
      SELECT status FROM reading_milestones 
      WHERE child_id = ? AND level = ?
    `, [child_id, level]);

    const allMastered = levelStatus.length > 0 && levelStatus.every(s => s.status === 'Mastered');

    let levelCompletedMessage = null;
    if (allMastered) {
      // Get child and parent
      const child = await dbHelper.dbGet('SELECT first_name FROM children WHERE id = ?', [child_id]);
      const parent = await dbHelper.dbGet('SELECT id FROM parents WHERE child_id = ?', [child_id]);

      if (child && parent) {
        levelCompletedMessage = `Congratulations! ${child.first_name} has fully mastered all skills in the "${level}" milestone level! 🎓🎉`;
        
        // Save alert/whatsapp notification in Communication History
        await dbHelper.dbRun(`
          INSERT INTO communication_history (recipient_id, recipient_type, channel, message_text, status, sent_at)
          VALUES (?, 'Parent', 'WhatsApp', ?, 'Sent', ?)
        `, [parent.id, levelCompletedMessage, new Date().toLocaleString()]);
      }
    }

    res.json({
      success: true,
      levelCompleted: allMastered,
      message: levelCompletedMessage || 'Milestone updated.'
    });
  } catch (err) {
    console.error('Error updating milestone:', err);
    res.status(500).json({ error: 'Server error updating milestone' });
  }
});

// 7. Get Enquiries List
app.get('/api/enquiries', async (req, res) => {
  try {
    const enquiries = await dbHelper.dbAll('SELECT * FROM enquiries ORDER BY date DESC, id DESC');
    res.json(enquiries);
  } catch (err) {
    console.error('Error fetching enquiries:', err);
    res.status(500).json({ error: 'Server error fetching enquiries' });
  }
});

// 8. Submit Parent Enquiry Form
app.post('/api/enquiries', async (req, res) => {
  const { child_name, parent_name, email, phone, source, notes } = req.body;

  if (!child_name || !parent_name || !email || !phone || !source) {
    return res.status(400).json({ error: 'All primary contact fields are required.' });
  }

  const enquiryDate = new Date().toISOString().split('T')[0];

  try {
    const result = await dbHelper.dbRun(`
      INSERT INTO enquiries (child_name, parent_name, email, phone, status, source, notes, date)
      VALUES (?, ?, ?, ?, 'New', ?, ?, ?)
    `, [child_name, parent_name, email, phone, source, notes || '', enquiryDate]);

    // Create a follow-up task for Center Counselor
    await dbHelper.dbRun(`
      INSERT INTO teacher_tasks (title, description, assigned_to, due_date, status)
      VALUES (?, ?, 'Center Counsellor', ?, 'Pending')
    `, [
      `Follow up: Enquiry for ${child_name}`,
      `New enquiry received via ${source}. Contact parent ${parent_name} (${phone}).`,
      new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // due in 2 days
    ]);

    res.status(201).json({ success: true, enquiryId: result.lastID, message: 'Enquiry submitted and follow-up assigned.' });
  } catch (err) {
    console.error('Error adding enquiry:', err);
    res.status(500).json({ error: 'Server error processing enquiry' });
  }
});

// 9. Update Enquiry Status (Promote to enrolled)
app.post('/api/enquiries/:id/status', async (req, res) => {
  const { status } = req.body;
  const enquiryId = req.params.id;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    await dbHelper.dbRun('UPDATE enquiries SET status = ? WHERE id = ?', [status, enquiryId]);
    res.json({ success: true, message: 'Enquiry status updated.' });
  } catch (err) {
    console.error('Error updating enquiry status:', err);
    res.status(500).json({ error: 'Server error updating enquiry status' });
  }
});

// 10. Log Child Routine (play, nap, toilet)
app.post('/api/routines', async (req, res) => {
  const { child_id, activity_type, notes } = req.body;

  if (!child_id || !activity_type) {
    return res.status(400).json({ error: 'Child ID and activity type are required.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const result = await dbHelper.dbRun(`
      INSERT INTO routines (child_id, date, activity_type, notes, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [child_id, todayStr, activity_type, notes || '', timeStr]);

    res.status(201).json({ success: true, routineId: result.lastID });
  } catch (err) {
    console.error('Error logging routine:', err);
    res.status(500).json({ error: 'Server error logging routine' });
  }
});

// 11. Get Fees List
app.get('/api/fees', async (req, res) => {
  try {
    const feeRecords = await dbHelper.dbAll(`
      SELECT f.*, c.first_name, c.last_name, cl.name as classroom_name
      FROM fees f
      JOIN children c ON f.child_id = c.id
      LEFT JOIN classrooms cl ON c.classroom_id = cl.id
      ORDER BY c.first_name ASC
    `);
    res.json(feeRecords);
  } catch (err) {
    console.error('Error fetching fees:', err);
    res.status(500).json({ error: 'Server error fetching fees' });
  }
});

// 12. Record Fee Payment
app.post('/api/fees/pay', async (req, res) => {
  const { fee_id, amount_paid } = req.body;

  if (!fee_id || amount_paid === undefined) {
    return res.status(400).json({ error: 'Fee ID and payment amount are required.' });
  }

  try {
    const feeRecord = await dbHelper.dbGet('SELECT * FROM fees WHERE id = ?', [fee_id]);
    if (!feeRecord) {
      return res.status(404).json({ error: 'Fee ledger record not found.' });
    }

    const newPaid = feeRecord.amount_paid + parseFloat(amount_paid);
    let newStatus = 'Unpaid';
    if (newPaid >= feeRecord.amount_due) {
      newStatus = 'Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partial';
    }

    await dbHelper.dbRun(`
      UPDATE fees
      SET amount_paid = ?, status = ?
      WHERE id = ?
    `, [newPaid, newStatus, fee_id]);

    // Log transaction history
    await dbHelper.dbRun(`
      INSERT INTO fee_payments (fee_id, amount_paid, payment_date, notes)
      VALUES (?, ?, ?, ?)
    `, [fee_id, amount_paid, new Date().toISOString().split('T')[0], 'Standard Receipt Logged']);

    // Log payment in communication notification
    const child = await dbHelper.dbGet('SELECT first_name FROM children WHERE id = ?', [feeRecord.child_id]);
    const parent = await dbHelper.dbGet('SELECT id FROM parents WHERE child_id = ?', [feeRecord.child_id]);

    if (child && parent) {
      await dbHelper.dbRun(`
        INSERT INTO communication_history (recipient_id, recipient_type, channel, message_text, status, sent_at)
        VALUES (?, 'Parent', 'WhatsApp', ?, 'Sent', ?)
      `, [
        parent.id,
        `Payment receipt: Received ₹${amount_paid} towards ${child.first_name}'s fees. Current balance: ₹${feeRecord.amount_due - newPaid}. Status: ${newStatus}. Thank you.`,
        new Date().toLocaleString()
      ]);
    }

    res.json({ success: true, newPaid, status: newStatus });
  } catch (err) {
    console.error('Error processing fee payment:', err);
    res.status(500).json({ error: 'Server error processing payment' });
  }
});

// 12.5. Get Fee Payments History
app.get('/api/fees/payments', async (req, res) => {
  try {
    const payments = await dbHelper.dbAll(`
      SELECT fp.*, c.first_name, c.last_name, cl.name as classroom_name, f.amount_due
      FROM fee_payments fp
      JOIN fees f ON fp.fee_id = f.id
      JOIN children c ON f.child_id = c.id
      LEFT JOIN classrooms cl ON c.classroom_id = cl.id
      ORDER BY fp.id DESC
    `);
    res.json(payments);
  } catch (err) {
    console.error('Error fetching payments history:', err);
    res.status(500).json({ error: 'Server error fetching payments history' });
  }
});

// 13. Get Classrooms list
app.get('/api/classrooms', async (req, res) => {
  try {
    const classrooms = await dbHelper.dbAll(`
      SELECT cl.*, 
        (SELECT COUNT(*) FROM children WHERE classroom_id = cl.id AND status = 'Active') as enrolled_count
      FROM classrooms cl
    `);
    res.json(classrooms);
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    res.status(500).json({ error: 'Server error fetching classrooms' });
  }
});

// 14. Get Teacher Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await dbHelper.dbAll('SELECT * FROM teacher_tasks ORDER BY due_date ASC');
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
});

// 15. Create Task
app.post('/api/tasks', async (req, res) => {
  const { title, description, assigned_to, due_date } = req.body;

  if (!title || !assigned_to || !due_date) {
    return res.status(400).json({ error: 'Title, assignee, and due date are required.' });
  }

  try {
    const result = await dbHelper.dbRun(`
      INSERT INTO teacher_tasks (title, description, assigned_to, due_date, status)
      VALUES (?, ?, ?, ?, 'Pending')
    `, [title, description || '', assigned_to, due_date]);

    res.status(201).json({ success: true, taskId: result.lastID });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Server error creating task' });
  }
});

// 16. Complete Task
app.post('/api/tasks/:id/complete', async (req, res) => {
  const taskId = req.params.id;
  try {
    await dbHelper.dbRun('UPDATE teacher_tasks SET status = "Completed" WHERE id = ?', [taskId]);
    res.json({ success: true, message: 'Task marked as completed.' });
  } catch (err) {
    console.error('Error completing task:', err);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// 17. Get Communication History
app.get('/api/communication/logs', async (req, res) => {
  try {
    const logs = await dbHelper.dbAll(`
      SELECT h.*, p.parent_name, c.first_name as child_name
      FROM communication_history h
      LEFT JOIN parents p ON h.recipient_id = p.id AND h.recipient_type = 'Parent'
      LEFT JOIN children c ON p.child_id = c.id
      ORDER BY h.id DESC
      LIMIT 30
    `);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching communication logs:', err);
    res.status(500).json({ error: 'Server error fetching logs' });
  }
});

// 18. Upload Photo Endpoint (Simulated)
app.post('/api/photos', async (req, res) => {
  const { child_id, url, caption, uploaded_by } = req.body;
  if (!child_id || !url || !uploaded_by) {
    return res.status(400).json({ error: 'Missing child_id, url, or uploader details' });
  }
  const dateStr = new Date().toISOString().split('T')[0];
  try {
    const result = await dbHelper.dbRun(`
      INSERT INTO photos (child_id, url, caption, uploaded_by, date)
      VALUES (?, ?, ?, ?, ?)
    `, [child_id, url, caption || '', uploaded_by, dateStr]);
    res.status(201).json({ success: true, photoId: result.lastID });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: 'Server error uploading photo' });
  }
});

// --- STATIC FILE SERVING FOR UNIFIED PORT DEPLOYMENT ---
const path = require('path');
// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback all other routes to React's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

