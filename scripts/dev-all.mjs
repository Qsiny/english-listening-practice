import { spawn } from 'child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name, args) {
  const child = spawn(npmCmd, args, {
    stdio: 'inherit',
    env: process.env,
  });
  child.name = name;
  return child;
}

const children = [
  run('server', ['start', '--prefix', 'server']),
  run('client', ['run', 'dev', '--prefix', 'client']),
];

let shuttingDown = false;

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill(signal);
      } catch {
        // ignore
      }
    }
  }
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      shutdown('SIGTERM');
    }
    if (signal) {
      process.exitCode = 1;
      return;
    }
    if (typeof code === 'number' && code !== 0) {
      process.exitCode = code;
    }
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
