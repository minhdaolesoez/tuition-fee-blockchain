import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const DATA_API = 'http://localhost:3001/api';

// Helper to save data to server
async function saveToServer(endpoint, data) {
  try {
    await fetch(`${DATA_API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('Failed to save to data server:', err);
  }
}

export default function AdminDashboard() {
  const { account, contract, isCorrectNetwork } = useWeb3();
  const navigate = useNavigate();
  const [isOwner, setIsOwner] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [stats, setStats] = useState({ 
    students: 0, 
    payments: 0, 
    balance: '0',
    collected: '0',
    refunded: '0'
  });
  
  // Form states
  const [newScholarship, setNewScholarship] = useState({ studentId: '', percent: '' });
  const [newFee, setNewFee] = useState({ semester: '', amount: '', deadline: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch pending registration requests
  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${DATA_API}/register-requests`);
      if (response.ok) {
        const requests = await response.json();
        setPendingRequests(requests);
      }
    } catch (err) {
      console.warn('Failed to fetch pending requests:', err);
    }
  };

  // Refresh stats
  const refreshStats = async () => {
    if (!contract) return;
    try {
      const studentCount = await contract.getRegisteredStudentsCount();
      const paymentCount = await contract.paymentCounter();
      const [balance, collected, refunded] = await contract.getFinancialSummary();
      const activeSemesters = await contract.getActiveSemesters();
      
      setStats({
        students: Number(studentCount),
        payments: Number(paymentCount),
        balance: ethers.formatEther(balance),
        collected: ethers.formatEther(collected),
        refunded: ethers.formatEther(refunded),
      });
      setSemesters(activeSemesters);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  // Check if current account is owner
  useEffect(() => {
    async function checkOwner() {
      if (!contract || !account) {
        setIsChecking(false);
        return;
      }
      try {
        const owner = await contract.owner();
        const ownerCheck = owner.toLowerCase() === account.toLowerCase();
        setIsOwner(ownerCheck);
        
        if (!ownerCheck) {
          // Not owner, redirect to home
          navigate('/');
          return;
        }
        
        await refreshStats();
        await fetchPendingRequests();
      } catch (err) {
        console.error('Error checking owner:', err);
      } finally {
        setIsChecking(false);
      }
    }
    checkOwner();
  }, [contract, account, navigate]);

  // Approve registration request
  const handleApproveRequest = async (wallet, studentId) => {
    setIsProcessing(true);
    try {
      // First register on blockchain
      const tx = await contract.registerStudent(wallet, studentId);
      toast.loading('Registering student...', { id: 'approve' });
      await tx.wait();
      
      // Then update API
      await fetch(`${DATA_API}/register-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet })
      });
      
      toast.success('Registration approved!', { id: 'approve' });
      await refreshStats();
      await fetchPendingRequests();
    } catch (err) {
      toast.error(err.reason || 'Approval failed!', { id: 'approve' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject registration request
  const handleRejectRequest = async (wallet) => {
    try {
      await fetch(`${DATA_API}/register-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet })
      });
      toast.success('Registration request rejected');
      await fetchPendingRequests();
    } catch (err) {
      toast.error('Rejection failed!');
    }
  };

  // Apply scholarship (auto refunds if already paid)
  const handleApplyScholarship = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsProcessing(true);
    try {
      // Lookup wallet address from student ID
      const walletAddress = await contract.studentIdToAddress(newScholarship.studentId);
      if (walletAddress === '0x0000000000000000000000000000000000000000') {
        toast.error('Student ID not found!', { id: 'scholarship' });
        setIsProcessing(false);
        return;
      }

      const tx = await contract.applyScholarship(walletAddress, newScholarship.percent);
      toast.loading('Applying scholarship...', { id: 'scholarship' });
      const receipt = await tx.wait();
      
      // Save to JSON file
      await saveToServer('/scholarships', { studentId: newScholarship.studentId, wallet: walletAddress, percent: Number(newScholarship.percent) });
      
      // Check if there was a scholarship refund
      const scholarshipRefundEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'ScholarshipRefund';
        } catch { return false; }
      });
      
      if (scholarshipRefundEvent) {
        toast.success('Scholarship applied! Auto-refunded the difference to student.', { id: 'scholarship' });
      } else {
        toast.success('Scholarship applied successfully!', { id: 'scholarship' });
      }
      
      setNewScholarship({ studentId: '', percent: '' });
      await refreshStats();
    } catch (err) {
      toast.error(err.reason || 'Failed!', { id: 'scholarship' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Set fee schedule
  const handleSetFee = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsProcessing(true);
    try {
      const amountWei = ethers.parseEther(newFee.amount);
      const deadlineTimestamp = Math.floor(new Date(newFee.deadline).getTime() / 1000);
      
      const tx = await contract.setFeeSchedule(newFee.semester, amountWei, deadlineTimestamp);
      toast.loading('Setting up tuition fee...', { id: 'fee' });
      await tx.wait();
      
      // Save to JSON file
      await saveToServer('/fees', { 
        semester: newFee.semester, 
        amount: amountWei.toString(), 
        deadline: deadlineTimestamp 
      });
      
      toast.success('Tuition fee set successfully!', { id: 'fee' });
      setNewFee({ semester: '', amount: '', deadline: '' });
      await refreshStats();
    } catch (err) {
      toast.error(err.reason || 'Failed!', { id: 'fee' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Withdraw to university
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsProcessing(true);
    try {
      const amountWei = withdrawAmount ? ethers.parseEther(withdrawAmount) : 0n;
      const tx = await contract.withdrawToUniversity(amountWei);
      toast.loading('Withdrawing to university wallet...', { id: 'withdraw' });
      await tx.wait();
      toast.success('Withdrawal successful!', { id: 'withdraw' });
      setWithdrawAmount('');
      await refreshStats();
    } catch (err) {
      toast.error(err.reason || 'Withdrawal failed!', { id: 'withdraw' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            Please connect MetaMask wallet
          </h2>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">
            Wrong Blockchain Network
          </h2>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-500">
            Only admin can access this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-500">Manage tuition fees and withdrawals</p>
      </div>

      {/* Pending Registration Requests */}
      {pendingRequests.length > 0 && (
        <div className="card mb-8 border-2 border-amber-200">
          <div className="card-header bg-amber-50">
            <h2 className="text-lg font-bold text-amber-800 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending Registration Requests ({pendingRequests.length})
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {pendingRequests.map((req, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800">{req.studentId}</p>
                    <p className="text-sm text-gray-500 font-mono">{req.wallet}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveRequest(req.wallet, req.studentId)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.wallet)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="relative z-10">
            <p className="text-sm text-blue-100 mb-1">Total Students</p>
            <p className="text-3xl font-bold">{stats.students}</p>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="relative z-10">
            <p className="text-sm text-emerald-100 mb-1">Total Collected</p>
            <p className="text-3xl font-bold">{stats.collected} <span className="text-sm">ETH</span></p>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="stat-card bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="relative z-10">
            <p className="text-sm text-amber-100 mb-1">Contract Balance</p>
            <p className="text-3xl font-bold">{stats.balance} <span className="text-sm">ETH</span></p>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="stat-card bg-gradient-to-br from-red-500 to-rose-600 text-white">
          <div className="relative z-10">
            <p className="text-sm text-red-100 mb-1">Total Refunded</p>
            <p className="text-3xl font-bold">{stats.refunded} <span className="text-sm">ETH</span></p>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>
      </div>

      {/* Semesters List */}
      {semesters.length > 0 && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">Configured Semesters</h2>
          </div>
          <div className="card-body">
            <div className="flex flex-wrap gap-2">
              {semesters.map((sem, idx) => (
                <span key={idx} className="badge badge-primary">{sem}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Apply Scholarship */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Apply Scholarship
            </h2>
          </div>
          <div className="card-body">
            <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                If the student has already paid, the system will <strong>auto-refund</strong> the difference.
              </p>
            </div>
            <form onSubmit={handleApplyScholarship} className="space-y-4">
              <input
                type="text"
                placeholder="Student ID (e.g., SV001)"
                value={newScholarship.studentId}
                onChange={(e) => setNewScholarship({ ...newScholarship, studentId: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="number"
                placeholder="Scholarship percentage (0-100)"
                min="0"
                max="100"
                value={newScholarship.percent}
                onChange={(e) => setNewScholarship({ ...newScholarship, percent: e.target.value })}
                className="input-field"
                required
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full btn-success"
              >
                Apply
              </button>
            </form>
          </div>
        </div>

        {/* Set Fee Schedule */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Set Tuition Fee
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSetFee} className="space-y-4">
              <input
                type="text"
                placeholder="Semester (e.g., 2026-1)"
                value={newFee.semester}
                onChange={(e) => setNewFee({ ...newFee, semester: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Amount (ETH)"
                value={newFee.amount}
                onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="datetime-local"
                value={newFee.deadline}
                onChange={(e) => setNewFee({ ...newFee, deadline: e.target.value })}
                className="input-field"
                required
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
              >
                Set Up
              </button>
            </form>
          </div>
        </div>

        {/* Withdraw to University */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Withdraw to University Wallet
            </h2>
          </div>
          <div className="card-body">
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700">
                Available balance: <strong>{stats.balance} ETH</strong>
              </p>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <input
                type="text"
                placeholder="Amount (ETH) - leave empty to withdraw all"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="input-field"
              />
              <button
                type="submit"
                disabled={isProcessing || parseFloat(stats.balance) === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
              >
                Withdraw
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
