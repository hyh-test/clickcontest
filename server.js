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

  /**
   * @description 마스터 프로세스에서 데이터베이스를 초기화합니다.
   */
  try {
    db.initDatabase();
  } catch (err) {
    console.error('마스터 DB 초기화 실패:', err);
    process.exit(1);
  }

  /**
   * @description 게임을 시작합니다.
   */
  gameLogic.startGame();
  console.log('게임이 시작되었습니다.');

  /**
   * @description CPU 코어 수만큼 워커 프로세스를 생성합니다.
   */
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  let readyWorkers = 0;
  /**
   * @description 각 워커로부터 메시지를 수신하고 처리합니다.
   *              - 'click': 클릭 이벤트를 처리하고 결과를 워커에게 보냅니다.
   *              - 'getWinner': 우승자 정보를 요청받아 워커에게 보냅니다.
   *              - 'httpReady': HTTP 서버가 준비되었음을 알리는 메시지를 처리합니다.
   */
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
        case 'httpReady': {
          readyWorkers++;
          if (readyWorkers === numCPUs) {
            console.log("모든 서버가 성공적으로 시작되었습니다.");
          }
          break;
        }
      }
    });
  });

  // 안전한 종료(Graceful Shutdown) 로직
  let isShuttingDown = false;
  /**
   * @description SIGINT 신호(Ctrl+C)를 수신하면 모든 워커 프로세스를 종료합니다.
   */
  process.on('SIGINT', () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('SIGINT 신호 수신. 모든 워커를 종료합니다...');
    for (const id in cluster.workers) {
      cluster.workers[id].disconnect();
    }
  });

  /**
   * @description 워커 프로세스가 종료될 때 발생하는 이벤트를 처리합니다.
   *              - 정상 종료 시 마스터 프로세스도 종료합니다.
   *              - 비정상 종료 시 새로운 워커를 생성합니다.
   */
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
  /**
   * @description 워커 프로세스에서 데이터베이스를 초기화합니다.
   */
  try {
    db.initDatabase();
  } catch (err) {
    console.error(`워커 (PID: ${process.pid}) DB 초기화 실패:`, err);
    process.exit(1);
  }

  /**
   * @description HTTP 서버를 시작합니다.
   */
  startHttpServer();
  /**
   * @description TCP 서버를 시작합니다.
   */
  startTcpServer();

  /**
   * @description 마스터 프로세스와의 연결이 끊어지면 데이터베이스를 닫고 워커 프로세스를 종료합니다.
   */
  process.on('disconnect', () => {
    db.closeDatabase();
    process.exit(0);
  });
}
