import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { API_ORIGIN, EQUALENS_API_KEY } from "../shared/src/config.ts";

interface RecordedRequest { url: string; request: unknown }
const trafficPath = process.argv.find((argument) => argument.endsWith(".json"))
  ?? "test-results/live/demo-live-live-production-diagnostic/production-traffic.json";
const traffic: RecordedRequest[] = JSON.parse(await readFile(trafficPath, "utf8"));
const interactions = traffic.filter(({ url, request }) => request && ["/analyze", "/scan", "/redesign"].includes(new URL(url).pathname));

async function check(interaction: RecordedRequest) {
  const started = performance.now();
  const response = await fetch(`${API_ORIGIN}${new URL(interaction.url).pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-EquaLens-Key": EQUALENS_API_KEY },
    body: JSON.stringify(interaction.request),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json() as { cached?: boolean; error?: string };
  const result = { endpoint: new URL(interaction.url).pathname, status: response.status, cached: body.cached, error: body.error, milliseconds: Math.round(performance.now() - started) };
  console.log(JSON.stringify(result));
  return result;
}

if (process.argv.includes("--burst")) {
  const selection = interactions.find(({ url }) => url.endsWith("/analyze"));
  if (!selection) throw new Error("No captured selection request to replay");
  const results = await Promise.all(Array.from({ length: 3 }, () => check(selection)));
  if (results.some(({ status }) => status !== 200)) process.exitCode = 1;
} else {
  for (const interaction of interactions) {
    await check(interaction);
    const second = await check(interaction);
    if (second.status !== 200 || second.cached !== true) {
      throw new Error(`Cache verification failed for ${second.endpoint}`);
    }
  }
}
