// tcpServer.js
// Node.js 내장 모듈인 net을 사용하여 TCP 서버를 구현합니다.
import net from 'node:net';

// TCP 서버 시작 함수를 export 합니다.
export function startTcpServer() {
  const TCP_PORT = 3001; // HTTP 서버(3000)와 다른 포트 사용

  // net.createServer()를 사용하여 TCP 서버 인스턴스를 생성합니다.
  const server = net.createServer((socket) => {
    // 클라이언트가 연결될 때마다 이 콜백 함수가 실행됩니다.
    console.log(`클라이언트 연결됨: ${socket.remoteAddress}:${socket.remotePort}`);

    // 클라이언트로부터 데이터가 수신될 때
    socket.on('data', (data) => {
      // TCP는 스트림 기반이므로, 데이터가 여러 번에 나눠 오거나 한 번에 올 수 있습니다.
      // 여기서는 간단히 문자열로 변환하여 로그에 출력합니다.
      // 실제 구현에서는 버퍼링 및 완전한 메시지 파싱 로직이 필요합니다.
      const receivedData = data.toString().trim();
      console.log(`클라이언트로부터 데이터 수신: ${receivedData}`);

      // TODO: 받은 데이터를 gameLogic.js로 전달하여 클릭 처리 로직 구현
      // 예: gameLogic.registerClick(userId, timestamp);

      // 클라이언트에게 응답을 보낼 수 있습니다.
      // socket.write('데이터 잘 받았습니다!');
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

  // 서버가 특정 포트에서 리스닝을 시작합니다.
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
