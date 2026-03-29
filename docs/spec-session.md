# Session 建立與查詢規格 (P1 Finalized Spec)

本文件定義了 P1 階段 Session 的核心規格，包含 API 格式、過期策略與狀態機。

---

## 核心設計原則 (MVP Optimized)
- **Security**: 外部 API 一律隱藏資料庫內部 `id`，僅曝露 `code` 作為唯一識別碼。
- **Simplicity**: 預設過期時間固定為建立後的 24 小時。
- **Clarity**: 統一使用 `success/data` 與 `success/error` 的結構化回應。

---

## 1. 建立 Session (`POST /api/sessions`)

### Request
- **Endpoint**: `POST /api/sessions`
- **Body**:
  ```json
  {
    "title": "我的交換站"
  }
  ```
- **Rules**:
  - `title`: 選填 (String)。
  - `title` 若未提供，預設為空字串 `""`。
  - `title` 會自動進行 `trim()` 並截斷至上限 255 字元。
  - 不接受非字串型別。

### Success Response
- **Status**: `201 Created`
- **Body**:
  ```json
  {
    "success": true,
    "data": {
      "session": {
        "code": "ABCDEFGH2345",
        "title": "我的交換站",
        "status": "active",
        "expiresAt": "2026-03-30T15:00:00.000Z",
        "createdAt": "2026-03-29T15:00:00.000Z",
        "updatedAt": "2026-03-29T15:00:00.000Z"
      }
    }
  }
  ```

---

## 2. 查詢 Session (`GET /api/sessions/:code`)

### Endpoint
- `GET /api/sessions/:code`

### 狀態行為 (Status Rules)
- **`active`**: 可查詢，回傳 `200`，顯示 `active`。
- **`expired`**:
  - 若 `expiresAt < now()`，API 應動態將其顯示為 `expired` 狀態。
  - 可查詢，回傳 `200`。
- **`deleted`**:
  - 視為不存在，回傳 `404 SESSION_NOT_FOUND`。

### Error Response
- **Status**: `404 Not Found`
- **Body**:
  ```json
  {
    "success": false,
    "error": {
      "code": "SESSION_NOT_FOUND",
      "message": "Session not found"
    }
  }
  ```

---

## 3. 實作規格細節 (Implementation Details)

### Session Code
- **格式**: 固定 12 碼英數組合。
- **安全**: 排除容易混淆字元 (`0, O, I, 1, l`)。
- **Alphabet**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (Base32 變體)。
- **生成方式**: 使用隨機產生器確保具備足夠的亂度。

### 過期規則 (Expiration)
- **預設有效期**: 建立後 **+24 小時**。
- **時間格式**: 所有 API 時間欄位皆採 ISO 8601 UTC 格式。

### 錯誤代碼 (Error Codes)
- `BAD_REQUEST`: 前端輸入格式不正確、型別錯誤或 JSON 解析失敗。
- `SESSION_NOT_FOUND`: Session 不存在或已標記為刪除。
- `INTERNAL_ERROR`: 未預期之伺服器錯誤。
- `METHOD_NOT_ALLOWED`: HTTP Method 不符合 API 定義。

---

## 驗收標準
1. [x] 成功建立 Session 並取得 12 碼 Code。
2. [x] Response 中不應包含資料庫內部的遞增 `id`。
3. [x] 查詢一個已超過 24 小時的 Session，應能顯示 `status: "expired"`。
4. [x] 查詢一個標記為 `deleted` 的 Session，應回傳 `404`。
5. [x] 錯誤回應應具有正確的 `code` 欄位以便前端判斷。
