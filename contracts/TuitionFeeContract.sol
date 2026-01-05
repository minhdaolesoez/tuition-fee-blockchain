// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TuitionFeeContract
 * @dev Smart contract for managing university tuition fee payments
 * @notice Enables transparent, real-time settlement without bank reconciliation
 * 
 * Architecture:
 * Student (MetaMask) -> React Frontend -> TuitionFeeContract -> University Wallet
 */
contract TuitionFeeContract is Ownable, ReentrancyGuard {
    
    // ============ Structs ============
    
    struct Payment {
        address student;
        string studentId;
        string semester;
        uint256 amount;
        uint256 timestamp;
        bool paid;
        bool refunded;
    }
    
    struct Student {
        string studentId;
        address walletAddress;
        uint256 scholarshipPercent; // 0-100
        bool isRegistered;
    }
    
    struct FeeSchedule {
        string semester;
        uint256 baseAmount;
        uint256 deadline;
        bool isActive;
    }
    
    // ============ State Variables ============
    
    address public universityWallet;
    uint256 public paymentCounter;
    
    // Mappings
    mapping(uint256 => Payment) public payments;
    mapping(address => Student) public students;
    mapping(string => address) public studentIdToAddress;
    mapping(string => FeeSchedule) public feeSchedules;
    mapping(address => mapping(string => uint256)) public studentSemesterPayment; // student -> semester -> paymentId
    
    // Arrays for enumeration
    string[] public activeSemesters;
    address[] public registeredStudents;
    
    // ============ Events ============
    
    event StudentRegistered(address indexed wallet, string studentId, uint256 timestamp);
    event ScholarshipApplied(address indexed student, uint256 percent);
    event PaymentReceived(
        uint256 indexed paymentId,
        address indexed student,
        string studentId,
        string semester,
        uint256 amount,
        uint256 timestamp
    );
    event RefundProcessed(
        uint256 indexed paymentId,
        address indexed student,
        uint256 amount,
        uint256 timestamp
    );
    event FeeScheduleCreated(string semester, uint256 baseAmount, uint256 deadline);
    event UniversityWalletUpdated(address oldWallet, address newWallet);
    
    // ============ Modifiers ============
    
    modifier onlyRegisteredStudent() {
        require(students[msg.sender].isRegistered, "Student not registered");
        _;
    }
    
    modifier validSemester(string memory semester) {
        require(feeSchedules[semester].isActive, "Invalid or inactive semester");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _universityWallet) Ownable(msg.sender) {
        require(_universityWallet != address(0), "Invalid university wallet");
        universityWallet = _universityWallet;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Register a new student
     * @param _walletAddress Student's MetaMask wallet address
     * @param _studentId University student ID
     */
    function registerStudent(
        address _walletAddress,
        string memory _studentId
    ) external onlyOwner {
        require(_walletAddress != address(0), "Invalid wallet address");
        require(!students[_walletAddress].isRegistered, "Student already registered");
        require(studentIdToAddress[_studentId] == address(0), "StudentId already exists");
        
        students[_walletAddress] = Student({
            studentId: _studentId,
            walletAddress: _walletAddress,
            scholarshipPercent: 0,
            isRegistered: true
        });
        
        studentIdToAddress[_studentId] = _walletAddress;
        registeredStudents.push(_walletAddress);
        
        emit StudentRegistered(_walletAddress, _studentId, block.timestamp);
    }
    
    /**
     * @dev Apply scholarship discount to a student
     * @param _studentAddress Student's wallet address
     * @param _percent Scholarship percentage (0-100)
     */
    function applyScholarship(
        address _studentAddress,
        uint256 _percent
    ) external onlyOwner {
        require(students[_studentAddress].isRegistered, "Student not registered");
        require(_percent <= 100, "Invalid percentage");
        
        students[_studentAddress].scholarshipPercent = _percent;
        
        emit ScholarshipApplied(_studentAddress, _percent);
    }
    
    /**
     * @dev Create or update fee schedule for a semester
     * @param _semester Semester identifier (e.g., "2024-1")
     * @param _baseAmount Base tuition fee in wei
     * @param _deadline Payment deadline timestamp
     */
    function setFeeSchedule(
        string memory _semester,
        uint256 _baseAmount,
        uint256 _deadline
    ) external onlyOwner {
        require(_baseAmount > 0, "Invalid amount");
        require(_deadline > block.timestamp, "Deadline must be in future");
        
        if (!feeSchedules[_semester].isActive) {
            activeSemesters.push(_semester);
        }
        
        feeSchedules[_semester] = FeeSchedule({
            semester: _semester,
            baseAmount: _baseAmount,
            deadline: _deadline,
            isActive: true
        });
        
        emit FeeScheduleCreated(_semester, _baseAmount, _deadline);
    }
    
    /**
     * @dev Update university wallet address
     * @param _newWallet New wallet address
     */
    function setUniversityWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet address");
        address oldWallet = universityWallet;
        universityWallet = _newWallet;
        
        emit UniversityWalletUpdated(oldWallet, _newWallet);
    }
    
    /**
     * @dev Deposit ETH to contract for refund pool
     */
    function depositForRefund() external payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
    }
    
    /**
     * @dev Process refund for course withdrawal
     * @param _paymentId Payment ID to refund
     */
    function processRefund(uint256 _paymentId) external onlyOwner nonReentrant {
        Payment storage payment = payments[_paymentId];
        require(payment.paid, "Payment not found");
        require(!payment.refunded, "Already refunded");
        require(address(this).balance >= payment.amount, "Insufficient refund pool");
        
        payment.refunded = true;
        
        (bool success, ) = payment.student.call{value: payment.amount}("");
        require(success, "Refund transfer failed");
        
        emit RefundProcessed(_paymentId, payment.student, payment.amount, block.timestamp);
    }
    
    /**
     * @dev Get contract balance (refund pool)
     */
    function getRefundPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ============ Student Functions ============
    
    /**
     * @dev Pay tuition fee for a semester
     * @param _semester Semester to pay for
     */
    function payTuition(
        string memory _semester
    ) external payable onlyRegisteredStudent validSemester(_semester) nonReentrant {
        require(studentSemesterPayment[msg.sender][_semester] == 0, "Already paid for this semester");
        
        uint256 requiredAmount = calculateFee(msg.sender, _semester);
        require(msg.value >= requiredAmount, "Insufficient payment amount");
        
        paymentCounter++;
        
        payments[paymentCounter] = Payment({
            student: msg.sender,
            studentId: students[msg.sender].studentId,
            semester: _semester,
            amount: msg.value,
            timestamp: block.timestamp,
            paid: true,
            refunded: false
        });
        
        studentSemesterPayment[msg.sender][_semester] = paymentCounter;
        
        // Transfer to university wallet
        (bool success, ) = universityWallet.call{value: msg.value}("");
        require(success, "Transfer to university failed");
        
        emit PaymentReceived(
            paymentCounter,
            msg.sender,
            students[msg.sender].studentId,
            _semester,
            msg.value,
            block.timestamp
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Calculate fee after scholarship deduction
     * @param _student Student address
     * @param _semester Semester identifier
     * @return Fee amount after scholarship
     */
    function calculateFee(
        address _student,
        string memory _semester
    ) public view returns (uint256) {
        uint256 baseAmount = feeSchedules[_semester].baseAmount;
        uint256 scholarshipPercent = students[_student].scholarshipPercent;
        
        if (scholarshipPercent == 0) {
            return baseAmount;
        }
        
        return baseAmount - (baseAmount * scholarshipPercent / 100);
    }
    
    /**
     * @dev Check if student has paid for a semester
     * @param _student Student address
     * @param _semester Semester identifier
     * @return Payment status
     */
    function hasStudentPaid(
        address _student,
        string memory _semester
    ) external view returns (bool) {
        uint256 paymentId = studentSemesterPayment[_student][_semester];
        if (paymentId == 0) return false;
        return payments[paymentId].paid && !payments[paymentId].refunded;
    }
    
    /**
     * @dev Get payment details
     * @param _paymentId Payment ID
     * @return Payment struct
     */
    function getPayment(uint256 _paymentId) external view returns (Payment memory) {
        return payments[_paymentId];
    }
    
    /**
     * @dev Get student details
     * @param _student Student address
     * @return Student struct
     */
    function getStudent(address _student) external view returns (Student memory) {
        return students[_student];
    }
    
    /**
     * @dev Get total registered students count
     * @return Count of registered students
     */
    function getRegisteredStudentsCount() external view returns (uint256) {
        return registeredStudents.length;
    }
    
    /**
     * @dev Get all payments for audit/transparency
     * @param _startId Start payment ID
     * @param _count Number of payments to retrieve
     * @return Array of payments
     */
    function getPaymentHistory(
        uint256 _startId,
        uint256 _count
    ) external view returns (Payment[] memory) {
        require(_startId > 0 && _startId <= paymentCounter, "Invalid start ID");
        
        uint256 endId = _startId + _count - 1;
        if (endId > paymentCounter) {
            endId = paymentCounter;
        }
        
        uint256 resultCount = endId - _startId + 1;
        Payment[] memory result = new Payment[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = payments[_startId + i];
        }
        
        return result;
    }
}
