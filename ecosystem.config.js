module.exports = {
  apps: [
    {
      name: 'mathoi-mcm',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'fork',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
