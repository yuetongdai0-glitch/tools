const path = require('path');
const fs = require('fs');
// 使用绝对路径引入模块
const Merger = require(path.join(__dirname, './core/merger'));
const Watcher = require(path.join(__dirname, './core/watcher'));
const RunApp = require(path.join(__dirname, './core/run-app'));

// 将工具函数移入当前文件避免循环依赖
function loadConfig(configPath) {
    const defaultConfig = {
        baseDir: 'public_src',
        patchDir: 'patch',
        outputDir: 'src',
        watch: true
    };

    if (!fs.existsSync(configPath)) {
        console.warn(`配置文件 ${configPath} 不存在，使用默认配置`);
        return defaultConfig;
    }

    return {
        ...defaultConfig,
        ...require(configPath)
    };
}

class PatchMerger {
    /**
     * @param {object} options
     * @param {string} options.configPath - 配置文件路径
     * @param {string} [options.patchChildDir] - 补丁子目录
     * @param {boolean} [options.watch=true] - 是否启用监听
     * @param {boolean} [options.verbose=false] - 详细日志模式
     * @typedef {Object} Plugin
     * @property {function(string): Promise<void>|void} [fileAdd] - 文件添加时触发
     * @property {function(string): Promise<void>|void} [fileChange] - 文件修改时触发
     * @property {function(string): Promise<void>|void} [fileDelete] - 文件删除时触发
     * @property {function(Error): void} [watchError] - 监听器错误时触发
     * @property {function(): Promise<void>|void} [beforeProdHook] - 生产模式启动前触发
     * @property {function(): Promise<void>|void} [beforeDevHook] - 开发模式启动前触发
     * @property {function(): Promise<void>|void} [afterMergeHook] - 合并完成后触发
     * @property {function(): Promise<void>|void} [afterStartHook] - 应用启动后触发
     */
    constructor({ configPath, patchChildDir, watch = true, verbose = false }) {
        if (!configPath) throw new Error('configPath 是必须参数');

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
        this.watcher = new Watcher(this.config, this.merger);

        // 监听 PatchWatcher 的事件
        this.setupWatcherEvents();
    }

    /**
     * 设置 PatchWatcher 事件监听
     */
    setupWatcherEvents() {
        // 监听文件添加事件
        this.watcher.on('add', async (filePath) => {
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
        this.watcher.on('change', async (filePath) => {
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
        this.watcher.on('unlink', async (filePath) => {
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
        this.watcher.on('error', (error) => {
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

    /** *
     * 开发模式
     */
    async dev() {
        try {
            await this.merger.mergeAll();
            // 执行上线前的插件钩子
            if (this.config.plugins) {
                for (const plugin of this.config.plugins) {
                    if (typeof plugin.beforeProdHook === 'function') {
                        await plugin.beforeProdHook();
                    }
                }
            }
            await this.RunApp.start();
            if(this.config.watch){
                await this.watcher.start();
            }
        } catch (err) {
            console.error('❌ 启动失败:', err);
            process.exit(1);
        }
    }

    /** *
     * 生产模式
     */
    async prod() {
        try {
            await this.merger.mergeAll();
            // 执行上线前的插件钩子
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

    /** *
     * 启动方法
     */
    async start() {
        try {
            if(this.config.mode === 'development'){
                await this.dev()
            }
            else if(this.config.mode === 'production'){
                await this.prod()
            }
        } catch (err) {
            console.error('❌ 启动失败:', err);
            process.exit(1);
        }
    }

    /**
     * 停止监听器
     */
    stop() {
        if (this.watcher) {
            this.watcher.stop();
        }
    }
}

// 确保只导出类
module.exports = PatchMerger;