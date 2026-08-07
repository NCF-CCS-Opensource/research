import { execFileSync } from "node:child_process"

export function setup() {
  execFileSync("./node_modules/.bin/supabase", ["db", "reset", "--local"], {
    stdio: "inherit",
  })
  const { API_URL } = JSON.parse(
    execFileSync(
      "./node_modules/.bin/supabase",
      ["status", "-o", "json"],
      { encoding: "utf8" }
    )
  ) as { API_URL: string }
  execFileSync(
    "curl",
    [
      "--fail",
      "--silent",
      "--retry",
      "10",
      "--retry-all-errors",
      "--retry-delay",
      "1",
      `${API_URL}/auth/v1/health`,
    ],
    { stdio: "inherit" }
  )
}
