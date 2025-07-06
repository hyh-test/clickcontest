// --- 게임 규칙 ---

// 게임 진행 시간 (단위: 초)
export const GAME_DURATION_SECONDS = 60;

// 사용자가 클릭 없이 버틸 수 있는 최대 시간 (단위: 초)
// 이 시간을 초과하면 실격 처리됩니다.
export const INACTIVE_TIMEOUT_SECONDS = 10;

// 1초 동안 허용되는 최대 클릭 횟수
// 이 횟수를 초과하면 실격 처리됩니다.
export const MAX_CLICKS_PER_SECOND = 4; 


// --- 서버 설정 ---
export const HTTP_PORT = 3000;
export const TCP_PORT = 3001;