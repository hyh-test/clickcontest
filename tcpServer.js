// tcpServer.js (클러스터 워커용)

import net from 'node:net';
import crypto from 'node:crypto';

const pendingRequests = new Map();

// 마스터 프로세스로부터 오는 메시지를 처리
process.on('message', (msg) => {
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

export function startTcpServer() {
  const TCP_PORT = 3001;

  const server = net.createServer((socket) => {
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
    // console.log(`TCP 워커 (PID: ${process.pid})가 ${TCP_PORT} 포트에서 실행 중`);
  });
}
