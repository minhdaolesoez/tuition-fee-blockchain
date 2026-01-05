# Tuition Fee Blockchain - AI Coding Guidelines

## Project Overview
Hệ thống thanh toán học phí dựa trên blockchain, giải quyết vấn đề đối soát chậm và phí cao của phương thức truyền thống.

**Architecture**: Student (MetaMask) → React Frontend → TuitionFeeContract → University Wallet

## Tech Stack
- **Smart Contract**: Solidity 0.8.24, Hardhat, OpenZeppelin
- **Frontend**: React 18, Vite, ethers.js v6, TailwindCSS
- **Network**: Sepolia testnet (chainId: 11155111)

## Project Structure
```
├── contracts/           # Solidity smart contracts
│   └── TuitionFeeContract.sol  # Core payment logic
├── scripts/             # Deployment scripts
├── test/                # Hardhat tests
├── client/              # React frontend
│   ├── src/contexts/    # Web3Context for wallet connection
│   ├── src/pages/       # Dashboard pages
│   └── src/config/      # Contract ABI & addresses
```

## Key Commands
```bash
# Smart Contract
npm run compile          # Compile contracts
npm run test             # Run tests
npm run node             # Start local Hardhat node
npm run deploy:local     # Deploy to local node

# Frontend
cd client && npm run dev # Start React dev server
```

## Smart Contract Patterns

### Core Data Structures
```solidity
// Payment record - used for audit/transparency
struct Payment {
  address student;
  string studentId;
  string semester;
  uint256 amount;
  uint256 timestamp;
  bool paid;
  bool refunded;
}
```

### Key Functions
| Function | Access | Purpose |
|----------|--------|---------|
| `registerStudent()` | Owner | Link wallet to student ID |
| `applyScholarship()` | Owner | Set discount percentage |
| `setFeeSchedule()` | Owner | Configure semester fees |
| `payTuition()` | Student | Pay with ETH, auto-transfer to university |
| `processRefund()` | Owner | Refund for course withdrawal |

### Events for Frontend
Listen to these events for real-time updates:
- `PaymentReceived` - New payment made
- `RefundProcessed` - Refund completed
- `StudentRegistered` - New student added

## Frontend Patterns

### Web3 Context Usage
```jsx
const { account, contract, isCorrectNetwork } = useWeb3();

// Always check before contract calls
if (!contract || !isCorrectNetwork) return;
const tx = await contract.payTuition(semester, { value: fee });
```

### Error Handling
Use `react-hot-toast` for notifications. Contract errors have `.reason` property:
```jsx
toast.error(err.reason || 'Transaction failed');
```

## Testing Guidelines
- Use local Hardhat network for testing
- Test file: `test/TuitionFeeContract.test.js`
- Test coverage: registration → fee setup → payment → scholarship → refund

## Deployment Checklist
1. Update `.env` with `SEPOLIA_RPC_URL` and `PRIVATE_KEY`
2. Run `npm run deploy:sepolia`
3. Copy contract address to `client/src/config/contracts.js`
4. Update `VITE_CONTRACT_ADDRESS` in client `.env`

## Vietnamese UI Text
All user-facing text should be in Vietnamese. Key terms:
- Học phí = Tuition fee
- Học bổng = Scholarship
- Hoàn tiền = Refund
- Học kỳ = Semester
- Sinh viên = Student
