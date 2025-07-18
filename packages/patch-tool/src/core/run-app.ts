import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';
import { Config } from '../types';

export class RunApp {
    private config: Config;
    private process: ChildProcess | null = null;
    private restarting: boolean = false;

    constructor(config: Config) {
        this.config = config;
    }

    start(): void {
        if (this.process) {
            console.warn('进程已在运行');
            return;
        }

        const { app, outputDir } = this.config;

        if (!app || !app.command) {
            console.error('❌ 必须提供 app.command 参数');
            return;
        }

        const { command, args = [] } = app;
        console.log(`🚀 启动: ${command} ${args.join(' ')}`);

        // 设置环境变量
        const env = {
            ...process.env,
            APP_ROOT: path.resolve(outputDir),
            PORT: this.getPort(args) || '8000',
            ...app.env
        };

        // 跨平台进程启动
        this.process = spawn(command, args, {
            stdio: 'inherit',
            env,
            cwd: app.cwd || process.cwd(),
            detached: app.detached || false
        });

        // 进程事件处理
        this.process.on('error', (err: Error) => {
            console.error('❌ 进程启动失败:', err);
            this.process = null;
        });

        this.process.on('exit', (code: number | null, signal: string | null) => {
            if (!this.restarting) {
                console.log(`进程退出 ${signal ? `(信号: ${signal})` : `(代码: ${code})`}`);
            }
            this.process = null;
            this.restarting = false;
        });
    }

    async stop(): Promise<void> {
        if (!this.process) return;

        return new Promise((resolve) => {
            console.log('🛑 正在停止进程...');
            treeKill(this.process!.pid!, 'SIGTERM', (err?: Error) => {
                if (err) {
                    console.error('停止进程失败:', err);
                } else {
                    console.log('✅ 进程已停止');
                }
                resolve();
            });
        });
    }

    async restart(): Promise<void> {
        this.restarting = true;
        await this.stop();

        // 等待一小段时间确保进程完全停止
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.start();
    }

    private parseCommand(fullCommand: string): { command: string; args: string[] } {
        // 处理类似 "cross-env NODE_ENV=development dev" 的复杂命令
        const parts = fullCommand.split(/\s+/);
        const command = parts.find(part => !/=/.test(part));
        const args = parts.filter(part => part !== command);

        if (!command) {
            throw new Error('无法解析命令');
        }

        return { command, args };
    }

    private getPort(args: string[]): string | null {
        // 从 --port 参数提取端口
        const portIndex = args.findIndex(arg => arg === '--port');
        return portIndex > -1 ? args[portIndex + 1] : null;
    }

    /**
     * 检查进程是否正在运行
     */
    isRunning(): boolean {
        return this.process !== null;
    }

    /**
     * 获取进程 PID
     */
    getPid(): number | undefined {
        return this.process?.pid;
    }
}