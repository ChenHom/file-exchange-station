# DB Migration: MySQL/TiDB → SQLite

**日期**：2026-06-25
**Branch**：`feat/sqlite-migration`

## Why

原本 file-exchange-station 透過 `mysql2` 連 TiDB（`127.0.0.1:4000`），
但 TiDB stack 在 2026-06-22 的 rag-stack 重整時已整組移除（rag-stack 改用 SQLite + Qdrant），
file-exchange-station 沒一起遷移，導致 `/health` 回報 `database: down`，所有 session/upload API 失敗。

決策：跟 rag-stack 對齊，改用 SQLite（`better-sqlite3`），避免在這台機器上再養一套 DB stack。

## What changed

| 檔案 | 變更 |
|---|---|
| `package.json` | `-mysql2` `+better-sqlite3` `+@types/better-sqlite3` |
| `src/config/env.ts` | `DB_HOST/PORT/USER/PASSWORD/NAME` → `SQLITE_PATH` |
| `src/db/client.ts` | mysql2 connection → singleton `better-sqlite3` Database，啟用 `journal_mode=WAL` / `foreign_keys=ON` / `busy_timeout=5000` |
| `src/db/query.ts` | mysql2 prepared connection → better-sqlite3 prepared statements；維持 `execute / queryOne / queryMany` 對外介面 |
| `src/db/schema.ts` | MySQL DDL → SQLite DDL，舊 10 條 ALTER 鏈合併成完整 CREATE TABLE |
| `src/db/migrate.ts` | mysql2 multipleStatements → better-sqlite3 transaction |
| `src/jobs/cleanup.ts` | `NOW()` → `strftime('%Y-%m-%d %H:%M:%f','now')`；`ON DUPLICATE KEY UPDATE` → `ON CONFLICT DO UPDATE` |
| `src/modules/config/system-config.ts` | 同上 upsert 改寫 |
| `.env` | 註解掉 `DB_*`，加 `SQLITE_PATH=/home/hom/services/file-exchange-station/storage/file-exchange.db` |
| `.gitignore` | 加 `storage/file-exchange.db*`、`.env.bak.*` |

### Schema 對應

| MySQL/TiDB | SQLite |
|---|---|
| `BIGINT UNSIGNED AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `ENUM('a','b','c')` | `TEXT CHECK (col IN ('a','b','c'))` |
| `DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)` | `TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))` |
| `ON UPDATE CURRENT_TIMESTAMP(3)` | 移除（由 application 層帶 timestamp，目前沒人用 `updated_at` 排序） |
| `JSON` | `TEXT`（仍以 `JSON.stringify` 寫入） |
| `FOREIGN KEY ... ON DELETE CASCADE/SET NULL` | 同上，但要 `PRAGMA foreign_keys = ON`（已在 client.ts 開） |

## Data migration

**沒有舊資料保留**。TiDB stack 在 6/22 已被清除，無資料可救；新 SQLite 從空開始，符合既定使用情境（file-exchange 本來就是臨時交換站，session 過期就丟）。

## Verification

1. `npm run typecheck` ✅
2. `npm run build` ✅
3. `npm test` — 17/17 ✅（DB 是 mocked，不需 live DB）
4. Smoke test：migrations 跑完，4 張表建好，INSERT/SELECT/`insertId` 正常，UPSERT 正常，FK CASCADE 正常 ✅
5. End-to-end：
   - `POST /api/sessions` → 拿到 code
   - `POST /api/sessions/<code>/files` multipart 上傳 → 拿到 file code
   - `GET /api/files/<code>/download` → 回原始內容
   - `downloadCount` 0 → 1 ✅
6. nginx proxy：`http://192.168.50.109/file-exchange/api/sessions/<code>/files` → 200 ✅
7. `/health` → `{"ok":true,"database":"up"}` ✅

## Rollback

- branch `feat/sqlite-migration` 可直接 `git checkout master` 回退。
- 真要回 MySQL 需要重啟一個 mysql/mariadb container，本地沒備份必要（無資料可救）。

## Follow-up（非必要）

- 之後若需要更乾淨的 timestamp 自動更新，可考慮在 sqlite 加 trigger 補 `ON UPDATE`；現況沒有 code path 依賴它。
- 可以把 `npm run start` 包成 systemd user unit，避免 reload 後要手動 `node dist/index.js`。
