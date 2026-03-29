# File Exchange Station

本機執行的暫存檔案交換站，使用 Node.js + TypeScript + MySQL，透過 ngrok 對外並整合 LINE Bot。

## 現況
- Node + TypeScript 核心架構完整，支援異步處理與錯誤管理
- MySQL schema 與 migration 機制已建立，支援 session/file/event 持久化
- Session 生命週期管理已實作 (建立、查詢、到期)
- 檔案上傳 (Multipart stream) 與下載 (Stream with token) 已完成
- 安全機制：Token-based 下載驗證、LINE Webhook Signature 驗證
- 排程任務：每 15 分鐘自動清理過期 Session 與實體檔案
- ngrok 整合：啟動時自動讀取本地 ngrok URL 並更新系統配置
- LINE Bot 核心功能：支援 `!new` (建立交換站) 與 `!list` (列出活動中交換站) 指令

## 專案結構
```text
src/
  config/      - 環境變數與核心配置
  db/          - MySQL client, migrations, query helper
  jobs/        - 排程清理任務 (cleanup)
  modules/
    events/    - 事件稽核記錄
    files/     - 檔案中介資料與服務邏輯
    line/      - LINE Messaging API 客戶端與驗證
    sessions/  - 交換站會話邏輯
    storage/   - 本地檔案系統存取 (FS)
    tokens/    - 安全 Token 生成與驗證 (HMAC)
  server/      - HTTP Server, Router, Webhook Handlers
  shared/      - 錯誤處理、加密工具、時間工具
```

## 環境變數
請以 `.env.example` 複製出 `.env`。

## 開發指令
```bash
npm install
npm run dev        # 開發模式 (tsx watch)
npm run typecheck  # 型別檢查
npm run build      # 編譯 TypeScript
npm run start      # 啟動編譯後的專案
```

## API 規格
所有 API 回應均遵循以下格式：
- **成功**: `{ "success": true, "data": { ... } }`
- **失敗**: `{ "success": false, "error": { "code": "ERR_CODE", "message": "..." } }`

詳細規格請參閱：[Session 建立與查詢規格 (P1 Finalized Spec)](docs/spec-session.md)

### 核心 API 概要
- `GET /health` - 系統健康檢查
- `POST /api/sessions` - 建立新的交換站 (24h 有效，回傳 12 碼 Code)
- `GET /api/sessions/:code` - 取得指定交換站資訊 (包含過期狀態動態判定)
- `GET /api/sessions/:code/files` - 列出交換站內的檔案
- `POST /api/sessions/:code/files` - 上傳檔案 (Multipart)
- `GET /api/files/:id/download?token=xxx` - 下載檔案 (需驗證 Token)
- `DELETE /api/files/:id?token=xxx` - 刪除檔案 (需驗證 Token)
- `POST /webhooks/line` - LINE Webhook 接收端

## 下一步開發建議
- 前端網頁介面開發 (目前僅有 index.html 骨架)
- 多檔案批次下載支援 (ZIP 打包)
- 檔案過期前的 LINE 主動通知功能
- 完善的單元測試與整合測試 (BDD Coverage)
