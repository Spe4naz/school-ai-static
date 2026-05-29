// services/dockerService.js — Docker container management
const { execFile } = require('child_process');

const SAFE_NAME_RE = /^[a-zA-Z0-9._-]+$/;

function validateName(name) {
  if (!name || typeof name !== 'string' || !SAFE_NAME_RE.test(name)) {
    throw new Error('Invalid container name');
  }
  return name;
}

function validateImage(image) {
  if (!image || typeof image !== 'string' || !/^[\w\-./:]+$/.test(image)) {
    throw new Error('Invalid image name');
  }
  return image;
}

function validateLines(lines) {
  const n = parseInt(lines, 10);
  return isNaN(n) || n < 1 ? 100 : Math.min(n, 10000);
}

class DockerService {
  constructor() {
    this._isDockerAvailable = null;
  }

  async isAvailable() {
    if (this._isDockerAvailable !== null) return this._isDockerAvailable;
    try {
      await this._exec('info');
      this._isDockerAvailable = true;
    } catch {
      this._isDockerAvailable = false;
    }
    return this._isDockerAvailable;
  }

  _exec(cmd, args = []) {
    return new Promise((resolve, reject) => {
      execFile('docker', [cmd, ...args], { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout.trim());
      });
    });
  }

  async getContainers() {
    if (!(await this.isAvailable())) return [];
    try {
      const output = await this._exec('ps', ['-a', '--format', '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}']);
      if (!output) return [];
      return output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, name, image, status, ports] = line.split('|');
          return { id, name, image, status, ports };
        });
    } catch {
      return [];
    }
  }

  async getContainer(name) {
    validateName(name);
    if (!(await this.isAvailable())) return null;
    try {
      const output = await this._exec('inspect', [
        '--format',
        '{{.State.Status}}|{{.State.StartedAt}}|{{.HostConfig.RestartPolicy.Name}}',
        name,
      ]);
      const [status, startedAt, restartPolicy] = output.split('|');
      return { name, status, startedAt, restartPolicy };
    } catch {
      return null;
    }
  }

  async getContainerLogs(name, lines = 100) {
    validateName(name);
    if (!(await this.isAvailable())) return '';
    try {
      return await this._exec('logs', ['--tail', String(validateLines(lines)), name]);
    } catch (e) {
      return e.message;
    }
  }

  async startContainer(name) {
    validateName(name);
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this._exec('start', [name]);
    return { success: true };
  }

  async stopContainer(name) {
    validateName(name);
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this._exec('stop', [name]);
    return { success: true };
  }

  async restartContainer(name) {
    validateName(name);
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this._exec('restart', [name]);
    return { success: true };
  }

  async getDockerInfo() {
    if (!(await this.isAvailable())) return { available: false };
    try {
      const version = await this._exec('--version');
      const composeVersion = await this._exec('compose', ['version', '--short']).catch(() => 'N/A');
      return { available: true, dockerVersion: version, composeVersion };
    } catch {
      return { available: false };
    }
  }

  async pullImage(image) {
    validateImage(image);
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this._exec('pull', [image]);
    return { success: true };
  }
}

module.exports = new DockerService();
