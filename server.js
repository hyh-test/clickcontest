// server.js (클러스터 안정성 강화)

import cluster from 'node:cluster';
import os from 'node:os';
import { db } from './database.js';
import { startHttpServer } from './httpserver.js';
import { startTcpServer } from './tcpserver.js';
import * as gameLogic from './gameLogic.js';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  /*********************************
   * 마스터 프로세스 (매니저) 로직
   *********************************/
  console.log(`마스터 프로세스 (PID: ${process.pid}) 실행 중`);

  try {
    db.initDatabase();
  } catch (err) {
    console.error('마스터 DB 초기화 실패:', err);
    process.exit(1);
  }

  gameLogic.startGame();
  console.log('게임이 시작되었습니다.');

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  let readyWorkers = 0;
  Object.values(cluster.workers).forEach(worker => {
    worker.on('message', (msg) => {
      switch (msg.type) {
        case 'click': {
          const clickTimestamp = process.hrtime.bigint();
          const result = gameLogic.processClick(msg.userId, clickTimestamp);
          worker.send({ type: 'clickResult', requestId: msg.requestId, success: result });
          break;
        }
        case 'getWinner': {
          const winner = gameLogic.getWinner();
          worker.send({ type: 'winnerResult', requestId: msg.requestId, winner: winner });
          break;
        }
        // ✅ 추가: 워커가 준비되었다는 메시지를 처리합니다.
        case 'httpReady': {
          readyWorkers++;
          // 첫 워커가 준비되면, 테스트를 진행하기 위한 신호를 보냅니다.
          if (readyWorkers === 1) {
            console.log("모든 서버가 성공적으로 시작되었습니다.");
          }
          break;
        }
      }
    });
  });

  // 안전한 종료(Graceful Shutdown) 로직
  let isShuttingDown = false;
  process.on('SIGINT', () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('SIGINT 신호 수신. 모든 워커를 종료합니다...');
    for (const id in cluster.workers) {
      cluster.workers[id].disconnect();
    }
  });

  cluster.on('exit', (worker, code, signal) => {
    if (isShuttingDown) {
      if (Object.keys(cluster.workers).length === 0) {
        console.log('모든 워커가 종료되었습니다. 마스터를 종료합니다.');
        db.closeDatabase();
        process.exit(0);
      }
    } else {
      console.log(`${worker.process.pid}번 워커가 비정상 종료되었습니다. 새로운 워커를 생성합니다.`);
      cluster.fork();
    }
  });

} else {
  /*********************************
   * 워커 프로세스 (요리사) 로직
   *********************************/
  try {
    db.initDatabase();
  } catch (err) {
    console.error(`워커 (PID: ${process.pid}) DB 초기화 실패:`, err);
    process.exit(1);
  }

  startHttpServer();
  startTcpServer();

  process.on('disconnect', () => {
    db.closeDatabase();
    process.exit(0);
  });
}
