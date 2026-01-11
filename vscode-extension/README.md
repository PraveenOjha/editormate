# EditorMate VS Code Extension (Scaffold)

This minimal extension shows a webview that fetches the Host Agent `/pairing` endpoint and displays:
- QR (deep link) for mobile pairing
- SSH commands to copy
- A button to open the deep link

Commands:
- `EditorMate: Show Pairing QR` — prompts for the Host IP and loads pairing data.

Development:
- Run a dev compiler that watches for changes: `npm run dev`
- Build once: `npm run build` (alias for `npm run compile`)
- Run the extension in the Extension Development Host (press F5 or use Run & Debug → "Run Extension").

Tips:
- Use the `Run Extension (build before launch)` configuration to run a build automatically before launching the debug host.
- To speed up iteration, run `npm run dev` (watch) in a terminal and then use `Run Extension` (no pre-launch build needed).

New features:
- A **EditorMate** icon appears in the Activity Bar (left side). Click it and open the **Chat** view or click the status item in the status bar to open the chat.
- The extension attempts to auto-detect the agent on your LAN, and if not found, will auto-start the local agent when `editormate.autoStartAgent` is enabled.
- The chat view receives real-time messages from mobile via the agent using Server-Sent Events (SSE). Mobile apps can POST to `http://<host>:3000/messages` to broadcast messages that appear in the chat.

## Notifications & Tunneling (MVP)
We plan to use **FCM (Android)** and **APNs (iOS)** for device wake and notification delivery. See `docs/notifications-tunneling.md` for the MVP spec (wake-token payloads, server relay API, and mobile wake-and-fetch flow).

Security note:
- The `/messages` endpoint is currently unauthenticated and intended for local network use only. For remote or internet-exposed setups, secure this endpoint (token, TLS, or onion routing) before use.
