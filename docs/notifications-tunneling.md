# Notifications & Tunneling — MVP Notes

This document captures the current decision and minimal implementation notes for EditorMate's notification and tunneling MVP.

## Goals
- Allow the Agent/Extension to wake a paired mobile device to fetch critical events/messages.
- Keep sensitive payloads off push notifications; use push only to carry a minimal wake token and metadata.
- Ensure the mobile app opens an authenticated SSH/tunnel connection (wake-and-fetch) to retrieve the full message over SSH.

## Providers (MVP)
- Android: Firebase Cloud Messaging (FCM)
- iOS: Apple Push Notification service (APNs)
- Note: Consider VoIP pushes for call-like or ultra-low-latency flows later (requires policy checks).

## MVP payload format (server -> push)
- Keep notification payload minimal. Example (FCM data message or APNs silent push):

```
{
  "type": "wake",
  "wake_token": "<short-lived-token>",
  "origin": "editor",          // optional small metadata
  "priority": "high"
}
```

- The wake_token is a short-lived token stored server-side. The mobile client uses it to authenticate a short-lived request over SSH/tunnel.

## Server relay API (MVP)
- POST /api/push/send
  - body: { deviceId, provider: "fcm"|"apns", wakeToken, title?, silent?: boolean }
  - behavior: translate into FCM/APNs push and send with retry & logging.

## Mobile behavior (MVP)
1. App registers for push and sends device token to Agent/Server during pairing.  
2. On wake push: app uses wake_token to establish SSH/tunnel and requests full message.  
3. If user-visible, show the OS notification; otherwise handle silently and open UI if necessary.

## Security & privacy
- Notification payload contains no plaintext message content.  
- wake_token: short TTL (e.g., 60s), bound to a specific pairing identity and limited to a single use.  
- All message content fetched on the SSH tunnel; messages are end-to-end authenticated using the existing SSH pairing keys.

## Future enhancements (backlog)
- Long-lived reverse-tunnel or relay when mobile cannot maintain long-lived TCP connections.  
- VoIP pushes and background modes for iOS for more reliable wake behavior.  
- Opt-in/opt-out UI and notification preferences in the extension and mobile.  
- E2E tests and monitoring for push delivery & wake success metrics.

---

_Added to project by GitHub Copilot as part of MVP planning._
