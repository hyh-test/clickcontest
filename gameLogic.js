import { db } from './database.js'; // 사용자 존재 여부 확인을 위해 database 모듈 import

// 게임 관련 상수 (나노초 단위로 변환)
const CLICK_TIME_LIMIT_NS = BigInt(60 * 1000) * BigInt(1_000_000); // 1분 (나노초)
const INACTIVE_LIMIT_NS = BigInt(10 * 1000) * BigInt(1_000_000); // 10초 무응답 실격 (나노초)
const MAX_CLICKS_PER_SECOND = 4; // 슬라이딩 윈도우 1초 내 4회 초과 시 실격
const ONE_SECOND_NS = BigInt(1_000_000_000); // 1초 (나노초)

// 게임 상태 및 사용자 데이터 (클러스터 모드에서는 마스터 프로세스에서 관리될 예정)
// 현재는 단일 프로세스 기준으로 작성하며, 나중에 클러스터 IPC를 통해 동기화 로직 추가
const users = new Map(); // userId -> { clicks: bigint[], disqualified: boolean, joinTime: bigint, lastClickTime: bigint }
let gameStartTime = null; // BigInt (나노초)
let gameEnded = false;

/**
 * 게임을 시작하고 타이머를 설정합니다.
 * @returns {object} 현재 게임 상태 (gameStartTime, gameEnded)
 */
export function startGame() {
  gameStartTime = process.hrtime.bigint(); // 현재 시각을 나노초로 저장
  gameEnded = false;          // 게임 상태 초기화

  // 게임 종료 타이머 설정
  setTimeout(() => {
  gameEnded = true;
  console.log('게임 종료!');

  const winner = getWinner(); // 우승자 선정 함수 호출
  if (winner) {
    console.log('🏆 최종 우승자:', winner);
  } else {
    console.log('우승자가 없습니다.');
  }
}, Number(CLICK_TIME_LIMIT_NS / BigInt(1_000_000)));

  return { gameStartTime, gameEnded };
}

/**
 * 사용자를 게임에 초기화합니다. (회원가입 여부 확인 포함)
 * @param {string} userId - 사용자 ID
 * @returns {boolean} 초기화 성공 여부 (이미 등록되었거나 실격된 경우 false)
 */
export function initializeUser(userId) {
  // 이미 등록된 사용자이거나 실격된 사용자는 재초기화하지 않습니다.
  if (users.has(userId) && (users.get(userId).disqualified || users.get(userId).joinTime !== undefined)) {
    return false;
  }

  // 데이터베이스에 등록된 유저인지 확인
   if (!db.userExists(userId)) { 
    console.log(`[${userId}]는 등록되지 않은 사용자입니다. 게임에 참여할 수 없습니다.`);
    return false;
  }

  users.set(userId, {
    clicks: [],
    disqualified: false,
    joinTime: process.hrtime.bigint(), // 참여 시간 기록 (나노초)
    lastClickTime: process.hrtime.bigint(), // 마지막 클릭 시간 기록 (나노초)
  });
  console.log(`사용자 [${userId}] 게임에 초기화됨.`);
  return true;
}

/**
 * 사용자의 클릭을 등록하고 게임 규칙을 적용합니다.
 * @param {string} userId - 사용자 ID
 * @param {bigint} timestamp - 클릭 발생 시각 (나노초, process.hrtime.bigint() 값)
 * @returns {boolean} 클릭 등록 성공 여부 (실격 또는 유효하지 않은 클릭인 경우 false)
 */
export function registerClick(userId, timestamp) {
  const user = users.get(userId);

  // 1. 유효하지 않은 상황은 즉시 리턴
  // 유저가 초기화되지 않았거나 이미 실격된 경우
  if (!user || user.disqualified) {
    // console.log(`[${userId}] 클릭 무시: 유저 없음 또는 실격됨.`);
    return false;
  }
  // 게임이 종료된 경우
  if (gameEnded) {
    // console.log(`[${userId}] 클릭 무시: 게임 종료됨.`);
    return false;
  }
  // 게임 시작 전 클릭이거나, 1분 시간 제한을 초과한 클릭
  if (gameStartTime === null || timestamp < gameStartTime || (timestamp - gameStartTime) >= CLICK_TIME_LIMIT_NS) {
    // console.log(`[${userId}] 클릭 무시: 시간 범위 벗어남.`);
    return false;
  }

  // 2. 10초 무응답 실격 체크
  if ((timestamp - user.lastClickTime) >= INACTIVE_LIMIT_NS) {
    user.disqualified = true; // 10초 이상 무응답 → 실격
    console.log(`[${userId}] 실격 처리됨: 10초 이상 무응답.`);
    return false;
  }

  // 3. 정상 클릭 기록
  user.lastClickTime = timestamp; // 마지막 클릭 시간 갱신
  user.clicks.push(timestamp);    // 클릭 시간 기록

  // 4. 슬라이딩 윈도우 부정 클릭 감지 (1초 내 4회 초과 → 실격)
  // 현재 클릭 시점으로부터 1초 전 (포함)까지의 클릭만 필터링
  const recentWindowStart = timestamp - ONE_SECOND_NS;
  const recentClicks = user.clicks.filter(t => t >= recentWindowStart);


  if (recentClicks.length > MAX_CLICKS_PER_SECOND) {
    user.disqualified = true; // 초당 최대 클릭 초과 → 실격
    console.log(`[${userId}] 실격 처리됨: 초당 클릭 제한 초과 (${recentClicks.length}회).`);
    return false;
  }

  console.log(`[${userId}] 클릭 등록됨. 총 클릭: ${user.clicks.length}`);
  return true;
}

/**
 * 게임 종료 후 우승자를 선정합니다.
 * @returns {object|null} 우승자 정보 (userId, clickCount, firstClickTime, lastClickTime) 또는 우승자가 없으면 null
 */
export function getWinner() {
  if (!gameEnded) {
    console.log('게임이 아직 종료되지 않았습니다.');
    return null;
  }

  // 실격되지 않은 유저만 필터링
  const validUsers = [...users.entries()].filter(([_, u]) => !u.disqualified);
  if (validUsers.length === 0) {
    console.log('유효한 참가자가 없습니다.');
    return null;
  }

  // 우승자 선정 로직
  validUsers.sort((a, b) => {
    const aClicks = a[1].clicks.length;
    const bClicks = b[1].clicks.length;

    // 1. 클릭 수가 다르면 클릭 수가 많은 순서대로 정렬
    if (bClicks !== aClicks) {
      return bClicks - aClicks;
    }
    // 2. 클릭 수가 같으면 마지막 클릭 시간이 빠른 순서대로 정렬 (나노초 비교)
    // 과제 요구사항: 클릭수가 동일한 선두가 생길 경우, 1 마이크로초라도 빠르게 클릭수에 도달한 유저가 우승자가 됩니다.
    // 이는 '마지막 클릭 시간'이 아니라 '동일 클릭수에 도달한 시간'을 의미할 수 있으나,
    // 현재 로직에서는 '마지막 클릭 시간'을 기준으로 구현합니다. (명확한 정의 필요)
    // 또는, 'clicks' 배열의 마지막 요소(가장 최근 클릭)를 비교하여 더 작은(빠른) 시간을 가진 유저가 우선합니다.
    return Number(a[1].clicks[aClicks - 1] - b[1].clicks[bClicks - 1]);
  });

  const [winnerId, winnerData] = validUsers[0];

  // 우승자 정보 반환 (나노초를 밀리초로 변환하여 가독성 높임)
  return {
    userId: winnerId,
    clickCount: winnerData.clicks.length,
    joinTimeMs: Number(winnerData.joinTime / BigInt(1_000_000)),
    firstClickTimeMs: winnerData.clicks.length > 0 ? Number(winnerData.clicks[0] / BigInt(1_000_000)) : null,
    lastClickTimeMs: winnerData.clicks.length > 0 ? Number(winnerData.clicks[winnerData.clicks.length - 1] / BigInt(1_000_000)) : null,
  };
}

/**
 * 현재 게임 상태를 반환합니다. (테스트 및 디버깅용)
 * @returns {Map<string, object>} 현재 사용자 맵
 */
export function _debugUsers() {
  return users;
}

/**
 * 게임 상태를 외부에서 설정할 수 있도록 하는 함수 (클러스터 IPC용)
 * @param {Map<string, object>} newUsers - 새로운 사용자 맵
 * @param {bigint} newGameStartTime - 새로운 게임 시작 시간
 * @param {boolean} newGameEnded - 새로운 게임 종료 상태
 */
export function _setGameState(newUsers, newGameStartTime, newGameEnded) {
  users.clear();
  for (const [key, value] of newUsers.entries()) {
    users.set(key, value);
  }
  gameStartTime = newGameStartTime;
  gameEnded = newGameEnded;
  console.log('게임 상태 업데이트됨.');
}

/**
 * 현재 게임 시작 시간을 반환합니다.
 * @returns {bigint|null} 게임 시작 시간 (나노초)
 */
export function getGameStartTime() {
  return gameStartTime;
}

/**
 * 현재 게임 종료 상태를 반환합니다.
 * @returns {boolean} 게임 종료 상태
 */
export function getGameEnded() {
  return gameEnded;
}

