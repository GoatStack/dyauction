import Database from 'better-sqlite3';
import path from 'path';
import { migrateDatabase } from './migrate';

let db: Database.Database | null = null;

export const initDatabase = (): Database.Database => {
  if (!db) {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    db = new Database(dbPath);
    
    // 데이터베이스 마이그레이션
    try {
      migrateDatabase();
    } catch (error) {
      console.log('마이그레이션 스킵 (이미 최신 상태)');
    }
    
    // 테이블 생성
    createTables();
    console.log('✅ SQLite 데이터베이스 초기화 완료');
  }
  
  return db;
};

const createTables = () => {
  if (!db) return;
  
  // 사용자 테이블 (학번, 승인 상태, 사용자 타입, 이미지 경로 추가)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      student_id TEXT UNIQUE NOT NULL,
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
      user_type TEXT DEFAULT 'user' CHECK(user_type IN ('admin', 'user')),
      id_card_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 경매 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      starting_price REAL NOT NULL,
      current_price REAL NOT NULL,
      seller_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      FOREIGN KEY (seller_id) REFERENCES users (id)
    )
  `);
  
  // 입찰 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER NOT NULL,
      bidder_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_id) REFERENCES auctions (id),
      FOREIGN KEY (bidder_id) REFERENCES users (id)
    )
  `);

  // 기본 관리자 계정 생성 (없는 경우에만)
  const adminExists = db.prepare('SELECT * FROM users WHERE user_type = ? OR username = ? OR email = ?').get('admin', 'admin', 'admin@dyauction.com');
  if (!adminExists) {
    // admin123 비밀번호의 해시값
    const adminPasswordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/vHhH8eG';
    db.prepare(`
      INSERT INTO users (username, email, password, student_id, approval_status, user_type) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@dyauction.com', adminPasswordHash, 'ADMIN001', 'approved', 'admin');
    console.log('✅ 기본 관리자 계정 생성 완료 (사용자명: admin, 비밀번호: admin123)');
  } else {
    console.log('ℹ️ 관리자 계정이 이미 존재합니다.');
  }
};

export const getDatabase = (): Database.Database => {
  if (!db) {
    return initDatabase();
  }
  
  // 데이터베이스 연결 상태 확인
  try {
    db.prepare('SELECT 1').get();
  } catch (error) {
    console.log('⚠️ 데이터베이스 연결 재설정 중...');
    db.close();
    db = null;
    return initDatabase();
  }
  
  return db;
};

export const closeDatabase = () => {
  if (db) {
    db.close();
    console.log('✅ SQLite 데이터베이스 연결 해제');
  }
};
