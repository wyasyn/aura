import { requireApiKey } from "./lib/harness"
import { runChatEvals } from "./chat.eval"
import { runScanEvals } from "./scan.eval"

/**
 * Entry point for `npm run eval`.
 *
 * Pass `scan` or `chat` to run one suite. Evals call the real model, so this is
 * never wired into `npm test`.
 */
async function main() {
  requireApiKey()

  const suite = process.argv[2]
  const results: boolean[] = []

  if (!suite || suite === "chat") {
    results.push(await runChatEvals())
  }

  if (!suite || suite === "scan") {
    results.push(await runScanEvals())
  }

  process.exit(results.every(Boolean) ? 0 : 1)
}

void main()
