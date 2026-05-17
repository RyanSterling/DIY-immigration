const { spawn, execSync } = require('child_process');
const net = require('net');

const REDIS_PORT = 6379;
const REDIS_TIMEOUT = 30000; // 30 seconds max wait

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

// Wait for Redis to be ready
async function waitForRedis() {
  const start = Date.now();
  console.log('Waiting for Redis...');

  while (Date.now() - start < REDIS_TIMEOUT) {
    if (await isPortInUse(REDIS_PORT)) {
      console.log('Redis is ready');
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('Redis failed to start within timeout');
}

async function main() {
  // Check if Redis is already running
  const redisRunning = await isPortInUse(REDIS_PORT);

  if (redisRunning) {
    console.log('Redis already running on port 6379');
  } else {
    console.log('Starting Redis via Docker...');
    // Start Redis in background (detached)
    execSync('docker compose --profile windows up -d', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    await waitForRedis();
  }

  // Start backend, frontend, and admin with concurrently
  console.log('Starting backend, frontend, and admin...');
  // On Windows with shell: true, pass the entire command as a single string
  // to avoid argument parsing issues (DEP0190 warning)
  const dev = spawn(
    'npx concurrently --names backend,frontend,admin --prefix-colors blue,green,magenta "npm run dev:backend" "npm run dev:frontend" "npm run dev:admin"',
    [],
    {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    }
  );

  dev.on('close', (code) => {
    process.exit(code);
  });
}

main().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
