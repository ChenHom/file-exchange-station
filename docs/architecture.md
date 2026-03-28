# Architecture

## 目標
做一個 local-first 的暫存檔交換站：
- MySQL 存 metadata
- 本機檔案系統存檔案
- ngrok 對外
- LINE Bot 管流程

## 模組切分
- `src/config`：環境變數
- `src/db`：MySQL 連線與 migration
- `src/modules/sessions`：session 生命週期
- `src/modules/files`：上傳/下載/刪除
- `src/modules/storage`：檔案落盤與刪除
- `src/modules/tokens`：token 產生與雜湊
- `src/modules/events`：audit/event
- `src/modules/line`：LINE webhook
- `src/jobs`：cleanup
- `src/server`：HTTP routes

## 設計原則
- transport 不放 business logic
- service 不直接綁 HTTP
- storage 不直接綁 LINE
- token 不明文存 DB
- local path 不外露

## 上線前缺口
- 真正的 upload/download stream
- LINE signature 驗證
- ngrok webhook refresh
- runbook / smoke test
