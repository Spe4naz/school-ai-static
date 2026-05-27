const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const server = spawn('npx', ['tsx', 'watch', 'server.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn('npx', ['esbuild', 'public/js/main.js', '--bundle', '--sourcemap', '--outfile=public/dashboard.bundle.js', '--watch'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  server.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  frontend.kill();
  process.exit(0);
});
