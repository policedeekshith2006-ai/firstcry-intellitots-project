const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dbHelper = require('../backend/database');
const aiEngine = require('../backend/ai_engine');

// Setup a separate test server on port 5001 to run tests in isolation
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Dashboard Summary Route
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const childCount = await dbHelper.dbGet('SELECT COUNT(*) as count FROM children WHERE status = "Active"');
    const enquiryCount = await dbHelper.dbGet('SELECT COUNT(*) as count FROM enquiries WHERE status != "Closed"');
    const taskCount = await dbHelper.dbGet('SELECT COUNT(*) as count FROM teacher_tasks WHERE status = "Pending"');
    const fees = await dbHelper.dbGet('SELECT SUM(amount_due) as total_due, SUM(amount_paid) as total_paid FROM fees');
    res.json({
      totalChildren: childCount.count,
      activeEnquiries: enquiryCount.count,
      pendingTasks: taskCount.count,
      totalDue: fees.total_due || 0,
      totalPaid: fees.total_paid || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Children List Route
app.get('/api/children', async (req, res) => {
  try {
    const children = await dbHelper.dbAll('SELECT * FROM children WHERE status = "Active"');
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Child Route
app.post('/api/children', async (req, res) => {
  const { first_name, last_name, date_of_birth, gender } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'Missing names' });
  try {
    const result = await dbHelper.dbRun(
      'INSERT INTO children (first_name, last_name, date_of_birth, gender, enrollment_date, status) VALUES (?, ?, ?, ?, "2026-06-11", "Active")',
      [first_name, last_name, date_of_birth, gender]
    );
    res.status(201).json({ success: true, childId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let server;
const PORT = 5001;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(data)
        });
      });
    });

    req.on('error', (err) => { reject(err); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  try {
    console.log('Initializing database for API testing...');
    await dbHelper.initDatabase();
  } catch (err) {
    console.error('\n❌ MySQL Connection Failed!');
    console.error('Please verify that:');
    console.error('1. Your MySQL server is running (e.g. via XAMPP, WampServer or command line).');
    console.error('2. Your connection credentials in backend/.env are correct.');
    console.error('Error Details:', err.message);
    process.exit(1);
  }

  console.log(`Starting test server on port ${PORT}...`);
  server = app.listen(PORT, async () => {
    try {
      console.log('Running API Tests...');

      // Test 1: GET Summary
      console.log('- Testing GET /api/dashboard/summary...');
      const summaryRes = await makeRequest('GET', '/api/dashboard/summary');
      if (summaryRes.statusCode !== 200 || summaryRes.body.totalChildren === undefined) {
        throw new Error('Summary API failed validation');
      }
      console.log(`  Child count returned: ${summaryRes.body.totalChildren}`);

      // Test 2: GET Children List
      console.log('- Testing GET /api/children...');
      const childrenRes = await makeRequest('GET', '/api/children');
      if (childrenRes.statusCode !== 200 || !Array.isArray(childrenRes.body)) {
        throw new Error('Children list API failed validation');
      }
      console.log(`  Received ${childrenRes.body.length} children from seed data.`);

      // Test 3: POST Enroll Child
      console.log('- Testing POST /api/children...');
      const newChild = {
        first_name: 'Testy',
        last_name: 'McTest',
        date_of_birth: '2022-01-01',
        gender: 'Male'
      };
      const enrollRes = await makeRequest('POST', '/api/children', newChild);
      if (enrollRes.statusCode !== 201 || !enrollRes.body.childId) {
        throw new Error('Enroll child API failed');
      }
      console.log(`  Successfully enrolled child with ID: ${enrollRes.body.childId}`);

      console.log('✅ API integration tests completed successfully!');
    } catch (err) {
      console.error('❌ API testing failed:', err.message);
      process.exitCode = 1;
    } finally {
      console.log('Closing test server...');
      server.close(async () => {
        console.log('Test server shut down.');
        try {
          await dbHelper.closeDatabase();
        } catch (e) {
          console.error('Error closing database pool:', e);
        }
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runTests();
