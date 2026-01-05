const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TuitionFeeContract", function () {
  let contract;
  let owner, universityWallet, student1, student2;
  const SEMESTER = "2024-1";
  const BASE_FEE = ethers.parseEther("1"); // 1 ETH
  
  beforeEach(async function () {
    [owner, universityWallet, student1, student2] = await ethers.getSigners();
    
    const TuitionFeeContract = await ethers.getContractFactory("TuitionFeeContract");
    contract = await TuitionFeeContract.deploy(universityWallet.address);
    await contract.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
    
    it("Should set the correct university wallet", async function () {
      expect(await contract.universityWallet()).to.equal(universityWallet.address);
    });
  });
  
  describe("Student Registration", function () {
    it("Should register a student", async function () {
      await contract.registerStudent(student1.address, "SV001");
      const student = await contract.getStudent(student1.address);
      
      expect(student.isRegistered).to.be.true;
      expect(student.studentId).to.equal("SV001");
    });
    
    it("Should not allow duplicate registration", async function () {
      await contract.registerStudent(student1.address, "SV001");
      await expect(
        contract.registerStudent(student1.address, "SV002")
      ).to.be.revertedWith("Student already registered");
    });
  });
  
  describe("Fee Schedule", function () {
    it("Should create fee schedule", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
      await contract.setFeeSchedule(SEMESTER, BASE_FEE, deadline);
      
      const schedule = await contract.feeSchedules(SEMESTER);
      expect(schedule.baseAmount).to.equal(BASE_FEE);
      expect(schedule.isActive).to.be.true;
    });
  });
  
  describe("Payment", function () {
    beforeEach(async function () {
      // Setup: register student and create fee schedule
      await contract.registerStudent(student1.address, "SV001");
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      await contract.setFeeSchedule(SEMESTER, BASE_FEE, deadline);
    });
    
    it("Should accept tuition payment", async function () {
      const initialBalance = await ethers.provider.getBalance(universityWallet.address);
      
      await contract.connect(student1).payTuition(SEMESTER, { value: BASE_FEE });
      
      const finalBalance = await ethers.provider.getBalance(universityWallet.address);
      expect(finalBalance - initialBalance).to.equal(BASE_FEE);
      
      const hasPaid = await contract.hasStudentPaid(student1.address, SEMESTER);
      expect(hasPaid).to.be.true;
    });
    
    it("Should emit PaymentReceived event", async function () {
      await expect(contract.connect(student1).payTuition(SEMESTER, { value: BASE_FEE }))
        .to.emit(contract, "PaymentReceived")
        .withArgs(
          1, // paymentId
          student1.address,
          "SV001",
          SEMESTER,
          BASE_FEE,
          (await ethers.provider.getBlock("latest")).timestamp + 1
        );
    });
    
    it("Should not allow double payment", async function () {
      await contract.connect(student1).payTuition(SEMESTER, { value: BASE_FEE });
      await expect(
        contract.connect(student1).payTuition(SEMESTER, { value: BASE_FEE })
      ).to.be.revertedWith("Already paid for this semester");
    });
  });
  
  describe("Scholarship", function () {
    beforeEach(async function () {
      await contract.registerStudent(student1.address, "SV001");
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      await contract.setFeeSchedule(SEMESTER, BASE_FEE, deadline);
    });
    
    it("Should apply scholarship discount", async function () {
      await contract.applyScholarship(student1.address, 50); // 50% scholarship
      
      const feeAfterScholarship = await contract.calculateFee(student1.address, SEMESTER);
      expect(feeAfterScholarship).to.equal(BASE_FEE / 2n);
    });
    
    it("Should accept reduced payment with scholarship", async function () {
      await contract.applyScholarship(student1.address, 50);
      const reducedFee = await contract.calculateFee(student1.address, SEMESTER);
      
      await contract.connect(student1).payTuition(SEMESTER, { value: reducedFee });
      
      const hasPaid = await contract.hasStudentPaid(student1.address, SEMESTER);
      expect(hasPaid).to.be.true;
    });
  });
  
  describe("Refund", function () {
    beforeEach(async function () {
      await contract.registerStudent(student1.address, "SV001");
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      await contract.setFeeSchedule(SEMESTER, BASE_FEE, deadline);
      await contract.connect(student1).payTuition(SEMESTER, { value: BASE_FEE });
      
      // Deposit ETH to refund pool
      await contract.depositForRefund({ value: BASE_FEE });
    });
    
    it("Should process refund", async function () {
      const initialBalance = await ethers.provider.getBalance(student1.address);
      
      await contract.processRefund(1);
      
      const finalBalance = await ethers.provider.getBalance(student1.address);
      expect(finalBalance - initialBalance).to.equal(BASE_FEE);
      
      const payment = await contract.getPayment(1);
      expect(payment.refunded).to.be.true;
    });
    
    it("Should not allow double refund", async function () {
      await contract.processRefund(1);
      await expect(contract.processRefund(1)).to.be.revertedWith("Already refunded");
    });
  });
  
  describe("Audit & Transparency", function () {
    it("Should return payment history", async function () {
      await contract.registerStudent(student1.address, "SV001");
      await contract.registerStudent(student2.address, "SV002");
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      await contract.setFeeSchedule(SEMESTER, BASE_FEE, deadline);
      
      await contract.connect(student1).payTuition(SEMESTER, { value: BASE_FEE });
      await contract.connect(student2).payTuition(SEMESTER, { value: BASE_FEE });
      
      const history = await contract.getPaymentHistory(1, 10);
      expect(history.length).to.equal(2);
      expect(history[0].studentId).to.equal("SV001");
      expect(history[1].studentId).to.equal("SV002");
    });
  });
});
