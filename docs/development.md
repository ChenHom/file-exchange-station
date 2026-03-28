# Development

## 開發準備
1. `npm install`
2. 複製 `.env.example` 到 `.env` 並填寫必要的變數 (LINE, MySQL 等)
3. 確保 MySQL 執行中並建立對應資料庫
4. `npm run dev` 啟動開發伺服器
5. 存取 `http://localhost:3000/health` 確認狀態

## 目前實作核心
- Session 與 File 的完整的增刪查改 (CRUD)
- 安全 Token 驗證機制與 LINE 簽章校驗
- 分段 (Multipart) 檔案上傳與串流下載
- 自動化清理背景任務
- ngrok 自動更新機制

## 後續優化重點
- 增加更多的單元測試 (Unit Tests)
- 前端 React/Vue UI 實作
- 完善 LINE 互動介面 (Rich Menu, Flex Message)
- 檔案預覽功能與快取優化
