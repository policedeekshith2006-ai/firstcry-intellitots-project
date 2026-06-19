const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let pool = null;

// Helper function to run an INSERT/UPDATE/DELETE query with SQLite-compatible return structure
async function dbRun(query, params = []) {
  if (!pool) throw new Error('Database pool not initialized.');
  const [result] = await pool.execute(query, params);
  return {
    lastID: result.insertId,
    changes: result.affectedRows
  };
}

// Helper function to get all records
async function dbAll(query, params = []) {
  if (!pool) throw new Error('Database pool not initialized.');
  const [rows] = await pool.execute(query, params);
  return rows;
}

// Helper function to get a single record
async function dbGet(query, params = []) {
  if (!pool) throw new Error('Database pool not initialized.');
  const [rows] = await pool.execute(query, params);
  return rows[0] || null;
}

// Initialize database schema and pool
async function initDatabase() {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306');
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const databaseName = process.env.DB_NAME || 'intellitots_db';

    console.log(`Connecting to MySQL server at ${host}:${port} as user "${user}"...`);

    // 1. Connect without database first to ensure the database exists
    const adminConnection = await mysql.createConnection({
      host,
      port,
      user,
      password
    });
    
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    await adminConnection.end();

    // 2. Initialize connection pool
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`Connected to MySQL database "${databaseName}" successfully.`);

    // 3. Setup tables and seed
    await createTablesAndSeed();
  } catch (err) {
    console.error('Error initializing MySQL database:', err);
    throw err;
  }
}

// Create MySQL tables and seed
async function createTablesAndSeed() {
  const conn = await pool.getConnection();
  try {
    console.log('Creating tables (disabling foreign keys during migration)...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Classrooms
    await conn.query(`CREATE TABLE IF NOT EXISTS classrooms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      capacity INT NOT NULL,
      age_group VARCHAR(255) NOT NULL,
      teacher_name VARCHAR(255) NOT NULL
    )`);

    // 2. Children
    await conn.query(`CREATE TABLE IF NOT EXISTS children (
      id INT PRIMARY KEY AUTO_INCREMENT,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      date_of_birth VARCHAR(255) NOT NULL,
      gender VARCHAR(255) NOT NULL,
      enrollment_date VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'Active',
      classroom_id INT,
      FOREIGN KEY(classroom_id) REFERENCES classrooms(id)
    )`);

    // 3. Parents
    await conn.query(`CREATE TABLE IF NOT EXISTS parents (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      parent_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 4. Admissions
    await conn.query(`CREATE TABLE IF NOT EXISTS admissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      parent_id INT,
      admission_date VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'Pending',
      FOREIGN KEY(child_id) REFERENCES children(id),
      FOREIGN KEY(parent_id) REFERENCES parents(id)
    )`);

    // 5. Enquiries
    await conn.query(`CREATE TABLE IF NOT EXISTS enquiries (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_name VARCHAR(255) NOT NULL,
      parent_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'New',
      source VARCHAR(255) NOT NULL,
      notes TEXT,
      date VARCHAR(255) NOT NULL
    )`);

    // 6. Attendance
    await conn.query(`CREATE TABLE IF NOT EXISTS attendance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      date VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      check_in_time VARCHAR(255),
      check_out_time VARCHAR(255),
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 7. Daycare Routines
    await conn.query(`CREATE TABLE IF NOT EXISTS routines (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      date VARCHAR(255) NOT NULL,
      activity_type VARCHAR(255) NOT NULL,
      notes TEXT,
      timestamp VARCHAR(255) NOT NULL,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 8. Allergies
    await conn.query(`CREATE TABLE IF NOT EXISTS allergies (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      allergy_name VARCHAR(255) NOT NULL,
      severity VARCHAR(255) NOT NULL,
      notes TEXT,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 9. Meals
    await conn.query(`CREATE TABLE IF NOT EXISTS meals (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      date VARCHAR(255) NOT NULL,
      meal_type VARCHAR(255) NOT NULL,
      items_eaten VARCHAR(255) NOT NULL,
      notes TEXT,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 10. Photos
    await conn.query(`CREATE TABLE IF NOT EXISTS photos (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      url VARCHAR(500) NOT NULL,
      caption VARCHAR(255),
      uploaded_by VARCHAR(255) NOT NULL,
      date VARCHAR(255) NOT NULL,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 11. Lesson Plans
    await conn.query(`CREATE TABLE IF NOT EXISTS lesson_plans (
      id INT PRIMARY KEY AUTO_INCREMENT,
      classroom_id INT,
      week_number INT NOT NULL,
      topic VARCHAR(255) NOT NULL,
      activities TEXT NOT NULL,
      status VARCHAR(255) DEFAULT 'Draft',
      FOREIGN KEY(classroom_id) REFERENCES classrooms(id)
    )`);

    // 12. Curriculum Activities
    await conn.query(`CREATE TABLE IF NOT EXISTS curriculum_activities (
      id INT PRIMARY KEY AUTO_INCREMENT,
      activity_name VARCHAR(255) NOT NULL,
      milestones_covered VARCHAR(255) NOT NULL,
      description TEXT
    )`);

    // 13. Reading Milestones
    await conn.query(`CREATE TABLE IF NOT EXISTS reading_milestones (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      level VARCHAR(255) NOT NULL,
      skill_name VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'Not Started',
      checked_date VARCHAR(255),
      teacher_id INT,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 14. Teacher Observations
    await conn.query(`CREATE TABLE IF NOT EXISTS teacher_observations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      date VARCHAR(255) NOT NULL,
      observer_id VARCHAR(255) NOT NULL,
      notes TEXT NOT NULL,
      strengths TEXT,
      concerns TEXT,
      suggestions TEXT,
      ai_summary TEXT,
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 15. Teacher Tasks
    await conn.query(`CREATE TABLE IF NOT EXISTS teacher_tasks (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_to VARCHAR(255) NOT NULL,
      due_date VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'Pending'
    )`);

    // 16. Feedback
    await conn.query(`CREATE TABLE IF NOT EXISTS feedback (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      parent_id INT,
      date VARCHAR(255) NOT NULL,
      rating INT CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      FOREIGN KEY(child_id) REFERENCES children(id),
      FOREIGN KEY(parent_id) REFERENCES parents(id)
    )`);

    // 17. Fees
    await conn.query(`CREATE TABLE IF NOT EXISTS fees (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      amount_due DECIMAL(10,2) NOT NULL,
      amount_paid DECIMAL(10,2) DEFAULT 0.00,
      due_date VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'Unpaid',
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 17.5. Fee Payments History
    await conn.query(`CREATE TABLE IF NOT EXISTS fee_payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      fee_id INT,
      amount_paid DECIMAL(10,2) NOT NULL,
      payment_date VARCHAR(255) NOT NULL,
      notes VARCHAR(255),
      FOREIGN KEY(fee_id) REFERENCES fees(id) ON DELETE CASCADE
    )`);

    // 18. Occupancy
    await conn.query(`CREATE TABLE IF NOT EXISTS occupancy (
      id INT PRIMARY KEY AUTO_INCREMENT,
      classroom_id INT,
      active_students INT NOT NULL,
      total_capacity INT NOT NULL,
      date VARCHAR(255) NOT NULL,
      FOREIGN KEY(classroom_id) REFERENCES classrooms(id)
    )`);

    // 19. Transport
    await conn.query(`CREATE TABLE IF NOT EXISTS transport (
      id INT PRIMARY KEY AUTO_INCREMENT,
      child_id INT,
      route_name VARCHAR(255) NOT NULL,
      status VARCHAR(255) DEFAULT 'Inactive',
      pickup_time VARCHAR(255),
      drop_time VARCHAR(255),
      FOREIGN KEY(child_id) REFERENCES children(id)
    )`);

    // 20. Supplies
    await conn.query(`CREATE TABLE IF NOT EXISTS supplies (
      id INT PRIMARY KEY AUTO_INCREMENT,
      item_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      status VARCHAR(255) DEFAULT 'In Stock'
    )`);

    // 21. Communication History
    await conn.query(`CREATE TABLE IF NOT EXISTS communication_history (
      id INT PRIMARY KEY AUTO_INCREMENT,
      recipient_id INT,
      recipient_type VARCHAR(255) NOT NULL,
      channel VARCHAR(255) NOT NULL,
      message_text TEXT NOT NULL,
      status VARCHAR(255) DEFAULT 'Sent',
      sent_at VARCHAR(255) NOT NULL
    )`);

    console.log('MySQL schema tables verified.');
    await seedDatabase(conn);
  } finally {
    console.log('Restoring foreign key checks...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    conn.release();
  }
}

// Seed Database if Empty
async function seedDatabase(conn) {
  try {
    const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM classrooms');
    if (count > 0) {
      console.log('Database already populated. Skipping seed.');
      return;
    }

    console.log('Seeding MySQL tables with realistic Intellitots records...');

    // 1. Classrooms
    await conn.query(`INSERT INTO classrooms (name, capacity, age_group, teacher_name) VALUES 
      ('Playgroup / Toddlers', 12, '1.5 - 2.5 Years', 'Ms. Sarah D''souza'),
      ('Nursery', 15, '2.5 - 3.5 Years', 'Ms. Priya Sharma'),
      ('LKG (Lower Kindergarten)', 18, '3.5 - 4.5 Years', 'Ms. Jessica Taylor'),
      ('UKG (Upper Kindergarten)', 20, '4.5 - 6.0 Years', 'Ms. Anjali Nair')
    `);

    // 2. Children
    await conn.query(`INSERT INTO children (first_name, last_name, date_of_birth, gender, enrollment_date, status, classroom_id) VALUES 
      ('Aria', 'Fernandes', '2021-08-14', 'Female', '2026-01-05', 'Active', 2),
      ('Reyansh', 'Patel', '2022-03-22', 'Male', '2026-01-10', 'Active', 1),
      ('Vihaan', 'Reddy', '2020-11-05', 'Male', '2025-06-15', 'Active', 3),
      ('Ananya', 'Sen', '2020-04-18', 'Female', '2025-06-01', 'Active', 4),
      ('Kabir', 'Mehta', '2021-12-01', 'Male', '2026-02-01', 'Active', 2),
      ('Zoya', 'Khan', '2020-09-30', 'Female', '2025-08-20', 'Active', 3),
      ('Ishaan', 'Gupta', '2020-02-14', 'Male', '2025-05-10', 'Active', 4),
      ('Mira', 'Joshi', '2022-05-11', 'Female', '2026-03-15', 'Active', 1)
    `);

    // 3. Parents
    await conn.query(`INSERT INTO parents (child_id, parent_name, email, phone, address) VALUES 
      (1, 'Melissa Fernandes', 'melissa.f@example.com', '+91 98765 43210', 'Flat 402, Sunshine Heights, Mumbai'),
      (2, 'Amit Patel', 'amit.patel@example.com', '+91 98123 45678', 'Row House 12, Orchid Villas, Mumbai'),
      (3, 'Srinivas Reddy', 'srinivas.r@example.com', '+91 97654 32109', 'Apt 1005, Park View, Mumbai'),
      (4, 'Debarati Sen', 'debarati.s@example.com', '+91 99887 76655', 'B-12, Springfields, Mumbai'),
      (5, 'Rajesh Mehta', 'rajesh.m@example.com', '+91 91234 56789', '45, Windsor Castle, Mumbai'),
      (6, 'Farhan Khan', 'farhan.k@example.com', '+91 95432 10987', 'Flat A-9, Sea Crest, Mumbai'),
      (7, 'Nitin Gupta', 'nitin.g@example.com', '+91 98989 89898', 'C-72, Green Meadows, Mumbai'),
      (8, 'Aditi Joshi', 'aditi.j@example.com', '+91 97777 66666', 'Flat 101, Tulip Residency, Mumbai')
    `);

    // 4. Admissions
    await conn.query(`INSERT INTO admissions (child_id, parent_id, admission_date, status) VALUES 
      (1, 1, '2026-01-02', 'Confirmed'),
      (2, 2, '2026-01-08', 'Confirmed'),
      (3, 3, '2025-06-10', 'Confirmed'),
      (4, 4, '2025-05-28', 'Confirmed'),
      (5, 5, '2026-01-28', 'Confirmed'),
      (6, 6, '2025-08-15', 'Confirmed'),
      (7, 7, '2025-05-05', 'Confirmed'),
      (8, 8, '2026-03-10', 'Confirmed')
    `);

    // 5. Enquiries
    await conn.query(`INSERT INTO enquiries (child_name, parent_name, email, phone, status, source, notes, date) VALUES 
      ('Advik Rao', 'Vikram Rao', 'vikram.rao@example.com', '+91 96633 88888', 'Contacted', 'Website', 'Inquired about playgroup timings and child-teacher ratio.', '2026-06-05'),
      ('Kiara Shah', 'Payal Shah', 'payal.shah@example.com', '+91 94444 33333', 'New', 'Walk-in', 'Interested in UKG curriculum and school van transport.', '2026-06-10'),
      ('Samaira Nair', 'Rohit Nair', 'rohit.nair@example.com', '+91 98877 22222', 'Enrolled', 'Referral', 'Referred by Melissa Fernandes. Interested in phonics focus.', '2026-05-15'),
      ('Ryan D''Souza', 'Neil D''Souza', 'neil.dsouza@example.com', '+91 97766 55443', 'Closed', 'Instagram', 'Enquired but selected another daycare closer to office.', '2026-05-20')
    `);

    // Dates
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 6. Attendance
    await conn.query(`INSERT INTO attendance (child_id, date, status, check_in_time, check_out_time) VALUES 
      (1, '${yesterday}', 'Present', '09:05 AM', '12:30 PM'),
      (2, '${yesterday}', 'Present', '09:15 AM', '12:00 PM'),
      (3, '${yesterday}', 'Present', '08:55 AM', '01:30 PM'),
      (4, '${yesterday}', 'Absent', NULL, NULL),
      (5, '${yesterday}', 'Present', '09:10 AM', '12:30 PM'),
      (6, '${yesterday}', 'Present', '09:00 AM', '01:30 PM'),
      (7, '${yesterday}', 'Present', '08:45 AM', '01:30 PM'),
      (8, '${yesterday}', 'Present', '09:30 AM', '12:00 PM'),
      (1, '${today}', 'Present', '09:02 AM', NULL),
      (2, '${today}', 'Present', '09:11 AM', NULL),
      (3, '${today}', 'Present', '08:58 AM', NULL),
      (4, '${today}', 'Present', '08:50 AM', NULL),
      (5, '${today}', 'Sick', NULL, NULL),
      (6, '${today}', 'Present', '08:55 AM', NULL),
      (7, '${today}', 'Present', '08:40 AM', NULL),
      (8, '${today}', 'Absent', NULL, NULL)
    `);

    // 7. Routines
    await conn.query(`INSERT INTO routines (child_id, date, activity_type, notes, timestamp) VALUES 
      (1, '${today}', 'Play', 'Aria engaged well in block stacking activity.', '10:00 AM'),
      (2, '${today}', 'Nap', 'Reyansh slept peacefully for 45 minutes.', '11:30 AM'),
      (3, '${today}', 'Activity', 'Vihaan completed the alphabet card matching game.', '10:45 AM'),
      (6, '${today}', 'Toilet', 'Zoya went to washroom with assistance.', '11:15 AM'),
      (7, '${today}', 'Play', 'Ishaan showed leadership in sandbox group play.', '10:15 AM')
    `);

    // 8. Allergies
    await conn.query(`INSERT INTO allergies (child_id, allergy_name, severity, notes) VALUES 
      (1, 'Peanuts', 'Severe', 'Keep Epipen in school bag. No peanut-based snacks.'),
      (3, 'Gluten', 'Moderate', 'Provide gluten-free roti/biscuits.'),
      (8, 'Dust Mites', 'Mild', 'Triggers mild sneezing; keep playroom clean.')
    `);

    // 9. Meals
    await conn.query(`INSERT INTO meals (child_id, date, meal_type, items_eaten, notes) VALUES 
      (1, '${yesterday}', 'Snack', 'Apple slices and milk', 'Ate everything, enjoyed the apples.'),
      (2, '${yesterday}', 'Lunch', 'Khichdi and curd', 'Ate half portion, was a bit cranky.'),
      (3, '${yesterday}', 'Lunch', 'Gluten-free pasta', 'Finished whole plate.'),
      (5, '${yesterday}', 'Breakfast', 'Oats porridge with bananas', 'Finished quickly.'),
      (6, '${yesterday}', 'Lunch', 'Roti and paneer subji', 'Finished food independently.')
    `);

    // 10. Photos
    await conn.query(`INSERT INTO photos (child_id, url, caption, uploaded_by, date) VALUES 
      (1, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80', 'Aria matching letters with cards', 'Ms. Priya Sharma', '${yesterday}'),
      (3, 'https://images.unsplash.com/photo-1540479859555-17af45c78602?auto=format&fit=crop&w=400&q=80', 'Vihaan during reading time', 'Ms. Jessica Taylor', '${yesterday}'),
      (7, 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=400&q=80', 'Ishaan presenting his drawing', 'Ms. Anjali Nair', '${yesterday}')
    `);

    // 11. Lesson Plans
    await conn.query(`INSERT INTO lesson_plans (classroom_id, week_number, topic, activities, status) VALUES 
      (1, 23, 'Animal Sounds and Sensory Play', 'Mimic animal calls, sensory tub exploration, nursery rhymes', 'Approved'),
      (2, 23, 'Introduction to Digraphs & Sight Words', 'Phonics blending games, reading "the", "and", "she" cards', 'Approved'),
      (3, 23, 'CVC Words and Number Addition', 'Interactive CVC slider board, single-digit addition with beads', 'Approved'),
      (4, 23, 'Complex Blend Reading & Short Stories', 'Read digraph lists, reading short paragraphs, writing practice', 'Approved')
    `);

    // 12. Curriculum Activities
    await conn.query(`INSERT INTO curriculum_activities (activity_name, milestones_covered, description) VALUES 
      ('Alphabet Bingo', 'Letter Recognition', 'Kids match spoken letters with cards in front of them.'),
      ('Sound Bouncing', 'Phonics Vowels', 'Saying a word and bouncing a ball on the vowel sound beat.'),
      ('CVC word sliders', 'Word Reading CVC', 'Sliding letters to form simple words like b-a-t, c-a-t.'),
      ('Sight Word Fly Swat', 'Word Reading Sight Words', 'Swatting sight words on the board when the teacher calls them out.'),
      ('Expressive Story Reading', 'Sentence Reading', 'Reading simple 3-line passages with tone adjustments.')
    `);

    // 13. Reading Milestones
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

    const levelsOrder = ['Letter Recognition', 'Phonics', 'Word Reading', 'Sentence Reading'];

    for (const conf of childConfigs) {
      let currentStatus = 'Mastered';
      for (const level of levelsOrder) {
        if (level === conf.inProgressLevel) {
          currentStatus = 'In Progress';
        } else if (conf.maxMasteredLevel && levelsOrder.indexOf(level) > levelsOrder.indexOf(conf.maxMasteredLevel)) {
          currentStatus = 'Not Started';
        }

        const skills = milestoneSkills[level];
        for (let i = 0; i < skills.length; i++) {
          let skillStatus = currentStatus;
          if (currentStatus === 'In Progress') {
            skillStatus = i < 2 ? 'Mastered' : (i === 2 ? 'In Progress' : 'Not Started');
          }
          
          await conn.query(`INSERT INTO reading_milestones (child_id, level, skill_name, status, checked_date, teacher_id) VALUES 
            (?, ?, ?, ?, ?, 1)`, 
            [conf.id, level, skills[i], skillStatus, skillStatus !== 'Not Started' ? yesterday : null]
          );
        }
      }
    }

    // 14. Observations
    await conn.query(`INSERT INTO teacher_observations (child_id, date, observer_id, notes, strengths, concerns, suggestions, ai_summary) VALUES 
      (1, '${yesterday}', 'Ms. Priya Sharma', 
       'Aria has shown fantastic enthusiasm during the letter sounds game today. She easily recognized upper and lowercase letters from A to Z and could associate them. However, she struggles with sound blends like "ch" or "sh", showing hesitation and mixing up their sounds. Recommend parents read storybooks emphasizing short vowel blends at home.',
       'Excellent at uppercase and lowercase letter recognition A-Z; highly enthusiastic.',
       'Struggles with sound blends like "ch" and "sh" and mixes them up.',
       'Parents should read storybooks with short vowel blends at home.',
       'Aria has mastered A-Z letter recognition and loves active reading games! We are now working on helping her with digraph sounds like "ch" and "sh". Practicing these blend sounds in stories at home will be very helpful.'),
       
      (3, '${yesterday}', 'Ms. Jessica Taylor', 
       'Vihaan is reading CVC words like "cat", "pin" and "sun" with good speed. He has mastered all vowel sounds. He does face difficulty when reading words containing silent E, like "cake" or "hope", and ends up pronouncing the silent E. Parents should play word-slider games with silent-E words.',
       'Strong at reading three-letter CVC words; has mastered all short vowel sounds.',
       'Pronounces the silent E in words like "cake" and "hope" instead of keeping it silent.',
       'Play word-slider card games with silent-E words at home.',
       'Vihaan is doing great reading CVC words like "cat" and "pin" independently! He is currently learning the silent E rule (words like "cake"). Working on word sliders together at home will make this concept easy for him.')
    `);

    // 15. Teacher Tasks
    await conn.query(`INSERT INTO teacher_tasks (title, description, assigned_to, due_date, status) VALUES 
      ('Prepare flashcards for LKG blends', 'Create color-coded cards for "bl", "cl", "dr", and "cr" sounds.', 'Ms. Jessica Taylor', '2026-06-15', 'Pending'),
      ('Update monthly report comments', 'Complete progress comments for all nursery kids on reading levels.', 'Ms. Priya Sharma', '2026-06-12', 'Pending'),
      ('Review fee arrears for playgroup', 'Follow up with Amit Patel regarding pending monthly fees.', 'Ms. Sarah D''souza', '2026-06-14', 'Pending'),
      ('Setup classroom reading corner', 'Arrange new storybooks and carpet area for UKG class.', 'Ms. Anjali Nair', '2026-06-18', 'Completed')
    `);

    // 16. Feedback
    await conn.query(`INSERT INTO feedback (child_id, parent_id, date, rating, comment) VALUES 
      (1, 1, '${yesterday}', 5, 'We love the phonic logs! Aria is always repeating the letter sounds at home.'),
      (3, 3, '${yesterday}', 4, 'Vihaan is showing interest in spelling out words. The school progress tracker is very informative.')
    `);

    // 17. Fees
    await conn.query(`INSERT INTO fees (child_id, amount_due, amount_paid, due_date, status) VALUES 
      (1, 12000.00, 12000.00, '2026-06-05', 'Paid'),
      (2, 10000.00, 5000.00, '2026-06-05', 'Partial'),
      (3, 14000.00, 14000.00, '2026-06-05', 'Paid'),
      (4, 15000.00, 0.00, '2026-06-05', 'Unpaid'),
      (5, 12000.00, 12000.00, '2026-06-05', 'Paid'),
      (6, 14000.00, 14000.00, '2026-06-05', 'Paid'),
      (7, 15000.00, 7500.00, '2026-06-05', 'Partial'),
      (8, 10000.00, 10000.00, '2026-06-05', 'Paid')
    `);

    // 17.5. Fee Payments History
    await conn.query(`INSERT INTO fee_payments (fee_id, amount_paid, payment_date, notes) VALUES 
      (1, 12000.00, '2026-06-05', 'Full payment received'),
      (2, 5000.00, '2026-06-05', 'First installment received'),
      (3, 14000.00, '2026-06-05', 'Full payment received'),
      (5, 12000.00, '2026-06-05', 'Full payment received'),
      (6, 14000.00, '2026-06-05', 'Full payment received'),
      (7, 7500.00, '2026-06-05', 'First installment received'),
      (8, 10000.00, '2026-06-05', 'Full payment received')
    `);

    // 18. Occupancy
    await conn.query(`INSERT INTO occupancy (classroom_id, active_students, total_capacity, date) VALUES 
      (1, 2, 12, '${today}'),
      (2, 2, 15, '${today}'),
      (3, 2, 18, '${today}'),
      (4, 2, 20, '${today}')
    `);

    // 19. Transport
    await conn.query(`INSERT INTO transport (child_id, route_name, status, pickup_time, drop_time) VALUES 
      (1, 'Route A - Powai', 'Active', '08:30 AM', '01:00 PM'),
      (3, 'Route B - Chembur', 'Active', '08:15 AM', '02:00 PM'),
      (4, 'Route A - Powai', 'Active', '08:25 AM', '02:05 PM'),
      (7, 'Route C - Thane', 'Active', '08:00 AM', '02:15 PM')
    `);

    // 20. Supplies
    await conn.query(`INSERT INTO supplies (item_name, quantity, status) VALUES 
      ('CVC word sliders sets', 15, 'In Stock'),
      ('Phonics vowel flashcards', 4, 'Low'),
      ('Storybooks - Level 1 (First Steps)', 30, 'In Stock'),
      ('Storybooks - Level 2 (Short Sentences)', 8, 'Low'),
      ('Alphabet clay moulds', 25, 'In Stock'),
      ('Drawing sheets bundles', 0, 'Out of Stock')
    `);

    // 21. Communication History
    await conn.query(`INSERT INTO communication_history (recipient_id, recipient_type, channel, message_text, status, sent_at) VALUES 
      (1, 'Parent', 'WhatsApp', 'Dear Parent, Aria has completed the "Letter Recognition" milestone! You can check details in the Parent Portal.', 'Read', '${yesterday} 05:30 PM'),
      (3, 'Parent', 'Email', 'Weekly Phonics Update: Vihaan is doing well with short CVC words. Home practice task is now updated.', 'Delivered', '${yesterday} 06:00 PM'),
      (2, 'Parent', 'WhatsApp', 'Fee Reminder: A partial payment is pending for Reyansh''s June fee invoice.', 'Sent', '${today} 09:00 AM')
    `);

    console.log('MySQL seeded successfully.');
  } catch (err) {
    console.error('Error seeding MySQL database:', err);
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL connection pool closed.');
  }
}

module.exports = {
  dbRun,
  dbAll,
  dbGet,
  initDatabase,
  closeDatabase
};
