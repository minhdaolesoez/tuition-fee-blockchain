# Hệ Thống Thanh Toán Học Phí Blockchain

Hệ thống thanh toán học phí dựa trên blockchain, giải quyết vấn đề đối soát chậm và phí cao của phương thức truyền thống.

## Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Chạy project](#chạy-project)
- [Cấu hình MetaMask](#cấu-hình-metamask)
- [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
- [Cấu trúc project](#cấu-trúc-project)
- [Các lệnh hữu ích](#các-lệnh-hữu-ích)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

---

## Vấn đề giải quyết

| Phương thức cũ | Vấn đề | Giải pháp Blockchain |
|----------------|--------|---------------------|
| Ngân hàng | Chậm đối soát | Real-time settlement |
| Cổng trung gian | Phí cao | Phí gas thấp |
| Cả hai | Thiếu minh bạch | On-chain audit |

## Architecture

```
Student (MetaMask) 
    ↓
React Frontend (Fee Portal)
    ↓
TuitionFeeContract (Solidity)
    ↓
University Wallet
```

---

## Yêu cầu hệ thống

- **Node.js**: v18 trở lên
- **npm**: v9 trở lên  
- **MetaMask**: Extension trên Chrome/Firefox/Edge

---

## Cài đặt

### Bước 1: Cài đặt dependencies

```bash
# Cài đặt dependencies cho smart contract
npm install

# Cài đặt dependencies cho frontend
cd client
npm install
cd ..
```

### Bước 2: Chạy project

Chỉ cần **1 lệnh** để khởi động toàn bộ:

```bash
npm start
```

Lệnh này sẽ tự động:
1. Khởi động Hardhat node (blockchain local)
2. Deploy smart contract  
3. Khởi động frontend tại http://localhost:3000

---

## Cấu hình MetaMask

### Bước 1: Thêm mạng Hardhat Localhost

Mở MetaMask → Settings → Networks → Add Network → Add a network manually

| Trường | Giá trị |
|--------|---------|
| Network name | Hardhat Localhost |
| New RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | ETH |

### Bước 2: Import tài khoản test

Hardhat cung cấp sẵn các tài khoản test với 10000 ETH. Dưới đây là các private key:

#### Tài khoản Admin (Owner) - BẮT BUỘC
```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```
> Dùng tài khoản này để: Đăng ký sinh viên, thiết lập học phí, áp dụng học bổng, xử lý hoàn tiền.

#### Tài khoản Sinh viên 1
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

#### Tài khoản Sinh viên 2  
```
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

**Cách import vào MetaMask:**
1. Mở MetaMask → Click icon tài khoản (góc trên) → Import Account
2. Chọn "Private Key"
3. Dán private key vào → Import

> ⚠️ **CẢNH BÁO**: Đây là tài khoản TEST trên mạng local. KHÔNG BAO GIỜ dùng các private key này trên mainnet hoặc mạng thật!

---

## Hướng dẫn sử dụng

### Quy trình demo đầy đủ:

#### 1. Đăng nhập Admin
- Mở MetaMask, chọn tài khoản Admin (địa chỉ bắt đầu `0xf39F...`)
- Truy cập http://localhost:3000
- Nhấn "Kết nối MetaMask"

#### 2. Thiết lập học phí (Admin)
- Vào tab "Quản trị"
- Phần "Thiết lập học phí":
  - Học kỳ: `2024-1`
  - Số tiền: `0.1` (ETH)
  - Deadline: chọn ngày trong tương lai
- Nhấn "Thiết lập" → Xác nhận trong MetaMask

#### 3. Đăng ký sinh viên (Admin)
- Phần "Đăng ký sinh viên":
  - Địa chỉ ví: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Mã sinh viên: `SV001`
- Nhấn "Đăng ký" → Xác nhận

#### 4. Áp dụng học bổng (Admin - tuỳ chọn)
- Phần "Áp dụng học bổng":
  - Địa chỉ ví sinh viên: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Phần trăm: `20` (giảm 20% học phí)
- Nhấn "Áp dụng"

#### 5. Thanh toán học phí (Sinh viên)
- **Đổi tài khoản** trong MetaMask sang "Sinh viên 1"
- Refresh trang web (F5)
- Vào tab "Sinh viên"
- Chọn học kỳ "2024-1"
- Nhấn "Thanh toán ngay" → Xác nhận trong MetaMask

#### 6. Xem lịch sử
- Vào tab "Lịch sử" để xem tất cả giao dịch trên blockchain

---

## Cấu trúc project

```
tuition-fee-blockchain/
├── contracts/                  # Smart contracts
│   └── TuitionFeeContract.sol  # Contract chính
├── scripts/
│   ├── deploy.js               # Script deploy
│   ├── demo.js                 # Demo tự động  
│   └── start.js                # Script khởi động all-in-one
├── test/
│   └── TuitionFeeContract.test.js  # Unit tests (13 tests)
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/           # Web3 context
│   │   ├── pages/              # Các trang
│   │   └── config/             # Cấu hình contract
│   └── package.json
├── hardhat.config.js           # Cấu hình Hardhat
├── package.json
└── README.md                   # File này
```

---

## Các lệnh hữu ích

| Lệnh | Mô tả |
|------|-------|
| `npm start` | Khởi động toàn bộ (node + deploy + frontend) |
| `npm test` | Chạy unit tests |
| `npm run demo` | Demo tự động không cần MetaMask |
| `npm run node` | Chỉ chạy Hardhat node |
| `npm run deploy:local` | Chỉ deploy contract |
| `npm run client:dev` | Chỉ chạy frontend |

---

## Xử lý lỗi thường gặp

### 1. MetaMask báo "Nonce too high" hoặc giao dịch pending mãi
**Nguyên nhân**: Cache của MetaMask không khớp với blockchain mới.

**Cách fix**: 
- MetaMask → Settings → Advanced → Clear activity tab data
- Hoặc: MetaMask → 3 chấm bên cạnh account → Account details → Clear activity tab data

### 2. Không kết nối được mạng / "Could not fetch chain ID"
**Cách fix**:
- Kiểm tra terminal có hiện "Started HTTP and WebSocket JSON-RPC server" không
- Đảm bảo RPC URL là `http://127.0.0.1:8545` (không phải localhost)
- Kiểm tra Chain ID là `31337`

### 3. "Execution reverted" khi giao dịch
**Nguyên nhân có thể**:
- Dùng sai tài khoản (Admin vs Sinh viên)
- Sinh viên chưa được đăng ký
- Học phí chưa được thiết lập
- Đã thanh toán học kỳ này rồi

### 4. Port 3000 đang bận
Frontend sẽ tự động chuyển sang port 3001, 3002... Xem terminal để biết port thực tế.

### 5. Sau khi restart `npm start`, MetaMask không hoạt động
Mỗi lần restart Hardhat node, blockchain được reset. Cần:
1. Clear activity data trong MetaMask (xem mục 1)
2. Refresh trang web

---

## Smart Contract API

### Hàm cho Sinh viên
- `payTuition(semester)` - Thanh toán học phí

### Hàm cho Admin
- `registerStudent(wallet, studentId)` - Đăng ký sinh viên
- `applyScholarship(wallet, percent)` - Áp dụng học bổng (0-100%)
- `setFeeSchedule(semester, amount, deadline)` - Thiết lập học phí
- `processRefund(paymentId)` - Hoàn tiền
- `depositForRefund()` - Nạp ETH vào quỹ hoàn tiền

### Hàm View (đọc dữ liệu)
- `calculateFee(student, semester)` - Tính học phí sau học bổng
- `hasStudentPaid(student, semester)` - Kiểm tra đã đóng chưa
- `getPaymentHistory(startId, count)` - Lấy lịch sử thanh toán
- `getStudent(wallet)` - Lấy thông tin sinh viên

---

## Tech Stack

- **Smart Contract**: Solidity 0.8.24, Hardhat, OpenZeppelin
- **Frontend**: React 18, Vite, ethers.js v6, TailwindCSS
- **Network**: Hardhat localhost (Chain ID: 31337)

---

## License

MIT
