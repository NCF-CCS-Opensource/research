import { execFileSync } from "node:child_process"

export function setup() {
  execFileSync("./node_modules/.bin/supabase", ["db", "reset", "--local"], {
    stdio: "inherit",
  })
}
