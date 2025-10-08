module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'API',
      script: 'node_modules/.bin/ts-node',
      args: '--transpileOnly --files ./src/app.ts',
      env: { NODE_ENV: 'production' },
      instances: 0,
      exec_mode: 'cluster',
    },
  ],
};
