// tcpServer.js (클러스터 워커용)

import net from 'node:net';
import crypto from 'node:crypto';
import { TCP_PORT } from './config.js';

const pendingRequests = new Map();

// 마스터 프로세스로부터 오는 메시지를 처리
process.on('message', (msg) => {
  /**
   * @function process.on('message')
   * @description 마스터 프로세스로부터 메시지를 수신하여 처리합니다. 특히 클릭 처리 결과를 받아 클라이언트 소켓에 응답을 보냅니다.
   * @param {object} msg - 수신된 메시지 객체
   * @param {string} msg.type - 메시지 타입 (예: 'clickResult')
   * @param {string} msg.requestId - 요청 ID
   * @param {boolean} msg.success - 클릭 처리 성공 여부
   */
  if (msg.type === 'clickResult') {
    const { requestId, success } = msg;
    const socket = pendingRequests.get(requestId);

    if (socket && !socket.destroyed) {
      const responseMessage = success ? 'OK' : 'ERROR: 클릭이 유효하지 않습니다.';
      socket.write(responseMessage);
      pendingRequests.delete(requestId);
    }
  }
});

/**
 * @function startTcpServer
 * @description TCP 서버를 시작하고 지정된 포트에서 클라이언트 연결을 수신 대기합니다.
 *              클라이언트로부터 클릭 데이터를 받아 마스터 프로세스로 전달하고, 마스터의 응답을 클라이언트에 다시 보냅니다.
 */
export function startTcpServer() {

  const server = net.createServer((socket) => {
    /**
     * @function net.createServer callback
     * @description 새로운 TCP 클라이언트 연결이 수립될 때마다 호출되는 콜백 함수입니다.
     *              클라이언트로부터 데이터를 수신하고, 오류를 처리합니다.
     * @param {net.Socket} socket - 클라이언트 소켓 객체
     */
    socket.on('data', (data) => {
      try {
        const clickData = JSON.parse(data.toString().trim());
        const { userId } = clickData;

        if (!userId) {
          socket.write('ERROR: userId가 필요합니다.');
          return;
        }

        const requestId = crypto.randomUUID();
        pendingRequests.set(requestId, socket);

        process.send({
          type: 'click',
          userId: userId,
          requestId: requestId,
        });

      } catch (err) {
        socket.write('ERROR: 잘못된 데이터 형식.');
      }
    });

    socket.on('close', () => {
      for (const [requestId, pendingSocket] of pendingRequests.entries()) {
        if (pendingSocket === socket) {
          pendingRequests.delete(requestId);
        }
      }
    });

    socket.on('error', (err) => {
      console.error(`소켓 오류:`, err.message);
    });
  });

  server.listen(TCP_PORT, () => {
    console.log(`TCP 워커 (PID: ${process.pid})가 ${TCP_PORT} 포트에서 실행 중`);
  });
}
