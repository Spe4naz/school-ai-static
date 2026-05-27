const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = async () => {
  const stateFile = path.join(__dirname, '.container-state.json');
  if (!fs.existsSync(stateFile)) {
    console.log('No container state file found, skipping teardown');
    return;
  }

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  try {
    execSync(`docker stop ${state.containerId}`, { stdio: 'inherit' });
    console.log('Global PostgreSQL container stopped');
  } catch (e) {
    console.error('Failed to stop container:', e.message);
  }

  fs.unlinkSync(stateFile);
};
