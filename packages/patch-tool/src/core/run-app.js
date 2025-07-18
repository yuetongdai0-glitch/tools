const path = require('path');
const {  spawn } = require('child_process');
const treeKill = require('tree-kill');

class RunApp {
    constructor(config) {
        this.config = config;
        this.process = null;
        this.restarting = false;
    }

    start() {
        if (this.process) {
            console.warn('进程已在运行');
            return;
        }
        const { patchCommand , outputDir } = this.config;

        if (!patchCommand) {
            console.error('❌ 必须提供 patchCommand 参数');
            return;
        }
        const [command, ...args] = this.parseCommand(patchCommand);
        console.log(args,"argsargs")

        console.log(`🚀 启动: ${command} ${args.join(' ')}`);

        // 设置环境变量
        const env = {
            ...process.env,
            APP_ROOT: path.resolve(outputDir),
            PORT: this.getPort(args) || 8000
        };
        const maxPath = path.resolve('../../apps/umi-project/node_modules/@umijs/max/bin/max.js');

        // 跨平台进程启动
        this.process = spawn('node ', [maxPath, 'dev'], {
            stdio: 'inherit',
        });

        // 进程事件处理
        this.process.on('error', (err) => {
            console.error('❌ 进程启动失败:', err);
            this.process = null;
        });

        this.process.on('exit', (code, signal) => {
            if (!this.restarting) {
                console.log(`进程退出 ${signal ? `(信号: ${signal})` : `(代码: ${code})`}`);
            }
            this.process = null;
            this.restarting = false;
        });
    }


    async stop() {
        if (!this.process) return;

        return new Promise((resolve) => {
            console.log('🛑 正在停止  进程...');
            treeKill(this.process.pid, 'SIGTERM', (err) => {
                if (err) {
                    console.error('停止  进程失败:', err);
                } else {
                    console.log('✅  进程已停止');
                }
                resolve();
            });
        });
    }

    parseCommand(fullCommand) {
        // 处理类似 "cross-env NODE_ENV=development  dev" 的复杂命令
        const parts = fullCommand.split(/\s+/);
        const command = parts.find(part => !/=/.test(part));
        const args = parts.filter(part => part !== command);
        return [command, ...args];
    }

    getPort(args) {
        // 从 --port 参数提取端口
        const portIndex = args.findIndex(arg => arg === '--port');
        return portIndex > -1 ? args[portIndex + 1] : null;
    }
}

module.exports = RunApp;