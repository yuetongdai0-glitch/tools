import {exec, execSync} from 'child_process';
import { promisify } from 'util';
import {Config} from "../types";


export class RunApp {
    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

     start() {
        const { app } = this.config;

        if (!app || !app.command) {
            console.error('❌ 必须提供 app.command 参数');
            return;
        }

        const { command, args = [] } = app;
        const fullCommand = `${command} ${args.join(' ')}`;
        console.log(`🚀 执行: ${fullCommand}`);

        try {
             execSync(fullCommand, {
                 stdio: 'inherit'
            });
            console.log('✅ 命令执行完成');
        } catch (error) {
            console.error('❌ 命令执行失败:', error.message);
            throw error;
        }
    }

    async stop(): Promise<void> {
        console.log('命令已执行完成');
    }
}