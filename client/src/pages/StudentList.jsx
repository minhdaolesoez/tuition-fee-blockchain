import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

export default function StudentList() {
  const { contract, account, isOwner } = useWeb3();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [processingRefund, setProcessingRefund] = useState(null);
  
  // Register Student Form
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newStudentWallet, setNewStudentWallet] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (contract && isOwner) {
      loadStudents();
      loadSemesters();
    }
  }, [contract, isOwner]);

  const loadSemesters = async () => {
    try {
      const activeSemesters = await contract.getActiveSemesters();
      setSemesters(activeSemesters);
      if (activeSemesters.length > 0) {
        setSelectedSemester(activeSemesters[0]);
      }
    } catch (error) {
      console.error('Error loading semesters:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentAddresses = await contract.getAllStudents();
      
      const studentsData = await Promise.all(
        studentAddresses.map(async (address) => {
          const student = await contract.getStudent(address);
          const paymentIds = await contract.getStudentPaymentIds(address);
          
          // Get payment details for each payment
          const payments = await Promise.all(
            paymentIds.map(async (id) => {
              const payment = await contract.getPayment(id);
              return {
                id: Number(id),
                semester: payment.semester,
                amount: payment.amount,
                amountAfterRefund: payment.amountAfterRefund,
                timestamp: Number(payment.timestamp),
                paid: payment.paid,
                refunded: payment.refunded
              };
            })
          );
          
          return {
            address,
            studentId: student.studentId,
            scholarshipPercent: Number(student.scholarshipPercent),
            isRegistered: student.isRegistered,
            payments
          };
        })
      );
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setRegistering(true);
      const tx = await contract.registerStudent(newStudentWallet, newStudentId);
      toast.loading('Processing registration...', { id: 'register' });
      await tx.wait();
      toast.success('Student registered successfully!', { id: 'register' });
      setNewStudentWallet('');
      setNewStudentId('');
      setShowRegisterForm(false);
      loadStudents();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.reason || 'Failed to register student', { id: 'register' });
    } finally {
      setRegistering(false);
    }
  };

  const handleRefund = async (paymentId) => {
    if (!contract) return;

    try {
      setProcessingRefund(paymentId);
      const tx = await contract.processRefund(paymentId);
      toast.loading('Processing refund...', { id: 'refund' });
      await tx.wait();
      toast.success('Refund processed successfully!', { id: 'refund' });
      
      // Wait a bit for blockchain state to update, then reload
      setTimeout(() => {
        loadStudents();
      }, 500);
    } catch (error) {
      console.error('Refund error:', error);
      toast.error(error.reason || 'Failed to process refund', { id: 'refund' });
    } finally {
      setProcessingRefund(null);
    }
  };

  const getPaymentStatus = (student, semester) => {
    const payment = student.payments.find(p => p.semester === semester);
    if (!payment) return { status: 'unpaid', payment: null };
    if (payment.refunded) return { status: 'refunded', payment };
    if (payment.paid) return { status: 'paid', payment };
    return { status: 'unpaid', payment: null };
  };

  const filteredStudents = students.filter(student => 
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOwner) {
    return (
      <div className="max-w-6xl mx-auto animate-slide-up">
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">Only administrators can view this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Student List</h1>
        <button
          onClick={() => setShowRegisterForm(!showRegisterForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showRegisterForm ? '✕ Close' : '+ Register Student'}
        </button>
      </div>

      {/* Register Student Form */}
      {showRegisterForm && (
        <div className="card p-6 mb-6 border-2 border-blue-200 bg-blue-50/50">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Register New Student</h2>
          <form onSubmit={handleRegisterStudent} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={newStudentWallet}
                  onChange={(e) => setNewStudentWallet(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g., SV001"
                  className="input-field"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={registering}
                className="btn-primary"
              >
                {registering ? 'Registering...' : 'Register Student'}
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Student
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Student ID or wallet address..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="input-field"
            >
              <option value="">All Semesters</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-500">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Student ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Wallet Address</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Scholarship</th>
                  {selectedSemester && (
                    <>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Payment Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const { status, payment } = selectedSemester 
                    ? getPaymentStatus(student, selectedSemester)
                    : { status: null, payment: null };
                  
                  return (
                    <tr key={student.address} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{student.studentId}</td>
                      <td className="py-3 px-4 font-mono text-sm text-gray-600">
                        {student.address.slice(0, 8)}...{student.address.slice(-6)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {student.scholarshipPercent > 0 ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {student.scholarshipPercent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {selectedSemester && (
                        <>
                          <td className="py-3 px-4 text-center">
                            {status === 'paid' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                ✓ Paid
                              </span>
                            )}
                            {status === 'refunded' && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                ↩ Refunded
                              </span>
                            )}
                            {status === 'unpaid' && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                ✗ Unpaid
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {payment && payment.paid && !payment.refunded && (
                              <button
                                onClick={() => handleRefund(payment.id)}
                                disabled={processingRefund === payment.id}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                              >
                                {processingRefund === payment.id ? 'Processing...' : 'Refund'}
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
          Total: {filteredStudents.length} student(s)
        </div>
      </div>
    </div>
  );
}
