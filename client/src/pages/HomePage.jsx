import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { account, contract, isCorrectNetwork } = useWeb3();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    async function checkAccountType() {
      if (!contract || !account) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if owner
        const owner = await contract.owner();
        if (owner.toLowerCase() === account.toLowerCase()) {
          setIsOwner(true);
          setIsLoading(false);
          // Auto redirect to admin
          navigate('/admin');
          return;
        }

        // Check if registered student
        const student = await contract.getStudent(account);
        if (student.isRegistered) {
          setIsStudent(true);
          // Auto redirect to student dashboard
          navigate('/student');
          return;
        }

        // Not registered - show registration option
        setShowRegister(true);
      } catch (err) {
        console.error('Error checking account:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccountType();
  }, [contract, account, navigate]);

  // Self-registration (requires admin approval or direct registration)
  const handleSelfRegister = async (e) => {
    e.preventDefault();
    if (!contract || !studentIdInput.trim()) return;

    setIsRegistering(true);
    try {
      // Try to register through admin API
      const response = await fetch('http://localhost:3001/api/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          studentId: studentIdInput.trim()
        })
      });

      if (response.ok) {
        toast.success('Registration request sent! Please wait for admin approval.');
        setStudentIdInput('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Request submission failed!');
      }
    } catch (err) {
      // If API not available, show message
      toast.error('Please contact admin to register in the system.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-slide-up">
          <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Tuition Payment Portal
          </h1>
          <p className="text-gray-500 text-lg mb-8">
            Blockchain-based tuition payment system
          </p>
          <p className="text-gray-400">
            Please connect MetaMask wallet to continue
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
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">
            Wrong Blockchain Network
          </h2>
          <p className="text-gray-500">
            Please switch to Hardhat Localhost network
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
          <p className="text-gray-500">Checking account...</p>
        </div>
      </div>
    );
  }

  // Show registration form for unregistered accounts
  if (showRegister) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full animate-slide-up">
          <div className="card">
            <div className="card-header text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                Account Not Registered
              </h2>
              <p className="text-gray-500 mt-2">
                Your wallet is not linked to the system
              </p>
            </div>
            <div className="card-body">
              <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Wallet Address:</strong><br/>
                  <code className="text-xs">{account}</code>
                </p>
              </div>

              <form onSubmit={handleSelfRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., SV001"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full btn-primary"
                >
                  {isRegistering ? 'Sending...' : 'Submit Registration Request'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 text-center">
                  After submitting, please wait for admin approval.<br/>
                  Contact the registrar office if you need assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
