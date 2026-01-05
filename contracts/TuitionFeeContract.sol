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
 * Student (MetaMask) -> React Frontend -> TuitionFeeContract (holds funds) -> University withdraws
 * 
 * Simplified flow:
 * - Payments stay in contract (university can withdraw anytime)
 * - When scholarship applied -> auto refund overpayments
 * - No separate refund pool needed
 */
contract TuitionFeeContract is Ownable, ReentrancyGuard {
    
    // ============ Structs ============
    
    struct Payment {
        address student;
        string studentId;
        string semester;
        uint256 amount;
        uint256 amountAfterRefund; // Track remaining amount after scholarship refunds
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
    uint256 public totalCollected; // Total tuition collected
    uint256 public totalRefunded;  // Total refunded to students
    
    // Mappings
    mapping(uint256 => Payment) public payments;
    mapping(address => Student) public students;
    mapping(string => address) public studentIdToAddress;
    mapping(string => FeeSchedule) public feeSchedules;
    mapping(address => mapping(string => uint256)) public studentSemesterPayment; // student -> semester -> paymentId
    mapping(address => uint256[]) public studentPaymentIds; // student -> array of payment IDs
    
    // Arrays for enumeration
    string[] public activeSemesters;
    address[] public registeredStudents;
    
    // ============ Events ============
    
    event StudentRegistered(address indexed wallet, string studentId, uint256 timestamp);
    event ScholarshipApplied(address indexed student, uint256 percent, uint256 totalRefunded);
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
    event ScholarshipRefund(
        address indexed student,
        uint256 indexed paymentId,
        uint256 refundAmount,
        uint256 timestamp
    );
    event FeeScheduleCreated(string semester, uint256 baseAmount, uint256 deadline);
    event UniversityWalletUpdated(address oldWallet, address newWallet);
    event UniversityWithdrawal(address indexed wallet, uint256 amount, uint256 timestamp);
    
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
     * @notice Automatically refunds overpayments if student already paid
     * @param _studentAddress Student's wallet address
     * @param _percent Scholarship percentage (0-100)
     */
    function applyScholarship(
        address _studentAddress,
        uint256 _percent
    ) external onlyOwner nonReentrant {
        require(students[_studentAddress].isRegistered, "Student not registered");
        require(_percent <= 100, "Invalid percentage");
        
        uint256 oldPercent = students[_studentAddress].scholarshipPercent;
        students[_studentAddress].scholarshipPercent = _percent;
        
        // If new scholarship is higher, refund difference for all payments
        uint256 totalRefundAmount = 0;
        if (_percent > oldPercent) {
            uint256[] memory paymentIds = studentPaymentIds[_studentAddress];
            
            for (uint256 i = 0; i < paymentIds.length; i++) {
                Payment storage payment = payments[paymentIds[i]];
                
                // Only process non-refunded payments
                if (payment.paid && !payment.refunded && payment.amountAfterRefund > 0) {
                    // Get base fee for this semester
                    uint256 baseFee = feeSchedules[payment.semester].baseAmount;
                    
                    // Calculate what they should have paid with new scholarship
                    uint256 shouldPay = baseFee - (baseFee * _percent / 100);
                    
                    // Calculate what they should have paid with old scholarship
                    uint256 paidFor = baseFee - (baseFee * oldPercent / 100);
                    
                    // Refund the difference if they overpaid
                    if (paidFor > shouldPay) {
                        uint256 refundAmount = paidFor - shouldPay;
                        
                        // Make sure we don't refund more than what's left in the payment
                        if (refundAmount > payment.amountAfterRefund) {
                            refundAmount = payment.amountAfterRefund;
                        }
                        
                        payment.amountAfterRefund -= refundAmount;
                        totalRefundAmount += refundAmount;
                        
                        emit ScholarshipRefund(_studentAddress, paymentIds[i], refundAmount, block.timestamp);
                    }
                }
            }
            
            // Send total refund to student
            if (totalRefundAmount > 0) {
                require(address(this).balance >= totalRefundAmount, "Insufficient contract balance");
                totalRefunded += totalRefundAmount;
                
                (bool success, ) = _studentAddress.call{value: totalRefundAmount}("");
                require(success, "Refund transfer failed");
            }
        }
        
        emit ScholarshipApplied(_studentAddress, _percent, totalRefundAmount);
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
     * @dev University withdraws collected tuition fees
     * @param _amount Amount to withdraw (0 = withdraw all available)
     */
    function withdrawToUniversity(uint256 _amount) external onlyOwner nonReentrant {
        uint256 availableBalance = address(this).balance;
        require(availableBalance > 0, "No funds to withdraw");
        
        uint256 withdrawAmount = _amount == 0 ? availableBalance : _amount;
        require(withdrawAmount <= availableBalance, "Insufficient balance");
        
        (bool success, ) = universityWallet.call{value: withdrawAmount}("");
        require(success, "Withdrawal failed");
        
        emit UniversityWithdrawal(universityWallet, withdrawAmount, block.timestamp);
    }
    
    /**
     * @dev Process refund for course withdrawal
     * @param _paymentId Payment ID to refund
     */
    function processRefund(uint256 _paymentId) external onlyOwner nonReentrant {
        Payment storage payment = payments[_paymentId];
        require(payment.paid, "Payment not found");
        require(!payment.refunded, "Already refunded");
        require(payment.amountAfterRefund > 0, "Nothing to refund");
        require(address(this).balance >= payment.amountAfterRefund, "Insufficient contract balance");
        
        uint256 refundAmount = payment.amountAfterRefund;
        payment.refunded = true;
        payment.amountAfterRefund = 0;
        totalRefunded += refundAmount;
        
        (bool success, ) = payment.student.call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        
        emit RefundProcessed(_paymentId, payment.student, refundAmount, block.timestamp);
    }

    /**
     * @dev Restore payment record from backup (for dev/test after Hardhat restart)
     * @notice This creates a payment record without requiring ETH transfer
     * @param _studentAddress Student's wallet address
     * @param _semester Semester identifier
     * @param _amount Original payment amount
     * @param _timestamp Original payment timestamp
     */
    function restorePayment(
        address _studentAddress,
        string memory _semester,
        uint256 _amount,
        uint256 _timestamp
    ) external onlyOwner {
        require(students[_studentAddress].isRegistered, "Student not registered");
        require(studentSemesterPayment[_studentAddress][_semester] == 0, "Payment already exists");
        
        paymentCounter++;
        
        // Calculate amount after scholarship
        uint256 scholarshipPercent = students[_studentAddress].scholarshipPercent;
        uint256 baseFee = feeSchedules[_semester].baseAmount;
        uint256 shouldPay = baseFee - (baseFee * scholarshipPercent / 100);
        uint256 amountAfterRefund = _amount > shouldPay ? shouldPay : _amount;
        
        payments[paymentCounter] = Payment({
            student: _studentAddress,
            studentId: students[_studentAddress].studentId,
            semester: _semester,
            amount: _amount,
            amountAfterRefund: amountAfterRefund,
            timestamp: _timestamp,
            paid: true,
            refunded: false
        });
        
        studentSemesterPayment[_studentAddress][_semester] = paymentCounter;
        studentPaymentIds[_studentAddress].push(paymentCounter);
        totalCollected += _amount;
        
        emit PaymentReceived(
            paymentCounter,
            _studentAddress,
            students[_studentAddress].studentId,
            _semester,
            _amount,
            _timestamp
        );
    }

    /**
     * @dev Get contract balance (available for withdrawal/refunds)
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get financial summary
     */
    function getFinancialSummary() external view returns (
        uint256 balance,
        uint256 collected,
        uint256 refunded
    ) {
        return (address(this).balance, totalCollected, totalRefunded);
    }
    
    // ============ Student Functions ============
    
    /**
     * @dev Pay tuition fee for a semester
     * @notice Payment stays in contract, university can withdraw anytime
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
            amountAfterRefund: msg.value, // Initially same as amount
            timestamp: block.timestamp,
            paid: true,
            refunded: false
        });
        
        studentSemesterPayment[msg.sender][_semester] = paymentCounter;
        studentPaymentIds[msg.sender].push(paymentCounter);
        totalCollected += msg.value;
        
        // Payment stays in contract - university can withdraw later
        
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

    /**
     * @dev Get all active semesters
     * @return Array of semester identifiers
     */
    function getActiveSemesters() external view returns (string[] memory) {
        return activeSemesters;
    }

    /**
     * @dev Get fee schedule for a semester
     * @param _semester Semester identifier
     * @return FeeSchedule struct
     */
    function getFeeSchedule(string memory _semester) external view returns (FeeSchedule memory) {
        return feeSchedules[_semester];
    }
}
