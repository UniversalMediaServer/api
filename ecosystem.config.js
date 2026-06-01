module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'API',
      script: './src/app.ts',
      env: { NODE_ENV: 'production', VERBOSE: 'false' },
      env_verbose: { NODE_ENV: 'production', VERBOSE: 'true' },
      instances: 0,
      exec_mode: 'cluster',
      watch: true,
    },
  ],
};
