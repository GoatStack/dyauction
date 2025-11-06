// APP_ENV 환경변수로 분기 (LOCAL, PROD, 기본값: PROD)
const APP_ENV = process.env.APP_ENV || 'PROD';

// 환경별 설정
export const envConfig = {
  LOCAL: {
    apiBaseUrl: 'http://localhost:65000/api',
    apiTimeout: 10000,
  },
  PROD: {
    apiBaseUrl: 'http://40.82.159.69:65000/api',
    apiTimeout: 10000,
  },
} as const;

export type EnvType = keyof typeof envConfig;

// 현재 환경 설정
export const currentEnv: EnvType = (APP_ENV in envConfig ? APP_ENV : 'PROD') as EnvType;
export const config = envConfig[currentEnv];

// 환경 변수 export
export { APP_ENV };
