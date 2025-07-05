// tcpServer.js
// Node.js 내장 모듈인 net을 사용하여 TCP 서버를 구현합니다.
import net from 'node:net';
import { initializeUser, registerClick, _debugUsers } from './gameLogic.js';

// TCP 서버 시작 함수를 export 합니다.
export function startTcpServer() {
  const TCP_PORT = 3001; // HTTP 서버(3000)와 다른 포트 사용

  // net.createServer()를 사용하여 TCP 서버 인스턴스를 생성합니다.
  const server = net.createServer((socket) => {
    // 클라이언트가 연결될 때마다 이 콜백 함수가 실행됩니다.
    console.log(`클라이언트 연결됨: ${socket.remoteAddress}:${socket.remotePort}`);

    // 클라이언트로부터 데이터가 수신될 때
    socket.on('data', (data) => {
      const clickTimestamp = process.hrtime.bigint(); // 클릭 발생 시각을 서버에서 정확히 기록
      let responseMessage = '';

      try {
        // TCP는 스트림 기반이므로, 데이터가 여러 번에 나눠 오거나 한 번에 올 수 있습니다.
        // 여기서는 간단히 JSON 문자열로 가정하고 파싱합니다.
        const clickData = JSON.parse(data.toString().trim());
        const userId = clickData.userId;

        if (!userId) {
          responseMessage = 'ERROR: userId가 필요합니다.';
          socket.write(responseMessage);
          return;
        }

        // 사용자 초기화 (이미 초기화되었거나 실격된 경우 false 반환)
        const userInitialized = initializeUser(userId);
       if (!userInitialized && !_debugUsers().get(userId)?.disqualified) {
          // 이미 초기화되었지만 실격되지 않은 경우 (재클릭)
          // continue to registerClick
        } else if (!userInitialized) {
          // 초기화 실패 (예: 미등록 사용자 또는 이미 실격된 사용자)
          responseMessage = `ERROR: 사용자 [${userId}]는 게임에 참여할 수 없습니다.`;
          socket.write(responseMessage);
          return;
        }

        // 클릭 등록 및 게임 규칙 적용
        const clickRegistered = registerClick(userId, clickTimestamp);

        if (clickRegistered) {
          responseMessage = 'OK';
        } else {
          // 클릭이 등록되지 않은 경우 (예: 실격, 시간 초과 등)
          responseMessage = 'ERROR: 클릭이 유효하지 않습니다.';
        }

      } catch (err) {
        // JSON 파싱 오류 등
        console.error('TCP 데이터 처리 오류:', err.message);
        responseMessage = 'ERROR: 잘못된 데이터 형식.';
      }
      socket.write(responseMessage);
    });

    // 클라이언트 연결이 종료될 때
    socket.on('end', () => {
      console.log(`클라이언트 연결 종료됨: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    // 소켓 오류 발생 시
    socket.on('error', (err) => {
      console.error(`소켓 오류 발생 (${socket.remoteAddress}:${socket.remotePort}):`, err.message);
    });
  });

  // 서버가 특정 포트에서 리스닝을 시작합니다。
  server.listen(TCP_PORT, () => {
    console.log(`TCP 클릭 서버 실행 중: 포트 ${TCP_PORT}`);
  });

  // 서버 오류 발생 시
  server.on('error', (err) => {
    console.error('TCP 서버 오류 발생:', err.message);
    // 서버 오류는 심각할 수 있으므로 프로세스 종료를 고려할 수 있습니다.
    // process.exit(1);
  });
}

