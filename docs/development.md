# Development

## 開發準備
1. `npm install`
2. 複製 `.env.example` 到 `.env` 並填寫必要的變數 (LINE, MySQL 等)
3. 確保 MySQL 執行中並建立對應資料庫
4. `npm run dev` 啟動開發伺服器
5. 存取 `http://localhost:3000/health` 確認狀態

## 目前實作核心
- **前端儀表板 (Phase 3.1)**: 
  - 實作 Vanilla JS SPA 介面，支援以 Session Code 存取與管理。
  - 實作上傳進度條 (XHR) 與 Session 到期即時倒數計時。
  - 介面適配行動裝置，支援 Token 驗證下載與刪除。
- **Session 建立與查詢 (P1)**: 支援 12 碼隨機 Code、24 小時自動過期、動態過期狀態判定。
- **檔案交換流程 (P2)**: 
  - 支援 10 碼隨機 File Code，對外完全隱藏數字 ID。
  - 檔案上傳、列表、下載與 Soft Delete 閉環完成。
  - 實作 Session 過期權限矩陣（過期後禁止變動與下載）。
- **安全與驗證**: Token-based 檔案下載與刪除驗證、LINE Webhook 簽章校驗。
- **自動化維運**: 背景 Job 每 15 分鐘清理過期 Session 與 Soft Deleted 實體檔案。
- **基礎架構**: MySQL Schema 自動 Migration (目前 v8)、TypeScript 強型別支援。

## 後續優化重點
- 增加更多的單元測試 (Unit Tests)
- 前端 React/Vue UI 實作
- 完善 LINE 互動介面 (Rich Menu, Flex Message)
- 檔案預覽功能與快取優化
