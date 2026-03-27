# Architecture

## 1. System context
The system is a local-first temporary file exchange service.
- Users interact through a web page and LINE Bot.
- The application runs on the owner's machine.
- ngrok exposes the local service through HTTPS.
- MySQL stores metadata.
- The local filesystem stores file contents.

## 2. Components
### 2.1 Node.js + TypeScript service
Responsibilities:
- Serve static web assets
- Provide upload/download/session APIs
- Receive LINE webhook events
- Validate tokens and access rights
- Schedule expiration and cleanup jobs

### 2.2 Web UI
Responsibilities:
- Drag-and-drop upload
- Show files and expiry state
- Download/delete operations
- Session access with token or code

### 2.3 MySQL
Responsibilities:
- Session records
- File metadata
- Access tokens
- Audit events
- Bot command state if needed

### 2.4 Local file storage
Responsibilities:
- Store uploaded file blobs
- Separate logical file id from physical filename
- Support safe deletion and cleanup

### 2.5 ngrok
Responsibilities:
- Public HTTPS entrypoint
- Stable inbound path for browser access and LINE webhook
- May require webhook refresh if URL changes

### 2.6 LINE Bot integration
Responsibilities:
- Create exchange sessions
- Deliver links and status messages
- Notify upload and expiration events
- Offer simple management commands

## 3. Request flows
### 3.1 Create session from LINE
1. User sends command to LINE Bot.
2. Bot handler creates session in MySQL.
3. Service generates code/token.
4. Service returns upload URL using ngrok base URL.
5. Bot replies with link and expiry.

### 3.2 Browser upload flow
1. User opens exchange link.
2. Browser requests session info.
3. User uploads file.
4. Server validates token and file policy.
5. Blob is stored locally.
6. Metadata is committed to MySQL.
7. Event is recorded.
8. Optional LINE notification is sent.

### 3.3 Download flow
1. User opens file link or clicks download.
2. Server validates access and expiration.
3. Server streams file from local storage.
4. Download event/count is updated.
5. Optional one-time token is invalidated.

### 3.4 Cleanup flow
1. Scheduled worker scans expired sessions/files.
2. Expired blobs are deleted from local storage.
3. Metadata status is marked expired/deleted.
4. Events are written.
5. Optional LINE notification is sent.

## 4. Design principles
- Local-first execution
- Minimal dependencies
- Clear separation between metadata and file blobs
- Time-limited access by default
- Secure-by-default token handling
- Observable events for debugging and audit

## 5. Data boundaries
### Trusted internal
- Environment variables
- LINE secrets
- MySQL credentials
- ngrok auth token
- local filesystem paths

### Externally exposed
- Public ngrok URL
- session code/token based links
- limited file/session metadata only

## 6. Operational concerns
- ngrok URL rotation may require LINE webhook update
- cleanup job must handle partially uploaded files
- file size limits should be configurable
- MySQL connectivity issues should not corrupt local storage state
- startup reconciliation should detect orphaned files/rows

## 7. Suggested implementation style
- TypeScript strict mode
- Native fetch / standard APIs where possible
- Minimal router abstraction or native HTTP server
- Repository layer for MySQL SQL access
- Service layer for session/file/token business rules
- Job runner for cleanup and notification tasks

## 8. Future extensions
- resumable chunk upload
- signed download URLs
- admin dashboard
- QR code sharing
- multi-user authorization model
- webhook auto-refresh API integration
