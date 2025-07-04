# 클릭 콘테스트 서버

이 프로젝트는 Node.js 내장 모듈만을 사용하여 제작된 간단한 클릭 콘테스트 게임의 백엔드 서버입니다.

## 주요 기술

- **서버:** `node:http` (Node.js 내장 HTTP 모듈)
- **데이터베이스:** `node:sqlite` (Node.js v22+ 내장 SQLite 모듈)
- **의존성:** 외부 라이브러리(`npm` 패키지 등)를 전혀 사용하지 않습니다.

---

## 실행 방법

이 프로젝트를 실행하려면 **Node.js v22.0.0 이상** 버전이 반드시 필요합니다.

1.  **프로젝트 클론 또는 다운로드**

2.  **터미널에서 서버 실행**
    프로젝트의 루트 디렉토리에서 다음 명령어를 입력하여 서버를 시작합니다.

    ```bash
    node --experimental-sqlite httpserver.js
    ```

    -   `--experimental-sqlite` 플래그는 내장 SQLite 모듈을 활성화하기 위해 필수적입니다.

3.  **서버 실행 확인**
    서버가 성공적으로 실행되면 터미널에 다음과 같은 메시지가 출력됩니다.

    ```
    데이터베이스가 성공적으로 초기화되었습니다. (C:\...\clickcontest\clickgame.db)
    HTTP 서버 실행 중: http://localhost:3000
    ```

---

## API 테스트 방법

서버가 실행 중인 상태에서, **새로운 터미널**을 열고 API를 테스트할 수 있습니다.

**💡 팁: 사용하시는 터미널에 따라 아래 명령어를 선택하세요.**
- **Windows PowerShell 사용자:** `Invoke-WebRequest` 명령어를 사용하세요.

### 회원가입 (`/signup`)

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

```powershell
Invoke-WebRequest -Uri http://localhost:3000/signup -Method POST -ContentType "application/json" -Body '{"userId": "ps_user_01", "address": "0xABCDEF12345"}'
```


#### 예상 결과


-   **첫 요청 (성공):**
    ```
    회원가입 성공
    ```

-   **동일한 `userId`로 다시 요청 (실패):**
    ```
    이미 존재하는 사용자입니다.
    ```

-   **`userId` 또는 `address` 누락 시 (실패):**
    ```
    userId와 address는 필수입니다.
    ```

```