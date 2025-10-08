// API 설정
export const API_CONFIG = {
  // 백엔드 서버 (올바른 주소로 수정)
  BASE_URL: __DEV__ ? 'http://40.82.159.69:65000/api' : 'https://40.82.159.69:65000/api',
  
  // API 엔드포인트
  ENDPOINTS: {
    AUCTIONS: '/auctions',
    USERS: '/users',
    AUTH: '/auth',
    ADMIN: '/admin',
  },
  
  // 타임아웃 설정
  TIMEOUT: 10000,
};

// 개발 환경에서 사용할 수 있는 IP 주소들 (실제 IP 우선)
export const DEV_IP_ADDRESSES = [
  'http://40.82.159.69:65000/api',
];

// API URL 생성 헬퍼 함수
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 자동으로 작동하는 IP 주소 찾기
export const findWorkingApiUrl = async (): Promise<string> => {
  if (!__DEV__) {
    return API_CONFIG.BASE_URL;
  }

  console.log('🔍 API 주소 자동 감지 중...');
  
  // 현재 서버 IP 우선 시도
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://40.82.159.69:65000/api/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('✅ 현재 서버 주소로 연결 성공');
      return 'http://40.82.159.69:65000/api';
    }
  } catch (error) {
    console.log('❌ 현재 서버 주소 연결 실패:', error);
  }

  // 로컬호스트(예비)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://localhost:65000/api/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('✅ 로컬호스트로 연결 성공');
      return 'http://localhost:65000/api';
    }
  } catch (error) {
    console.log('❌ 로컬호스트 연결 실패:', error);
  }

  // Android 에뮬레이터(개발 환경) 예비
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://10.0.2.2:65000/api/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('✅ Android 에뮬레이터 IP로 연결 성공');
      return 'http://10.0.2.2:65000/api';
    }
  } catch (error) {
    console.log('❌ Android 에뮬레이터 IP 연결 실패:', error);
  }

  console.log('⚠️ 모든 IP 주소 연결 실패, 기본값 사용');
  return API_CONFIG.BASE_URL;
};
