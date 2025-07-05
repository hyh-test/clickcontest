import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

let dbInstance;

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
    } catch (err) {
      console.error("데이터베이스 초기화 중 심각한 오류가 발생했습니다:", err);
      process.exit(1);
    }
  },

  addUser(userId, address) {
    if (!dbInstance) throw new Error("데이터베이스가 초기화되지 않았습니다.");
    const stmt = dbInstance.prepare('INSERT INTO users (userId, address) VALUES (?, ?)');
    stmt.run(userId, address);
  },

  userExists(userId) {
    if (!dbInstance) throw new Error("데이터베이스가 초기화되지 않았습니다.");
    const stmt = dbInstance.prepare('SELECT 1 FROM users WHERE userId = ?');
    return !!stmt.get(userId);
  },

  getUser(userId) {
    if (!dbInstance) throw new Error("데이터베이스가 초기화되지 않았습니다.");
    const stmt = dbInstance.prepare('SELECT userId, address FROM users WHERE userId = ?');
    return stmt.get(userId);
  },

  closeDatabase() {
    if (dbInstance) {
      dbInstance.close();
      console.log("데이터베이스 연결이 종료되었습니다.");
    }
  }
};
