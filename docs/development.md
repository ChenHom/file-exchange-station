# Development

## 流程
1. `npm install`
2. 填 `.env`
3. 啟動 MySQL
4. `npm run dev`
5. 測 `/health`

## 目前實作重點
- session create/read
- file list/delete stub
- storage module
- token module
- cleanup job 雛形
- LINE webhook stub

## 後續優先順序
1. session / file CRUD 完整化
2. multipart upload
3. download stream
4. token 驗證
5. LINE signature 驗證
6. ngrok + go-live 流程
