import { db } from './database.js';

// 게임 관련 상수
const CLICK_TIME_LIMIT_NS = BigInt(60 * 1000) * BigInt(1_000_000);
const INACTIVE_LIMIT_NS = BigInt(10 * 1000) * BigInt(1_000_000);
const MAX_CLICKS_PER_SECOND = 4;
const ONE_SECOND_NS = BigInt(1_000_000_000);

// 게임 상태 및 사용자 데이터
const users = new Map();
let gameStartTime = null;
let gameEnded = false;

/**
 * @function startGame
 * @description 게임을 시작하고 게임 시작 시간을 기록합니다. 60초 후에 게임을 종료하고 우승자를 발표합니다.
 * @returns {{gameStartTime: bigint, gameEnded: boolean}}
 */
export function startGame() {
  gameStartTime = process.hrtime.bigint();
  gameEnded = false;

  setTimeout(() => {
    gameEnded = true;
    console.log('게임 종료!');
    const winner = getWinner();
    if (winner) {
      console.log('🏆 최종 우승자:', winner);
    } else {
      console.log('우승자가 없습니다.');
    }
  }, Number(CLICK_TIME_LIMIT_NS / BigInt(1_000_000)));

  return { gameStartTime, gameEnded };
}

/**
 * @function initializeUser
 * @description 새로운 사용자를 게임에 참여하도록 초기화합니다. 이미 참여했거나 부적격한 사용자, 또는 데이터베이스에 없는 사용자는 초기화되지 않습니다.
 * @param {string} userId - 초기화할 사용자의 ID
 * @returns {boolean} - 사용자 초기화 성공 여부
 */
export function initializeUser(userId) {
  if (users.has(userId) && (users.get(userId).disqualified || users.get(userId).joinTime !== undefined)) {
    return false;
  }
  if (!db.userExists(userId)) {
    console.log(`[${userId}]는 등록되지 않은 사용자입니다. 게임에 참여할 수 없습니다.`);
    return false;
  }
  users.set(userId, {
    clicks: [],
    disqualified: false,
    joinTime: process.hrtime.bigint(),
    lastClickTime: process.hrtime.bigint(),
  });
  return true;
}

/**
 * @function registerClick
 * @description 사용자의 클릭을 등록하고 유효성을 검사합니다. 게임 종료, 실격, 또는 초당 클릭 제한 초과 시 false를 반환합니다.
 * @param {string} userId - 클릭을 등록할 사용자의 ID
 * @param {bigint} timestamp - 클릭 발생 시간 (process.hrtime.bigint() 값)
 * @returns {boolean} - 클릭 등록 성공 여부
 */
export function registerClick(userId, timestamp) {
  const user = users.get(userId);
  if (!user || user.disqualified || gameEnded || gameStartTime === null || timestamp < gameStartTime || (timestamp - gameStartTime) >= CLICK_TIME_LIMIT_NS) {
    return false;
  }
  if ((timestamp - user.lastClickTime) >= INACTIVE_LIMIT_NS) {
    user.disqualified = true;
    console.log(`[${userId}] 실격 처리됨: 10초 이상 무응답.`);
    return false;
  }
  user.lastClickTime = timestamp;
  user.clicks.push(timestamp);
  const recentWindowStart = timestamp - ONE_SECOND_NS;
  const recentClicks = user.clicks.filter(t => t >= recentWindowStart);
  if (recentClicks.length > MAX_CLICKS_PER_SECOND) {
    user.disqualified = true;
    console.log(`[${userId}] 실격 처리됨: 초당 클릭 제한 초과 (${recentClicks.length}회).`);
    return false;
  }
  return true;
}

/**
 * @function getWinner
 * @description 게임이 종료된 후 우승자를 결정합니다. 가장 많은 클릭 수를 기록한 유효한 사용자가 우승자가 됩니다.
 *              클릭 수가 같을 경우 마지막 클릭 시간이 빠른 사용자가 우승합니다.
 * @returns {{userId: string, clickCount: number} | null} - 우승자 정보 또는 우승자가 없을 경우 null
 */
export function getWinner() {
  if (!gameEnded) {
    return null;
  }
  const validUsers = [...users.entries()].filter(([_, u]) => !u.disqualified);
  if (validUsers.length === 0) {
    return null;
  }
  validUsers.sort((a, b) => {
    const aClicks = a[1].clicks.length;
    const bClicks = b[1].clicks.length;
    if (bClicks !== aClicks) {
      return bClicks - aClicks;
    }
    return Number(a[1].clicks[aClicks - 1] - b[1].clicks[bClicks - 1]);
  });
  const [winnerId, winnerData] = validUsers[0];
  return {
    userId: winnerId,
    clickCount: winnerData.clicks.length,
  };
}

/**
 * @function processClick
 * @description 사용자 클릭을 처리합니다. 사용자가 처음 클릭하는 경우 초기화하고, 클릭을 등록합니다.
 * @param {string} userId - 클릭을 처리할 사용자의 ID
 * @param {bigint} timestamp - 클릭 발생 시간 (process.hrtime.bigint() 값)
 * @returns {boolean} - 클릭 처리 성공 여부
 */
export function processClick(userId, timestamp) {
  if (!users.has(userId)) {
    const initSuccess = initializeUser(userId);
    if (!initSuccess) {
      return false;
    }
  }
  return registerClick(userId, timestamp);
}

// --- 테스트 및 디버깅용 함수 ---
/**
 * @function _debugUsers
 * @description (디버깅용) 현재 게임에 참여 중인 사용자들의 맵을 반환합니다.
 * @returns {Map<string, object>}
 */
export function _debugUsers() {
  return users;
}

/**
 * @function _setGameState
 * @description (디버깅용) 게임 상태를 수동으로 설정합니다. 주로 테스트를 위해 사용됩니다.
 * @param {Map<string, object>} newUsers - 새로 설정할 사용자 맵
 * @param {bigint | null} newGameStartTime - 새로 설정할 게임 시작 시간
 * @param {boolean} newGameEnded - 새로 설정할 게임 종료 여부
 */
export function _setGameState(newUsers, newGameStartTime, newGameEnded) {
  users.clear();
  for (const [key, value] of newUsers.entries()) {
    users.set(key, value);
  }
  gameStartTime = newGameStartTime;
  gameEnded = newGameEnded;
}
