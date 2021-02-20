module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'API',
      script: 'ts-node',
      args: '--files ./src/app.ts',
      env: { NODE_ENV: 'production' },
      instances: 4,
      exec_mode: 'cluster',
      watch: true,
      autorestart: true,
    },
  ],
};
