-- 경매 로그 테이블 생성
CREATE TABLE IF NOT EXISTS auction_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER,
    user_id INTEGER,
    action TEXT NOT NULL, -- 'created', 'approved', 'rejected', 'ended', 'bid_placed', 'delayed_end', 'updated'
    details TEXT, -- JSON 형태로 상세 정보 저장
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_auction_logs_auction_id ON auction_logs(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_logs_timestamp ON auction_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_auction_logs_action ON auction_logs(action);
