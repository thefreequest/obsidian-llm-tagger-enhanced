# Mobile Setup Guide

This guide explains how to use LLM Tagger Enhanced on mobile devices (iOS/iPadOS/Android) by connecting to a remote Ollama instance.

## Prerequisites

- Ollama installed and running on a desktop/server (Windows, Mac, Linux)
- Network connectivity between mobile device and Ollama server
- Mobile device running Obsidian with LLM Tagger Enhanced plugin

## Quick Setup

### 1. Configure Ollama Server (One-time setup)

Ollama by default only accepts connections from `localhost`. You need to configure it to accept connections from your mobile device.

#### Option A: Using Tailscale (Recommended - Secure)

**On your Ollama server:**

1. Install Tailscale on your computer: https://tailscale.com/download
2. Configure Ollama to accept external connections:

   **Linux/Mac:**
   ```bash
   # Set environment variable
   export OLLAMA_HOST=0.0.0.0:11434
   export OLLAMA_ORIGINS=*

   # Restart Ollama
   ollama serve
   ```

   **Or add to systemd service (Linux):**
   ```bash
   sudo systemctl edit ollama
   ```

   Add:
   ```ini
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0:11434"
   Environment="OLLAMA_ORIGINS=*"
   ```

   Then restart:
   ```bash
   sudo systemctl restart ollama
   ```

   **Windows:**
   ```powershell
   # Set environment variables
   [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")
   [System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")

   # Restart Ollama application
   ```

3. Find your Tailscale IP:
   ```bash
   tailscale ip -4
   # Example output: 100.x.x.x
   ```

4. Test from mobile:
   ```bash
   # On iPad/iPhone with a-Shell or similar, or from another computer:
   curl http://100.x.x.x:11434/api/tags
   ```

**On your mobile device:**

1. Install Tailscale on iPad/iPhone: https://apps.apple.com/app/tailscale/id1470499037
2. Log in to the same Tailscale network
3. Your Ollama URL will be: `http://100.x.x.x:11434`

#### Option B: Local Network (Less Secure)

**On your Ollama server:**

1. Configure Ollama same as above (set `OLLAMA_HOST=0.0.0.0:11434`)

2. Find your local IP address:
   - **Linux/Mac**: `ip addr` or `ifconfig`
   - **Windows**: `ipconfig`
   - Look for something like `192.168.1.xxx` or `10.0.0.xxx`

3. Ensure firewall allows port 11434:
   ```bash
   # Linux (ufw)
   sudo ufw allow 11434/tcp

   # Or iptables
   sudo iptables -A INPUT -p tcp --dport 11434 -j ACCEPT
   ```

**On your mobile device:**

1. Connect to the same WiFi network
2. Your Ollama URL will be: `http://192.168.1.xxx:11434`

### 2. Configure Plugin on Mobile

1. Open Obsidian on your mobile device
2. Go to **Settings → Community Plugins**
3. Find **LLM Tagger Enhanced** and enable it
4. Click the gear icon ⚙️ next to the plugin
5. Under **Ollama server URL**, change from:
   ```
   http://localhost:11434
   ```
   To your Ollama server URL:
   ```
   http://100.x.x.x:11434      (Tailscale)
   or
   http://192.168.1.xxx:11434  (Local network)
   ```
6. Click outside the field to save
7. Refresh the model list - you should now see your models!

## Troubleshooting

### "Failed to load models" Error

This usually means one of the following:

#### 1. CORS Issue (Most Common)

**Symptoms:**
- Error in console: `CORS policy` or `Access-Control-Allow-Origin`

**Solution:**
Make sure `OLLAMA_ORIGINS` environment variable is set:

```bash
# Allow all origins (least secure but works)
export OLLAMA_ORIGINS=*

# Or allow specific origin
export OLLAMA_ORIGINS=app://obsidian.md,capacitor://localhost
```

Then restart Ollama.

#### 2. Connection Refused

**Symptoms:**
- Error: `Failed to fetch` or `Network error`
- Cannot reach the server at all

**Check:**
```bash
# From your mobile device or another computer on same network:
curl http://YOUR_OLLAMA_IP:11434/api/tags

# Should return JSON with model list
```

**Solutions:**
- Ensure Ollama is running: `ollama list` should work on server
- Check `OLLAMA_HOST=0.0.0.0:11434` is set (not just `127.0.0.1`)
- Check firewall allows port 11434
- Verify IP address is correct and reachable

#### 3. Wrong URL Format

**Symptoms:**
- Plugin says "Failed to connect"

**Check:**
- URL must include `http://` prefix
- URL must include port `:11434`
- No trailing slash
- Correct format: `http://100.x.x.x:11434`
- Wrong formats:
  - ❌ `100.x.x.x:11434` (missing http://)
  - ❌ `http://100.x.x.x` (missing port)
  - ❌ `http://100.x.x.x:11434/` (trailing slash)

#### 4. Ollama Not Exposing API

**Check version:**
```bash
ollama --version
```

Make sure you're running a recent version. Update if needed:
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Mac
brew upgrade ollama

# Windows
# Download latest from https://ollama.com/download
```

### Testing Your Setup

Run these tests in order:

**1. Test Ollama locally on server:**
```bash
curl http://localhost:11434/api/tags
```
Should return JSON with models.

**2. Test Ollama from external IP on server:**
```bash
curl http://0.0.0.0:11434/api/tags
# or
curl http://$(hostname -I | awk '{print $1}'):11434/api/tags
```
Should return same JSON.

**3. Test from mobile device:**
- Open Safari/Chrome on mobile
- Navigate to: `http://YOUR_OLLAMA_IP:11434/api/tags`
- Should see JSON with model list

**4. Test in Obsidian:**
- Open Developer Tools (Settings → About → Show debug info)
- Look for console errors when loading models
- Error messages will tell you exactly what's wrong

## Security Considerations

### Tailscale (Most Secure)
✅ Encrypted VPN connection
✅ Only devices on your Tailscale network can access
✅ Works from anywhere (home, office, mobile data)
⚠️ Requires Tailscale account and app on both devices

### Local Network (Moderate Security)
✅ Only devices on your WiFi can access
⚠️ Anyone on your WiFi network can access Ollama
⚠️ Only works when on same network
⚠️ No encryption between devices

### Public IP / Port Forwarding (Not Recommended)
❌ Exposes Ollama to entire internet
❌ No authentication by default
❌ Risk of abuse/attacks
❌ Only use with proper authentication/reverse proxy

## Recommended Setup

For the best balance of security and convenience:

1. **Use Tailscale** for remote access
2. **Set `OLLAMA_ORIGINS=app://obsidian.md,capacitor://localhost`** (more restrictive than `*`)
3. **Keep Ollama updated** for latest security patches
4. **Monitor Ollama logs** for unusual activity

## Performance Tips

- **Network latency:** Tagging will be slower on mobile due to network
- **Use faster models:** Prefer `mistral` over `llama2:13b` for better mobile experience
- **Batch operations:** Do bulk tagging when on fast WiFi
- **Check battery:** LLM processing on server won't drain mobile battery, but network usage will

## Advanced: HTTPS with Reverse Proxy

For production use, consider setting up a reverse proxy with HTTPS:

```nginx
# nginx example
server {
    listen 443 ssl;
    server_name ollama.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then use `https://ollama.yourdomain.com` as your Ollama URL.

## Getting Help

If you're still having issues:

1. Check the **Developer Console** in Obsidian mobile
2. Look for specific error messages
3. Open an issue with:
   - Error message from console
   - Your Ollama version (`ollama --version`)
   - Your network setup (Tailscale/local/etc)
   - Steps you've already tried

---

**Note:** This setup allows you to use your desktop's computing power for LLM processing while organizing notes on your mobile device. The actual LLM inference happens on your Ollama server, not on your phone/tablet!
