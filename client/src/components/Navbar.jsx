import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

export default function Navbar() {
  const { account, connect, disconnect, isConnecting, isCorrectNetwork, switchNetwork } = useWeb3();
  const location = useLocation();

  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-lg shadow-lg shadow-gray-200/50 sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-10">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Cổng Học Phí
            </Link>
            <div className="hidden md:flex space-x-2">
              <Link 
                to="/" 
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Trang chủ
              </Link>
              <Link 
                to="/history" 
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/history') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Lịch sử giao dịch
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {!isCorrectNetwork && account && (
              <button
                onClick={switchNetwork}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all duration-200"
              >
                Đổi mạng
              </button>
            )}
            
            {account ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-700 font-mono font-medium text-sm">
                    {formatAddress(account)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                >
                  Ngắt kết nối
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary"
              >
                {isConnecting ? 'Đang kết nối...' : 'Kết nối MetaMask'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
