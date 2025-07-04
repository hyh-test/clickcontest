# `node:sqlite` 모듈 사용법 가이드

이 문서는 Node.js v22+에 내장된 `node:sqlite` 모듈의 기본적인 사용법을 설명합니다.

**중요:** 이 모듈은 현재 실험적(Experimental) 기능이므로, Node.js를 실행할 때 반드시 `--experimental-sqlite` 플래그를 추가해야 합니다.

---

### 1. 모듈 가져오기 (Import)

`node:sqlite` 모듈은 동기(Synchronous) 방식으로 작동하는 `DatabaseSync` 클래스를 제공합니다. `{ }`를 사용하여 `DatabaseSync`를 `import` 해야 합니다.

```javascript
import { DatabaseSync } from 'node:sqlite';
```

---

### 2. 데이터베이스 열기 및 생성

`new DatabaseSync('파일경로')`를 사용하여 데이터베이스 파일을 열거나 생성합니다. 파일이 존재하지 않으면 새로 생성됩니다. 메모리에서만 사용하려면 `':memory:'`를 파일경로로 지정합니다.

```javascript
// 파일 기반 데이터베이스
const db = new DatabaseSync('my_database.db');

// 메모리 기반 데이터베이스
const inMemoryDb = new DatabaseSync(':memory:');
```

---

### 3. 쿼리 실행 (결과값이 필요 없을 때)

테이블 생성(CREATE), 데이터 삭제(DELETE), 테이블 구조 변경(ALTER) 등 결과 데이터를 반환받을 필요가 없는 쿼리는 `db.exec()`를 사용합니다.

```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL
  );
`);
```

---

### 4. 준비된 구문 (Prepared Statements)

사용자 입력값과 같이 동적으로 변하는 데이터를 SQL 쿼리에 안전하게 삽입하려면 **준비된 구문(Prepared Statements)**을 사용해야 합니다. 이는 **SQL Injection 공격을 방어**하는 가장 중요한 방법입니다.

`db.prepare('SQL 쿼리')`로 구문을 준비하고, 상황에 맞는 함수를 호출합니다.

#### 가. 데이터 삽입/수정/삭제 (`.run()`)

`INSERT`, `UPDATE`, `DELETE` 쿼리를 실행할 때는 `.run()` 함수를 사용합니다. `?`는 값이 들어갈 자리를 의미하며, `.run()`의 인자로 순서대로 전달합니다.

```javascript
const stmt = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)');

// run()을 호출하여 실제 데이터를 전달하고 쿼리를 실행합니다.
stmt.run('Laptop', 1200.50);
stmt.run('Keyboard', 75.00);
```

#### 나. 단일 행 조회 (`.get()`)

결과가 최대 1개인 `SELECT` 쿼리를 실행할 때는 `.get()` 함수를 사용합니다. 일치하는 행을 객체(`{ }`)로 반환하며, 결과가 없으면 `undefined`를 반환합니다.

```javascript
const stmt = db.prepare('SELECT * FROM products WHERE id = ?');

const product = stmt.get(1); // id가 1인 상품 조회

if (product) {
  console.log(product.name, product.price);
} else {
  console.log("상품을 찾을 수 없습니다.");
}
```

#### 다. 모든 행 조회 (`.all()`)

여러 개의 행이 반환될 수 있는 `SELECT` 쿼리를 실행할 때는 `.all()` 함수를 사용합니다. 모든 결과 행을 배열(`[ ]`)로 반환합니다.

```javascript
const stmt = db.prepare('SELECT * FROM products WHERE price < ?');

const cheapProducts = stmt.all(100); // 100달러 미만 상품 모두 조회

for (const product of cheapProducts) {
  console.log(product.name);
}
```

---

### 5. 데이터베이스 닫기

애플리케이션이 종료되기 전에 `db.close()`를 호출하여 데이터베이스 연결을 안전하게 종료하는 것이 좋습니다.

```javascript
db.close();
console.log("데이터베이스 연결이 종료되었습니다.");
```
