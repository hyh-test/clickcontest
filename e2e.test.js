// e2e.test.js

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import fs from "node:fs"; // 파일 시스템 모듈 추가
import path from "node:path"; // 경로 모듈 추가

// --- 헬퍼 함수 정의 ---

/**
 * 지정된 시간(ms)만큼 대기하는 Promise를 반환합니다.
 * @param {number} ms - 대기할 밀리초
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- 테스트 환경 설정 ---

let serverProcess;
const E2E_USER_ID = "e2e_user"; // 테스트 전체에서 사용할 사용자 ID
const DB_FILE = path.join(process.cwd(), 'clickgame.db'); // DB 파일 경로

// 모든 테스트가 시작되기 전에 딱 한 번 실행됩니다.
before(() => {
  // 1. 이전 테스트에서 남은 DB 파일이 있다면 삭제하여 깨끗한 상태에서 시작합니다.
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
      console.log("E2E 테스트: 이전 DB 파일 삭제 완료.");
    }
  } catch (err) {
    console.error("DB 파일 삭제 중 오류:", err);
    process.exit(1); // 파일 삭제 실패 시 테스트 중단
  }

  // 2. 서버를 실행합니다.
  return new Promise((resolve, reject) => {
    serverProcess = spawn("node", ["--experimental-sqlite", "server.js"]);

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("모든 서버가 성공적으로 시작되었습니다.")) {
        console.log("E2E 테스트: 서버 준비 완료.");
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      const errorOutput = data.toString();
      if (errorOutput.includes('ExperimentalWarning')) {
        console.warn(`[Server Warning]: ${errorOutput.trim()}`);
        return;
      }
      console.error(`[Server Error]: ${errorOutput}`);
      if (errorOutput.includes('EADDRINUSE')) {
        reject(new Error("서버 시작 실패: 포트가 이미 사용 중입니다. 다른 서버 프로세스를 종료하고 다시 시도하세요."));
      } else {
        reject(new Error(`서버 시작 중 오류 발생:\n---\n${errorOutput.trim()}\n---`));
      }
    });
  });
});

// 모든 테스트가 끝난 후에 딱 한 번 실행됩니다.
after(() => {
  if (serverProcess) {
    serverProcess.kill("SIGINT");
    console.log("E2E 테스트: 서버 프로세스 종료.");
  }
});

// --- 메인 E2E 테스트 케이스 ---

test("전체 게임 시나리오 E2E 테스트", async () => {
  // 1. HTTP 클라이언트로 /signup 회원가입 요청 보내기
  await new Promise((resolve, reject) => {
    const signupData = JSON.stringify({
      userId: E2E_USER_ID,
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/signup",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(signupData),
      },
    };

    const req = http.request(options, (res) => {
      assert.strictEqual(res.statusCode, 201, `회원가입은 성공(201)해야 합니다. 실제 코드: ${res.statusCode}`);
      console.log(`✅ 1. 회원가입 요청 완료 (상태 코드: ${res.statusCode}).`);

      // ✅ 수정: 응답 데이터를 소비해야 'end' 이벤트가 확실히 발생합니다.
      res.on('data', () => {});
      res.on("end", resolve);
    });

    req.on("error", reject);
    req.write(signupData);
    req.end();
  });

  // 2. TCP 클라이언트로 여러 번의 클릭 요청 보내기
  console.log("▶️  2. TCP 클릭 전송을 시작합니다...");
  await new Promise((resolve, reject) => {
    const clickCount = 10;
    let clicksSent = 0;
    const tcpClient = new net.Socket();

    tcpClient.on("error", reject);
    tcpClient.on("data", (data) => {
      // console.log(`   [TCP Response]: ${data.toString().trim()}`);
    });

    tcpClient.connect(3001, "localhost", () => {
      console.log("   - TCP 서버에 연결됨. 300ms 간격으로 클릭을 시작합니다.");
      const intervalId = setInterval(() => {
        if (clicksSent >= clickCount) {
          clearInterval(intervalId);
          setTimeout(() => {
            tcpClient.destroy();
            console.log(`✅ 2. ${clickCount}번의 클릭 전송 완료.`);
            resolve();
          }, 500);
          return;
        }

        const clickData = JSON.stringify({ userId: E2E_USER_ID });
        tcpClient.write(clickData);
        clicksSent++;
      }, 300);
    });
  });

  // 3. 게임이 종료될 때까지 대기
  console.log("⏳ 게임이 종료될 때까지 61초 대기합니다...");
  await wait(61000);
  console.log("⏰ 61초 경과. 우승자 정보를 확인합니다.");

  // 4. HTTP 클라이언트로 /winner API를 호출하여 우승자 정보 검증하기
  await new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/winner",
      method: "GET",
    };

    const req = http.request(options, (res) => {
      assert.strictEqual(res.statusCode, 200, "우승자 API는 성공(200)해야 합니다.");
      let body = "";
      res.on("data", (chunk) => (body += chunk.toString()));
      res.on("end", () => {
        try {
          const winner = JSON.parse(body);
          console.log("🏆 수신된 우승자 정보:", winner);

          assert.strictEqual(winner.userId, E2E_USER_ID, "우승자 ID가 일치해야 합니다.");
          assert.strictEqual(winner.clickCount, 10, "우승자의 클릭 수는 10회여야 합니다.");
          
          console.log("✅ 4. 우승자 정보 검증 완료.");
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });

  console.log("🎉 E2E 테스트 완료: 모든 검증이 성공적으로 통과되었습니다.");
});
