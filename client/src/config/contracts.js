// Contract configuration - Update after deployment
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// Network configuration
export const SUPPORTED_CHAIN_ID = 31337; // Hardhat localhost (change to 11155111 for Sepolia)
export const NETWORK_NAME = "Hardhat Localhost";

// Contract ABI - Key functions only
export const CONTRACT_ABI = [
  // Read functions
  "function owner() view returns (address)",
  "function universityWallet() view returns (address)",
  "function paymentCounter() view returns (uint256)",
  "function students(address) view returns (string studentId, address walletAddress, uint256 scholarshipPercent, bool isRegistered)",
  "function studentIdToAddress(string) view returns (address)",
  "function feeSchedules(string) view returns (string semester, uint256 baseAmount, uint256 deadline, bool isActive)",
  "function calculateFee(address _student, string _semester) view returns (uint256)",
  "function hasStudentPaid(address _student, string _semester) view returns (bool)",
  "function getPayment(uint256 _paymentId) view returns (tuple(address student, string studentId, string semester, uint256 amount, uint256 amountAfterRefund, uint256 timestamp, bool paid, bool refunded))",
  "function getStudent(address _student) view returns (tuple(string studentId, address walletAddress, uint256 scholarshipPercent, bool isRegistered))",
  "function getRegisteredStudentsCount() view returns (uint256)",
  "function getPaymentHistory(uint256 _startId, uint256 _count) view returns (tuple(address student, string studentId, string semester, uint256 amount, uint256 amountAfterRefund, uint256 timestamp, bool paid, bool refunded)[])",
  "function getContractBalance() view returns (uint256)",
  "function getFinancialSummary() view returns (uint256 balance, uint256 collected, uint256 refunded)",
  "function getActiveSemesters() view returns (string[])",
  "function getFeeSchedule(string _semester) view returns (tuple(string semester, uint256 baseAmount, uint256 deadline, bool isActive))",
  "function getAllStudents() view returns (address[])",
  "function getStudentPaymentIds(address _student) view returns (uint256[])",
  
  // Write functions
  "function registerStudent(address _walletAddress, string _studentId)",
  "function applyScholarship(address _studentAddress, uint256 _percent)",
  "function setFeeSchedule(string _semester, uint256 _baseAmount, uint256 _deadline)",
  "function payTuition(string _semester) payable",
  "function processRefund(uint256 _paymentId, uint256 _refundAmount)",
  "function withdrawToUniversity(uint256 _amount)",
  "function setUniversityWallet(address _newWallet)",
  
  // Events
  "event StudentRegistered(address indexed wallet, string studentId, uint256 timestamp)",
  "event ScholarshipApplied(address indexed student, uint256 percent, uint256 totalRefunded)",
  "event PaymentReceived(uint256 indexed paymentId, address indexed student, string studentId, string semester, uint256 amount, uint256 timestamp)",
  "event RefundProcessed(uint256 indexed paymentId, address indexed student, uint256 amount, uint256 timestamp)",
  "event ScholarshipRefund(address indexed student, uint256 indexed paymentId, uint256 refundAmount, uint256 timestamp)",
  "event UniversityWithdrawal(address indexed wallet, uint256 amount, uint256 timestamp)",
];
