# File Exchange Station

本機執行的暫存檔案交換站，使用 Node.js + TypeScript + MySQL，透過 ngrok 對外並整合 LINE Bot。

## 現況
- Node + TypeScript 骨架已建立
- MySQL migration 已可跑
- Session / file / event 基礎 domain 已開始實作
- `/health` 與核心 API 路由已建立
- README / docs 已整理

## 專案結構
```text
src/
  config/
  db/
  jobs/
  modules/
    events/
    files/
    line/
    sessions/
    storage/
    tokens/
  server/
  shared/
```

## 環境變數
請以 `.env.example` 複製出 `.env`。

## 開發指令
```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## API 概要
- `GET /health`
- `GET /`
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:code`
- `GET /api/sessions/:code/files`
- `DELETE /api/files/:id`
- `GET /api/files/:id/download`
- `POST /webhooks/line`

## 已完成的方向
- local-first
- MySQL metadata
- filesystem storage
- token / hash 基礎
- cleanup job 雛形
- LINE webhook stub

## 下一步還要補
- 真正的 multipart upload
- download stream
- session/file token 驗證
- LINE signature 驗證
- cleanup job 完整化
- go-live runbook
