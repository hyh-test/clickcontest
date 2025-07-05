import http from 'node:http';
import crypto from 'node:crypto';
import { db } from './database.js';

const pendingRequests = new Map();

process.on('message', (msg) => {
  /**
   * @function process.on('message')
   * @description 마스터 프로세스로부터 메시지를 수신하여 처리합니다. 특히 우승자 결과 메시지를 받아 HTTP 응답을 보냅니다.
   * @param {object} msg - 수신된 메시지 객체
   * @param {string} msg.type - 메시지 타입 (예: 'winnerResult')
   * @param {string} msg.requestId - 요청 ID
   * @param {object} msg.winner - 우승자 정보
   */
  if (msg.type === 'winnerResult') {
    const { requestId, winner } = msg;
    const { res } = pendingRequests.get(requestId) || {};

    if (res && !res.writableEnded) {
      try {
        if (winner) {
          const winnerInfoFromDb = db.getUser(winner.userId);
          const finalWinnerResponse = {
            userId: winner.userId,
            clickCount: winner.clickCount,
            address: winnerInfoFromDb ? winnerInfoFromDb.address : null
          };
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(finalWinnerResponse));
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('게임이 아직 종료되지 않았거나 우승자가 없습니다.');
        }
      } catch (err) {
        console.error(`워커 (PID: ${process.pid})에서 우승자 처리 중 오류:`, err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('우승자 정보를 처리하는 중 서버에서 오류가 발생했습니다.');
      } finally {
        pendingRequests.delete(requestId);
      }
    }
  }
  
});

const server = http.createServer((req, res) => {
  /**
   * @function http.createServer callback
   * @description HTTP 요청을 처리하는 콜백 함수입니다. 회원가입 및 우승자 조회 요청을 처리합니다.
   * @param {http.IncomingMessage} req - HTTP 요청 객체
   * @param {http.ServerResponse} res - HTTP 응답 객체
   */
  if (req.method === 'POST' && req.url === '/signup') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { userId, address } = JSON.parse(body);
        if (!userId || !address) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('userId와 address는 필수입니다.');
        }
        if (db.userExists(userId)) {
          res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('이미 존재하는 사용자입니다.');
        }
        db.addUser(userId, address);
        res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('회원가입 성공');
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('서버 내부 오류가 발생했습니다.');
      }
    });
  } 
  else if (req.method === 'GET' && req.url === '/winner') {
    const requestId = crypto.randomUUID();
    pendingRequests.set(requestId, { req, res });
    process.send({ type: 'getWinner', requestId });
  } 
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

/**
 * @function startHttpServer
 * @description HTTP 서버를 시작하고 지정된 포트에서 요청을 수신 대기합니다. 서버가 준비되면 마스터 프로세스에 메시지를 보냅니다.
 */
export function startHttpServer() {
  const PORT = 3000;
  server.listen(PORT, () => {
    //마스터에게 HTTP 서버가 준비되었음을 알립니다.
    if (process.send) {
      process.send({ type: 'httpReady' });
    }
  });
}
