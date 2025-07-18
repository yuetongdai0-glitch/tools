import * as fs from 'fs';
import { Merger } from './core/merger';
import { PatchWatcher } from './core/watcher';
import { RunApp } from './core/run-app';
import type { Config,PatchMergerOptions } from './types';

/**
 * 加载配置文件
 */
function loadConfig(configPath: string): Config {
    const defaultConfig: Config = {
        baseDir: 'public_src',
        patchDir: 'patch',
        outputDir: 'src',
        watch: true,
        mode: 'development',
        ignoredPatterns: [],
        plugins: [],
        watchDelay: 100
    };

    if (!fs.existsSync(configPath)) {
        console.warn(`配置文件 ${configPath} 不存在，使用默认配置`);
        return defaultConfig;
    }

    const userConfig = require(configPath);
    return {
        ...defaultConfig,
        ...userConfig
    };
}

/**
 * 主要的补丁合并器类
 */
export class PatchMerger {
    private config: Config;
    private merger: Merger;
    private RunApp: RunApp;
    private watcher: PatchWatcher;

    /**
     * 创建 PatchMerger 实例
     */
    constructor(options: PatchMergerOptions) {
        const { configPath, patchChildDir, watch = true, verbose = false } = options;

        if (!configPath) {
            throw new Error('configPath 是必须参数');
        }

        // 加载配置
        this.config = loadConfig(configPath);

        // 合并构造函数参数
        this.config = {
            ...this.config,
            patchChildDir,
            watch,
            verbose
        };

        // 初始化核心模块
        this.merger = new Merger(this.config);
        this.RunApp = new RunApp(this.config);
        this.watcher = new PatchWatcher(this.config, this.merger);

        // 监听 PatchWatcher 的事件
        this.setupWatcherEvents();
    }

    /**
     * 设置 PatchWatcher 事件监听
     */
    private setupWatcherEvents(): void {
        // 监听文件添加事件
        this.watcher.on('add', async (filePath: string) => {
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.fileAdd === 'function') {
                        try {
                            await plugin.fileAdd(filePath);
                        } catch (error) {
                            console.error(`插件 fileAdd 钩子执行失败:`, error);
                        }
                    }
                }
            }
        });

        // 监听文件修改事件
        this.watcher.on('change', async (filePath: string) => {
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.fileChange === 'function') {
                        try {
                            await plugin.fileChange(filePath);
                        } catch (error) {
                            console.error(`插件 fileChange 钩子执行失败:`, error);
                        }
                    }
                }
            }
        });

        // 监听文件删除事件
        this.watcher.on('unlink', async (filePath: string) => {
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.fileDelete === 'function') {
                        try {
                            await plugin.fileDelete(filePath);
                        } catch (error) {
                            console.error(`插件 fileDelete 钩子执行失败:`, error);
                        }
                    }
                }
            }
        });

        // 监听监听器错误事件
        this.watcher.on('error', (error: Error) => {
            console.error('文件监听器错误:', error);
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.watchError === 'function') {
                        try {
                            plugin.watchError(error);
                        } catch (err) {
                            console.error(`插件 watchError 钩子执行失败:`, err);
                        }
                    }
                }
            }
        });
    }

    /**
     * 开发模式
     */
    async dev(): Promise<void> {
        try {
            await this.merger.mergeAll();

            // 执行开发模式启动前的插件钩子
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.beforeDevHook === 'function') {
                        await plugin.beforeDevHook();
                    }
                }
            }

            await this.RunApp.start();

            if (this.config.watch) {
                await this.watcher.start();
            }
        } catch (err) {
            console.error('❌ 启动失败:', err);
            process.exit(1);
        }
    }

    /**
     * 生产模式
     */
    async prod(): Promise<void> {
        try {
            await this.merger.mergeAll();

            // 执行生产模式启动前的插件钩子
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.beforeProdHook === 'function') {
                        await plugin.beforeProdHook();
                    }
                }
            }

            this.RunApp.start();
        } catch (err) {
            console.error('❌ 启动失败:', err);
            process.exit(1);
        }
    }

    /**
     * 启动方法
     */
    async start(): Promise<void> {
        try {
            if (this.config.mode === 'development') {
                await this.dev();
            } else if (this.config.mode === 'production') {
                await this.prod();
            }
        } catch (err) {
            console.error('❌ 启动失败:', err);
            process.exit(1);
        }
    }

    /**
     * 停止监听器
     */
    stop(): void {
        if (this.watcher) {
            this.watcher.stop();
        }
    }
}

// 默认导出
export default PatchMerger;