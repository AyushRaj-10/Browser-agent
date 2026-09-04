import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const target = process.argv[2] || "firefox"; // "firefox" or "chrome"
const distDir = path.resolve(process.cwd(), `dist/${target}`);
const outputFile = path.resolve(process.cwd(), `browser-agent-${target}.zip`);

if (!fs.existsSync(distDir)) {
  console.error(`Directory ${distDir} does not exist. Run npm run build:${target} first.`);
  process.exit(1);
}

if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
}

console.log(`Packaging ${target} extension from ${distDir} into ${outputFile}...`);

// Use Windows/Unix built-in tar to create standard zip archive with forward slashes
try {
  execSync(`tar -a -c -f "${outputFile}" *`, {
    cwd: distDir,
    stdio: "inherit",
  });
  console.log(`✅ Successfully created: ${outputFile}`);
} catch (err) {
  console.error("Failed to create zip using tar:", err);
  process.exit(1);
}

// Verify entries in the created zip file have standard forward slashes
try {
  const buf = fs.readFileSync(outputFile);
  let pos = 0;
  const entries = [];
  while (pos < buf.length - 4) {
    if (buf.readUInt32LE(pos) === 0x04034b50) {
      const nameLen = buf.readUInt16LE(pos + 26);
      const extraLen = buf.readUInt16LE(pos + 28);
      const name = buf.toString("utf8", pos + 30, pos + 30 + nameLen);
      entries.push(name);
      pos += 30 + nameLen + extraLen;
    } else {
      pos++;
    }
  }
  const hasBackslashes = entries.some((e) => e.includes("\\"));
  if (hasBackslashes) {
    console.warn("⚠️ Warning: Archive still contains backslashes!");
  } else {
    console.log(`✓ All ${entries.length} entries use POSIX forward slashes. Compatible with Mozilla AMO.`);
  }
} catch (e) {
  console.warn("Verification check:", e);
}
