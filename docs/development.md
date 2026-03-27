# Development Guide

## 1. Stack
- Node.js
- TypeScript
- MySQL
- ngrok
- LINE Messaging API

## 2. Local prerequisites
- Node.js 20+
- npm or pnpm
- MySQL connection info
- ngrok installed and authenticated
- LINE channel access token and channel secret

## 3. Environment variables
```env
PORT=3000
APP_BASE_URL=https://example.ngrok-free.app
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=file_exchange
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
NGROK_AUTHTOKEN=
STORAGE_ROOT=./storage/uploads
DEFAULT_TTL_MINUTES=1440
MAX_FILE_SIZE_MB=100
```

## 4. Bootstrapping
1. Initialize Node.js + TypeScript project.
2. Enable strict TypeScript settings.
3. Create folders: src, public, docs, storage/uploads, scripts.
4. Add MySQL connection module.
5. Add SQL migration scripts.
6. Implement health endpoint.
7. Implement session creation and retrieval.
8. Implement upload/download/delete APIs.
9. Implement LINE webhook verification.
10. Implement expiration job.

## 5. Suggested source layout
```text
src/
  index.ts
  config/
    env.ts
  server/
    http.ts
    routes.ts
  modules/
    sessions/
    files/
    tokens/
    line/
  db/
    client.ts
    migrations/
  jobs/
    cleanup.ts
  shared/
    logger.ts
    errors.ts
    crypto.ts
    time.ts
```

## 6. SQL migration outline
### exchange_sessions
- create table
- unique code index
- expiry index

### files
- foreign key to session
- expiry index
- upload status index

### access_tokens
- token hash index
- expiry index

### events
- session id index
- created_at index

## 7. Development workflow
1. Start MySQL.
2. Run migrations.
3. Start local Node service.
4. Start ngrok tunnel.
5. Set LINE webhook to `${APP_BASE_URL}/webhooks/line`.
6. Test create-session command from LINE.
7. Open returned link and upload a file.
8. Confirm DB row, local file blob, and LINE notification.

## 8. Testing priorities
- session expiry correctness
- token validation
- upload size/type enforcement
- path traversal prevention
- webhook signature verification
- cleanup consistency between MySQL and filesystem
- invalid/expired download handling

## 9. Logging and observability
Log at least:
- session created
- upload started/completed/failed
- file downloaded
- file deleted
- cleanup deleted expired data
- LINE webhook verification failure
- ngrok/webhook refresh action

## 10. Publish checklist
Before pushing repo:
- remove secrets
- provide .env.example only
- add README
- add docs/architecture.md
- add docs/development.md
- add .gitignore for node_modules, storage, env files, logs
- ensure no local uploaded blobs are committed

## 11. Recommended next implementation order
1. docs and repo skeleton
2. env/config loading
3. db client and migrations
4. session APIs
5. upload/download APIs
6. LINE webhook integration
7. cleanup scheduler
8. polish UI
