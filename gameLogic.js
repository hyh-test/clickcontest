
const CLICK_TIME_LIMIT_MS = 60 * 1000; // 1분
const INACTIVE_LIMIT_MS = 10 * 1000; // 10초 무응답 실격
const MAX_CLICKS_PER_SECOND = 4; // 슬라이딩 윈도우 1초 내 4회 초과 시 실격

const users = new Map(); // userId -> { clicks: number[], disqualified: boolean, joinTime, lastClickTime }
let gameStartTime = null;
let gameEnded = false;

//게임 시작
function startGame() {
  gameStartTime = Date.now(); // 현재 시각 저장
  gameEnded = false;          // 게임 상태 초기화

  setTimeout(() => {
    gameEnded = true;         // 일정 시간 후 자동 종료
  }, CLICK_TIME_LIMIT_MS);    // 60초 후 종료
}


//게임 
function initializeUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      clicks: [],
      disqualified: false,
      joinTime: Date.now(),
      lastClickTime: Date.now(),
    });
  }
}

function registerClick(userId, timestamp) {
  const user = users.get(userId);

  // 1. 유효하지 않은 상황은 즉시 리턴
  if (!user || user.disqualified) return;                // 유저 없음 또는 실격자
  if (gameEnded) return;                                 // 게임 종료
  if (timestamp - gameStartTime >= CLICK_TIME_LIMIT_MS) return; // 1분 초과 클릭

  // 2. 10초 무응답 실격 체크
  if (timestamp - user.lastClickTime >= INACTIVE_LIMIT_MS) {
    user.disqualified = true;                            // 10초 이상 무응답 → 실격
    return;
  }

  // 3. 정상 클릭 기록
  user.lastClickTime = timestamp;                        // 마지막 클릭 시간 갱신
  user.clicks.push(timestamp);                           // 클릭 시간 기록

  // 4. 슬라이딩 윈도우 부정 클릭 감지 (1초 내 4회 초과 → 실격)
  const recentWindowStart = timestamp - 1000;            // 1초 전 기준 시작 시각
  const recentClicks = user.clicks.filter(t => t >= recentWindowStart); // 최근 1초 클릭 추출
  if (recentClicks.length > MAX_CLICKS_PER_SECOND) {
    user.disqualified = true;                            // 초당 최대 클릭 초과 → 실격
  }
}


function getWinner() {
  if (!gameEnded) return null;

  const validUsers = [...users.entries()].filter(([_, u]) => !u.disqualified);
  if (validUsers.length === 0) return null;

  validUsers.sort((a, b) => {
    const aClicks = a[1].clicks.length;
    const bClicks = b[1].clicks.length;
    if (bClicks !== aClicks) return bClicks - aClicks;
    return a[1].clicks[aClicks - 1] - b[1].clicks[bClicks - 1]; // 마지막 클릭 시간 비교
  });

  const [winnerId, winnerData] = validUsers[0];
  return {
    userId: winnerId,
    clickCount: winnerData.clicks.length,
    firstClickTime: winnerData.clicks[0],
    lastClickTime: winnerData.clicks[winnerData.clicks.length - 1],
  };
}

module.exports = {
  startGame,
  initializeUser,
  registerClick,
  getWinner,
  _debugUsers: () => users, // 테스트용
};
