# File Exchange Station

## Overview
A local-first temporary file exchange website running on Node.js + TypeScript, exposed via ngrok, and integrated with LINE Bot for notifications and control.

## Fixed technical choices
- Runtime: Node.js
- Language: TypeScript
- Backend style: no heavyweight backend framework
- Database: MySQL
- Exposure: ngrok
- Messaging integration: LINE Messaging API webhook

## Goals
- Temporary file exchange across devices/users
- Local execution on the owner's machine
- External access only through ngrok
- LINE Bot for workflow control and notifications
- Automatic cleanup of expired files
- Keep dependencies low and architecture understandable

## Non-goals
- Not a permanent cloud drive
- Not public anonymous file hosting
- Not a collaboration suite

## Architecture summary
- Web UI: static HTML/JS/TS-built frontend for upload/download/list operations
- HTTP service: Node.js native HTTP server or minimal router layer, no large framework
- Storage metadata: MySQL tables for exchange sessions, files, events, access tokens
- File blobs: local filesystem storage
- Public ingress: ngrok HTTPS tunnel
- Bot interface: LINE webhook endpoint handled by the same Node service
- Background jobs: expiration cleanup, token invalidation, notification dispatch

## Core modules
1. Web UI
2. Upload API
3. Download API
4. Exchange session management
5. LINE Bot webhook handler
6. Expiration/cleanup worker
7. Audit/event logging
8. Config and secret management

## Suggested folder structure
```text
file-exchange-station/
  docs/
    architecture.md
    development.md
  src/
    server/
    modules/
    shared/
    jobs/
  public/
  scripts/
  storage/
    uploads/
  tests/
  .env.example
  package.json
  tsconfig.json
```

## Data model draft
### exchange_sessions
- id
- code
- title
- created_by
- created_at
- expires_at
- status

### files
- id
- session_id
- original_name
- stored_name
- mime_type
- size_bytes
- sha256
- upload_status
- created_at
- expires_at
- download_count

### access_tokens
- id
- session_id
- token_hash
- scope
- created_at
- expires_at
- max_uses
- used_count

### events
- id
- session_id
- file_id
- actor
- event_type
- payload_json
- created_at

## API draft
### Public web
- GET /health
- GET /api/session/:code
- GET /api/session/:code/files
- POST /api/session/:code/upload
- POST /api/session/:code/complete-upload
- GET /api/file/:id/download
- DELETE /api/file/:id

### LINE webhook
- POST /webhooks/line

### Internal/admin
- POST /internal/session
- POST /internal/session/:id/expire
- POST /internal/ngrok/refresh-webhook

## LINE Bot capabilities
- Create temporary exchange session
- Return upload URL and expiry
- Notify on upload completion
- Notify before expiry
- Show active sessions
- Delete file/session on command
- Rebind webhook URL when ngrok URL changes

## Security requirements
- Never expose local paths
- Verify LINE signature
- Use high-entropy session codes/tokens
- Hash stored tokens
- Restrict file size/types if needed
- Normalize filenames
- Enforce TTL cleanup
- Keep secrets only in env/config, never in client
- Audit uploads/downloads/deletes

## Development phases
### Phase 1 - MVP
- Session creation
- Drag-and-drop upload
- File list
- Download
- Manual delete
- TTL cleanup
- LINE notifications

### Phase 2 - Better UX
- Progress bars
- Countdown timers
- Polling or SSE refresh
- One-time download links
- Download limits

### Phase 3 - Robustness
- Chunk upload
- Resume upload
- Rate limiting
- Better audit logs
- Automatic LINE webhook refresh when ngrok changes

## Deployment notes
- Run locally with Node.js
- MySQL can be local or remote
- ngrok provides HTTPS public endpoint
- Update LINE webhook to current ngrok URL
- Prefer process manager for local service (systemd/pm2)
