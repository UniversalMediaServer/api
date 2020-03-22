module.exports = {
/**
 * Application configuration section
 * http://pm2.keymetrics.io/docs/usage/application-declaration/
 */
  apps: [
    {
      name: 'API',
      script: 'ts-node --files ./src/app.ts',
      env: { NODE_ENV: 'production' },
      instances: 4,
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
    },
    {
      name: 'CRON',
      script: 'ts-node --files ./src/cron/all-episodes.ts',
      instances: 1,
      cron_restart: '0,30 * * * *',
      autorestart: false,
    },
  ],
};
