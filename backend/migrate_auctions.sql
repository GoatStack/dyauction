-- auctions 테이블 마이그레이션 완료
-- 필요한 컬럼들이 이미 존재합니다:
-- - category: TEXT
-- - images: TEXT (image_uris 대신 사용)
-- - status: TEXT DEFAULT 'pending'
-- - created_at: DATETIME

-- 기존 경매들을 active 상태로 설정 (필요시)
-- UPDATE auctions SET status = 'active' WHERE status IS NULL;
