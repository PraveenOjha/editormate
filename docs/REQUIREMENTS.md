# EditorMate Requirements & Technical Roadmap

## 1. Core Philosophy & Constraints
*Reference: MANIFESTO.md*

- **Mobile First Control Layer**: Not an IDE, but a reasoning/control layer.
- **Constraints**: No deep refactoring, no silent changes, no cloud execution of user code.
- **Agent Location**: Host-only. keys stay on host.

## 2. Networking & Connectivity Strategy

### Phase 1: Local Development (MVP)
- **Protocol**: SSH (Local LAN).
- **Discovery**: Manual IP entry or local mDNS.
- **Host Prerequisites**:
    - Host Agent checks for active network interfaces on startup.
    - Host Agent validates port 2222 availability.
    - Host Agent displays "Connect to: <IP>:2222" QR/Text.
- **Auth**: SSH Key pair generated on mobile, public key added to host `authorized_keys` (or custom agent auth).
- **Focus**: Get the control loop working without complex traversal logic.

### Phase 2: Remote Access (Production)
- **Tunneling**: Cloudflare Tunnel (cloudflared) for NAT traversal.
- **Session Management**: Firebase (Firestore/Realtime DB) to store connection metadata (not code).
- **Connection Flow**:
    1. Host Agent starts `cloudflared` tunnel.
    2. Host posts connection status/ID to Firebase (linked to user account).
    3. Mobile App (Logged in) fetches active sessions.
    4. **One-Click Connect**: User selects session to connect.
    5. **QR Code**: Alternative flow for login-less pairing or instant context transfer.

- **Pairing Endpoint (Host)**: The Host Agent exposes a `/pairing` HTTP endpoint that returns:
    - `sshCommands`: an array of SSH command strings for each local IP (e.g. `ssh user@192.168.1.22 -p 2222`).
    - `qrDataUrl`: a data URL (PNG) containing a QR code of the primary SSH command for quick mobile scanning.

  Example: `GET /pairing` → `{ sshCommands: [...], qrDataUrl: 'data:image/png;base64,...' }`


## 3. Host Agent (Node.js + TS)
- **Runtime**: Node.js (Latest LTS).
- **Communication**: WebSocket / HTTP over the secure tunnel.
- **Capabilities**:
    - **PTY Management**: Spawning pseudo-terminals for shell access.
    - **File System**: Read/Write within workspaces.
    - **LLM Orchestration**: Interfacing with Ollama (local) or APIs (OpenAI/Anthropic).
    - **Git Integration**: Diff viewing, staging, committing.

## 4. Mobile App (React Native)
- **Platform**: iOS & Android (Expo or CLI).
- **Storage**: Local encrypted storage for SSH keys/Auth tokens.
- **UI Components**:
    - Chat Interface (The "Command Center").
    - Activity Feed (Long-running tasks).
    - Context Manager (File selection/tagging).

## 5. Security Architecture
- **Zero Trust**: Mobile never trusts the cloud with code.
- **E2E Encryption**: Traffic flows through tunnel encrypted.
- **Key Management**: LLM API keys reside strictly on the Host (env vars or secure store). Mobile sends *intents*, Host executes *prompts*.
