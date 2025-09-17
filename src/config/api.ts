// API 설정
export const API_CONFIG = {
  // 개발 환경에서는 실제 IP 주소 사용
  BASE_URL: __DEV__ ? 'http://192.168.0.36:3000' : 'https://your-production-domain.com',
  
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
  'http://192.168.0.36:3000', // 현재 컴퓨터 IP (우선순위 1)
  'http://40.82.159.69:3000', // 이전 IP
  'http://40.82.159.69:3000', // 이전 IP
  'http://40.82.159.69:3000',       // Android 에뮬레이터
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
  
  // 현재 IP 주소 우선 시도
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://192.168.0.36:3000/api/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('✅ 현재 IP 주소로 연결 성공');
      return 'http://192.168.0.36:3000';
    }
  } catch (error) {
    console.log('❌ 현재 IP 주소 연결 실패:', error);
  }

  // 로컬호스트 시도
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://11.182.185.87:3000/api/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('✅ 로컬호스트로 연결 성공');
      return 'http://11.182.185.87:3000';
    }
  } catch (error) {
    console.log('❌ 로컬호스트 연결 실패:', error);
  }

  // Android 에뮬레이터용 IP 시도
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('http://10.0.2.2:3000/api/health', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('✅ Android 에뮬레이터 IP로 연결 성공');
      return 'http://10.0.2.2:3000';
    }
  } catch (error) {
    console.log('❌ Android 에뮬레이터 IP 연결 실패:', error);
  }

  console.log('⚠️ 모든 IP 주소 연결 실패, 기본값 사용');
  return API_CONFIG.BASE_URL;
};