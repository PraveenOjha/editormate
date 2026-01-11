# Project TODO (Snapshot)

This file captures the high-level tasks related to Notifications & Tunneling (MVP) and associated follow-ups.

- [ ] Implement server-side notification relay (FCM & APNs) — MVP: send minimal wake-token payloads
- [ ] Mobile: register for push, handle background notification, and implement wake-and-fetch SSH connection
- [ ] Implement SSH tunnel support and a reconnect/wakeup strategy (reverse tunnel, relay, or maintained connection)
- [ ] Encrypt/limit notification payloads & define privacy/security model (only wake tokens in notifications)
- [ ] Add extension UI settings for notification service, tunneling options, and opt-in controls
- [ ] Add tests (unit + e2e) and CI checks for notification delivery and background wake flows
- [ ] Update docs, migration notes, and developer guide for notification/tunnel setup

> Notes:
> - MVP decisions: FCM (Android) & APNs (iOS) selected. Use wake-token + SSH wake-and-fetch pattern to keep message content off the push layer.
> - See `docs/notifications-tunneling.md` for the MVP payload and server API examples.

_Added by GitHub Copilot as part of MVP planning._