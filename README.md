# 경매 앱 (Auction App)

React Native와 Node.js를 사용한 실시간 경매 애플리케이션입니다.

## 🚀 주요 기능

### 모바일 앱 (React Native)
- **사용자 인증**: 회원가입, 로그인, 프로필 관리
- **경매 등록**: 이미지 업로드, 경매 정보 입력
- **실시간 경매**: 실시간 입찰, 경매 상태 확인
- **경매 관리**: 내 경매, 입찰 내역 관리
- **푸시 알림**: 경매 관련 알림

### 백엔드 (Node.js + Express)
- **RESTful API**: 경매, 사용자, 입찰 관리
- **실시간 통신**: WebSocket을 통한 실시간 업데이트
- **이미지 처리**: Multer를 사용한 이미지 업로드
- **데이터베이스**: SQLite 데이터베이스
- **관리자 페이지**: 웹 기반 경매 관리

## 🛠 기술 스택

### Frontend (Mobile)
- **React Native**: 크로스 플랫폼 모바일 앱
- **TypeScript**: 타입 안전성
- **React Navigation**: 네비게이션
- **React Native Paper**: UI 컴포넌트
- **AsyncStorage**: 로컬 데이터 저장
- **Expo**: 개발 및 빌드 도구

### Backend
- **Node.js**: 서버 런타임
- **Express.js**: 웹 프레임워크
- **TypeScript**: 타입 안전성
- **SQLite**: 데이터베이스
- **Multer**: 파일 업로드
- **JWT**: 인증 토큰
- **CORS**: 크로스 오리진 요청 처리

## 📁 프로젝트 구조

```
dyauction/
├── src/                    # React Native 소스 코드
│   ├── screens/            # 화면 컴포넌트
│   ├── components/         # 재사용 가능한 컴포넌트
│   ├── contexts/           # React Context
│   ├── types/              # TypeScript 타입 정의
│   ├── utils/              # 유틸리티 함수
│   └── navigation/         # 네비게이션 설정
├── backend/                # 백엔드 서버
│   ├── src/
│   │   ├── routes/         # API 라우트
│   │   ├── middleware/      # 미들웨어
│   │   ├── config/         # 설정 파일
│   │   └── utils/          # 유틸리티
│   ├── uploads/            # 업로드된 파일
│   └── admin.html          # 관리자 페이지
└── assets/                 # 앱 아이콘 및 이미지
```

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js (v16 이상)
- npm 또는 yarn
- React Native 개발 환경
- Android Studio (Android 개발용)
- Xcode (iOS 개발용, macOS만)

### 백엔드 실행

```bash
cd backend
npm install
npm run build
npm start
```

서버는 `http://localhost:65000`에서 실행됩니다.

### 모바일 앱 실행

```bash
# 의존성 설치
npm install

# Android 실행
npx react-native run-android

# iOS 실행 (macOS만)
npx react-native run-ios

# Expo 개발 서버
npx expo start
```

## 🔧 환경 설정

### 백엔드 환경 변수
`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
JWT_SECRET=your_jwt_secret
PORT=65000
NODE_ENV=development
```

### 모바일 앱 설정
`src/config/api.ts`에서 API URL을 설정하세요:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://your-server-ip:65000/api',
  // ...
};
```

## 📱 주요 화면

### 사용자 화면
- **로그인/회원가입**: 사용자 인증
- **메인 화면**: 경매 목록, 핫한 경매
- **경매 상세**: 경매 정보, 입찰 기능
- **프로필**: 사용자 정보, 내 경매 관리

### 관리자 화면
- **대시보드**: 경매 현황
- **경매 관리**: 경매 승인/거부
- **사용자 관리**: 사용자 목록

## 🔄 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 사용자 정보

### 경매
- `GET /api/auctions` - 경매 목록
- `GET /api/auctions/:id` - 경매 상세
- `POST /api/auctions` - 경매 등록
- `POST /api/auctions/:id/bid` - 입찰

### 관리자
- `GET /api/admin/auctions` - 모든 경매
- `PATCH /api/admin/auctions/:id/approve` - 경매 승인

## 🎯 주요 기능 설명

### 이미지 처리
- **업로드**: Multer를 사용한 FormData 처리
- **저장**: SQLite 데이터베이스에 BLOB 형태로 저장
- **서빙**: Express를 통한 이미지 제공
- **URL 관리**: 일관된 이미지 URL 처리

### 실시간 기능
- **입찰**: 실시간 입찰 업데이트
- **상태**: 경매 상태 변경 알림
- **카운트다운**: 경매 종료 시간 표시

### 보안
- **JWT 인증**: 토큰 기반 인증
- **CORS 설정**: 크로스 오리진 요청 허용
- **입력 검증**: 사용자 입력 데이터 검증

## 🐛 문제 해결

### 일반적인 문제
1. **포트 충돌**: 다른 포트 사용
2. **이미지 로딩 실패**: URL 설정 확인
3. **API 연결 실패**: 서버 주소 및 포트 확인

### 개발 도구
- **React Native Debugger**: 디버깅
- **Flipper**: 네트워크 및 상태 모니터링
- **Expo DevTools**: 개발 도구

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

문제가 발생하면 이슈를 생성해주세요.

---

**개발자**: 경매 앱 개발팀  
**버전**: 1.0.0  
**최종 업데이트**: 2025년 9월