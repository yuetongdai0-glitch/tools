import * as fs from 'fs';
import * as path from 'path';
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

    try {
        const fullPath = path.resolve(configPath);
        let content = fs.readFileSync(fullPath, 'utf-8');

        // 如果是 TypeScript 文件，移除类型注解
        if (fullPath.endsWith('.ts')) {
            content = removeTypeScriptTypes(content);
        }

        // 转换 ES 模块语法为 CommonJS
        content = transformESModulesToCommonJS(content);

        // 创建临时文件并执行
        const tempPath = fullPath.replace(/\.(ts|js)$/, '.temp.js');
        fs.writeFileSync(tempPath, content);

        let userConfig: any;
        try {
            delete require.cache[require.resolve(tempPath)];
            userConfig = require(tempPath);
            fs.unlinkSync(tempPath);
        } catch (error) {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw error;
        }

        // 支持 ES6 default export
        userConfig = userConfig.default || userConfig;
        console.log(userConfig,"userConfiguserConfig")

        // 如果是函数，执行它获取配置
        if (typeof userConfig === 'function') {
            userConfig = userConfig();
        }

        return {
            ...defaultConfig,
            ...userConfig
        } as Config;

    } catch (error: any) {
        console.error(`加载配置文件失败: ${error.message || error}`);
        console.warn('使用默认配置');
        return defaultConfig;
    }
}

/**
 * 移除 TypeScript 类型注解
 */
function removeTypeScriptTypes(content: string): string {
    // 移除类型注解
    content = content.replace(/:\s*[A-Za-z_$][\w$<>[\]|&.,\s]*(?=\s*[=,;)\]}])/g, '');
    // 移除泛型
    content = content.replace(/<[^>]*>/g, '');
    // 移除接口定义
    content = content.replace(/interface\s+\w+\s*\{[^}]*\}/g, '');
    // 移除类型别名
    content = content.replace(/type\s+\w+\s*=[^;]*;/g, '');
    // 移除可选属性标记
    content = content.replace(/\?\s*:/g, ':');
    // 移除 as 类型断言
    content = content.replace(/\s+as\s+\w+/g, '');

    return content;
}

/**
 * 转换 ES 模块语法为 CommonJS
 */
function transformESModulesToCommonJS(content: string): string {
    // 转换 import 语句
    content = content.replace(
        /import\s+(\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"];?/g,
        (match, importPart, modulePath) => {
            if (importPart.startsWith('{') && importPart.endsWith('}')) {
                // 解构导入: import { a, b } from 'module'
                return `const ${importPart} = require('${modulePath}');`;
            } else if (importPart.includes('* as')) {
                // 命名空间导入: import * as name from 'module'
                const name = importPart.replace('* as ', '').trim();
                return `const ${name} = require('${modulePath}');`;
            } else {
                // 默认导入: import name from 'module'
                return `const ${importPart.trim()} = require('${modulePath}').default || require('${modulePath}');`;
            }
        }
    );

    // 转换 export default
    content = content.replace(/export\s+default\s+/g, 'module.exports = ');

    // 转换 export const/function/class
    content = content.replace(/export\s+(const|function|class)\s+(\w+)/g,
        '$1 $2'
    );

    return content;
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
                            await plugin.fileAdd(this.config,filePath);
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
                            await plugin.fileChange(this.config,filePath);
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
                            await plugin.fileDelete(this.config,filePath);
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
                            plugin.watchError(this.config,error);
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
                        await plugin.beforeDevHook(this.config);
                    }
                }
            }

             this.RunApp.start();

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
                        await plugin.beforeProdHook(this.config);
                    }
                }
            }

             this.RunApp.start();

            // 打包完成之后运行插件钩子
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.afterMergeHook === 'function') {
                        await plugin.afterMergeHook(this.config);
                    }
                }
            }
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