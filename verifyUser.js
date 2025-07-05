import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { exit } from 'node:process';

const userIdToVerify = process.argv[2];

if (!userIdToVerify) {
  /**
   * @description 명령줄 인수로 userId가 제공되지 않으면 사용법을 출력하고 종료합니다.
   */
  console.error('사용법: node --experimental-sqlite verifyUser.js <userId>');
  exit(1);
}

let db;

try {
  const dbPath = path.join(process.cwd(), 'clickgame.db');
  /**
   * @description SQLite 데이터베이스에 연결합니다.
   */
  db = new DatabaseSync(dbPath);

  /**
   * @description 주어진 userId로 사용자를 조회합니다.
   */
  const stmt = db.prepare('SELECT userId, address FROM users WHERE userId = ?');
  const user = stmt.get(userIdToVerify);

  /**
   * @description 조회된 사용자 정보에 따라 결과를 출력합니다.
   */
  if (user) {
    console.log(`사용자 [${user.userId}]가 데이터베이스에 존재합니다. 주소: ${user.address}`);
  } else {
    console.log(`사용자 [${userIdToVerify}]는 데이터베이스에 존재하지 않습니다.`);
  }

} catch (err) {
  /**
   * @description 데이터베이스 확인 중 오류가 발생하면 오류를 기록하고 프로세스를 종료합니다.
   */
  console.error('데이터베이스 확인 중 오류 발생:', err.message);
  exit(1);
} finally {
  /**
   * @description 데이터베이스 연결을 닫습니다.
   */
  if (db) {
    db.close();
  }
}
