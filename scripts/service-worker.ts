import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir: string): Promise<string[]> {
  const files = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(files.map((f) => (f.isDirectory() ? walk(`${dir}/${f.name}`) : [`${dir}/${f.name}`])))
  ).flat();
}
const files = (await walk("out")).filter((f) => !f.endsWith(".map") && !f.endsWith("/sw.js") && !f.endsWith(".txt"));
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(file));
const version = hash.digest("hex").slice(0, 12);
const assets = [...new Set(["/", ...files.map((f) => f.slice(3))])];
await writeFile(
  "out/sw.js",
  `const CACHE='munchy-${version}';const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('munchy-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/v1/')||url.pathname==='/health')return;if(!ASSETS.includes(url.pathname)&&event.request.mode!=='navigate')return;event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))??(event.request.mode==='navigate'?await cache.match('/'):null)??fetch(event.request)));});`
);
console.log(`Offline app shell: ${assets.length} files, ${version}`);
