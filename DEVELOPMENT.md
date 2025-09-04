# 🛠️ 개발자 설정 가이드

DY Auction App 개발 환경을 설정하는 상세한 가이드입니다.

## 📋 사전 요구사항

### 필수 소프트웨어
- **Node.js** (v16 이상) - [다운로드](https://nodejs.org/)
- **npm** 또는 **yarn** - Node.js와 함께 설치됨
- **Git** - [다운로드](https://git-scm.com/)
- **Expo CLI** - `npm install -g @expo/cli`

### 모바일 개발 (선택사항)
- **Android Studio** (Android 개발용)
- **Xcode** (iOS 개발용, macOS만)

## 🚀 빠른 시작

### 1. 프로젝트 클론
```bash
git clone https://github.com/YOUR_USERNAME/dy-auction-app.git
cd dy-auction-app
```

### 2. 의존성 설치
```bash
# 프론트엔드 의존성
npm install

# 백엔드 의존성
cd backend
npm install
cd ..
```

### 3. 환경 변수 설정
```bash
# 백엔드 환경 변수
cd backend
cp env.example .env
```

`.env` 파일을 편집하여 다음 값들을 설정합니다:
```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. 개발 서버 시작
```bash
# 터미널 1: 백엔드 서버
cd backend
npm run dev

# 터미널 2: 프론트엔드 서버
npm start
```

## 📱 모바일 앱 테스트

### Expo Go 사용 (권장)
1. **Expo Go 앱 설치**
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **개발 서버 연결**
   ```bash
   npm start
   ```
   - 터미널에 표시되는 QR 코드를 Expo Go로 스캔
   - 또는 같은 네트워크에서 URL 입력

### 실제 디바이스 빌드
```bash
# Android
expo run:android

# iOS (macOS에서만)
expo run:ios
```

## 🗄️ 데이터베이스 설정

### SQLite 데이터베이스
- **위치**: `backend/database.sqlite`
- **초기화**: 앱 시작 시 자동으로 테이블 생성
- **관리자 계정**: 자동으로 생성됨
  - 이메일: `wers2008wers@gmail.com`
  - 비밀번호: `!!2008rhksflwk`

### 데이터베이스 초기화 (필요시)
```bash
cd backend
sqlite3 database.sqlite < clear_database.sql
```

## 🔧 개발 도구

### VS Code 확장 프로그램 (권장)
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Prettier - Code formatter**
- **ESLint**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**

### 유용한 명령어
```bash
# 코드 포맷팅
npm run format

# 린트 검사
npm run lint

# 타입 체크
npm run type-check

# 빌드
npm run build
```

## 🌐 API 테스트

### Postman 컬렉션
API 테스트를 위한 Postman 컬렉션을 제공합니다:

1. **환경 변수 설정**
   - `base_url`: `http://localhost:3000`
   - `token`: JWT 토큰 (로그인 후 설정)

2. **주요 엔드포인트**
   - `POST /api/auth/login` - 로그인
   - `GET /api/auctions` - 경매 목록
   - `POST /api/auctions` - 경매 등록
   - `POST /api/auctions/:id/bid` - 입찰

### cURL 예시
```bash
# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 경매 목록 조회
curl -X GET http://localhost:3000/api/auctions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 디버깅

### 프론트엔드 디버깅
```bash
# React Native 디버거
npm start
# 'd' 키를 눌러 디버거 열기

# 로그 확인
# Metro bundler 터미널에서 로그 확인
```

### 백엔드 디버깅
```bash
# 상세 로그 활성화
cd backend
DEBUG=* npm run dev

# 특정 모듈 디버깅
DEBUG=app:server npm run dev
```

### 데이터베이스 디버깅
```bash
# SQLite 데이터베이스 접속
cd backend
sqlite3 database.sqlite

# 테이블 구조 확인
.schema

# 데이터 조회
SELECT * FROM users;
SELECT * FROM auctions;
SELECT * FROM bids;
```

## 📊 성능 모니터링

### 프론트엔드 성능
- **React Native Performance Monitor** 사용
- **Flipper** (Facebook의 디버깅 도구)
- **Expo Dev Tools** 내장 성능 모니터

### 백엔드 성능
- **Node.js 내장 프로파일러**
- **PM2** (프로덕션 환경)
- **New Relic** 또는 **DataDog** (선택사항)

## 🔒 보안 설정

### 개발 환경
- **환경 변수**: 민감한 정보는 `.env` 파일에 저장
- **JWT 시크릿**: 강력한 시크릿 키 사용
- **CORS**: 개발 시에는 모든 도메인 허용

### 프로덕션 환경
- **HTTPS**: SSL 인증서 적용
- **환경 변수**: 서버 환경 변수 사용
- **방화벽**: 필요한 포트만 열기
- **데이터베이스**: 접근 권한 제한

## 📦 배포 준비

### 프론트엔드 빌드
```bash
# Expo 빌드
expo build:android
expo build:ios

# 또는 EAS Build (권장)
eas build --platform android
eas build --platform ios
```

### 백엔드 빌드
```bash
cd backend
npm run build
npm start
```

## 🆘 문제 해결

### 자주 발생하는 문제

#### 1. Metro bundler 오류
```bash
# 캐시 클리어
npx expo start --clear
```

#### 2. Node modules 오류
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 3. 데이터베이스 연결 오류
```bash
# 데이터베이스 파일 권한 확인
ls -la backend/database.sqlite
```

#### 4. 이미지 업로드 오류
```bash
# 업로드 디렉토리 생성
mkdir -p backend/uploads
chmod 755 backend/uploads
```

### 로그 확인
```bash
# 프론트엔드 로그
npm start
# Metro bundler 터미널에서 로그 확인

# 백엔드 로그
cd backend
npm run dev
# 서버 터미널에서 로그 확인
```

## 📞 지원

문제가 해결되지 않는다면:
1. **GitHub Issues**에 문제를 보고해주세요
2. **개발팀에 직접 연락**해주세요
3. **문서를 다시 확인**해주세요

---

**Happy Coding! 🚀**
