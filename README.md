# 🏆 DY Auction App

덕영고등학교 앱개발팀에서 개발한 경매 애플리케이션입니다.

## 📱 프로젝트 개요

DY Auction App은 학생들이 안전하고 투명하게 물품을 경매할 수 있는 플랫폼입니다.

### 주요 기능
- 🔐 사용자 인증 (회원가입/로그인)
- 🏷️ 경매 등록 및 관리
- 💰 실시간 입찰 시스템
- 🔔 푸시 알림 및 이메일 알림
- 📊 개인 경매 현황 관리
- 🛡️ 관리자 승인 시스템

## 🛠️ 기술 스택

### Frontend (Mobile)
- **React Native** with Expo
- **TypeScript**
- **React Navigation**
- **React Native Paper** (UI Components)
- **AsyncStorage** (로컬 저장소)
- **React Native Push Notification** (푸시 알림)

### Backend
- **Node.js** with Express.js
- **TypeScript**
- **SQLite** (데이터베이스)
- **JWT** (인증)
- **Multer** (파일 업로드)
- **Nodemailer** (이메일 발송)
- **bcryptjs** (비밀번호 해시화)

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js (v16 이상)
- npm 또는 yarn
- Expo CLI
- Git

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/dy-auction-app.git
cd dy-auction-app
```

### 2. 프론트엔드 설정
```bash
# 의존성 설치
npm install

# Expo CLI 설치 (전역)
npm install -g @expo/cli

# 개발 서버 시작
npm start
```

### 3. 백엔드 설정
```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 환경 변수 설정

# 개발 서버 시작
npm run dev
```

## 📁 프로젝트 구조

```
dy-auction-app/
├── src/                    # React Native 소스 코드
│   ├── components/         # 재사용 가능한 컴포넌트
│   ├── navigation/         # 네비게이션 설정
│   ├── screens/           # 화면 컴포넌트
│   ├── services/          # 서비스 (푸시 알림 등)
│   ├── types/             # TypeScript 타입 정의
│   └── utils/             # 유틸리티 함수
├── backend/               # Express.js 백엔드
│   ├── src/
│   │   ├── config/        # 데이터베이스 설정
│   │   ├── controllers/   # 컨트롤러
│   │   ├── middleware/    # 미들웨어 (인증, 업로드)
│   │   ├── models/        # 데이터 모델
│   │   ├── routes/        # API 라우트
│   │   └── utils/         # 유틸리티 함수
│   └── uploads/           # 업로드된 파일
├── assets/                # 이미지, 아이콘 등
└── docs/                  # 문서
```

## 🔧 환경 변수 설정

### Backend (.env)
```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 📱 주요 화면

- **Welcome Screen**: 앱 소개 및 시작
- **Login/Signup**: 사용자 인증
- **Main Screen**: 경매 목록 및 핫한 경매
- **Auction Detail**: 경매 상세 및 입찰
- **Create Auction**: 경매 등록
- **Profile**: 사용자 프로필 및 경매 관리
- **Settings**: 앱 설정
- **Notifications**: 알림 목록

## 🔌 API 엔드포인트

### 인증
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인

### 경매
- `GET /api/auctions` - 경매 목록 조회
- `GET /api/auctions/:id` - 경매 상세 조회
- `POST /api/auctions` - 경매 등록
- `POST /api/auctions/:id/bid` - 입찰

### 사용자
- `GET /api/users/profile` - 프로필 조회
- `PUT /api/users/profile` - 프로필 수정
- `GET /api/users/auctions` - 내 경매 조회

### 관리자
- `GET /api/admin/users` - 사용자 목록
- `PUT /api/admin/auctions/:id/approve` - 경매 승인

## 🧪 테스트

```bash
# 프론트엔드 테스트
npm test

# 백엔드 테스트
cd backend
npm test
```

## 📦 빌드 및 배포

### 모바일 앱 빌드
```bash
# Android
expo build:android

# iOS
expo build:ios
```

### 백엔드 배포
```bash
cd backend
npm run build
npm start
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 👥 개발팀

**덕영고등학교 앱개발팀**

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.

## 🔄 업데이트 로그

### v1.0.0 (2024-01-XX)
- 초기 릴리스
- 기본 경매 기능 구현
- 사용자 인증 시스템
- 푸시 알림 시스템
- 관리자 기능

---

**Happy Coding! 🚀**
