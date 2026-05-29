const path = require('path');
const fs = require('fs');
const { GenericContainer } = require('testcontainers');

module.exports = async () => {
  const stateFile = path.join(__dirname, '.container-state.json');

  console.log('Starting global PostgreSQL container...');
  const container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'school_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test_pass',
    })
    .withExposedPorts(5432)
    .withHealthCheck({
      test: ['CMD-SHELL', 'pg_isready -U test -d school_test'],
      interval: 1000,
      retries: 15,
    })
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test_pass@${host}:${port}/school_test`;

  const state = { containerId: container.getId(), databaseUrl };
  fs.writeFileSync(stateFile, JSON.stringify(state));
  console.log('Global PostgreSQL ready at', databaseUrl);
};
