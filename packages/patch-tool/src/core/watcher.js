const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const { EventEmitter } = require('events');
const minimatch = require('minimatch');

class PatchWatcher extends EventEmitter {
    constructor(config, merger) {
        super();
        this.config = config;
        this.merger = merger;
        this.watcher = null;
        this.outputWatcher = null;
        this.syncingFiles = new Set(); // 防止循环依赖的标识
        this.timers = new Set(); // 管理定时器
    }

    start() {
        const { baseDir, patchDir, outputDir, watchDelay = 100 } = this.config;
        const fullPatchDir = this.getFullPatchDir();

        // 监听基础目录和补丁目录
        this.watcher = chokidar.watch([baseDir, fullPatchDir], {
            ignored: [
                /(^|[/\\])\../, // 忽略隐藏文件
                /node_modules/,
                /\.git/
            ],
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: watchDelay,
                pollInterval: 100
            }
        });

        // 监听目标目录（反向同步）
        this.outputWatcher = chokidar.watch(outputDir, {
            ignored: [
                /(^|[/\\])\../, // 忽略隐藏文件
                /node_modules/,
                /\.git/
            ],
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: watchDelay,
                pollInterval: 100
            }
        });

        // 事件绑定
        this.watcher
            .on('add', filePath => this.handleAdd(filePath))
            .on('change', filePath => this.handleChange(filePath))
            .on('unlink', filePath => this.handleDelete(filePath))
            .on('error', error => console.error('监听错误:', error));

        // 目标目录事件绑定（反向同步）
        this.outputWatcher
            .on('change', filePath => this.handleOutputChange(filePath))
            .on('error', error => console.error('目标目录监听错误:', error));

        console.log(`👀 开始监听目录:
                      - 基础目录: ${baseDir}
                      - 补丁目录: ${fullPatchDir}
                      - 目标目录: ${outputDir} (反向同步)`);
    }

    // 处理目标目录文件变更（反向同步到源文件）
    async handleOutputChange(filePath) {
        this.emit('change', filePath);
        const { baseDir, outputDir } = this.config;
        const relativePath = path.relative(outputDir, filePath);

        // 防止循环依赖：检查是否正在同步相关文件
        const outputKey = `output:${filePath}`;
        const patchKey = `patch:${path.join(this.getFullPatchDir(), relativePath)}`;
        const baseKey = `base:${path.join(baseDir, relativePath)}`;

        if (this.syncingFiles.has(outputKey) || this.syncingFiles.has(patchKey) || this.syncingFiles.has(baseKey)) {
            return;
        }

        try {
            if (await this.merger.isIgnored(relativePath)) return;

            const patchFilePath = path.join(this.getFullPatchDir(), relativePath);
            const baseFilePath = path.join(baseDir, relativePath);

            // 标记所有相关文件正在同步
            this.syncingFiles.add(outputKey);
            this.syncingFiles.add(patchKey);
            this.syncingFiles.add(baseKey);

            // 如果补丁目录中有文件，优先修改补丁文件
            if (await fs.pathExists(patchFilePath)) {
                await fs.copy(filePath, patchFilePath);
            } else if (await fs.pathExists(baseFilePath)) {
                // 否则修改基础文件
                await fs.copy(filePath, baseFilePath);
            } else {
                console.log(`⚠️ 目标文件变更但源文件不存在: ${relativePath}`);
            }

            // 使用更长的延迟清除标记，确保同步完成
            const timer = setTimeout(() => {
                this.syncingFiles.delete(outputKey);
                this.syncingFiles.delete(patchKey);
                this.syncingFiles.delete(baseKey);
                this.timers.delete(timer);
            }, 500); // 增加到500ms

            this.timers.add(timer);

        } catch (error) {
            console.error(`反向同步失败: ${filePath}`, error);
            // 出错时也要清除标记
            this.syncingFiles.delete(outputKey);
            this.syncingFiles.delete(patchKey);
            this.syncingFiles.delete(baseKey);
        }
    }

    // 修改原有的同步方法，添加循环依赖防护
    async handleChange(filePath,isNoChange = true) {
        if(isNoChange){
            this.emit('change', filePath);
        }
        const { baseDir, outputDir } = this.config;
        const relativePath = filePath.startsWith(baseDir)
            ? path.relative(baseDir, filePath)
            : path.relative(this.getFullPatchDir(), filePath);

        // 防止循环依赖：检查是否正在同步相关文件
        const outputKey = `output:${path.join(outputDir, relativePath)}`;
        const patchKey = `patch:${path.join(this.getFullPatchDir(), relativePath)}`;
        const baseKey = `base:${path.join(baseDir, relativePath)}`;

        if (this.syncingFiles.has(outputKey) || this.syncingFiles.has(patchKey) || this.syncingFiles.has(baseKey)) {
            console.log(`⏭️ 跳过循环同步: ${relativePath}`);
            return;
        }

        try {
            if (filePath.startsWith(baseDir)) {
                // 公共目录文件修改
                const patchFilePath = path.join(this.getFullPatchDir(), relativePath);
                const outputFilePath = path.join(outputDir, relativePath);

                if (await fs.pathExists(patchFilePath)) {
                    console.log(`🔄 忽略公共文件修改: ${relativePath} (存在补丁文件)`);
                    return;
                }

                if (await this.merger.isIgnored(relativePath)) return;

                // 标记正在同步
                this.syncingFiles.add(outputKey);
                this.syncingFiles.add(baseKey);

                await fs.ensureDir(path.dirname(outputFilePath));
                await fs.copy(filePath, outputFilePath);
                console.log(`🔄 同步公共文件修改: ${relativePath}`);

                // 延迟清除标记
                const timer = setTimeout(() => {
                    this.syncingFiles.delete(outputKey);
                    this.syncingFiles.delete(baseKey);
                    this.timers.delete(timer);
                }, 500);

                this.timers.add(timer);

            } else if (filePath.startsWith(this.getFullPatchDir())) {
                // 补丁目录文件修改
                const outputFilePath = path.join(outputDir, relativePath);

                if (await this.merger.isIgnored(relativePath)) return;

                // 标记正在同步
                this.syncingFiles.add(outputKey);
                this.syncingFiles.add(patchKey);

                await fs.ensureDir(path.dirname(outputFilePath));
                await fs.copy(filePath, outputFilePath);
                console.log(`🔄 同步补丁文件修改: ${relativePath}`);

                // 延迟清除标记
                const timer = setTimeout(() => {
                    this.syncingFiles.delete(outputKey);
                    this.syncingFiles.delete(patchKey);
                    this.timers.delete(timer);
                }, 500);

                this.timers.add(timer);
            }
        } catch (error) {
            console.error(`文件修改同步失败: ${filePath}`, error);
        }

        // 文件变化时运行插件生命周期
        if (this.config.plugins) {
            for (const plugin of this.config.plugins) {
                if (typeof plugin.fileChange === 'function') {
                    await plugin.fileChange(filePath);
                }
            }
        }
    }

    async handleAdd(filePath) {
        this.emit('add', filePath);
        // 文件添加时可以触发同步逻辑，类似 handleChange
        await this.handleChange(filePath,false);
    }

    async handleDelete(filePath) {
        this.emit('delete', filePath);
        const { baseDir, outputDir } = this.config;
        console.log(`🗑️ 文件删除: ${filePath}`);

        try {
            let relativePath;
            let outputFilePath;

            if (filePath.startsWith(baseDir)) {
                relativePath = path.relative(baseDir, filePath);
                outputFilePath = path.join(outputDir, relativePath);

                // 检查是否有补丁文件覆盖
                const patchFilePath = path.join(this.getFullPatchDir(), relativePath);
                if (await fs.pathExists(patchFilePath)) {
                    console.log(`🔄 基础文件已删除，但存在补丁文件: ${relativePath}`);
                    return; // 有补丁文件时不删除目标文件
                }
            } else if (filePath.startsWith(this.getFullPatchDir())) {
                relativePath = path.relative(this.getFullPatchDir(), filePath);
                outputFilePath = path.join(outputDir, relativePath);

                // 补丁文件删除后，检查是否需要恢复基础文件
                const baseFilePath = path.join(baseDir, relativePath);
                if (await fs.pathExists(baseFilePath)) {
                    await fs.copy(baseFilePath, outputFilePath);
                    console.log(`🔄 补丁文件已删除，恢复基础文件: ${relativePath}`);
                    return;
                }
            }

            // 删除目标文件
            if (outputFilePath && await fs.pathExists(outputFilePath)) {
                await fs.remove(outputFilePath);
                console.log(`🗑️ 同步删除目标文件: ${relativePath}`);
            }
        } catch (error) {
            console.error(`文件删除同步失败: ${filePath}`, error);
        }

    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
        }
        if (this.outputWatcher) {
            this.outputWatcher.close();
        }
        this.syncingFiles.clear();
        // 清除所有未完成的定时器
        this.clearAllTimers();
    }

    // 清除所有定时器
    clearAllTimers() {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }

    getFullPatchDir() {
        return path.join(
            this.config.patchDir,
            this.config.patchChildDir || ''
        );
    }
}

module.exports = PatchWatcher;