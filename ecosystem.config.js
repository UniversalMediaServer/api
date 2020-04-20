module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'API',
      script: './node_modules/.bin/ts-node',
      args: 'src/app.ts',
      env: { NODE_ENV: 'production' },
      env_production: { NODE_ENV: 'production' },
      instances: 4,
      interpreter: 'node_modules/.bin/ts-node',
      exec_mode: 'cluster',
      watch: ['src'],
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
