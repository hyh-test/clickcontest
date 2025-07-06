import { db } from './database.js';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.join(process.cwd(), 'clickgame.db');
const TEST_USER_ID = 'verify_user';
const TEST_USER_ADDRESS = 'busan';

try {
  /**
   * @description 기존 데이터베이스 파일이 존재하면 삭제합니다.
   */
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }

  /**
   * @description 데이터베이스를 초기화하고 테스트 사용자를 추가합니다.
   */
  db.initDatabase();
  db.addUser(TEST_USER_ID, TEST_USER_ADDRESS);
  console.log(`테스트 사용자 [${TEST_USER_ID}]가 데이터베이스에 추가되었습니다.`);
  /**
   * @description 데이터베이스 연결을 종료합니다.
   */
  db.closeDatabase();

} catch (err) {
  /**
   * @description 테스트 데이터베이스 설정 중 오류가 발생하면 오류를 기록하고 프로세스를 종료합니다.
   */
  console.error('테스트 데이터베이스 설정 중 오류 발생:', err);
  process.exit(1);
}
