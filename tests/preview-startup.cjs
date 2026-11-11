/* Tests local startup on a temporary port; never stops the user's 8766 preview. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { spawn, spawnSync } = require("node:child_process"),
  net = require("node:net"),
  http = require("node:http"),
  os = require("node:os");
const root = path.resolve(__dirname, "..");
const hooksPath = path.resolve(root, "..", ".codex", "hooks.json");
const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
const event = hooks.hooks.SessionStart[0],
  command = event.hooks[0].command;
assert.equal(event.matcher, "^(startup|resume)$");
const match = command.match(
  /^powershell\.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "([^"]+)" -Quiet$/,
);
assert.ok(match, "Unexpected hook command");
assert.equal(path.resolve(match[1]), path.join(root, "Start-Preview.ps1"));
function launch(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        match[1],
        "-Quiet",
        "-Port",
        String(port),
      ],
      {
        cwd: os.tmpdir(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let out = "",
      err = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        Error(
          "Launcher or inherited output pipes did not close within 48 seconds.",
        ),
      );
    }, 48000);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, out, err });
    });
  });
}
function owners(port) {
  const result = spawnSync("netstat.exe", ["-ano", "-p", "tcp"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0);
  const pattern = new RegExp(
    `^\\s*TCP\\s+127\\.0\\.0\\.1:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`,
  );
  return [
    ...new Set(
      result.stdout.split(/\r?\n/).flatMap((line) => {
        const found = line.match(pattern);
        return found ? [Number(found[1])] : [];
      }),
    ),
  ].sort((a, b) => a - b);
}
async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
(async () => {
  const port = await freePort();
  let unrelated;
  assert.notEqual(port, 8766);
  try {
    const first = await launch(port);
    assert.equal(first.code, 0, first.err);
    assert.equal(first.out, "", "Quiet startup should not emit stdout");
    assert.equal(first.err, "");
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /data-moneywise-react/);
    const runtime = await fetch(`http://127.0.0.1:${port}/@vite/client`);
    assert.equal(runtime.status, 200);
    assert.match(runtime.headers.get("content-type"), /javascript/);
    const before = owners(port);
    assert.equal(before.length, 1, "Cold start should create one server");
    const reuse = await launch(port);
    assert.equal(reuse.code, 0, reuse.err);
    assert.deepEqual(owners(port), before, "Existing server must be reused");
    const concurrent = await Promise.all([launch(port), launch(port)]);
    concurrent.forEach((result) => assert.equal(result.code, 0, result.err));
    assert.deepEqual(
      owners(port),
      before,
      "Concurrent hooks must not create duplicate listeners",
    );
    unrelated = http.createServer((req, res) =>
      res.end("<title>Another local app</title>"),
    );
    await new Promise((resolve) => unrelated.listen(0, "127.0.0.1", resolve));
    const occupied = await launch(unrelated.address().port);
    assert.notEqual(occupied.code, 0);
    assert.match(occupied.err, /different page/);
    assert.equal(
      (await fetch(`http://127.0.0.1:${unrelated.address().port}/`)).status,
      200,
    );
    await new Promise((resolve) => unrelated.close(resolve));
    unrelated = null;
    let runtimeAttempts = 0;
    unrelated = http.createServer((req, res) => {
      if (req.url === "/") {
        res.setHeader("content-type", "text/html");
        return res.end(
          "<title>Moneywise test</title><main data-moneywise-react></main>",
        );
      }
      if (req.url !== "/@vite/client") {
        res.writeHead(404);
        return res.end();
      }
      res.setHeader("content-type", "text/javascript");
      if (++runtimeAttempts === 1) {
        setTimeout(() => {
          if (!res.destroyed) res.end("export {};");
        }, 2600);
        return;
      }
      res.end("export {};");
    });
    await new Promise((resolve) => unrelated.listen(0, "127.0.0.1", resolve));
    const delayed = await launch(unrelated.address().port);
    assert.equal(delayed.code, 0, delayed.err);
    assert.ok(runtimeAttempts >= 2, "A timed-out Vite probe should be retried");
    console.log(
      "PASS: actual hook command, cold start, quiet output and closed pipes, correct folder, repeated/concurrent server reuse, delayed Vite runtime, and unrelated occupied-port safety.",
    );
  } finally {
    if (unrelated) await new Promise((resolve) => unrelated.close(resolve));
    for (const pid of owners(port)) {
      try {
        process.kill(pid);
      } catch {}
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
