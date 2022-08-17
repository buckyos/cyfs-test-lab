module.exports = {
  apps : [{
    "name": "node-tester-app", // 名称
    "script": "./script/daemon.js", // 入口文件
    "env": { // 环境
      "NODE_ENV": "development"
    },
    "env_production": {
      "NODE_ENV": "production"
    },
    "exec_mode": "fork",
    "watch": false,
    "max_restarts" : 10, // 设置应用程序异常退出重启的次数，默认15次（从0开始计数）
    "restart_delay" : 5000, // 异常重启情况下，延时重启时间
    "exec_interpreter": "none",
    "cwd": "./script",
    "args":"win32 Agent",
    "log_date_format" : "YYYY-MM-DD HH:mm Z",
    "combine_logs" : true,
    "log_file": "../blog/combined.outerr.log", // 日志目录
    "out_file": "../blog/out.log",
    "error_file": "../blog/err.log",
  }, {

  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
