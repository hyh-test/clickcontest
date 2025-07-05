// database.js
// Node.js v22+ 내장 모듈인 node:sqlite를 사용합니다.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

let dbInstance; // db -> dbInstance로 이름 변경 (혼동 방지)

// 함수들을 db 객체에 담습니다.
export const db = {
  initDatabase() {
    try {
      const dbPath = path.join(process.cwd(), 'clickgame.db');
      dbInstance = new DatabaseSync(dbPath);
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS users (
          userId TEXT PRIMARY KEY,
          address TEXT NOT NULL
        );
      `);
      console.log(`데이터베이스가 성공적으로 초기화되었습니다. (${dbPath})`);
    } catch (err) {
      console.error("데이터베이스 초기화 중 심각한 오류가 발생했습니다:", err);
      process.exit(1);
    }
  },

  addUser(userId, address) {
    if (!dbInstance) {
      throw new Error("데이터베이스가 초기화되지 않았습니다. initDatabase()를 먼저 호출해야 합니다.");
    }
    const stmt = dbInstance.prepare('INSERT INTO users (userId, address) VALUES (?, ?)');
    try {
      stmt.run(userId, address);
      console.log(`사용자가 추가되었습니다: ${userId}`);
    } catch (err) {
      throw err;
    }
  },

  userExists(userId) {
    if (!dbInstance) {
      throw new Error("데이터베이스가 초기화되지 않았습니다.");
    }
    const stmt = dbInstance.prepare('SELECT 1 FROM users WHERE userId = ?');
    const result = stmt.get(userId);
    return !!result;
  },

  closeDatabase() {
    if (dbInstance) {
      dbInstance.close();
      console.log("데이터베이스 연결이 종료되었습니다.");
    }
  }
};