import Database from 'better-sqlite3';
import path from 'path';

export const migrateDatabase = () => {
  const dbPath = path.join(__dirname, '../../database.sqlite');
  const db = new Database(dbPath);
  
  try {
    console.log('🔄 데이터베이스 마이그레이션 확인 중...');
    
    // 현재 users 테이블의 스키마 확인
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasStudentId = tableInfo.some((col: any) => col.name === 'student_id');
    const hasApprovalStatus = tableInfo.some((col: any) => col.name === 'approval_status');
    const hasUserType = tableInfo.some((col: any) => col.name === 'user_type');
    
    // 이미 최신 스키마인 경우 마이그레이션 스킵
    if (hasStudentId && hasApprovalStatus && hasUserType) {
      console.log('✅ 데이터베이스가 이미 최신 상태입니다. 마이그레이션이 필요하지 않습니다.');
      return;
    }
    
    console.log('🔄 데이터베이스 마이그레이션 시작...');
    
    // 기존 테이블 백업
    try {
      db.exec('ALTER TABLE users RENAME TO users_backup');
      console.log('✅ 기존 users 테이블을 users_backup으로 백업');
    } catch (error) {
      // 백업 테이블이 이미 존재하는 경우 삭제
      db.exec('DROP TABLE IF EXISTS users_backup');
      db.exec('ALTER TABLE users RENAME TO users_backup');
      console.log('✅ 기존 users 테이블을 users_backup으로 백업 (기존 백업 테이블 정리)');
    }
    
    // 새 스키마로 테이블 생성
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        student_id TEXT UNIQUE NOT NULL,
        approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
        user_type TEXT DEFAULT 'user' CHECK(user_type IN ('admin', 'user')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 새 users 테이블 생성');
    
    // 기존 데이터 마이그레이션
    const oldUsers = db.prepare('SELECT * FROM users_backup').all();
    
    oldUsers.forEach((user: any) => {
      // 기존 사용자들을 승인된 일반 사용자로 설정
      const studentId = user.student_id || `USER${user.id}`;
      
      db.prepare(`
        INSERT INTO users (username, email, password, student_id, approval_status, user_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.username,
        user.email,
        user.password,
        studentId,
        'approved', // 기존 사용자는 승인된 것으로 간주
        'user',     // 기존 사용자는 일반 사용자로 간주
        user.created_at || new Date().toISOString()
      );
    });
    
    console.log(`✅ ${oldUsers.length}명의 사용자 데이터 마이그레이션 완료`);
    
    // 백업 테이블 삭제
    db.exec('DROP TABLE users_backup');
    console.log('✅ 백업 테이블 삭제');
    
    console.log('✅ 데이터베이스 마이그레이션 완료');
    
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    throw error;
  } finally {
    db.close();
  }
};

// 직접 실행 시 마이그레이션 수행
if (require.main === module) {
  migrateDatabase();
}
