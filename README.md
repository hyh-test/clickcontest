# 클릭 콘테스트 백엔드 서버

## 📖 프로젝트 개요

이 프로젝트는 주어진 과제 요구사항에 따라 **외부 라이브러리(npm 등) 없이** 오직 Node.js 내장 모듈만을 사용하여 개발된 실시간 클릭 콘테스트 게임의 백엔드 서버입니다.

HTTP를 통한 회원가입, TCP를 통한 실시간 클릭 처리, 그리고 CPU 성능을 극대화하기 위한 **클러스터(Cluster) 모드**까지 모든 핵심 기능이 구현되어 있습니다.

## ✨ 주요 기능 및 특징

- **실시간 클릭 처리**: `node:net`을 사용한 TCP 서버를 통해 사용자의 클릭을 실시간으로 처리합니다.
- **회원가입 API**: `node:http`를 사용한 HTTP 서버를 통해 사용자 등록 기능을 제공합니다.
- **데이터베이스**: `node:sqlite`를 사용하여 사용자 정보를 영구적으로 저장합니다.
- **고성능 아키텍처**: `node:cluster`를 활용하여 CPU 코어 수만큼 워커(Worker) 프로세스를 생성, 서버의 처리량을 극대화합니다.
- **제로 의존성**: `npm install` 없이, Node.js v22+ 환경이라면 즉시 실행 가능합니다.
- **완벽한 테스트**: 모든 게임 규칙에 대한 **단위 테스트**와 전체 시나리오를 검증하는 **E2E 테스트**가 포함되어 있습니다.

## 📂 프로젝트 구조

- **`server.js`**: 메인 서버 실행 파일. 클러스터 모드의 마스터/워커 프로세스를 관리하고, 게임의 중앙 관제탑 역할을 합니다.
- **`gameLogic.js`**: 1분 시간제한, 실격 규칙, 우승자 선정 등 모든 핵심 게임 로직을 담당합니다.
- **`database.js`**: SQLite 데이터베이스 연결 및 쿼리(사용자 추가/조회)를 담당합니다.
- **`httpserver.js`**: `/signup`, `/winner` API를 제공하는 HTTP 서버 로직입니다.
- **`tcpServer.js`**: 클라이언트의 클릭 요청을 받아 마스터 프로세스에 전달하는 TCP 서버 로직입니다.
- **`config.js`**: 게임 시간, 포트 번호 등 주요 설정값을 관리하는 파일입니다.
- **`gameLogic.test.js`**: `gameLogic.js`의 모든 규칙을 검증하는 단위 테스트 파일입니다.
- **`e2e.test.js`**: 회원가입부터 우승자 확인까지 전체 흐름을 테스트하는 E2E 테스트 파일입니다.
- **`tcpClient.js`, `verifyUser.js`, `setup_test_db.js`**: 수동 테스트 및 개발 편의를 위한 유틸리티 스크립트입니다.

## ⚙️ 실행 환경

- **Node.js**: **v22.0.0 이상** 필수 (`node:sqlite` 모듈 사용)

## 🚀 실행 방법

### 1. 메인 서버 실행

프로젝트의 루트 디렉터리에서 다음 명령어를 입력하여 클러스터 모드로 서버를 시작합니다.

```powershell
node --experimental-sqlite server.js
```

- `--experimental-sqlite` 플래그는 내장 SQLite 모듈을 활성화하기 위해 필수입니다.
- 서버가 시작되면 마스터 프로세스와 CPU 코어 수만큼의 워커 프로세스가 실행됩니다.

### 2. 실행 확인

서버가 성공적으로 실행되면 터미널에 다음과 유사한 로그가 출력됩니다.

```text
마스터 프로세스 (PID: 12345) 실행 중
게임이 시작되었습니다.
워커 12346 준비 완료. (1/16)
워커 12347 준비 완료. (2/16)
... (CPU 코어 수만큼 반복) ...
모든 서버가 성공적으로 시작되었습니다.
```

## 🧪 테스트 방법

### 1. 자동화 테스트

#### 단위 테스트 (Unit Test)

`gameLogic.js`의 모든 규칙이 정확히 동작하는지 빠르게 검증합니다.

```powershell
node --test gameLogic.test.js
```

#### End-to-End (E2E) 테스트

회원가입부터 우승자 확인까지 전체 사용자 시나리오를 자동으로 테스트합니다. **(주의: 테스트 실행에 약 1분 이상 소요됩니다)**

```powershell
node --test e2e.test.js
```

### 2. 수동 테스트 및 사용 예시

서버가 실행 중인 상태에서, **새로운 터미널**을 열고 아래 스크립트들을 사용하여 수동으로 기능을 테스트할 수 있습니다.

#### ① 테스트 환경 준비 (선택 사항)

깨끗한 환경에서 테스트하고 싶다면, `setup_test_db.js` 스크립트를 실행하여 데이터베이스를 초기화하고 테스트용 사용자를 미리 등록할 수 있습니다.

```powershell
node --experimental-sqlite setup_test_db.js
```
- **결과**: `테스트 사용자 [verify_user]가 데이터베이스에 추가되었습니다.` 메시지가 출력됩니다.

#### ② 회원가입

PowerShell에서 `Invoke-WebRequest`를 사용하여 사용자를 등록합니다.

```powershell
Invoke-WebRequest -Uri http://localhost:3000/signup -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"userId": "manual_user", "address": "seoul"}'
```

- **예상 결과 (성공)**: `StatusCode : 201`, `Content : 회원가입 성공`
- **예상 결과 (이미 존재하는 사용자)**: `(409) 충돌` 오류 발생

#### ③ 클릭 시도

`tcpClient.js` 스크립트로 클릭 이벤트를 서버에 전송합니다.

```powershell
node tcpClient.js
```

- **실행**: 위 명령어를 입력하면 ID를 묻는 프롬프트가 나타납니다. `manual_user` 또는 `verify_user`를 입력하고 Enter를 누릅니다.
- **예상 결과**:
  ```text
  사용자 [manual_user]는 회원가입되어 있습니다. 클릭을 시작합니다.
  서버에 연결됨: localhost:3001
  ...
  서버 응답: OK
  서버 연결 종료됨.
  ```

#### ④ 우승자 확인

게임 종료(서버 시작 후 1분) 후, 아래 명령어를 실행하여 우승자 정보를 깔끔한 JSON 형태로 확인합니다.

```powershell
(Invoke-WebRequest -Uri http://localhost:3000/winner).Content | ConvertFrom-Json
```

- **예상 결과 (우승자 존재 시)**:
  ```powershell
  userId      clickCount address
  --------      ---------- -------
  verify_user          5 0xABCDEFG
  ```
- **예상 결과 (게임 미종료 시)**: `(404) 찾을 수 없음` 오류가 발생합니다.

## 📝 API 명세 요약

### `POST /signup`

- **설명**: 새로운 사용자를 등록합니다.
- **Request Body**:
  ```json
  {
    "userId": "string",
    "address": "string"
  }
  ```
- **주요 응답 코드**: `201 Created`, `409 Conflict`, `400 Bad Request`

### `GET /winner`

- **설명**: 게임 종료 후 우승자 정보를 조회합니다.
- **Response Body (성공 시)**:
  ```json
  {
    "userId": "string",
    "clickCount": "number",
    "address": "string"
  }
  ```
- **주요 응답 코드**: `200 OK`, `404 Not Found`
