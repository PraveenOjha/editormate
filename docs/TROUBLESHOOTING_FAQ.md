# ❓ Troubleshooting & Frequently Asked Questions (FAQ)

> Quick solutions to common setup, connection, audio, and operating system permission issues.

---

## 🛠️ Frequently Asked Questions (FAQ)

### Q: Does my computer need to remain powered on?
**A:** Yes. EditorMate runs as a companion on your local machine and directs your desktop IDE. If your workstation shuts down, the coding agent cannot execute tasks. If using a laptop, ensure it is plugged in and configured not to sleep when the lid is closed.

### Q: Does EditorMate work when I am away from home on 5G mobile data?
**A:** Yes! Because the companion daemon connects outbound to Telegram, WhatsApp, or Discord, your phone can be anywhere in the world on cellular data with **zero port forwarding, dynamic DNS, or VPN configuration**.

### Q: Can multiple people on my team control the same workstation?
**A:** By default, pairing is restricted to a single administrator user ID for security. However, team licenses allow multi-user whitelisting in `config.json` under `allowedUserIds`.

### Q: What is the difference between Free Trial and Lifetime Pro?
**A:** 
- **7-Day Free Trial:** Includes 100% full features across all platforms (Telegram, WhatsApp, Discord, Slack, Matrix), voice notes, and window snapshots.
- **Lifetime Pro:** Single one-time purchase with permanent device seat binding, free future updates, and priority support. Zero monthly subscriptions.

---

## 🔧 Troubleshooting Common Issues

### 1. Workstation Goes to Sleep While I'm Away
- **macOS:** Open System Settings -> Lock Screen -> Turn display off on battery/power adapter -> Set to *"Never"* (or run `caffeinate -d` in a background terminal).
- **Linux:** Run `systemd-inhibit --what=sleep editormate daemon` or disable automatic suspend in power settings.
- **Windows:** Open Power & Battery Settings -> Sleep -> Set to *"Never"* when plugged in.

### 2. macOS Screen Recording Permission Denied
If `/snap` returns a black screen or permission prompt on macOS:
1. Open **System Settings** -> **Privacy & Security** -> **Screen & System Audio Recording**.
2. Ensure **Terminal**, **iTerm**, or **VS Code / Antigravity / Cursor** is toggled **ON**.
3. If prompted, restart the IDE or terminal.

### 3. Linux Wayland Snapshot Troubleshooting
On modern Wayland desktops (GNOME, KDE Plasma 6, Hyprland):
- Ensure `spectacle` (KDE) or `grim` + `slurp` (GNOME/wlroots) is installed:
  ```bash
  # Debian/Ubuntu
  sudo apt install grim slurp

  # Fedora
  sudo dnf install grim slurp

  # Arch Linux
  sudo pacman -S grim slurp
  ```

### 4. WhatsApp Bridge Disconnected
If WhatsApp messages stop arriving:
1. In WhatsApp on your phone, go to **Settings** -> **Linked Devices**.
2. If "EditorMate" shows logged out, run `editormate pair --platform whatsapp` and scan the QR code once more.
3. EditorMate will store your refreshed session keys in `~/.editormate/whatsapp_auth/`.

### 5. Telegram Bot Not Responding
1. Verify the daemon is running:
   ```bash
   editormate status
   ```
2. Verify your bot token has not been revoked in `@BotFather`.
3. Check the local daemon log:
   ```bash
   tail -n 50 ~/.editormate/logs/daemon.log
   ```

### 6. Changing the Default Port
If port `4588` conflicts with another local service on your machine:
```bash
editormate daemon --port 4599
```
Or set the environment variable:
```bash
export EDITORMATE_PORT=4599
```

---

<p align="center">
  <sub>Still need help? Open an issue on <a href="https://github.com/PraveenOjha/editormate/issues">GitHub Issues</a> or reach out at <a href="https://praveenojha.com/store/editormate/support">praveenojha.com/store/editormate/support</a>.</sub>
</p>
