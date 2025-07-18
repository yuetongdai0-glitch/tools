import spawn from 'cross-spawn';
import { ChildProcess } from 'child_process';
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

        const { app } = this.config;

        if (!app || !app.command) {
            console.error('❌ 必须提供 app.command 参数');
            return;
        }

        const { command, args = [] } = app;
        console.log(`🚀 启动: ${command} ${args.join(' ')}`);



        // 使用 cross-spawn 替代 spawn，提供更好的跨平台兼容性
        this.process = spawn(command, args, {
            stdio: 'inherit'
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
}