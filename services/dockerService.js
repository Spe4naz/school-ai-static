// services/dockerService.js — Docker container management
const { execSync, exec } = require('child_process');

class DockerService {
  constructor() {
    this._isDockerAvailable = null;
  }

  async isAvailable() {
    if (this._isDockerAvailable !== null) return this._isDockerAvailable;
    try {
      execSync('docker info', { stdio: 'ignore', timeout: 5000 });
      this._isDockerAvailable = true;
    } catch {
      this._isDockerAvailable = false;
    }
    return this._isDockerAvailable;
  }

  async execAsync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout.trim());
      });
    });
  }

  async getContainers() {
    if (!(await this.isAvailable())) return [];
    try {
      const output = await this.execAsync(
        'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"',
      );
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
    if (!(await this.isAvailable())) return null;
    try {
      const output = await this.execAsync(
        `docker inspect --format '{{.State.Status}}|{{.State.StartedAt}}|{{.HostConfig.RestartPolicy.Name}}' ${name}`,
      );
      const [status, startedAt, restartPolicy] = output.split('|');
      return { name, status, startedAt, restartPolicy };
    } catch {
      return null;
    }
  }

  async getContainerLogs(name, lines = 100) {
    if (!(await this.isAvailable())) return '';
    try {
      return await this.execAsync(`docker logs --tail ${lines} ${name} 2>&1`);
    } catch (e) {
      return e.message;
    }
  }

  async startContainer(name) {
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this.execAsync(`docker start ${name}`);
    return { success: true };
  }

  async stopContainer(name) {
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this.execAsync(`docker stop ${name}`);
    return { success: true };
  }

  async restartContainer(name) {
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this.execAsync(`docker restart ${name}`);
    return { success: true };
  }

  async getDockerInfo() {
    if (!(await this.isAvailable())) return { available: false };
    try {
      const version = await this.execAsync('docker --version');
      const composeVersion = await this.execAsync('docker compose version --short').catch(() => 'N/A');
      return {
        available: true,
        dockerVersion: version,
        composeVersion,
      };
    } catch {
      return { available: false };
    }
  }

  async pullImage(image) {
    if (!(await this.isAvailable())) throw new Error('Docker not available');
    await this.execAsync(`docker pull ${image}`);
    return { success: true };
  }
}

module.exports = new DockerService();
