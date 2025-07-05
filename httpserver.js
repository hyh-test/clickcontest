import http from "node:http";
import { db } from "./database.js";
import { getWinner } from "./gameLogic.js";

// HTTP 서버 생성
const server = http.createServer((req, res) => {
  // 회원가입 요청 처리
  if (req.method === "POST" && req.url === "/signup") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const { userId, address } = JSON.parse(body);

        if (!userId || !address) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("userId와 address는 필수입니다.");
          return;
        }

        if (db.userExists(userId)) {
          res.writeHead(409, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("이미 존재하는 사용자입니다.");
          return;
        }

        db.addUser(userId, address);
        res.writeHead(201, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("회원가입 성공");
      } catch (err) {
        if (err instanceof SyntaxError) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("JSON 형식이 잘못되었습니다.");
        } else {
          console.error("요청 처리 중 오류 발생:", err);
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("서버 내부 오류가 발생했습니다.");
        }
      }
    });
  } else if (req.method === "GET" && req.url === "/winner") {
    const winner = getWinner();
    if (winner) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(winner));
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("게임이 아직 종료되지 않았거나 우승자가 없습니다.");
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

// HTTP 서버 시작 함수를 export
export function startHttpServer() {
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`HTTP 서버 실행 중: http://localhost:${PORT}`);
  });
}
