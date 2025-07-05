
// 테스트를 위해 데이터베이스를 설정하고 테스트 사용자를 추가하는 스크립트

import { db } from './database.js';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.join(process.cwd(), 'clickgame.db');
const TEST_USER_ID = 'verify_user';
const TEST_USER_ADDRESS = '0xABCDEFG';

try {
  // 이전 DB 파일이 있다면 삭제
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }

  // 데이터베이스 초기화 및 사용자 추가
  db.initDatabase();
  db.addUser(TEST_USER_ID, TEST_USER_ADDRESS);
  console.log(`테스트 사용자 [${TEST_USER_ID}]가 데이터베이스에 추가되었습니다.`);
  db.closeDatabase();

} catch (err) {
  console.error('테스트 데이터베이스 설정 중 오류 발생:', err);
  process.exit(1);
}
