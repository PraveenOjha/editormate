# 🛡️ Security, Privacy & Zero-Data Architecture

> **EditorMate operates under a strict Zero-Party Data Principle:** Your code, file names, prompts, and credentials never touch third-party cloud servers or external databases.

---

## 🔒 1. Core Security Guarantees

### 1. Zero Cloud Data Retention
- EditorMate does not operate multi-tenant cloud storage servers.
- When you execute a command, request a snapshot, or send a voice prompt, the data travels exclusively between your mobile messaging client and your local workstation.
- We operate **zero telemetry trackers**, **zero code telemetry**, and **zero AI training pipelines** on your software.

### 2. Strict Localhost Binding
- The companion daemon binds strictly to loopback interface `127.0.0.1:4588` (or `localhost`).
- It does **not** bind to `0.0.0.0` or external network adapters.
- It is physically unreachable by other devices on your local Wi-Fi network unless you explicitly establish an authenticated tunnel.

### 3. Outbound-Only Communication
- EditorMate does not require you to open inbound firewall ports or configure router port forwarding.
- Communication with messaging platforms (Telegram, Discord, Slack, Matrix) uses **outbound long-polling or secure WebSockets** initiated by your workstation to official provider endpoints.

### 4. Native OS Keyring Encryption (AES-256-GCM)
- Sensitive secrets—such as Telegram Bot Tokens, Discord Tokens, and Slack Signing Secrets—are never stored in plaintext JSON files on disk.
- EditorMate stores secrets in your operating system's native secure credential vault:
  - **macOS:** Apple Keychain via Security Framework
  - **Linux:** Freedesktop SecretService (GNOME Keyring / KWallet)
  - **Windows:** Windows Credential Manager (DPAPI)

### 5. Single-User Cryptographic Whitelisting
- During setup, a one-time cryptographic pairing handshake is established (`/pair <random_token>`).
- Once paired, your messaging user ID (e.g. Telegram `user_id` or Discord `snowflake`) is permanently whitelisted.
- Messages, button clicks, or commands received from any other account are immediately discarded with an unauthorized security log.

### 6. Selective Active Window Capture
- When `/snap` is executed, EditorMate uses operating system window handle APIs:
  - **macOS:** `screencapture -x -l<window_id>`
  - **Linux Wayland:** `spectacle -a` or `grim` window focus
  - **Linux X11:** `xwd` window isolation
  - **Windows:** .NET Win32 `Graphics.CopyFromScreen` with active IDE handle bounds
- **Only the IDE window rectangle is captured.** Your desktop wallpaper, secondary monitors, personal browser tabs, password managers, and background chat apps remain completely uncaptured.

---

## 🛑 2. Threat Model & Mitigations

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **Unauthorized User Messaging Your Bot** | Rejected at the gateway. Only the paired user ID matches the cryptographic whitelist. |
| **Accidental Destructive Shell Commands** | Sensitive commands require explicit interactive confirmation (`/approve` or button tap). |
| **Network Eavesdropping** | All transport to Telegram, WhatsApp, Discord, Slack, and Matrix is encrypted with TLS 1.3. |
| **Local Malware Reading Config** | Credentials encrypted at rest with hardware-backed OS keyrings. |
| **Shutter Sound Alerting Office** | Native capture uses silent flags (`-x`) to mute all hardware audio feedback. |

---

## 📜 3. Privacy Compliance Statement

EditorMate fully complies with **GDPR (Article 25 — Privacy by Design)**, **CCPA/CPRA**, and enterprise corporate confidentiality policies because **no personal data or proprietary code is collected, transferred, or processed by EditorMate**.
