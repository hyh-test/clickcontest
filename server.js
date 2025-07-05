// server.js
// 애플리케이션의 메인 진입점 파일입니다.

import { db } from './database.js';                     
import { startHttpServer } from './httpserver.js';
import { startTcpServer } from './tcpserver.js';
import { startGame } from './gameLogic.js';

console.log('애플리케이션 시작 중...');

// 1. 데이터베이스 초기화
// 애플리케이션 시작 시 가장 먼저 데이터베이스를 설정합니다.
try {
  db.initDatabase(); 
} catch (err) {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
}

// 2. 게임 시작
startGame();
console.log('게임이 시작되었습니다.');

// 3. HTTP 서버 시작
startHttpServer();

// 4. TCP 서버 시작
startTcpServer();

console.log('모든 서버가 성공적으로 시작되었습니다.');

// 애플리케이션 종료 시 데이터베이스 연결을 안전하게 정리합니다。
process.on('SIGINT', () => {
  console.log('SIGINT 신호 수신. 서버 종료 중...');
  db.closeDatabase(); // ✅ 수정된 코드
  console.log('서버가 종료되었습니다.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 수신. 서버 종료 중...');
  db.closeDatabase(); // ✅ 수정된 코드
  console.log('서버가 종료되었습니다.');
  process.exit(0);
});