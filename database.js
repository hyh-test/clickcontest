import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

let dbInstance;

export const db = {
  /**
   * @function initDatabase
   * @description 데이터베이스를 초기화하고, users 테이블이 없으면 생성합니다.
   */
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
    } catch (err) {
      console.error("데이터베이스 초기화 중 심각한 오류가 발생했습니다:", err);
      process.exit(1);
    }
  },

  /**
   * @function addUser
   * @description 새로운 사용자를 users 테이블에 추가합니다.
   * @param {string} userId - 사용자의 고유 ID
   * @param {string} address - 사용자의 주소
   */
  addUser(userId, address) {
    if (!dbInstance) throw new Error("데이터베이스가 초기화되지 않았습니다.");
    const stmt = dbInstance.prepare('INSERT INTO users (userId, address) VALUES (?, ?)');
    stmt.run(userId, address);
  },

  /**
   * @function userExists
   * @description 주어진 userId를 가진 사용자가 users 테이블에 존재하는지 확인합니다.
   * @param {string} userId - 확인할 사용자의 고유 ID
   * @returns {boolean} - 사용자가 존재하면 true, 그렇지 않으면 false
   */
  userExists(userId) {
    if (!dbInstance) throw new Error("데이터베이스가 초기화되지 않았습니다.");
    const stmt = dbInstance.prepare('SELECT 1 FROM users WHERE userId = ?');
    return !!stmt.get(userId);
  },

  /**
   * @function getUser
   * @description 주어진 userId를 가진 사용자의 정보를 users 테이블에서 가져옵니다.
   * @param {string} userId - 가져올 사용자의 고유 ID
   * @returns {object | undefined} - 사용자의 정보 (userId, address) 또는 사용자가 없으면 undefined
   */
  getUser(userId) {
    if (!dbInstance) throw new Error("데이터베이스가 초기화되지 않았습니다.");
    const stmt = dbInstance.prepare('SELECT userId, address FROM users WHERE userId = ?');
    return stmt.get(userId);
  },

  /**
   * @function closeDatabase
   * @description 데이터베이스 연결을 종료합니다.
   */
  closeDatabase() {
    if (dbInstance) {
      dbInstance.close();
      console.log("데이터베이스 연결이 종료되었습니다.");
    }
  }
};
