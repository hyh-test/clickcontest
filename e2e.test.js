// e2e.test.js

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

// --- 헬퍼 함수 정의 ---

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- 테스트 환경 설정 ---

let serverProcess;
const E2E_USER_ID = "e2e_user";
const DB_FILE = path.join(process.cwd(), 'clickgame.db');

before(() => {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
      console.log("E2E 테스트: 이전 DB 파일 삭제 완료.");
    }
  } catch (err) {
    console.error("DB 파일 삭제 중 오류:", err);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    console.log("E2E 테스트: 서버 프로세스 시작...");
    serverProcess = spawn("node", ["--experimental-sqlite", "server.js"]);

    let serverReady = false;
    let accumulatedStderr = ''; // 에러 출력을 누적하기 위한 변수

    // ✅ 수정: 서버 프로세스가 예기치 않게 종료되는 경우를 감지합니다.
    serverProcess.on('close', (code) => {
      if (!serverReady) { // 서버가 준비되기도 전에 종료된 경우
        console.error(`서버 프로세스가 코드로 종료됨: ${code}`);
        reject(new Error(`서버가 준비되기도 전에 예기치 않게 종료되었습니다. 코드: ${code}\n누적된 오류 로그:\n${accumulatedStderr}`));
      }
    });

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`[Server STDOUT]: ${output.trim()}`); // ✅ stdout 로그를 항상 출력하여 확인
            if (!serverReady && output.includes("모든 서버가 성공적으로 시작되었습니다.")) {
        serverReady = true;
        console.log("E2E 테스트: 서버 준비 완료 (첫 워커 응답 감지).");
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      const errorOutput = data.toString();
      accumulatedStderr += errorOutput; // 에러 로그 누적

      if (errorOutput.includes('ExperimentalWarning')) {
        console.warn(`[Server Warning]: ${errorOutput.trim()}`);
        return;
      }
      
      console.error(`[Server STDERR]: ${errorOutput.trim()}`);
      if (!serverReady) {
        // 실제 오류가 발생하면 즉시 테스트를 실패시킵니다.
        reject(new Error(`서버 시작 중 오류 발생:\n---${errorOutput.trim()}\n---`));
      }
    });
  });
});

after(() => {
  if (serverProcess) {
    serverProcess.kill("SIGINT");
    console.log("E2E 테스트: 서버 프로세스 종료.");
  }
});

// --- 메인 E2E 테스트 케이스 ---

test("전체 게임 시나리오 E2E 테스트", async (t) => {
  // 테스트 타임아웃을 90초로 넉넉하게 설정
  t.timeout = 90000;

  // 1. 회원가입
  await new Promise((resolve, reject) => {
    const signupData = JSON.stringify({ userId: E2E_USER_ID, address: "0x1234567890abcdef1234567890abcdef12345678" });
    const options = { hostname: "localhost", port: 3000, path: "/signup", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(signupData) } };
    const req = http.request(options, (res) => {
      assert.strictEqual(res.statusCode, 201, `회원가입은 성공(201)해야 합니다. 실제 코드: ${res.statusCode}`);
      console.log(`✅ 1. 회원가입 요청 완료.`);
      res.on('data', () => {});
      res.on("end", resolve);
    });
    req.on("error", reject);
    req.write(signupData);
    req.end();
  });

  // 2. 클릭 전송
  await new Promise((resolve, reject) => {
    console.log("▶️  2. TCP 클릭 전송을 시작합니다...");
    const clickCount = 10;
    let clicksSent = 0;
    const tcpClient = new net.Socket();
    tcpClient.on("error", reject);
    tcpClient.on("data", () => {});
    tcpClient.connect(3001, "localhost", () => {
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
        tcpClient.write(JSON.stringify({ userId: E2E_USER_ID }));
        clicksSent++;
      }, 300);
    });
  });

  // 3. 게임 종료 대기
  console.log("⏳ 게임이 종료될 때까지 61초 대기합니다...");
  await wait(61000);
  console.log("⏰ 61초 경과. 우승자 정보를 확인합니다.");

  // 4. 우승자 확인
  await new Promise((resolve, reject) => {
    const options = { hostname: "localhost", port: 3000, path: "/winner", method: "GET" };
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
