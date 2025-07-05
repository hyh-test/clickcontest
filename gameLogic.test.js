import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as gameLogic from './gameLogic.js';
import { db } from './database.js';

// 1. 모든 모킹(Mocking)과 훅(Hook)을 파일 최상단에 배치합니다.

// 타이머 모킹 활성화 (setTimeout이 테스트를 멈추지 않도록)
mock.timers.enable();

/**
 * @function mock.method(db, 'userExists')
 * @description `db.userExists` 함수를 모킹하여 특정 userId에 대해 `true`를 반환하도록 설정합니다.
 * @param {string} userId - 확인할 사용자 ID
 * @returns {boolean} - `userId`가 'existing_user'일 경우 `true`를 반환합니다.
 */
mock.method(db, 'userExists', (userId) => {
  return userId === 'existing_user';
});

/**
 * @function afterEach
 * @description 각 테스트가 끝난 후 게임 로직의 사용자 데이터를 초기화합니다.
 */
afterEach(() => {
  gameLogic._debugUsers().clear();
});


// 2. 모든 테스트 케이스를 중첩 없이 단순하게 나열합니다.

/**
 * @function test
 * @description 게임이 정상적으로 시작되는지 테스트합니다.
 */
test('게임이 정상적으로 시작되어야 한다', () => {
  const { gameStartTime, gameEnded } = gameLogic.startGame();
  assert.strictEqual(typeof gameStartTime, 'bigint', '게임 시작 시간은 BigInt 타입이어야 합니다.');
  assert.strictEqual(gameEnded, false, '게임은 시작 직후 종료 상태가 아니어야 합니다.');
});

/**
 * @function test
 * @description 등록된 사용자가 성공적으로 초기화되는지 테스트합니다.
 */
test('등록된 사용자는 성공적으로 초기화되어야 한다', () => {
  const result = gameLogic.initializeUser('existing_user');
  assert.strictEqual(result, true, '등록된 사용자의 초기화는 성공(true)해야 합니다.');
  
  const users = gameLogic._debugUsers();
  const user = users.get('existing_user');
  
  assert.ok(user, '사용자 정보가 맵에 추가되어야 합니다.');
  assert.strictEqual(user.disqualified, false, '초기화된 사용자는 실격 상태가 아니어야 합니다.');
});

/**
 * @function test
 * @description 등록되지 않은 사용자가 초기화에 실패하는지 테스트합니다.
 */
test('등록되지 않은 사용자는 초기화에 실패해야 한다', () => {
  const result = gameLogic.initializeUser('unregistered_user');
  assert.strictEqual(result, false, '미등록 사용자의 초기화는 실패(false)해야 합니다.');
  
  const users = gameLogic._debugUsers();
  assert.strictEqual(users.has('unregistered_user'), false, '미등록 사용자는 맵에 추가되지 않아야 합니다.');
});

/**
 * @function test
 * @description 10초 이상 무응답 시 사용자가 실격 처리되는지 테스트합니다.
 */
test('10초 이상 무응답 시 실격 처리되어야 한다', () => {
  // Arrange: 테스트 준비
  const userId = 'existing_user'; // 1. 모킹된 ID 사용
  gameLogic.initializeUser(userId);

  // 현재 시간과 11초 전 시간을 나노초(BigInt)로 정의
  const now_ns = process.hrtime.bigint();
  const elevenSecondsAgo_ns = now_ns - BigInt(11 * 1_000_000_000);

  // 사용자의 마지막 클릭 시간을 강제로 11초 전으로 설정
  const user = gameLogic._debugUsers().get(userId);
  user.lastClickTime = elevenSecondsAgo_ns;


  // Act: 실제 테스트 동작 수행
  // 11초가 지난 지금 새로운 클릭을 시도하면, 내부적으로 실격 처리가 되어야 함
  const result = gameLogic.registerClick(userId, now_ns);


  // Assert: 결과 확인
  // 2. 실격 처리로 인해 클릭은 실패(false)해야 함
  assert.strictEqual(result, false, '10초 이상 지난 후의 클릭은 false를 반환해야 합니다.');

  // 3. 사용자의 상태가 실격(disqualified: true)으로 변경되었는지 확인
  assert.strictEqual(user.disqualified, true, '10초 무응답 후 사용자는 실격 상태가 되어야 합니다.');
});

/**
 * @function test
 * @description 슬라이딩 윈도우 내 초당 클릭 제한(4회 초과) 시 사용자가 실격 처리되는지 테스트합니다.
 */
test('슬라이딩 윈도우 내 초당 클릭 제한(4회 초과) 시 실격 처리되어야 한다', () => {
  // Arrange: 테스트 준비
  const userId = 'existing_user';
  gameLogic.initializeUser(userId);

  // 1.5초 시점에 5번째 클릭을 했을 때,
  // 0.5초 ~ 1.5초 사이의 1초 윈도우 안에 5개의 클릭이 포함되는 시나리오
  const now_ns = process.hrtime.bigint();
  const clickTimestamps = [
    now_ns + 600_000_000n, // 0.6초 시점
    now_ns + 700_000_000n, // 0.7초 시점
    now_ns + 800_000_000n, // 0.8초 시점
    now_ns + 900_000_000n, // 0.9초 시점
  ];
  const disqualifyingClick = now_ns + 1_500_000_000n; // 1.5초 시점 (실격 유발)


  // Act 1: 처음 4번의 클릭은 정상 등록되어야 함
  for (const ts of clickTimestamps) {
    const result = gameLogic.registerClick(userId, ts);
    assert.strictEqual(result, true, `${ts} 시점의 클릭은 정상 등록되어야 합니다.`);
  }


  // Act 2: 5번째 클릭 시도 (실격 발생)
  const finalResult = gameLogic.registerClick(userId, disqualifyingClick);


  // Assert: 결과 확인
  assert.strictEqual(finalResult, false, '제한을 초과한 5번째 클릭은 false를 반환해야 합니다.');
  
  const user = gameLogic._debugUsers().get(userId);
  assert.strictEqual(user.disqualified, true, '초당 클릭 제한을 초과한 사용자는 실격 처리되어야 합니다.');
});



/**
 * @function test
 * @description 우승자 선정 로직이 정확히 동작하는지 테스트합니다.
 */
test('우승자 선정 로직이 정확히 동작해야 한다', () => {
  // Arrange: 테스트에 사용할 가상 사용자 데이터를 별도의 Map으로 생성
  const mockUsers = new Map();
  const now_ns = process.hrtime.bigint();
  const gameStartTime = now_ns - 60000n; // 가상의 게임 시작 시간

  // 1. 최종 우승자 (5클릭, 시간 우위)
  mockUsers.set('user_A_time_winner', {
    clicks: [gameStartTime + 1000n, gameStartTime + 2000n, gameStartTime + 3000n, gameStartTime + 4000n, gameStartTime + 5000n],
    disqualified: false,
    joinTime: gameStartTime,
  });

  // 2. 2등 (5클릭, 시간 밀림)
  mockUsers.set('user_B_click_runner_up', {
    clicks: [gameStartTime + 1100n, gameStartTime + 2100n, gameStartTime + 3100n, gameStartTime + 4100n, gameStartTime + 5100n],
    disqualified: false,
    joinTime: gameStartTime,
  });

  // 3. 실격 사례 1: 10초 무응답
  mockUsers.set('user_C_inactive_disqualified', {
    clicks: [gameStartTime + 1000n],
    lastClickTime: gameStartTime + 1000n, // 마지막 클릭이 오래됨
    disqualified: true, // 실격 상태
    joinTime: gameStartTime,
  });

  // 4. 실격 사례 2: 초당 클릭 제한 위반
  mockUsers.set('user_D_rate_limit_disqualified', {
    clicks: [gameStartTime + 100n, gameStartTime + 200n, gameStartTime + 300n, gameStartTime + 400n, gameStartTime + 500n],
    disqualified: true, // 실격 상태
    joinTime: gameStartTime,
  });


  // Action: _setGameState 함수로 게임의 모든 상태를 한 번에 설정
  gameLogic._setGameState(mockUsers, gameStartTime, true);

  const winner = gameLogic.getWinner();

  // Assert: 결과 확인
  assert.ok(winner, '우승자 객체는 null이 아니어야 합니다.');
  assert.strictEqual(winner.userId, 'user_A_time_winner', '실격자들을 제외하고, 클릭 수가 같을 경우 C가 우승해야 합니다.');
  assert.strictEqual(winner.clickCount, 5, '우승자의 클릭 수는 5여야 합니다.');
});