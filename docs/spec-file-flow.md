# 檔案交換流程規格 (P2 Finalized Spec)

本文件定義 P2 階段「檔案交換流程」的正式 contract 與行為準則。

---

## 1. 檔案上傳 (`POST /api/sessions/:code/files`)

### Request
- **Endpoint**: `POST /api/sessions/:code/files`
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `file`: (Binary File)
- **Constraints**:
  - 檔案大小上限：預設 20MB。
  - 檔名處理：`trim()` 並移除潛在路徑穿越字元。

### Success Response
- **Status**: `201 Created`
- **Body**:
  ```json
  {
    "success": true,
    "data": {
      "file": {
        "code": "ABCDEFGH23",
        "originalName": "photo.jpg",
        "sizeBytes": 1048576,
        "mimeType": "image/jpeg",
        "downloadCount": 0,
        "createdAt": "2026-03-29T15:00:00.000Z",
        "updatedAt": "2026-03-29T15:00:00.000Z"
      },
      "downloadToken": "secure_download_token"
    }
  }
  ```

---

## 2.5 批次打包下載 (`GET /api/sessions/:code/download-all`)

### Request
- **Endpoint**: `GET /api/sessions/:code/download-all`

### Behavior
- **Success**: 系統將 Session 下所有 `ready` 狀態的檔案打包為 ZIP。
- **Response Header**: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="session-{code}.zip"`。
- **Session Expired**: 禁止下載，回傳 `403 FORBIDDEN`。
- **Empty Session**: 若無任何檔案，回傳 `404 FILE_NOT_FOUND`。

---

## 3. 檔案下載 (`GET /api/files/:code/download`)

### Request
- **Endpoint**: `GET /api/files/:code/download?token=...`
- **Authentication**: 需帶入正確的 `token`。

### Behavior
- **Success**: 回傳檔案串流 (Stream)，設定正確的 `Content-Disposition` 與 `Content-Type`。
- **Failure**:
  - Token 錯誤/過期 -> `403 FORBIDDEN`
  - 檔案不存在/已刪除 -> `404 FILE_NOT_FOUND`
  - **Session 已過期** -> `403 FORBIDDEN`

---

## 4. 檔案刪除 (`DELETE /api/files/:code`)

### Request
- **Endpoint**: `DELETE /api/files/:code?token=...`

### Behavior
- **Soft Delete**: API 僅標記 `status = 'deleted'`，實體檔案由背景任務延後清理。
- **Session 已過期**: 禁止刪除，回傳 `403 FORBIDDEN`。

---

## 5. 狀態交互矩陣 (State Matrix)

| 動作 | Session Active | Session Expired | Session Deleted | File Deleted |
| :--- | :---: | :---: | :---: | :---: |
| 列出檔案 | O | O | X (404) | X (不顯示) |
| 上傳檔案 | O | X (403) | X (404) | - |
| 下載檔案 | O | X (403) | X (404) | X (404) |
| 刪除檔案 | O | X (403) | X (404) | X (404) |

---

## 6. UI 互動流程 (UI Flow Specs - Issue #9)

### 6.1 首頁上傳流程 (Upload-First Flow)
1. **觸發**: 使用者在首頁拖曳檔案至上傳區或點擊上傳。
2. **初始化**: 
   - 若未輸入代碼，系統自動調用 `POST /api/sessions` 建立暫存空間。
   - 畫面顯示初始化進度。
3. **執行**: 批次調用 `POST /api/sessions/:code/files` 上傳檔案。
4. **完成**: 
   - 顯示該次上傳產生的 **Session Code**。
   - 顯示完整分享網址。
   - 顯示該檔案的下載/刪除 **Token**。

### 6.2 下載路徑區分 (Differentiated Download Paths)
不論是透過以下哪種方式，皆須經過 **Selection Page (檔案列表頁)**：
1. **分享網址 (Shared URL)**:
   - 使用者存取 `/?code={code}`。
   - 系統顯示該 Session 的檔案列表。
   - 使用者可選擇單檔下載或「全部打包下載 (ZIP)」。
2. **首頁輸入代碼 (Homepage Code Entry)**:
   - 使用者在首頁輸入 12 碼代碼並點擊「進入交換站」。
   - 系統跳轉至檔案列表頁面。
   - 使用者確認檔案後進行下載。

---
