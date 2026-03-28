# Architecture

## 目標
做一個 local-first 的暫存檔交換站：
- MySQL 存 metadata
- 本機檔案系統存檔案
- ngrok 對外
- LINE Bot 管流程

## 模組切分
- `src/config`：環境變數與核心配置
- `src/db`：MySQL 連線、migration 與查詢輔助工具
- `src/modules/sessions`：交換站生命週期管理
- `src/modules/files`：檔案 metadata、上傳、下載與刪除邏輯
- `src/modules/storage`：實體檔案讀取、寫入與刪除 (FS 層)
- `src/modules/tokens`：HMAC-based 安全 Token 產生與驗證
- `src/modules/events`：稽核與事件日誌記錄
- `src/modules/line`：LINE Webhook 解析與 Messaging API 客戶端
- `src/jobs`：自動清理過期會話與實體檔案的排程任務
- `src/server`：HTTP Server 基底與 RESTful 路由分發

## 設計原則
- Transport 不放 Business Logic
- Service 不直接與 HTTP Request/Response 耦合
- Storage 不直接綁定特定業務場景
- 安全性：Token 不明文存入 DB，使用雜湊驗證
- 隱私：不洩漏本地檔案路徑給前端

## 目前核心實現
- 基於 Stream 的 Multipart 上傳與檔案下載
- LINE Webhook 簽章驗證 (X-Line-Signature)
- 啟動時自動探索並同步 ngrok 本地位址
- 定時掃描並執行實體檔案清理 (Garbage Collection)
