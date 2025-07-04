// database.js
// Node.js v22+ 내장 모듈인 node:sqlite를 사용합니다.
// 검색 결과 확인: DatabaseSync 클래스를 named import로 가져오는 것이 올바른 방법입니다.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

// 데이터베이스 인스턴스를 저장할 전역 변수
let db;

/**
 * 데이터베이스를 초기화하고 테이블을 생성하는 함수.
 * 애플리케이션 시작 시 한번만 호출되어야 합니다.
 */
export function initDatabase() {
  try {
    // 현재 프로세스가 실행되는 디렉토리에 데이터베이스 파일을 생성합니다.
    const dbPath = path.join(process.cwd(), 'clickgame.db');
    
    // new DatabaseSync()를 사용하여 데이터베이스 파일을 동기적으로 엽니다.
    // 파일이 없으면 자동으로 생성됩니다.
    db = new DatabaseSync(dbPath);

    // db.exec() : 결과값이 필요 없는 SQL(테이블 생성, 인덱스 생성 등)을 실행합니다.
    // IF NOT EXISTS 구문을 사용하여 테이블이 이미 존재하면 오류 없이 넘어갑니다.
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        address TEXT NOT NULL
      );
    `);
    
    console.log(`데이터베이스가 성공적으로 초기화되었습니다. (${dbPath})`);

  } catch (err) {
    console.error("데이터베이스 초기화 중 심각한 오류가 발생했습니다:", err);
    process.exit(1); // 초기화 실패는 심각한 문제이므로 프로세스를 종료합니다.
  }
}

/**
 * 새로운 사용자를 데이터베이스에 추가합니다.
 * @param {string} userId - 사용자의 고유 ID
 * @param {string} address - 사용자의 주소
 */
export function addUser(userId, address) {
  if (!db) {
    throw new Error("데이터베이스가 초기화되지 않았습니다. initDatabase()를 먼저 호출해야 합니다.");
  }
  
  // db.prepare() : SQL Injection 공격을 방지하기 위해 사용하는 준비된 구문입니다.
  // ?는 나중에 실제 값으로 대체될 placeholder 입니다.
  const stmt = db.prepare('INSERT INTO users (userId, address) VALUES (?, ?)');
  
  try {
    // stmt.run() : 준비된 구문을 실제 값과 함께 실행합니다.
    stmt.run(userId, address);
    console.log(`사용자가 추가되었습니다: ${userId}`);
  } catch (err) {
    // UNIQUE 제약 조건 위반(중복 ID) 등의 오류를 상위 호출자(httpserver.js)에게 전달합니다.
    throw err;
  }
}

/**
 * 주어진 userId를 가진 사용자가 존재하는지 확인합니다.
 * @param {string} userId - 확인할 사용자의 ID
 * @returns {boolean} - 사용자가 존재하면 true, 그렇지 않으면 false
 */
export function userExists(userId) {
  if (!db) {
    throw new Error("데이터베이스가 초기화되지 않았습니다.");
  }
  
  const stmt = db.prepare('SELECT 1 FROM users WHERE userId = ?');
  
  // stmt.get() : 쿼리 결과의 첫 번째 행만 가져옵니다. 결과가 없으면 undefined를 반환합니다.
  const result = stmt.get(userId);
  
  // !! 연산자를 사용하여 result 객체가 있으면 true, undefined이면 false로 변환하여 반환합니다.
  return !!result;
}

/**
 * 애플리케이션 종료 시 데이터베이스 연결을 닫습니다.
 */
export function closeDatabase() {
  if (db) {
    db.close();
    console.log("데이터베이스 연결이 종료되었습니다.");
  }
}
