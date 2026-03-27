# File Exchange Station

本機執行的暫存檔案交換站，使用 Node.js + TypeScript + MySQL，預計透過 ngrok 對外並整合 LINE Bot。

## 目前狀態
- 已建立文件骨架
- 已建立最小 Node + TypeScript 專案骨架
- 已加入 `/health` 與 MySQL 連線檢查雛形
- 已提供 `.env.example`

## 專案結構
```text
file-exchange-station/
  docs/
    architecture.md
    development.md
  src/
    config/
    db/
    server/
  storage/
    uploads/
  .env.example
  .gitignore
  package.json
  tsconfig.json
```

## 環境變數
請複製 `.env.example` 為 `.env`，並填入實際值。

```env
PORT=3000
APP_BASE_URL=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=file_exchange
DB_PASSWORD=
DB_NAME=file_exchange_station
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
NGROK_AUTHTOKEN=
STORAGE_ROOT=./storage/uploads
DEFAULT_TTL_MINUTES=1440
MAX_FILE_SIZE_MB=100
```

## 開發
安裝依賴：

```bash
npm install
```

啟動開發模式：

```bash
npm run dev
```

型別檢查：

```bash
npm run typecheck
```

建置：

```bash
npm run build
```

## 健康檢查
啟動後可檢查：

```bash
curl http://127.0.0.1:3000/health
```

成功時會回傳應用狀態與資料庫連線狀態。

## 文件
- `docs/architecture.md`：整體架構與模組邊界
- `docs/development.md`：開發環境、流程、實作順序

## 下一步
- session / file schema migration
- upload / download API
- LINE webhook handler
- cleanup job
- ngrok webhook refresh flow
