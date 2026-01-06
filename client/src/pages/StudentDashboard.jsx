import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { account, contract, isCorrectNetwork } = useWeb3();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [feeAmount, setFeeAmount] = useState(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  // Fetch semesters first
  useEffect(() => {
    async function fetchSemesters() {
      if (!contract) return;
      try {
        const activeSemesters = await contract.getActiveSemesters();
        setSemesters(activeSemesters);
        if (activeSemesters.length > 0 && !selectedSemester) {
          setSelectedSemester(activeSemesters[0]);
        }
      } catch (err) {
        console.error('Error fetching semesters:', err);
      }
    }
    fetchSemesters();
  }, [contract]);

  // Fetch student info and check registration
  useEffect(() => {
    async function fetchStudentInfo() {
      if (!contract || !account) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Check if admin first
        const owner = await contract.owner();
        if (owner.toLowerCase() === account.toLowerCase()) {
          // Admin should go to admin page
          navigate('/admin');
          return;
        }
        
        const student = await contract.getStudent(account);
        if (student.isRegistered) {
          setStudentInfo({
            studentId: student.studentId,
            scholarshipPercent: Number(student.scholarshipPercent),
          });
        } else {
          // Not registered, redirect to home for registration
          navigate('/');
          return;
        }
      } catch (err) {
        console.error('Error fetching student info:', err);
        setStudentInfo(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStudentInfo();
  }, [contract, account, navigate]);

  // Fetch fee info when semester changes
  useEffect(() => {
    async function fetchFeeInfo() {
      if (!contract || !account || !selectedSemester || !studentInfo) return;
      
      try {
        // Get fee for selected semester
        const fee = await contract.calculateFee(account, selectedSemester);
        setFeeAmount(fee);
        
        // Check if already paid
        const paid = await contract.hasStudentPaid(account, selectedSemester);
        setHasPaid(paid);
      } catch (err) {
        console.error('Error fetching fee info:', err);
        setFeeAmount(null);
        setHasPaid(false);
      }
    }
    
    fetchFeeInfo();
  }, [contract, account, selectedSemester, studentInfo]);

  // Pay tuition
  const handlePayTuition = async () => {
    if (!contract || !feeAmount) return;
    
    setIsPaying(true);
    try {
      const tx = await contract.payTuition(selectedSemester, { value: feeAmount });
      toast.loading('Processing transaction...', { id: 'payment' });
      
      const receipt = await tx.wait();
      
      // Save payment to data server for persistence
      try {
        await fetch('http://localhost:3001/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: account,
            semester: selectedSemester,
            amount: feeAmount.toString(),
            timestamp: Math.floor(Date.now() / 1000)
          })
        });
      } catch (apiErr) {
        console.warn('Could not save payment to server:', apiErr);
      }
      
      toast.success('Payment successful!', { id: 'payment' });
      setHasPaid(true);
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.reason || 'Payment failed!', { id: 'payment' });
    } finally {
      setIsPaying(false);
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
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Connect MetaMask Wallet
          </h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Please connect your wallet to view tuition information and make payments
          </p>
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
          <h2 className="text-2xl font-bold text-amber-600 mb-3">
            Wrong Blockchain Network
          </h2>
          <p className="text-gray-500">
            Please switch to Hardhat Localhost network (Chain ID: 31337)
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!studentInfo) {
    // This should not happen as we redirect in useEffect, but just in case
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Student Dashboard
        </h1>
        <p className="text-gray-500">Manage and pay tuition fees online</p>
      </div>

      {/* Student Info Card */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="text-lg font-bold text-gray-800">
            Student Information
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Student ID</p>
              <p className="text-xl font-bold text-gray-800">{studentInfo.studentId}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
              <p className="text-sm text-emerald-600 mb-1">Scholarship</p>
              <p className="text-xl font-bold text-emerald-700">
                {studentInfo.scholarshipPercent > 0 
                  ? `${studentInfo.scholarshipPercent}%` 
                  : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-bold text-gray-800">
            Pay Tuition
          </h2>
        </div>
        <div className="card-body">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            {semesters.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No semesters have been set up yet</p>
            ) : (
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="input-field"
              >
                {semesters.map((sem, idx) => (
                  <option key={idx} value={sem}>{sem}</option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
            <p className="text-sm text-blue-600 mb-2">Amount to Pay</p>
            <p className="text-4xl font-bold text-blue-700">
              {feeAmount ? `${ethers.formatEther(feeAmount)} ETH` : '--'}
            </p>
            {studentInfo.scholarshipPercent > 0 && (
              <p className="text-sm text-emerald-600 mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {studentInfo.scholarshipPercent}% scholarship applied
              </p>
            )}
          </div>

          {hasPaid ? (
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-emerald-700 font-bold text-lg">
                This semester has been paid
              </span>
            </div>
          ) : (
            <button
              onClick={handlePayTuition}
              disabled={isPaying || !feeAmount}
              className="w-full btn-primary text-lg"
            >
              {isPaying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Pay Now'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
