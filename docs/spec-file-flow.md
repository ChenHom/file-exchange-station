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
