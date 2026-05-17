import { startTunnel } from 'untun';
import { spawn, ChildProcess } from 'child_process';
import { config } from 'dotenv';
import { createServer } from 'net';

// Load existing .env
config();

const PORT = parseInt(process.env.PORT || '3000', 10);

// Promise with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

// Retry helper with exponential backoff and timeout
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000,
  timeout: number = 30000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeout, 'Connection timed out');
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(
          `  Tunnel connection failed (${lastError.message}), retrying in ${delay / 1000}s (attempt ${attempt}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Check if a port is in use
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Wait for port to be in use (server started)
const PORT_CHECK_INTERVAL_MS = 1000;
async function waitForPort(port: number, maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortInUse(port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, PORT_CHECK_INTERVAL_MS));
  }
  const totalSeconds = (maxAttempts * PORT_CHECK_INTERVAL_MS) / 1000;
  throw new Error(`Server did not start on port ${port} within ${totalSeconds}s`);
}

// Update the server's QB_BASE_URL via internal endpoint
async function updateServerBaseUrl(tunnelUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${PORT}/_internal/set-qb-base-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tunnelUrl }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to update server QB_BASE_URL:', err);
    return false;
  }
}

async function main() {
  console.log('Starting backend dev server...\n');

  // Start the dev server first (QB_BASE_URL will be undefined initially, which is OK)
  // Note: When using shell: true, pass the command as a single string to avoid DEP0190 warning
  const child: ChildProcess = spawn('npx tsx watch src/index.ts', [], {
    env: process.env,
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  });

  // Handle shutdown
  const cleanup = () => {
    child.kill();
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  // Wait for the server to start
  console.log(`Waiting for server to start on port ${PORT}...`);
  try {
    await waitForPort(PORT);
  } catch (err) {
    console.error('Failed to detect server startup:', err);
    cleanup();
    return;
  }

  // Give the server a moment to fully initialize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Now start the Cloudflare tunnel with retry logic
  console.log('\nStarting Cloudflare tunnel...');

  // Helper to start tunnel and get URL
  const tryStartTunnel = async (): Promise<string> => {
    const tunnel = await startTunnel({
      port: PORT,
      acceptCloudflareNotice: true,
    });

    if (!tunnel) {
      throw new Error('Tunnel creation returned undefined');
    }

    const url = await tunnel.getURL();
    return url;
  };

  let tunnelUrl: string | null = null;
  try {
    tunnelUrl = await retryWithBackoff(tryStartTunnel);
  } catch (err) {
    console.warn('');
    console.warn('==================================================================');
    console.warn('                    TUNNEL UNAVAILABLE                            ');
    console.warn('==================================================================');
    console.warn(`  Could not establish tunnel after 3 attempts.`);
    console.warn(`  Error: ${(err as Error).message}`);
    console.warn('------------------------------------------------------------------');
    console.warn('  Cloudflare tunnel service may be unavailable.');
    console.warn(`  Your dev server is still running at http://localhost:${PORT}`);
    console.warn('  External webhook callbacks will not work until tunnel is up.');
    console.warn('  Try running the command again in a few minutes.');
    console.warn('==================================================================');
    console.warn('');
  }

  if (tunnelUrl) {
    // Update the running server with the tunnel URL
    const updated = await updateServerBaseUrl(tunnelUrl);

    // Prominent banner
    console.log('');
    console.log('==================================================================');
    console.log('                   CLOUDFLARE TUNNEL ACTIVE                       ');
    console.log('==================================================================');
    console.log(`  Public URL: ${tunnelUrl}`);
    console.log(`  Local Port: ${PORT}`);
    console.log('------------------------------------------------------------------');
    console.log('  QueueBear webhook endpoints:');
    console.log(`    ${tunnelUrl}/api/jobs/textract`);
    console.log(`    ${tunnelUrl}/api/jobs/email`);
    console.log(`    ${tunnelUrl}/api/jobs/cleanup`);
    console.log('==================================================================');
    console.log('');
    if (updated) {
      console.log('Server QB_BASE_URL has been updated to the tunnel URL.');
      console.log('Jobs enqueued will now use the correct webhook callback URL.');
    } else {
      console.warn('WARNING: Could not update server QB_BASE_URL.');
      console.warn('Jobs may not work correctly until server is restarted.');
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
