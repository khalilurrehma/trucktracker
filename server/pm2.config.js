module.exports = {
  apps: [
    {
      name: "main-server",
      script: "server.js",
      instances: 1,
    },
    {
      name: "flespi-backup-cron",
      script: "cron.js",
      instances: 1,
      max_restarts: 3,
      restart_delay: 3000,
      error_file: "./logs/backup-error.log",
      out_file: "./logs/backup-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
