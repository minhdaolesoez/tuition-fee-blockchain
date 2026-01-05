import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { account, contract, isCorrectNetwork } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [stats, setStats] = useState({ students: 0, payments: 0 });
  
  // Form states
  const [newStudent, setNewStudent] = useState({ wallet: '', studentId: '' });
  const [newScholarship, setNewScholarship] = useState({ wallet: '', percent: '' });
  const [newFee, setNewFee] = useState({ semester: '', amount: '', deadline: '' });
  const [refundId, setRefundId] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if current account is owner
  useEffect(() => {
    async function checkOwner() {
      if (!contract || !account) return;
      try {
        const owner = await contract.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
        
        // Get stats
        const studentCount = await contract.getRegisteredStudentsCount();
        const paymentCount = await contract.paymentCounter();
        setStats({
          students: Number(studentCount),
          payments: Number(paymentCount),
        });
      } catch (err) {
        console.error('Error checking owner:', err);
      }
    }
    checkOwner();
  }, [contract, account]);

  // Register student
  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsProcessing(true);
    try {
      const tx = await contract.registerStudent(newStudent.wallet, newStudent.studentId);
      toast.loading('Đang đăng ký sinh viên...', { id: 'register' });
      await tx.wait();
      toast.success('Đăng ký sinh viên thành công!', { id: 'register' });
      setNewStudent({ wallet: '', studentId: '' });
      setStats(prev => ({ ...prev, students: prev.students + 1 }));
    } catch (err) {
      toast.error(err.reason || 'Đăng ký thất bại!', { id: 'register' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply scholarship
  const handleApplyScholarship = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsProcessing(true);
    try {
      const tx = await contract.applyScholarship(newScholarship.wallet, newScholarship.percent);
      toast.loading('Đang áp dụng học bổng...', { id: 'scholarship' });
      await tx.wait();
      toast.success('Áp dụng học bổng thành công!', { id: 'scholarship' });
      setNewScholarship({ wallet: '', percent: '' });
    } catch (err) {
      toast.error(err.reason || 'Thất bại!', { id: 'scholarship' });
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
      toast.loading('Đang thiết lập học phí...', { id: 'fee' });
      await tx.wait();
      toast.success('Thiết lập học phí thành công!', { id: 'fee' });
      setNewFee({ semester: '', amount: '', deadline: '' });
    } catch (err) {
      toast.error(err.reason || 'Thất bại!', { id: 'fee' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process refund
  const handleRefund = async (e) => {
    e.preventDefault();
    if (!contract) return;
    
    setIsProcessing(true);
    try {
      const tx = await contract.processRefund(refundId);
      toast.loading('Đang xử lý hoàn tiền...', { id: 'refund' });
      await tx.wait();
      toast.success('Hoàn tiền thành công!', { id: 'refund' });
      setRefundId('');
    } catch (err) {
      toast.error(err.reason || 'Hoan tien that bai!', { id: 'refund' });
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
            Vui lòng kết nối ví MetaMask
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
            Sai mạng blockchain
          </h2>
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
            Không có quyền truy cập
          </h2>
          <p className="text-gray-500">
            Chỉ admin mới có thể truy cập trang này
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">
          Trang Quản Trị
        </h1>
        <p className="text-gray-500">Quản lý sinh viên, học phí và hoàn tiền</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="relative z-10">
            <p className="text-sm text-blue-100 mb-1">Tổng sinh viên</p>
            <p className="text-4xl font-bold">{stats.students}</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="relative z-10">
            <p className="text-sm text-emerald-100 mb-1">Tổng giao dịch</p>
            <p className="text-4xl font-bold">{stats.payments}</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Register Student */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Đăng ký sinh viên
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleRegisterStudent} className="space-y-4">
              <input
                type="text"
                placeholder="Địa chỉ ví (0x...)"
                value={newStudent.wallet}
                onChange={(e) => setNewStudent({ ...newStudent, wallet: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Mã sinh viên (VD: SV001)"
                value={newStudent.studentId}
                onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                className="input-field"
                required
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full btn-primary"
              >
                Đăng ký
              </button>
            </form>
          </div>
        </div>

        {/* Apply Scholarship */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Áp dụng học bổng
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleApplyScholarship} className="space-y-4">
              <input
                type="text"
                placeholder="Địa chỉ ví sinh viên"
                value={newScholarship.wallet}
                onChange={(e) => setNewScholarship({ ...newScholarship, wallet: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="number"
                placeholder="Phần trăm học bổng (0-100)"
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
                Áp dụng
              </button>
            </form>
          </div>
        </div>

        {/* Set Fee Schedule */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Thiết lập học phí
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSetFee} className="space-y-4">
              <input
                type="text"
                placeholder="Học kỳ (VD: 2024-1)"
                value={newFee.semester}
                onChange={(e) => setNewFee({ ...newFee, semester: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Số tiền (ETH)"
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
                Thiết lập
              </button>
            </form>
          </div>
        </div>

        {/* Process Refund */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold text-gray-800">
              Hoàn tiền
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleRefund} className="space-y-4">
              <input
                type="number"
                placeholder="Payment ID"
                min="1"
                value={refundId}
                onChange={(e) => setRefundId(e.target.value)}
                className="input-field"
                required
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full btn-danger"
              >
                Hoàn tiền
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
