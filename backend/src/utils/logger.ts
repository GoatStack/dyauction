import { getDatabase } from '../config/database';
import fs from 'fs';
import path from 'path';

export interface LogEntry {
  auctionId?: any;
  userId?: any;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

// 로그 파일 경로
const LOG_FILE_PATH = path.join(__dirname, '../../logs/auction_logs.txt');

// 로그 디렉토리 생성
const logDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 데이터베이스에 로그 저장
export function logToDatabase(entry: LogEntry): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO auction_logs (auction_id, user_id, action, details, ip_address, user_agent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(
      entry.auctionId ? Number(entry.auctionId) : null,
      entry.userId ? Number(entry.userId) : null,
      entry.action,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null
    );
  } catch (error) {
    console.error('데이터베이스 로그 저장 실패:', error);
  }
}

// 텍스트 파일에 로그 저장
export function logToFile(entry: LogEntry): void {
  try {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${entry.action} | Auction: ${entry.auctionId || 'N/A'} | User: ${entry.userId || 'N/A'} | Details: ${entry.details ? JSON.stringify(entry.details) : 'N/A'}\n`;
    
    fs.appendFileSync(LOG_FILE_PATH, logLine, 'utf8');
  } catch (error) {
    console.error('파일 로그 저장 실패:', error);
  }
}

// 통합 로그 함수
export function logAuctionActivity(entry: LogEntry): void {
  // 데이터베이스와 파일에 동시 저장
  logToDatabase(entry);
  logToFile(entry);
  
  // 콘솔에도 출력 (개발용)
  console.log(`[Auction Log] ${entry.action} - Auction: ${entry.auctionId}, User: ${entry.userId}`);
}

// 로그 조회 함수
export function getAuctionLogs(auctionId?: number, limit: number = 100): any[] {
  try {
    const db = getDatabase();
    let query = `
      SELECT al.*, u.username, a.title as auction_title
      FROM auction_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN auctions a ON al.auction_id = a.id
    `;
    
    const params: any[] = [];
    if (auctionId) {
      query += ' WHERE al.auction_id = ?';
      params.push(auctionId);
    }
    
    query += ' ORDER BY al.timestamp DESC LIMIT ?';
    params.push(limit);
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('로그 조회 실패:', error);
    return [];
  }
}
