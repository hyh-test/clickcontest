// tcpClient.js
// Node.js 내장 net, readline, path, sqlite 모듈을 사용하여 TCP 서버에 연결하는 클라이언트 스크립트입니다.

import net from "node:net";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { exit } from "node:process";

const TCP_SERVER_PORT = 3001;
const TCP_SERVER_HOST = "localhost";
const DB_PATH = path.join(process.cwd(), "clickgame.db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function checkUserRegistration(userId) {
  let db;
  try {
    db = new DatabaseSync(DB_PATH);
    const stmt = db.prepare("SELECT userId FROM users WHERE userId = ?");
    const user = stmt.get(userId);
    return !!user;
  } catch (err) {
    console.error("데이터베이스 확인 중 오류 발생:", err.message);
    return false; // 오류 발생 시 등록되지 않은 것으로 간주
  } finally {
    if (db) {
      db.close();
    }
  }
}

function sendClickToTcpServer(userId) {
  const client = new net.Socket();

  client.connect(TCP_SERVER_PORT, TCP_SERVER_HOST, () => {
    console.log(`서버에 연결됨: ${TCP_SERVER_HOST}:${TCP_SERVER_PORT}`);

    const clickData = JSON.stringify({
      userId: userId,
      timestamp: Date.now(), // 클라이언트 시간 (서버에서 다시 기록됨)
    });

    console.log(`클릭 데이터 전송: ${clickData}`);
    client.write(clickData);
  });

  client.on("data", (data) => {
    const response = data.toString().trim();
    console.log(`서버 응답: ${response}`);

    // 서버 응답에 따라 추가적인 메시지 출력 (예: 이미 참여했거나 실격된 경우)
    if (
      response.includes("ERROR: 사용자") &&
      response.includes("게임에 참여할 수 없습니다.")
    ) {
      console.log("-> 이 사용자는 이미 게임에 참여했거나 실격 처리되었습니다.");
    }

    client.destroy(); // 응답을 받으면 연결 종료
  });

  client.on("close", () => {
    console.log("서버 연결 종료됨.");
  });

  client.on("error", (err) => {
    console.error("클라이언트 오류 발생:", err.message);
  });
}

async function main() {
  rl.question("클릭할 사용자 ID를 입력하세요: ", async (userId) => {
    if (!userId) {
      console.log("사용자 ID를 입력해야 합니다.");
      rl.close();
      exit(1);
    }

    const isRegistered = await checkUserRegistration(userId);

    if (isRegistered) {
      console.log(
        `사용자 [${userId}]는 회원가입되어 있습니다. 클릭을 시작합니다.`
      );
      sendClickToTcpServer(userId);
    } else {
      console.log(
        `사용자 [${userId}]는 데이터베이스에 존재하지 않습니다. 회원가입이 필요합니다.`
      );
      console.log(`HTTP 서버의 /signup 경로를 이용해주세요.`);
      exit(0);
    }
    rl.close();
  });
}

main();
