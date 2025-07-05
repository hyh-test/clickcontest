import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { exit } from 'node:process';

const userIdToVerify = process.argv[2];

if (!userIdToVerify) {
  console.error('사용법: node --experimental-sqlite verifyUser.js <userId>');
  exit(1);
}

let db;

try {
  const dbPath = path.join(process.cwd(), 'clickgame.db');
  db = new DatabaseSync(dbPath);

  const stmt = db.prepare('SELECT userId, address FROM users WHERE userId = ?');
  const user = stmt.get(userIdToVerify);

  if (user) {
    console.log(`사용자 [${user.userId}]가 데이터베이스에 존재합니다. 주소: ${user.address}`);
  } else {
    console.log(`사용자 [${userIdToVerify}]는 데이터베이스에 존재하지 않습니다.`);
  }

} catch (err) {
  console.error('데이터베이스 확인 중 오류 발생:', err.message);
  exit(1);
} finally {
  if (db) {
    db.close();
  }
}
