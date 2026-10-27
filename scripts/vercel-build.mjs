import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

console.log("> prisma generate");
run("npx prisma generate");

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
  console.log("> DATABASE_URL detected: running prisma migrate deploy");
  try {
    run("npx prisma migrate deploy");
  } catch (error) {
    if (process.env.VERCEL_ENV === "preview") {
      console.warn("⚠️ Warning: prisma migrate deploy failed in preview environment:", error.message);
    } else {
      throw error;
    }
  }
} else {
  console.log("ℹ️ DATABASE_URL is not set in this build environment. Skipping prisma migrate deploy.");
}

console.log("> next build");
run("npx next build");