import Constants from 'expo-constants';

/**
 * 환경변수 설정 예시
 *
 * app.config.js의 extra 필드에 정의된 환경변수들을
 * expo-constants를 통해 접근할 수 있습니다.
 */

// 환경변수 타입 정의
export interface EnvConfig {
  apiBaseUrl?: string;
  apiTimeout?: string;
  // 추가 환경변수들을 여기에 정의하세요
}

// 환경변수 가져오기
export const ENV: EnvConfig = Constants.expoConfig?.extra || {};

// 사용 예시
export const API_BASE_URL = ENV.apiBaseUrl || 'http://localhost:65000/api';
export const API_TIMEOUT = parseInt(ENV.apiTimeout || '10000', 10);

// 디버그용 로그 (개발 중에만 사용)
if (__DEV__) {
  console.log('Environment Config:', {
    apiBaseUrl: API_BASE_URL,
    apiTimeout: API_TIMEOUT,
  });
}

/**
 * 사용 방법:
 *
 * import { API_BASE_URL, API_TIMEOUT } from './envConfig';
 *
 * fetch(`${API_BASE_URL}/users`, {
 *   signal: AbortSignal.timeout(API_TIMEOUT),
 * });
 */
