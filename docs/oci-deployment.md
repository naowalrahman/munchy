> [!NOTE]
> This document is AI-generated.

# OCI static-IP food proxy

## Current status

Deployed on 2026-09-05 in the tenancy's home region, US East (Ashburn):

- Instance: `munchy-food-proxy`, Ubuntu 24.04 Minimal ARM, A1 Flex, 1 OCPU / 6 GB RAM / 46.6 GB boot volume.
- Network: `munchy-network`, public subnet `munchy-public`, internet gateway and default route verified in the OCI browser.
- Reserved public IPv4: **129.80.164.67**. Outgoing address verified from the VM.
- App and proxy: https://munchy.129.80.164.67.sslip.io (trusted HTTPS through Caddy).
- OCI and guest firewall: TCP 22 restricted to operator `71.227.135.163/32`; TCP 80/443 public. Bun listens only on loopback. SSH access was updated and verified through a normal reboot on 2026-10-11.
- `munchy-proxy` and `caddy` system services are enabled. OAuth credentials and app token are root-readable only in `/etc/munchy-proxy.env`.
- Live search for apples and food detail 35718 both returned HTTP 200 from FatSecret. Missing app token returned 401; foreign Origin returned 403.
- Storage permission remains pending: `cacheSeconds=0`. Search and inspection work; persisting FatSecret nutrition requires appropriate account permission.
- Barcode lookup is enabled with `FATSECRET_SCOPE="basic barcode"` in `/etc/munchy-proxy.env`. Verified on 2026-10-21 with an authenticated `/v1/barcode` request returning food details.
- Caddy allows same-origin camera access with `Permissions-Policy: camera=(self), microphone=(), geolocation=()`.

The IP-based hostname uses third-party DNS. Keep this origin stable because browser data belongs to an origin. Export a backup before moving to a personal domain. The local private app token is in ignored `secrets/app-access-token.txt`; enter it in app Settings. Never distribute the OAuth secret to devices.

## Provision in the console

1. Use the tenancy's home region and an Always Free-eligible shape. Check current free allocation and boot volume usage. The proxy needs little CPU or memory. Do not select paid fallback shapes when free capacity is unavailable.
2. Create a dedicated public VCN/subnet with an internet gateway and default route to it. A new VM can initially have no public IP. Keep in-transit disk encryption enabled. Add the operator's existing SSH public key.
3. Allocate a **reserved public IPv4** and attach it to the instance's primary private IPv4. Keep this reserved IP through rebuilds; an ephemeral IP does not meet the requirement.
4. Permit TCP 22 only from the operator's current public `/32`, and TCP 80/443 for the HTTPS service and certificate validation. Keep Bun bound to `127.0.0.1:8787`. Mirror the intended rules in the guest firewall. Do not expose port 8787.
5. Add the reserved public IPv4 to the FatSecret app's IP whitelist. Wait for propagation, then test from the VM itself.

[Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) describes home-region requirements, capacity shortages, and idle-instance reclamation. A low-traffic proxy may be reclaimed; reserved IP and reproducible setup simplify recovery but do not guarantee uptime.

## Host setup

Use Ubuntu's package manager to install `caddy` and `ca-certificates`. Create an unprivileged `munchy` system user and `/var/lib/munchy-proxy` owned by it. Build the static app and cross-compile the proxy locally:

```sh
bun run build
bun build --compile --target=bun-linux-arm64 --minify proxy/src/server.ts --outfile build/munchy-proxy
```

Copy `out/` to `/opt/munchy/out`, the executable to `/opt/munchy/munchy-proxy` with mode 0755, and `proxy/munchy-proxy.service` to `/etc/systemd/system/`. The standalone binary includes Bun; the VM needs no Node or Bun installation.

Create `/etc/munchy-proxy.env` with mode `0600`, owned by root, using `proxy/.env.example` as its template. Fill OAuth credentials from the local ignored secrets through SSH; never embed them in cloud-init, Terraform state, source files, shell history, or frontend assets. Generate the app access token with a cryptographically secure random generator. Set exact allowed origins and the proper FatSecret storage entitlement. The file is read by systemd; the service remains unprivileged.

Use a domain pointed at the reserved address for trusted HTTPS. Caddy's `MUNCHY_DOMAIN` must match that domain. Copy `proxy/Caddyfile` to Caddy's configured location. The configuration serves the static app and forwards only `/v1/*` and `/health` to Bun. The client therefore needs the same HTTPS origin as its proxy URL, plus the app access token.

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now munchy-proxy
sudo systemctl reload caddy
```

## Updating a running deployment

`bun run deploy` builds the static app and the ARM proxy binary, ships both over SSH, and checks the live URL:

```sh
bun run deploy              # app and proxy
bun run deploy --app-only   # static app only, no service restart
bun run deploy --proxy-only # proxy binary only
```

It uploads `out/` as a tar stream because the Minimal image has no `rsync`, unpacks into `/opt/munchy/out.new`, and swaps it into place, leaving the previous tree at `/opt/munchy/out.old` for rollback. The proxy binary lands as `munchy-proxy.new` and is renamed over the running one, so `systemctl restart munchy-proxy` picks it up without `ETXTBSY`. Every deploy also renders `proxy/Caddyfile` with the deployment hostname and static root, validates it, installs it to `/etc/caddy/Caddyfile`, and reloads Caddy. App deploys check that the live response permits same-origin camera access. `MUNCHY_SSH_HOST`, `MUNCHY_REMOTE_ROOT`, and `MUNCHY_URL` override the defaults.

Proxy environment secrets and account permissions are not overwritten by deploys. To enable barcode lookup on an existing server, set `FATSECRET_SCOPE="basic barcode"` in `/etc/munchy-proxy.env` and restart `munchy-proxy`; the FatSecret account must have barcode access. Deploying the binary alone does not change OAuth scopes. For camera scanning, deploy the Caddy policy too, reload the app, and allow camera access in the browser. Keep microphone and geolocation disabled.

Deploys need SSH, which the OCI security list and the guest firewall allow only from the operator's `/32`. Update both rules when that address changes; the script fails its preflight rather than hanging.

Check the operator's current public address with `curl https://api.ipify.org`. Change only the TCP 22 source CIDR in the OCI security list and the guest firewall; keep it a single `/32`. Persist guest changes in `/etc/iptables/rules.v4` using `sudo iptables-save | sudo tee /etc/iptables/rules.v4`, then verify a new SSH connection.

If the old guest rule locks you out, changing OCI alone is not enough. Use the instance's **OS Management → Console connection → Launch Cloud Shell connection**. Exit any existing Cloud Shell session first. Ubuntu console login requires an existing password; if none is available, an authorized recovery reboot is needed. Interrupt GRUB, boot the installed kernel with its existing root UUID and temporary `rw console=ttyAMA0 init=/bin/bash` arguments, repair and persist the firewall rule, then return to normal boot. Verify SSH and the app/proxy services after a clean reboot. Do not open TCP 22 to `0.0.0.0/0`.

## Verify before calling it deployed

- Console shows the VM running and its private IP attached to the intended reserved public IPv4.
- From the VM, the outgoing public IPv4 equals the FatSecret-whitelisted address.
- HTTPS certificate verifies normally; no browser security bypass.
- `/health` returns 200; food endpoints without the app token return 401.
- Authenticated food search and a result's detail request return real FatSecret data.
- Authenticated `/v1/barcode?barcode=0012345678905` returns food details on an account with barcode access; ordinary search still works after changing scopes.
- The app response includes `Permissions-Policy: camera=(self), microphone=(), geolocation=()`. After reloading, the browser permits camera access; scan a package or enter its barcode manually to open the portion editor.
- Foreign browser origins receive 403; arbitrary proxy paths and POST requests fail.
- The app connects, logs supported foods, reloads its persisted diary, and loads its saved shell offline.
- Service survives restart. Credentials and app access tokens are absent from `out/`, logs, Git diffs, and documentation.

## Recovery

Keep the reserved IP allocated and retain local source and deployment configuration. If the free VM is reclaimed, recreate it within the free allocation and reattach the reserved IP. The remote quota database can be restored from a server backup, but it contains no diary data. User diaries are recovered from each device's exported backups.
