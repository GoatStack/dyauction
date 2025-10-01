import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';

async function main() {
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const db = new Database(dbPath);

  const username = process.argv[2] || 'admin2';
  const email = process.argv[3] || `${username}@dyauction.com`;
  const studentId = process.argv[4] || 'ADMIN002';
  const randomSuffix = Math.random().toString(36).slice(-6);
  const plainPassword = process.argv[5] || `Admin_${randomSuffix}`;

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ? OR student_id = ?').get(username, email, studentId) as any;
  if (existing) {
    console.log('EXISTS');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);
  db.prepare('INSERT INTO users (username, email, password, student_id, approval_status, user_type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, email, passwordHash, studentId, 'approved', 'admin');

  console.log(JSON.stringify({ username, email, studentId, password: plainPassword }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


