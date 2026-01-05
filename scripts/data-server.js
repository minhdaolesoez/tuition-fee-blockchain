const express = require('express');
const cors = require('cors');
const { 
  loadData, 
  addStudent, 
  setScholarship, 
  addFeeSchedule,
  addRegistrationRequest,
  approveRegistration,
  rejectRegistration,
  getPendingRequests,
  addPayment,
  getStudentPayments
} = require('./data-manager');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Get all data
app.get('/api/data', (req, res) => {
  const data = loadData();
  res.json(data);
});

// Add student
app.post('/api/students', (req, res) => {
  const { wallet, studentId } = req.body;
  if (!wallet || !studentId) {
    return res.status(400).json({ error: 'Missing wallet or studentId' });
  }
  const data = addStudent(wallet, studentId);
  res.json({ success: true, data });
});

// Set scholarship
app.post('/api/scholarships', (req, res) => {
  const { wallet, percent } = req.body;
  if (!wallet || percent === undefined) {
    return res.status(400).json({ error: 'Missing wallet or percent' });
  }
  const data = setScholarship(wallet, percent);
  res.json({ success: true, data });
});

// Add fee schedule
app.post('/api/fees', (req, res) => {
  const { semester, amount, deadline } = req.body;
  if (!semester || !amount || !deadline) {
    return res.status(400).json({ error: 'Missing semester, amount or deadline' });
  }
  const data = addFeeSchedule(semester, amount, deadline);
  res.json({ success: true, data });
});

// Registration request from student
app.post('/api/register-request', (req, res) => {
  const { wallet, studentId } = req.body;
  if (!wallet || !studentId) {
    return res.status(400).json({ error: 'Missing wallet or studentId' });
  }
  const result = addRegistrationRequest(wallet, studentId);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Yêu cầu đăng ký đã được gửi' });
});

// Get pending registration requests
app.get('/api/register-requests', (req, res) => {
  const requests = getPendingRequests();
  res.json(requests);
});

// Approve registration
app.post('/api/register-approve', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) {
    return res.status(400).json({ error: 'Missing wallet' });
  }
  const result = approveRegistration(wallet);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, student: result.student });
});

// Reject registration
app.post('/api/register-reject', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) {
    return res.status(400).json({ error: 'Missing wallet' });
  }
  const result = rejectRegistration(wallet);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true });
});

// Add payment record
app.post('/api/payments', (req, res) => {
  const { wallet, semester, amount, timestamp } = req.body;
  if (!wallet || !semester || !amount) {
    return res.status(400).json({ error: 'Missing wallet, semester or amount' });
  }
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const data = addPayment(wallet, semester, amount, ts);
  res.json({ success: true, data });
});

// Get student payments
app.get('/api/payments/:wallet', (req, res) => {
  const payments = getStudentPayments(req.params.wallet);
  res.json(payments);
});

app.listen(PORT, () => {
  console.log(`[DATA API] Running on http://localhost:${PORT}`);
});

module.exports = app;
