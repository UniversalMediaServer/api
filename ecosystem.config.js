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
    {
      name: 'CRON',
      script: 'ts-node',
      args: ' --files ./src/cron/all-episodes.ts',
      instances: 1,
      cron_restart: '0,30 * * * *',
      autorestart: false,
    },
  ],
};
