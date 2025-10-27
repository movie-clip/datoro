// PM2 Ecosystem Configuration
// Run with: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [{
    name: 'factorly-api',
    script: './server/server.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    
    // Cluster mode: run multiple instances
    instances: 4, // or 'max' for all CPU cores
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 7071
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 7071,
      watch: true,
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        'prisma',
        'src/generated'
      ]
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto-restart settings
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Source maps support (for debugging)
    node_args: '--enable-source-maps'
  }]
};
