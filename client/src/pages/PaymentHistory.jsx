import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';

export default function PaymentHistory() {
  const { contract, isCorrectNetwork } = useWeb3();
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPayments, setTotalPayments] = useState(0);

  useEffect(() => {
    async function fetchPayments() {
      if (!contract) return;
      
      setIsLoading(true);
      try {
        const count = await contract.paymentCounter();
        setTotalPayments(Number(count));
        
        if (count > 0) {
          const history = await contract.getPaymentHistory(1, Math.min(Number(count), 50));
          setPayments(history);
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPayments();
  }, [contract]);

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('vi-VN');
  };

  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isCorrectNetwork) {
    return (
      <div className="animate-slide-up text-center py-20">
        <div className="card max-w-md mx-auto">
          <div className="card-body text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Wrong Network
            </h2>
            <p className="text-gray-500">Please connect to Hardhat localhost network</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Payment History
          </h1>
          <p className="text-gray-500">
            Track all transactions on blockchain
          </p>
        </div>
        <div className="badge badge-primary text-base px-6 py-3">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Total: {totalPayments} transactions
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Loading transaction history...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-16">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No transactions yet</h3>
            <p className="text-gray-500">Transactions will be displayed here when payments are made</p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Wallet</th>
                  <th>Semester</th>
                  <th>Amount</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={index}>
                    <td className="font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td>
                      <span className="font-semibold text-gray-900">{payment.studentId}</span>
                    </td>
                    <td>
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-600">
                        {formatAddress(payment.student)}
                      </code>
                    </td>
                    <td className="text-gray-700">
                      {payment.semester}
                    </td>
                    <td>
                      <div>
                        <span className="font-semibold text-gray-900">{ethers.formatEther(payment.amountAfterRefund || payment.amount)}</span>
                        <span className="text-gray-500 ml-1">ETH</span>
                      </div>
                      {payment.amount !== payment.amountAfterRefund && payment.amountAfterRefund && (
                        <div className="text-xs text-gray-400">
                          Original: {ethers.formatEther(payment.amount)} ETH
                        </div>
                      )}
                    </td>
                    <td className="text-gray-500 text-sm">
                      {formatDate(payment.timestamp)}
                    </td>
                    <td>
                      {payment.refunded ? (
                        <span className="badge badge-warning">
                          Refunded
                        </span>
                      ) : payment.paid ? (
                        <span className="badge badge-success">
                          Success
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Info */}
      <div className="mt-8 card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-blue-800 text-lg mb-2">
                Transparency
              </h3>
              <p className="text-blue-700">
                All transactions are recorded on blockchain and can be verified at any time.
                No bank reconciliation needed, real-time settlement, and fully auditable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
