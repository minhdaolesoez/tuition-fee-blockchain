const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'state.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load data from JSON
function loadData() {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data:', err.message);
  }
  return {
    students: [],
    feeSchedules: [],
    scholarships: [],
    payments: [],
    registrationRequests: [],
    lastUpdated: null
  };
}

// Save data to JSON
function saveData(data) {
  ensureDataDir();
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('[DATA] Saved to', DATA_FILE);
}

// Add student
function addStudent(wallet, studentId) {
  const data = loadData();
  const existing = data.students.find(s => s.wallet.toLowerCase() === wallet.toLowerCase());
  if (!existing) {
    data.students.push({ wallet, studentId, createdAt: new Date().toISOString() });
    saveData(data);
  }
  return data;
}

// Add scholarship
function setScholarship(wallet, percent) {
  const data = loadData();
  const existing = data.scholarships.find(s => s.wallet.toLowerCase() === wallet.toLowerCase());
  if (existing) {
    existing.percent = percent;
    existing.updatedAt = new Date().toISOString();
  } else {
    data.scholarships.push({ wallet, percent, createdAt: new Date().toISOString() });
  }
  saveData(data);
  return data;
}

// Add fee schedule
function addFeeSchedule(semester, amount, deadline) {
  const data = loadData();
  const existing = data.feeSchedules.find(f => f.semester === semester);
  if (existing) {
    existing.amount = amount;
    existing.deadline = deadline;
    existing.updatedAt = new Date().toISOString();
  } else {
    data.feeSchedules.push({ semester, amount, deadline, createdAt: new Date().toISOString() });
  }
  saveData(data);
  return data;
}

// Add registration request
function addRegistrationRequest(wallet, studentId) {
  const data = loadData();
  if (!data.registrationRequests) data.registrationRequests = [];
  
  // Check if already requested
  const existing = data.registrationRequests.find(
    r => r.wallet.toLowerCase() === wallet.toLowerCase()
  );
  if (existing) {
    return { error: 'Yêu cầu đăng ký đã tồn tại', data };
  }
  
  // Check if already a student
  const isStudent = data.students.find(
    s => s.wallet.toLowerCase() === wallet.toLowerCase()
  );
  if (isStudent) {
    return { error: 'Tài khoản đã được đăng ký', data };
  }
  
  data.registrationRequests.push({
    wallet,
    studentId,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  saveData(data);
  return { success: true, data };
}

// Approve registration request
function approveRegistration(wallet) {
  const data = loadData();
  if (!data.registrationRequests) return { error: 'No requests found' };
  
  const request = data.registrationRequests.find(
    r => r.wallet.toLowerCase() === wallet.toLowerCase() && r.status === 'pending'
  );
  if (!request) {
    return { error: 'Không tìm thấy yêu cầu đăng ký' };
  }
  
  request.status = 'approved';
  request.approvedAt = new Date().toISOString();
  
  // Add to students
  data.students.push({
    wallet: request.wallet,
    studentId: request.studentId,
    createdAt: new Date().toISOString()
  });
  
  saveData(data);
  return { success: true, student: request, data };
}

// Reject registration request
function rejectRegistration(wallet) {
  const data = loadData();
  if (!data.registrationRequests) return { error: 'No requests found' };
  
  const request = data.registrationRequests.find(
    r => r.wallet.toLowerCase() === wallet.toLowerCase() && r.status === 'pending'
  );
  if (!request) {
    return { error: 'Không tìm thấy yêu cầu đăng ký' };
  }
  
  request.status = 'rejected';
  request.rejectedAt = new Date().toISOString();
  saveData(data);
  return { success: true, data };
}

// Get pending registration requests
function getPendingRequests() {
  const data = loadData();
  if (!data.registrationRequests) return [];
  return data.registrationRequests.filter(r => r.status === 'pending');
}

// Add payment record
function addPayment(wallet, semester, amount, timestamp) {
  const data = loadData();
  if (!data.payments) data.payments = [];
  
  // Check if already exists
  const existing = data.payments.find(
    p => p.wallet.toLowerCase() === wallet.toLowerCase() && p.semester === semester
  );
  if (existing) {
    return data; // Already recorded
  }
  
  data.payments.push({
    wallet,
    semester,
    amount: amount.toString(), // Store as string to handle big numbers
    timestamp,
    createdAt: new Date().toISOString()
  });
  saveData(data);
  return data;
}

// Get payments for a student
function getStudentPayments(wallet) {
  const data = loadData();
  if (!data.payments) return [];
  return data.payments.filter(p => p.wallet.toLowerCase() === wallet.toLowerCase());
}

module.exports = {
  loadData,
  saveData,
  addStudent,
  setScholarship,
  addFeeSchedule,
  addRegistrationRequest,
  approveRegistration,
  rejectRegistration,
  getPendingRequests,
  addPayment,
  getStudentPayments,
  DATA_FILE
};
