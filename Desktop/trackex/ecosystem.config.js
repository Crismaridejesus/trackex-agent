/**
 * PM2 Ecosystem Configuration for TrackEx
 *
 * SCALABILITY CONFIGURATION:
 * - Cluster mode: Uses all available CPU cores for horizontal scaling
 * - Redis: Required for shared state (rate limits, cache, SSE connections) across instances
 * - Graceful reload: Zero-downtime deployments with wait_ready and listen_timeout
 *
 * DEPLOYMENT NOTES:
 * 1. Ensure .env.production file exists with all required variables
 * 2. Ensure Redis is running before starting PM2
 * 3. Use `pm2 reload trackex` for zero-downtime deploys
 * 4. Monitor with `pm2 monit` or PM2 Plus
 *
 * MEMORY NOTES:
 * - Each instance uses ~200-400MB
 * - With 4 cores and max_memory_restart at 512M = ~2GB total
 * - Adjust based on server RAM (Hetzner typically has 4-8GB)
 */
module.exports = {
  apps: [
    {
      name: "trackex",
      script: "node_modules/.bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      cwd: "/home/deploy/trackex/Desktop/trackex",

      // CLUSTER MODE: Use all available CPU cores
      // Set to a specific number (e.g., 2) if you want to reserve cores for other services
      instances: "max",
      exec_mode: "cluster",

      // Load environment variables from .env.production file
      env_file: ".env",

      // Memory management
      // Lower per-instance limit since we have multiple instances
      max_memory_restart: "512M",

      // Reliability settings
      autorestart: true,
      watch: false,

      // Graceful shutdown and reload
      kill_timeout: 5000, // 5s to finish requests before SIGKILL
      wait_ready: true, // Wait for process.send('ready') before considering online
      listen_timeout: 10000, // 10s timeout for ready signal
      shutdown_with_message: true, // Send shutdown message instead of signal

      // Logging
      error_file: "/home/deploy/.pm2/logs/trackex-error.log",
      out_file: "/home/deploy/.pm2/logs/trackex-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Health monitoring
      exp_backoff_restart_delay: 100, // Exponential backoff on restarts
      max_restarts: 10, // Max restarts in min_uptime period
      min_uptime: "10s", // Min uptime to consider successful start
    },
  ],
}
