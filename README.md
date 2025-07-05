# 클릭 콘테스트 서버

**💡 참고:** 이 프로젝트의 실행 및 테스트 방법은 주로 **Windows 환경**에 맞춰져 있습니다.

이 프로젝트는 Node.js 내장 모듈만을 사용하여 제작된 간단한 클릭 콘테스트 게임의 백엔드 서버입니다.

## 주요 기술

- **서버:** `node:http` (Node.js 내장 HTTP 모듈)
- **데이터베이스:** `node:sqlite` (Node.js v22+ 내장 SQLite 모듈)
- **의존성:** 외부 라이브러리(`npm` 패키지 등)를 전혀 사용하지 않습니다.

---

## 실행 방법

이 프로젝트를 실행하려면 **Node.js v22.0.0 이상** 버전이 반드시 필요합니다.

1.  **프로젝트 클론 또는 다운로드**

2.  **터미널에서 메인 서버 실행**
    프로젝트의 루트 디렉토리에서 다음 명령어를 입력하여 서버를 시작합니다.

    ```bash
    node --experimental-sqlite server.js
    ```

    -   `--experimental-sqlite` 플래그는 내장 SQLite 모듈을 활성화하기 위해 필수적입니다.
    -   이 명령어를 실행하면 HTTP 서버(포트 3000)와 TCP 서버(포트 3001)가 동시에 시작됩니다.

3.  **서버 실행 확인**
    서버가 성공적으로 실행되면 터미널에 다음과 같은 메시지가 출력됩니다.

    ```
    애플리케이션 시작 중...
    데이터베이스가 성공적으로 초기화되었습니다. (C:\...\clickcontest\clickgame.db)
    게임이 시작되었습니다.
    HTTP 서버 실행 중: http://localhost:3000
    TCP 클릭 서버 실행 중: 포트 3001
    모든 서버가 성공적으로 시작되었습니다.
    ```

---

## API 및 스크립트 테스트 방법

서버가 실행 중인 상태에서, **새로운 터미널**을 열고 아래 방법을 사용하여 기능을 테스트할 수 있습니다.

### 1. 회원가입 (`/signup` API)

사용자를 데이터베이스에 등록합니다.

-   **URL:** `/signup`
-   **Method:** `POST`
-   **Body:**
    ```json
    {
      "userId": "string",
      "address": "string"
    }
    ```

#### 테스트 명령어 예시 (Windows PowerShell)

PowerShell에서는 `curl` 별칭 대신 `Invoke-WebRequest`를 사용하는 것이 가장 확실하고 오류가 없습니다.

```powershell
Invoke-WebRequest -Uri http://localhost:3000/signup -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"userId": "ps_user_01", "address": "0xABCDEF12345"}'
```


#### 예상 결과

-   **첫 요청 (성공):**
    ```
    HTTP Status Code: 201
    Response Body: 회원가입 성공
    ```

-   **동일한 `userId`로 다시 요청 (실패):**
    ```
    원격 서버에서 (409) 충돌 오류를 반환했습니다.
    ```


-   **`userId` 또는 `address` 누락 시 (실패):**
    ```
    원격 서버에서 (400) 충돌 오류를 반환했습니다
    ```

### 2. 사용자 등록 여부 확인 (`verifyUser.js` 스크립트)

데이터베이스에 특정 `userId`가 등록되어 있는지 직접 확인합니다.

```bash
node --experimental-sqlite verifyUser.js <확인할_userId>
```

#### 예시

```bash
node --experimental-sqlite verifyUser.js test_user_01
```

#### 예상 결과

-   **사용자가 존재할 경우:**
    ```
    사용자 [test_user_01]가 데이터베이스에 존재합니다. 주소: 0x12345ABCDEF
    ```

-   **사용자가 존재하지 않을 경우:**
    ```
    사용자 [non_existent_user]는 데이터베이스에 존재하지 않습니다.
    ```

### 3. 클릭 시뮬레이션 (`tcpClient.js` 스크립트)

TCP 서버를 통해 클릭 이벤트를 시뮬레이션합니다. 스크립트 실행 시 사용자 ID를 입력받아 등록 여부를 확인한 후 클릭을 시도합니다.

```bash
node tcpClient.js
```

#### 사용 방법

1.  위 명령어를 실행하면 `클릭할 사용자 ID를 입력하세요: ` 프롬프트가 나타납니다.
2.  테스트할 `userId`를 입력하고 Enter를 누릅니다.

#### 예상 결과

-   **등록된 사용자 ID 입력 시 (클릭 시도):**
    ```
    사용자 [입력한_userId]는 회원가입되어 있습니다. 클릭을 시작합니다.
    서버에 연결됨: localhost:3001
    클릭 데이터 전송: {"userId":"입력한_userId","timestamp":...}
    서버 응답: OK
    서버 연결 종료됨.
    ```

-   **미등록 사용자 ID 입력 시 (클릭 시도 안 함):**
    ```
    사용자 [입력한_userId]는 데이터베이스에 존재하지 않습니다. 회원가입이 필요합니다.
    HTTP 서버의 /signup 경로를 이용해주세요.
    ```

-   **서버 응답에 따른 추가 메시지:**
    *   `서버 응답: ERROR: 사용자 [입력한_userId]는 게임에 참여할 수 없습니다.`
        `-> 이 사용자는 이미 게임에 참여했거나 실격 처리되었습니다.`
    *   `서버 응답: ERROR: 클릭이 유효하지 않습니다.`
        (게임 시작 전, 게임 종료 후, 시간 범위 벗어남, 슬라이딩 윈도우 초과 등 `gameLogic` 규칙 위반 시)

---

## 다음 단계

-   **클러스터 모드 구현:** `server.js`를 수정하여 `node:cluster`를 사용하고, 마스터-워커 간의 게임 상태 동기화 로직을 구현해야 합니다.
-   **테스트 코드 작성:** 과제 요구사항에 따라 유닛 테스트 및 E2E 테스트를 작성해야 합니다.
