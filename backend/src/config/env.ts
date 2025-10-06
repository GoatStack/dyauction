/**
 * 환경변수 설정 파일
 */

export const config = {
  // 서버 설정
  port: process.env.PORT || 65000,
  serverUrl: process.env.SERVER_URL || process.env.EXTERNAL_URL || 'https://40.82.159.69:65000',
  
  // JWT 설정
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  
  // 데이터베이스 설정
  databasePath: process.env.DATABASE_PATH || './database.sqlite',
  
  // 이메일 설정
  email: {
    host: process.env.EMAIL_HOST || '',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  }
};

export default config;
