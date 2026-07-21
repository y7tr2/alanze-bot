import app from "./app";
import { logger } from "./lib/logger";
import { startBot } from "./bot";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  startBot().catch((err) => {
    logger.error({ err }, "Failed to start bot");
  });

  // ── self-ping: keep the process alive every 4 minutes ──────────────────
  const selfUrl = `http://localhost:${port}/`;
  setInterval(async () => {
    try {
      const res = await fetch(selfUrl, { signal: AbortSignal.timeout(5000) });
      logger.debug({ status: res.status }, "Self-ping OK");
    } catch (err) {
      logger.warn({ err }, "Self-ping failed");
    }
  }, 4 * 60 * 1000);
});
