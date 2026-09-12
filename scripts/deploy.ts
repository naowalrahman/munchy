import { $ } from "bun";

const host = process.env.MUNCHY_SSH_HOST ?? "ubuntu@129.80.164.67";
const root = process.env.MUNCHY_REMOTE_ROOT ?? "/opt/munchy";
const url = (process.env.MUNCHY_URL ?? "https://munchy.129.80.164.67.sslip.io").replace(/\/$/, "");
const args = new Set(process.argv.slice(2));
const app = !args.has("--proxy-only");
const proxy = !args.has("--app-only");

const status = (await $`git status --porcelain`.text()).trim();
const commit = (await $`git log -1 --pretty=${"%h %s"}`.text()).trim();
if (status) console.warn(`Uncommitted changes are included in this deploy.\n${status}\n`);
console.log(`Deploying ${commit} to ${host}`);

await $`ssh -o BatchMode=yes -o ConnectTimeout=10 ${host} true`
  .nothrow()
  .quiet()
  .then((r) => {
    if (r.exitCode !== 0)
      throw new Error(
        `Cannot reach ${host} over SSH. Port 22 is restricted to the operator's /32 in the OCI ` +
          `security list and the guest firewall; update both if this machine's public address changed.`
      );
  });

if (app) {
  await $`bun run build`;
  // tar keeps the remote free of an rsync dependency; the swap leaves out.old for rollback.
  const install = `set -e
    sudo rm -rf ${root}/out.new ${root}/out.old
    sudo mkdir -p ${root}/out.new
    sudo tar -xzf - -C ${root}/out.new
    sudo chown -R root:root ${root}/out.new
    sudo chmod -R u=rwX,go=rX ${root}/out.new
    [ -d ${root}/out ] && sudo mv ${root}/out ${root}/out.old
    sudo mv ${root}/out.new ${root}/out`;
  await $`tar --no-xattrs -czf - -C out . | ssh ${host} ${install}`;
  console.log(`Published out/ to ${root}/out`);
}

if (proxy) {
  await $`bun build --compile --target=bun-linux-arm64 --minify proxy/src/server.ts --outfile build/munchy-proxy`;
  const install = `set -e
    sudo install -m 0755 -o root -g root /dev/stdin ${root}/munchy-proxy.new
    sudo mv ${root}/munchy-proxy.new ${root}/munchy-proxy
    sudo systemctl restart munchy-proxy`;
  await $`ssh ${host} ${install} < build/munchy-proxy`;
  console.log(`Installed ${root}/munchy-proxy and restarted the service`);
}

const checks: [string, number][] = [];
if (proxy) checks.push([`${url}/health`, 200]);
if (app) checks.push([url, 200]);
for (const [target, expected] of checks) {
  // systemctl restart returns before the proxy binds its port, so allow a brief warm-up.
  let response: Response | null = null;
  for (let attempt = 0; attempt < 10 && response?.status !== expected; attempt++) {
    if (attempt) await Bun.sleep(500);
    response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(20000) }).catch(() => null);
  }
  if (response?.status !== expected)
    throw new Error(`${target} returned ${response ? response.status : "no response"}, expected ${expected}.`);
  console.log(`${target} ${response.status}`);
}
console.log("Deployed. Hard-reload an installed device so the service worker picks up the new build.");
