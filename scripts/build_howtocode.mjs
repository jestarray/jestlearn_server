// Publishes the jestlearn submodule's production build as the `howtocode`
// course that server.js serves at /how_to_code/.
//
// Run it with: npm run build:howtocode
//
// The output is a derived artifact and is deliberately NOT committed: it is
// regenerated from source on every deploy, so the repo only ever holds the
// submodule's sources. See README.md ("Publishing a course build").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app_dir = path.join(root, "jestlearn");
const dist_dir = path.join(app_dir, "dist");
const output_dir = path.join(root, "howtocode");
const staging_dir = `${output_dir}.staging`;

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });

// Node refuses to spawn npm.cmd without a shell (EINVAL on Windows), and
// passing args with `shell: true` is deprecated because they are concatenated
// rather than escaped. So find npm's CLI entry point and hand it to the Node
// binary that is already running this script.
function resolve_npm_cli() {
  const bin_dir = path.dirname(process.execPath);
  for (const candidate of [
    path.join(bin_dir, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(bin_dir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const npm_cli = resolve_npm_cli();
const npm = (args, cwd) =>
  npm_cli
    ? run(process.execPath, [npm_cli, ...args], cwd)
    : run(process.platform === "win32" ? "npm.cmd" : "npm", args, cwd);

function ensure_sources() {
  if (!fs.existsSync(path.join(app_dir, "package.json"))) {
    console.log("jestlearn submodule is not checked out, initialising it...");
    run("git", ["submodule", "update", "--init", "--recursive"], root);
  }
  // npm ci wipes node_modules and reinstalls it, so only pay for it when the
  // toolchain is actually missing rather than on every deploy.
  if (!fs.existsSync(path.join(app_dir, "node_modules"))) {
    console.log("installing jestlearn build dependencies (npm ci)...");
    npm(["ci"], app_dir);
  }
}

function publish() {
  if (!fs.existsSync(path.join(dist_dir, "index.html"))) {
    throw new Error(`jestlearn build produced no dist/index.html in ${dist_dir}`);
  }
  // Stage first and only swap into place once the build has succeeded, so a
  // failed or partial build can never leave a previously working
  // howtocode/ emptied out or half written.
  fs.rmSync(staging_dir, { recursive: true, force: true });
  fs.cpSync(dist_dir, staging_dir, { recursive: true });
  fs.rmSync(output_dir, { recursive: true, force: true });
  fs.renameSync(staging_dir, output_dir);
  console.log(`published ${path.relative(root, dist_dir)} -> ${path.relative(root, output_dir)}`);
}

try {
  ensure_sources();
  console.log("building jestlearn...");
  npm(["run", "build"], app_dir);
  publish();
} catch (error) {
  fs.rmSync(staging_dir, { recursive: true, force: true });
  // A build that never published must still leave a usable directory behind,
  // because express.static is mounted on this path: a missing directory would
  // turn into a confusing 404 instead of the clear message below.
  fs.mkdirSync(output_dir, { recursive: true });
  console.error(`\nbuild:howtocode failed: ${error.message}`);
  console.error("howtocode/ was left untouched; fix the build and run it again.");
  process.exitCode = 1;
}
