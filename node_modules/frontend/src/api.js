/**
 * API Utility Manager
 * Detects whether the live MySQL Express backend is running.
 * - If ONLINE: Routes requests to the Express backend (http://localhost:5000).
 * - If OFFLINE: Falls back to a local storage sandbox database so the UI is fully functional.
 */

const BACKEND_URL = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
let isBackendOnline = false;

// Mock database initial state
const DEFAULT_MOCK_DATA = {
  classrooms: [
    { id: 1, name: 'Playgroup / Toddlers', capacity: 12, age_group: '1.5 - 2.5 Years', teacher_name: 'Ms. Sarah D\'souza', enrolled_count: 2 },
    { id: 2, name: 'Nursery', capacity: 15, age_group: '2.5 - 3.5 Years', teacher_name: 'Ms. Priya Sharma', enrolled_count: 2 },
    { id: 3, name: 'LKG (Lower Kindergarten)', capacity: 18, age_group: '3.5 - 4.5 Years', teacher_name: 'Ms. Jessica Taylor', enrolled_count: 2 },
    { id: 4, name: 'UKG (Upper Kindergarten)', capacity: 20, age_group: '4.5 - 6.0 Years', teacher_name: 'Ms. Anjali Nair', enrolled_count: 2 }
  ],
  children: [
    { id: 1, first_name: 'Aria', last_name: 'Fernandes', date_of_birth: '2021-08-14', gender: 'Female', enrollment_date: '2026-01-05', status: 'Active', classroom_id: 2, classroom_name: 'Nursery', progressPercentage: 62 },
    { id: 2, first_name: 'Reyansh', last_name: 'Patel', date_of_birth: '2022-03-22', gender: 'Male', enrollment_date: '2026-01-10', status: 'Active', classroom_id: 1, classroom_name: 'Playgroup / Toddlers', progressPercentage: 25 },
    { id: 3, first_name: 'Vihaan', last_name: 'Reddy', date_of_birth: '2020-11-05', gender: 'Male', enrollment_date: '2025-06-15', status: 'Active', classroom_id: 3, classroom_name: 'LKG (Lower Kindergarten)', progressPercentage: 68 },
    { id: 4, first_name: 'Ananya', last_name: 'Sen', date_of_birth: '2020-04-18', gender: 'Female', enrollment_date: '2025-06-01', status: 'Active', classroom_id: 4, classroom_name: 'UKG (Upper Kindergarten)', progressPercentage: 81 },
    { id: 5, first_name: 'Kabir', last_name: 'Mehta', date_of_birth: '2021-12-01', gender: 'Male', enrollment_date: '2026-02-01', status: 'Active', classroom_id: 2, classroom_name: 'Nursery', progressPercentage: 25 },
    { id: 6, first_name: 'Zoya', last_name: 'Khan', date_of_birth: '2020-09-30', gender: 'Female', enrollment_date: '2025-08-20', status: 'Active', classroom_id: 3, classroom_name: 'LKG (Lower Kindergarten)', progressPercentage: 62 },
    { id: 7, first_name: 'Ishaan', last_name: 'Gupta', date_of_birth: '2020-02-14', gender: 'Male', enrollment_date: '2025-05-10', status: 'Active', classroom_id: 4, classroom_name: 'UKG (Upper Kindergarten)', progressPercentage: 87 },
    { id: 8, first_name: 'Mira', last_name: 'Joshi', date_of_birth: '2022-05-11', gender: 'Female', enrollment_date: '2026-03-15', status: 'Active', classroom_id: 1, classroom_name: 'Playgroup / Toddlers', progressPercentage: 0 }
  ],
  parents: [
    { id: 1, child_id: 1, parent_name: 'Melissa Fernandes', email: 'melissa.f@example.com', phone: '+91 98765 43210', address: 'Flat 402, Sunshine Heights, Mumbai' },
    { id: 2, child_id: 2, parent_name: 'Amit Patel', email: 'amit.patel@example.com', phone: '+91 98123 45678', address: 'Row House 12, Orchid Villas, Mumbai' },
    { id: 3, child_id: 3, parent_name: 'Srinivas Reddy', email: 'srinivas.r@example.com', phone: '+91 97654 32109', address: 'Apt 1005, Park View, Mumbai' },
    { id: 4, child_id: 4, parent_name: 'Debarati Sen', email: 'debarati.s@example.com', phone: '+91 99887 76655', address: 'B-12, Springfields, Mumbai' },
    { id: 5, child_id: 5, parent_name: 'Rajesh Mehta', email: 'rajesh.m@example.com', phone: '+91 91234 56789', address: '45, Windsor Castle, Mumbai' },
    { id: 6, child_id: 6, parent_name: 'Farhan Khan', email: 'farhan.k@example.com', phone: '+91 95432 10987', address: 'Flat A-9, Sea Crest, Mumbai' },
    { id: 7, child_id: 7, parent_name: 'Nitin Gupta', email: 'nitin.g@example.com', phone: '+91 98989 89898', address: 'C-72, Green Meadows, Mumbai' },
    { id: 8, child_id: 8, parent_name: 'Aditi Joshi', email: 'aditi.j@example.com', phone: '+91 97777 66666', address: 'Flat 101, Tulip Residency, Mumbai' }
  ],
  enquiries: [
    { id: 1, child_name: 'Advik Rao', parent_name: 'Vikram Rao', email: 'vikram.rao@example.com', phone: '+91 96633 88888', status: 'Contacted', source: 'Website', notes: 'Inquired about playgroup timings and child-teacher ratio.', date: '2026-06-05' },
    { id: 2, child_name: 'Kiara Shah', parent_name: 'Payal Shah', email: 'payal.shah@example.com', phone: '+91 94444 33333', status: 'New', source: 'Walk-in', notes: 'Interested in UKG curriculum and school van transport.', date: '2026-06-10' },
    { id: 3, child_name: 'Samaira Nair', parent_name: 'Rohit Nair', email: 'rohit.nair@example.com', phone: '+91 98877 22222', status: 'Enrolled', source: 'Referral', notes: 'Referred by Melissa Fernandes. Interested in phonics focus.', date: '2026-05-15' }
  ],
  routines: [
    { id: 1, child_id: 1, date: '2026-06-11', activity_type: 'Play', notes: 'Aria engaged well in block stacking activity.', timestamp: '10:00 AM' },
    { id: 2, child_id: 2, date: '2026-06-11', activity_type: 'Nap', notes: 'Reyansh slept peacefully for 45 minutes.', timestamp: '11:30 AM' },
    { id: 3, child_id: 3, date: '2026-06-11', activity_type: 'Activity', notes: 'Vihaan completed the alphabet card matching game.', timestamp: '10:45 AM' },
    { id: 4, child_id: 6, date: '2026-06-11', activity_type: 'Toilet', notes: 'Zoya went to washroom with assistance.', timestamp: '11:15 AM' },
    { id: 5, child_id: 7, date: '2026-06-11', activity_type: 'Play', notes: 'Ishaan showed leadership in sandbox group play.', timestamp: '10:15 AM' }
  ],
  allergies: [
    { id: 1, child_id: 1, allergy_name: 'Peanuts', severity: 'Severe', notes: 'Keep Epipen in bag.' },
    { id: 2, child_id: 3, allergy_name: 'Gluten', severity: 'Moderate', notes: 'Provide gluten-free meals.' }
  ],
  fees: [
    { id: 1, child_id: 1, amount_due: 12000, amount_paid: 12000, due_date: '2026-06-05', status: 'Paid', first_name: 'Aria', last_name: 'Fernandes', classroom_name: 'Nursery' },
    { id: 2, child_id: 2, amount_due: 10000, amount_paid: 5000, due_date: '2026-06-05', status: 'Partial', first_name: 'Reyansh', last_name: 'Patel', classroom_name: 'Playgroup / Toddlers' },
    { id: 3, child_id: 3, amount_due: 14000, amount_paid: 14000, due_date: '2026-06-05', status: 'Paid', first_name: 'Vihaan', last_name: 'Reddy', classroom_name: 'LKG (Lower Kindergarten)' },
    { id: 4, child_id: 4, amount_due: 15000, amount_paid: 0, due_date: '2026-06-05', status: 'Unpaid', first_name: 'Ananya', last_name: 'Sen', classroom_name: 'UKG (Upper Kindergarten)' },
    { id: 5, child_id: 5, amount_due: 12000, amount_paid: 12000, due_date: '2026-06-05', status: 'Paid', first_name: 'Kabir', last_name: 'Mehta', classroom_name: 'Nursery' },
    { id: 6, child_id: 6, amount_due: 14000, amount_paid: 14000, due_date: '2026-06-05', status: 'Paid', first_name: 'Zoya', last_name: 'Khan', classroom_name: 'LKG (Lower Kindergarten)' },
    { id: 7, child_id: 7, amount_due: 15000, amount_paid: 7500, due_date: '2026-06-05', status: 'Partial', first_name: 'Ishaan', last_name: 'Gupta', classroom_name: 'UKG (Upper Kindergarten)' },
    { id: 8, child_id: 8, amount_due: 10000, amount_paid: 10000, due_date: '2026-06-05', status: 'Paid', first_name: 'Mira', last_name: 'Joshi', classroom_name: 'Playgroup / Toddlers' }
  ],
  fee_payments: [
    { id: 1, fee_id: 1, amount_paid: 12000, payment_date: '2026-06-05', notes: 'Full payment received' },
    { id: 2, fee_id: 2, amount_paid: 5000, payment_date: '2026-06-05', notes: 'First installment received' },
    { id: 3, fee_id: 3, amount_paid: 14000, payment_date: '2026-06-05', notes: 'Full payment received' },
    { id: 4, fee_id: 5, amount_paid: 12000, payment_date: '2026-06-05', notes: 'Full payment received' },
    { id: 5, fee_id: 6, amount_paid: 14000, payment_date: '2026-06-05', notes: 'Full payment received' },
    { id: 6, fee_id: 7, amount_paid: 7500, payment_date: '2026-06-05', notes: 'First installment received' },
    { id: 7, fee_id: 8, amount_paid: 10000, payment_date: '2026-06-05', notes: 'Full payment received' }
  ],
  tasks: [
    { id: 1, title: 'Prepare flashcards for LKG blends', description: 'Create color-coded cards for blends.', assigned_to: 'Ms. Jessica Taylor', due_date: '2026-06-15', status: 'Pending' },
    { id: 2, title: 'Update monthly report comments', description: 'Complete progress comments for all nursery kids.', assigned_to: 'Ms. Priya Sharma', due_date: '2026-06-12', status: 'Pending' },
    { id: 3, title: 'Review fee arrears for playgroup', description: 'Follow up with Amit Patel regarding pending monthly fees.', assigned_to: 'Ms. Sarah D\'souza', due_date: '2026-06-14', status: 'Pending' }
  ],
  observations: [
    {
      id: 1, child_id: 1, date: '2026-06-10', observer_id: 'Ms. Priya Sharma',
      notes: 'Aria has shown fantastic enthusiasm during the letter sounds game today. She easily recognized upper and lowercase letters from A to Z. However, she struggles with sound blends like "ch" or "sh". Recommend parents read storybooks emphasizing short vowel blends at home.',
      strengths: 'Excellent at uppercase and lowercase letter recognition A-Z; highly enthusiastic.',
      concerns: 'Struggles with sound blends like "ch" and "sh".',
      suggestions: 'Parents should read storybooks with short vowel blends at home.',
      ai_summary: '🌟 Aria is making wonderful progress! We observed that she has mastered A-Z letter recognition and loves active reading games. Right now, we are focusing on digraph sounds like "ch" and "sh". To support this at home, we suggest: parents read storybooks with short vowel blends.'
    },
    {
      id: 2, child_id: 3, date: '2026-06-10', observer_id: 'Ms. Jessica Taylor',
      notes: 'Vihaan is reading CVC words like "cat", "pin" and "sun" with good speed. He has mastered all vowel sounds. He does face difficulty when reading words containing silent E, like "cake" or "hope".',
      strengths: 'Strong at reading three-letter CVC words; has mastered all short vowel sounds.',
      concerns: 'Pronounces the silent E in words like "cake" and "hope" instead of keeping it silent.',
      suggestions: 'Play word-slider card games with silent-E words at home.',
      ai_summary: '🌟 Vihaan is doing great reading CVC words like "cat" and "pin" independently! He is currently learning the silent E rule (words like "cake"). Working on word sliders together at home will make this concept easy for him.'
    }
  ],
  milestones: [] // Populated dynamically below
};

// Initialize mock milestones if local storage is empty
const milestoneLevels = ['Letter Recognition', 'Phonics', 'Word Reading', 'Sentence Reading'];
const milestoneSkills = {
  'Letter Recognition': ['Recognizes Uppercase A-Z', 'Recognizes Lowercase a-z', 'Matches Upper & Lowercase', 'Points to Letters on Request'],
  'Phonics': ['Short Vowel Sounds (a, e, i, o, u)', 'Consonant Sounds (b, c, d, f...)', 'Digraphs (ch, sh, th, wh)', 'Consonant Blends (bl, cl, cr, dr)'],
  'Word Reading': ['CVC Words (cat, pin, sun)', 'Sight Words (the, logic, of, you, is)', 'Consonant Blend Words (frog, club)', 'Long Vowel Silent E (cake, rope)'],
  'Sentence Reading': ['Reads 3-Word Sentences', 'Reads 5-Word Sentences with Sight Words', 'Reads 2-3 Sentences Paragraph', 'Comprehends Simple Story Meaning']
};

const childConfigs = [
  { id: 1, maxMasteredLevel: 'Letter Recognition', inProgressLevel: 'Phonics' },
  { id: 2, maxMasteredLevel: '', inProgressLevel: 'Letter Recognition' },
  { id: 3, maxMasteredLevel: 'Phonics', inProgressLevel: 'Word Reading' },
  { id: 4, maxMasteredLevel: 'Word Reading', inProgressLevel: 'Sentence Reading' },
  { id: 5, maxMasteredLevel: '', inProgressLevel: 'Letter Recognition' },
  { id: 6, maxMasteredLevel: 'Phonics', inProgressLevel: 'Word Reading' },
  { id: 7, maxMasteredLevel: 'Word Reading', inProgressLevel: 'Sentence Reading' },
  { id: 8, maxMasteredLevel: '', inProgressLevel: 'Letter Recognition' }
];

childConfigs.forEach(conf => {
  let currentStatus = 'Mastered';
  milestoneLevels.forEach(level => {
    if (level === conf.inProgressLevel) {
      currentStatus = 'In Progress';
    } else if (conf.maxMasteredLevel && milestoneLevels.indexOf(level) > milestoneLevels.indexOf(conf.maxMasteredLevel)) {
      currentStatus = 'Not Started';
    }

    const skills = milestoneSkills[level];
    skills.forEach((skill, idx) => {
      let skillStatus = currentStatus;
      if (currentStatus === 'In Progress') {
        skillStatus = idx < 2 ? 'Mastered' : (idx === 2 ? 'In Progress' : 'Not Started');
      }
      DEFAULT_MOCK_DATA.milestones.push({
        id: DEFAULT_MOCK_DATA.milestones.length + 1,
        child_id: conf.id,
        level,
        skill_name: skill,
        status: skillStatus,
        checked_date: skillStatus !== 'Not Started' ? '2026-06-10' : null,
        teacher_id: 1
      });
    });
  });
});

// Load DB from localStorage or write default
const getLocalDB = () => {
  const dbStr = localStorage.getItem('intellitots_sandbox_db');
  if (!dbStr) {
    localStorage.setItem('intellitots_sandbox_db', JSON.stringify(DEFAULT_MOCK_DATA));
    return DEFAULT_MOCK_DATA;
  }
  return JSON.parse(dbStr);
};

const saveLocalDB = (data) => {
  localStorage.setItem('intellitots_sandbox_db', JSON.stringify(data));
};

// Check connectivity to backend
export async function checkBackendStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/dashboard/summary`, { signal: AbortSignal.timeout(1000) });
    isBackendOnline = res.ok;
  } catch (err) {
    isBackendOnline = false;
  }
  console.log(`Intellitots API Connection: ${isBackendOnline ? 'ONLINE (MySQL)' : 'OFFLINE (Sandbox Demo Mode)'}`);
  return isBackendOnline;
}

// 1. Dashboard summary
export async function getDashboardSummary() {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/dashboard/summary`);
    return await res.json();
  }

  // Fallback mock logic
  const db = getLocalDB();
  const activeChildren = db.children.filter(c => c.status === 'Active');
  const activeEnquiries = db.enquiries.filter(e => e.status !== 'Closed' && e.status !== 'Enrolled');
  const pendingTasks = db.tasks.filter(t => t.status === 'Pending');
  
  const totalDue = db.fees.reduce((acc, f) => acc + f.amount_due, 0);
  const totalPaid = db.fees.reduce((acc, f) => acc + f.amount_paid, 0);
  const totalCap = db.classrooms.reduce((acc, c) => acc + c.capacity, 0);

  const masteredCount = db.milestones.filter(m => m.status === 'Mastered').length;
  const totalMilestones = db.milestones.length;

  // Recent observations
  const recentObservations = [...db.observations]
    .sort((a, b) => b.id - a.id)
    .slice(0, 4)
    .map(obs => {
      const child = db.children.find(c => c.id === obs.child_id);
      return {
        ...obs,
        first_name: child ? child.first_name : 'Student',
        last_name: child ? child.last_name : '',
        classroom_name: child ? child.classroom_name : ''
      };
    });

  return {
    totalChildren: activeChildren.length,
    activeEnquiries: activeEnquiries.length,
    pendingTasks: pendingTasks.length,
    financials: {
      totalDue,
      totalPaid,
      collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0
    },
    occupancy: {
      enrolled: activeChildren.length,
      capacity: totalCap,
      percentage: totalCap > 0 ? Math.round((activeChildren.length / totalCap) * 100) : 0
    },
    recentObservations,
    milestoneRate: totalMilestones > 0 ? Math.round((masteredCount / totalMilestones) * 100) : 0
  };
}

// 2. Get Children list
export async function getChildren(classroomId = '', search = '') {
  const online = await checkBackendStatus();
  if (online) {
    let url = `${BACKEND_URL}/api/children`;
    const params = [];
    if (classroomId) params.push(`classroomId=${classroomId}`);
    if (search) params.push(`search=${search}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const res = await fetch(url);
    return await res.json();
  }

  // Fallback
  const db = getLocalDB();
  return db.children.filter(c => {
    if (c.status !== 'Active') return false;
    if (classroomId && c.classroom_id !== Number(classroomId)) return false;
    if (search) {
      const term = search.toLowerCase();
      const parent = db.parents.find(p => p.child_id === c.id);
      const parentMatch = parent ? parent.parent_name.toLowerCase().includes(term) : false;
      return c.first_name.toLowerCase().includes(term) || c.last_name.toLowerCase().includes(term) || parentMatch;
    }
    return true;
  }).map(c => {
    // calculate progress percentage
    const childMilestones = db.milestones.filter(m => m.child_id === c.id);
    const total = childMilestones.length;
    const mastered = childMilestones.filter(m => m.status === 'Mastered').length;
    const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    
    return {
      ...c,
      progressPercentage: pct
    };
  });
}

// 3. Get Single Child details
export async function getChildDetails(id) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/children/${id}`);
    return await res.json();
  }

  const db = getLocalDB();
  const child = db.children.find(c => c.id === Number(id));
  if (!child) return null;

  const classroom = db.classrooms.find(cl => cl.id === child.classroom_id);
  const parent = db.parents.find(p => p.child_id === child.id);
  const childAllergies = db.allergies.filter(a => a.child_id === child.id);
  const childRoutines = db.routines.filter(r => r.child_id === child.id).sort((a,b) => b.id - a.id);
  const childMilestones = db.milestones.filter(m => m.child_id === child.id);
  const childObservations = db.observations.filter(o => o.child_id === child.id).sort((a,b) => b.id - a.id);
  const feeRecord = db.fees.find(f => f.child_id === child.id);

  return {
    child: {
      ...child,
      classroom_teacher: classroom ? classroom.teacher_name : 'Staff Teacher'
    },
    parent,
    allergies: childAllergies,
    routines: childRoutines,
    meals: [],
    milestones: childMilestones,
    observations: childObservations,
    transport: { status: 'Active', route_name: 'Route A - Powai', pickup_time: '08:15 AM', drop_time: '01:30 PM' },
    fees: feeRecord || { amount_due: 12000, amount_paid: 0, status: 'Unpaid' },
    photos: [
      { id: 1, url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80', caption: 'Matching letter cards', date: '2026-06-10' }
    ]
  };
}

// 4. Enroll new child
export async function enrollChild(formData) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    return await res.json();
  }

  const db = getLocalDB();
  const childId = db.children.length + 1;
  const classroom = db.classrooms.find(cl => cl.id === Number(formData.classroom_id));
  
  const newChild = {
    id: childId,
    first_name: formData.first_name,
    last_name: formData.last_name,
    date_of_birth: formData.date_of_birth,
    gender: formData.gender,
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    classroom_id: Number(formData.classroom_id),
    classroom_name: classroom ? classroom.name : 'Unassigned',
    progressPercentage: 0
  };

  const newParent = {
    id: db.parents.length + 1,
    child_id: childId,
    parent_name: formData.parent_name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address || ''
  };

  const newFee = {
    id: db.fees.length + 1,
    child_id: childId,
    amount_due: formData.amount_due ? Number(formData.amount_due) : 12000,
    amount_paid: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'Unpaid',
    first_name: formData.first_name,
    last_name: formData.last_name,
    classroom_name: classroom ? classroom.name : 'Unassigned'
  };

  // Seed milestone templates for new kid
  milestoneLevels.forEach(level => {
    milestoneSkills[level].forEach(skill => {
      db.milestones.push({
        id: db.milestones.length + 1,
        child_id: childId,
        level,
        skill_name: skill,
        status: 'Not Started',
        checked_date: null,
        teacher_id: 1
      });
    });
  });

  db.children.push(newChild);
  db.parents.push(newParent);
  db.fees.push(newFee);

  saveLocalDB(db);
  return { success: true, childId };
}

// 5. Add observation (with AI analysis fallback)
export async function addObservation(childId, observerId, notes) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, observer_id: observerId, notes })
    });
    return await res.json();
  }

  // Client-side AI parser fallback
  const db = getLocalDB();
  const child = db.children.find(c => c.id === childId);
  const name = child ? child.first_name : 'Student';

  // Basic regex parser replicating backend ai_engine
  const sentences = notes.split(/(?<=[.!?])\s+/);
  const strengthsArr = [];
  const concernsArr = [];
  const suggestionsArr = [];

  const strengthKeywords = ['excellent', 'good', 'mastered', 'easily', 'great', 'strong', 'loves', 'enthusiasm', 'spots', 'fluent'];
  const concernKeywords = ['struggle', 'difficulty', 'hard', 'needs help', 'mixes', 'confuses', 'hesitant'];
  const suggestionKeywords = ['suggest', 'recommend', 'should', 'at home', 'parents', 'please'];

  sentences.forEach(s => {
    const clean = s.trim();
    if (clean.length < 5) return;
    const lower = clean.toLowerCase();

    if (suggestionKeywords.some(kw => lower.includes(kw))) suggestionsArr.push(clean);
    else if (concernKeywords.some(kw => lower.includes(kw))) concernsArr.push(clean);
    else strengthsArr.push(clean);
  });

  const strengths = strengthsArr.length > 0 ? strengthsArr.join(' ') : 'Good reading skills.';
  const concerns = concernsArr.length > 0 ? concernsArr.join(' ') : 'No concerns.';
  const suggestions = suggestionsArr.length > 0 ? suggestionsArr.join(' ') : 'Read stories together at home.';
  const ai_summary = `🌟 ${name} is doing well! We noticed that ${strengths.toLowerCase()}. We will support them with any areas that ${concerns.toLowerCase()}. Please support them by: ${suggestions.toLowerCase()}`;

  const newObs = {
    id: db.observations.length + 1,
    child_id: childId,
    date: new Date().toISOString().split('T')[0],
    observer_id: observerId,
    notes,
    strengths,
    concerns,
    suggestions,
    ai_summary
  };

  db.observations.push(newObs);
  saveLocalDB(db);

  return { success: true, analysis: newObs };
}

// 6. Update checklist milestone
export async function updateMilestone(childId, level, skillName, status) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/milestones/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, level, skill_name: skillName, status })
    });
    return await res.json();
  }

  const db = getLocalDB();
  const idx = db.milestones.findIndex(m => m.child_id === childId && m.level === level && m.skill_name === skillName);
  
  if (idx !== -1) {
    db.milestones[idx].status = status;
    db.milestones[idx].checked_date = status !== 'Not Started' ? new Date().toISOString().split('T')[0] : null;
  }

  // Check if level is fully completed
  const levelSkills = db.milestones.filter(m => m.child_id === childId && m.level === level);
  const levelCompleted = levelSkills.length > 0 && levelSkills.every(m => m.status === 'Mastered');

  saveLocalDB(db);
  return { success: true, levelCompleted, message: levelCompleted ? 'Level completed!' : '' };
}

// 7. Get Enquiries
export async function getEnquiries() {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/enquiries`);
    return await res.json();
  }
  const db = getLocalDB();
  return db.enquiries;
}

// 8. Add Enquiry
export async function addEnquiry(formData) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    return await res.json();
  }

  const db = getLocalDB();
  const newEnq = {
    id: db.enquiries.length + 1,
    child_name: formData.child_name,
    parent_name: formData.parent_name,
    email: formData.email,
    phone: formData.phone,
    status: 'New',
    source: formData.source,
    notes: formData.notes || '',
    date: new Date().toISOString().split('T')[0]
  };

  db.enquiries.push(newEnq);
  saveLocalDB(db);
  return { success: true };
}

// 9. Log child routine
export async function logRoutine(childId, activityType, notes) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, activity_type: activityType, notes })
    });
    return await res.json();
  }

  const db = getLocalDB();
  const newRoutine = {
    id: db.routines.length + 1,
    child_id: childId,
    date: new Date().toISOString().split('T')[0],
    activity_type: activityType,
    notes,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  db.routines.push(newRoutine);
  saveLocalDB(db);
  return { success: true };
}

// 10. Get Fees list
export async function getFees() {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/fees`);
    return await res.json();
  }
  const db = getLocalDB();
  return db.fees;
}

// 11. Pay Fee
export async function payFee(feeId, amountPaid) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/fees/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee_id: feeId, amount_paid: amountPaid })
    });
    return await res.json();
  }

  const db = getLocalDB();
  const idx = db.fees.findIndex(f => f.id === feeId);
  if (idx !== -1) {
    const f = db.fees[idx];
    f.amount_paid += Number(amountPaid);
    if (f.amount_paid >= f.amount_due) f.status = 'Paid';
    else if (f.amount_paid > 0) f.status = 'Partial';
    db.fees[idx] = f;

    // Log the transaction in mock fee_payments list
    if (!db.fee_payments) {
      db.fee_payments = [];
    }
    db.fee_payments.push({
      id: db.fee_payments.length + 1,
      fee_id: feeId,
      amount_paid: Number(amountPaid),
      payment_date: new Date().toISOString().split('T')[0],
      notes: 'Standard Receipt Logged (Sandbox)'
    });
  }
  saveLocalDB(db);
  return { success: true };
}

// 11.5. Get Fee Payments history
export async function getFeePayments() {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/fees/payments`);
    return await res.json();
  }

  const db = getLocalDB();
  const payments = db.fee_payments || [];
  return payments.map(fp => {
    const fee = db.fees.find(f => f.id === fp.fee_id) || {};
    const child = db.children.find(c => c.id === fee.child_id) || {};
    return {
      ...fp,
      first_name: child.first_name || fee.first_name || 'Student',
      last_name: child.last_name || fee.last_name || '',
      classroom_name: fee.classroom_name || 'Unassigned',
      amount_due: fee.amount_due || 0
    };
  }).sort((a, b) => b.id - a.id);
}

// 12. Get Classrooms
export async function getClassrooms() {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/classrooms`);
    return await res.json();
  }
  const db = getLocalDB();
  return db.classrooms.map(c => {
    const activeKids = db.children.filter(child => child.classroom_id === c.id && child.status === 'Active').length;
    return {
      ...c,
      enrolled_count: activeKids
    };
  });
}

// 13. Get Tasks
export async function getTasks() {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/tasks`);
    return await res.json();
  }
  const db = getLocalDB();
  return db.tasks;
}

// 14. Complete Task
export async function completeTask(taskId) {
  const online = await checkBackendStatus();
  if (online) {
    const res = await fetch(`${BACKEND_URL}/api/tasks/${taskId}/complete`, {
      method: 'POST'
    });
    return await res.json();
  }

  const db = getLocalDB();
  const idx = db.tasks.findIndex(t => t.id === taskId);
  if (idx !== -1) {
    db.tasks[idx].status = 'Completed';
  }
  saveLocalDB(db);
  return { success: true };
}
