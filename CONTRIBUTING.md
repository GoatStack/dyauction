# 🤝 기여 가이드

DY Auction App 프로젝트에 기여해주셔서 감사합니다!

## 📋 개발 환경 설정

### 1. 저장소 포크 및 클론
```bash
# 1. GitHub에서 저장소를 포크합니다
# 2. 포크한 저장소를 클론합니다
git clone https://github.com/YOUR_USERNAME/dy-auction-app.git
cd dy-auction-app

# 3. 원본 저장소를 upstream으로 추가합니다
git remote add upstream https://github.com/ORIGINAL_OWNER/dy-auction-app.git
```

### 2. 개발 환경 설정
```bash
# 프론트엔드 의존성 설치
npm install

# 백엔드 의존성 설치
cd backend
npm install
cd ..

# Expo CLI 설치 (전역)
npm install -g @expo/cli
```

### 3. 환경 변수 설정
```bash
# 백엔드 환경 변수 설정
cd backend
cp env.example .env
# .env 파일을 편집하여 필요한 값들을 설정합니다
```

## 🔄 개발 워크플로우

### 1. 브랜치 생성
```bash
# 최신 코드로 업데이트
git checkout main
git pull upstream main

# 새로운 기능 브랜치 생성
git checkout -b feature/새로운-기능-이름
# 또는
git checkout -b fix/버그-수정-이름
```

### 2. 개발 및 테스트
```bash
# 프론트엔드 개발 서버 시작
npm start

# 백엔드 개발 서버 시작 (새 터미널)
cd backend
npm run dev
```

### 3. 커밋 및 푸시
```bash
# 변경사항 스테이징
git add .

# 의미있는 커밋 메시지로 커밋
git commit -m "feat: 새로운 기능 추가"
# 또는
git commit -m "fix: 버그 수정"
# 또는
git commit -m "docs: 문서 업데이트"

# 브랜치에 푸시
git push origin feature/새로운-기능-이름
```

### 4. Pull Request 생성
1. GitHub에서 Pull Request를 생성합니다
2. 변경사항을 자세히 설명합니다
3. 관련 이슈가 있다면 링크합니다

## 📝 코딩 컨벤션

### TypeScript/JavaScript
- **함수명**: camelCase (`getUserInfo`)
- **변수명**: camelCase (`userName`)
- **상수명**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **컴포넌트명**: PascalCase (`UserProfile`)

### React Native
- **파일명**: PascalCase (`UserProfile.tsx`)
- **스타일 객체**: camelCase (`containerStyle`)
- **Props 인터페이스**: `ComponentNameProps` (`UserProfileProps`)

### 백엔드 (Express.js)
- **라우트 파일**: kebab-case (`user-routes.ts`)
- **함수명**: camelCase (`getUserById`)
- **API 엔드포인트**: kebab-case (`/api/user-profile`)

## 🧪 테스트

### 프론트엔드 테스트
```bash
# 단위 테스트 실행
npm test

# E2E 테스트 (필요시)
npm run test:e2e
```

### 백엔드 테스트
```bash
cd backend
npm test
```

## 📱 모바일 앱 테스트

### Expo 개발 빌드
```bash
# Android
expo run:android

# iOS (macOS에서만)
expo run:ios
```

### 실제 디바이스 테스트
```bash
# Expo Go 앱 사용
expo start
# QR 코드를 스캔하여 실제 디바이스에서 테스트
```

## 🐛 버그 리포트

버그를 발견하셨다면 다음 정보를 포함하여 이슈를 생성해주세요:

1. **버그 설명**: 무엇이 잘못되었는지
2. **재현 단계**: 버그를 재현하는 방법
3. **예상 동작**: 어떻게 동작해야 하는지
4. **실제 동작**: 실제로 어떻게 동작하는지
5. **스크린샷**: 가능하다면 스크린샷 첨부
6. **환경 정보**: 
   - OS (iOS/Android)
   - 앱 버전
   - 디바이스 모델

## ✨ 기능 요청

새로운 기능을 제안하고 싶으시다면:

1. **기능 설명**: 어떤 기능을 원하는지
2. **사용 사례**: 언제, 왜 필요한지
3. **예상 동작**: 어떻게 동작해야 하는지
4. **대안**: 다른 해결책이 있는지

## 📚 문서화

### 코드 주석
```typescript
/**
 * 사용자 정보를 가져옵니다
 * @param userId - 사용자 ID
 * @returns 사용자 정보 객체
 */
async function getUserInfo(userId: number): Promise<User> {
  // 구현
}
```

### README 업데이트
새로운 기능이나 변경사항이 있다면 README.md를 업데이트해주세요.

## 🔒 보안

보안 관련 이슈를 발견하셨다면:
1. **공개 이슈로 생성하지 마세요**
2. **개발팀에 직접 연락해주세요**
3. **자세한 정보를 제공해주세요**

## 📞 문의

개발 과정에서 궁금한 점이 있으시면:
- **이슈 생성**: GitHub Issues 사용
- **토론**: GitHub Discussions 사용
- **이메일**: 개발팀 이메일로 연락

## 🎉 감사합니다!

프로젝트에 기여해주셔서 정말 감사합니다. 
함께 더 나은 경매 앱을 만들어봅시다! 🚀
