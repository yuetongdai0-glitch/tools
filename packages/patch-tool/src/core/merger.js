const path = require('path');
const fs = require('fs-extra');
const minimatch = require('minimatch');

class Merger {
    constructor(config) {
        this.config = config;
    }

    /**
     * 全量合并
     */
    async mergeAll() {
        await this.clearOutput();
        await this.copyBaseFiles();
        await this.applyPatches();
    }

    // 以下是具体实现方法
    // ===============================================
    async clearOutput() {
        const srcDir = this.config.outputDir;
        if (await fs.pathExists(srcDir)) {
            const files = await fs.readdir(srcDir);
            for (const file of files) {
                if (await this.isIgnored(file)) continue;
                const filePath = path.join(srcDir, file);
                await fs.remove(filePath);
            }
        }
    }

    async copyBaseFiles() {
        await this.copyFilesRecursively(this.config.baseDir, this.config.outputDir, '');
    }

    // 递归复制基础文件
    async copyFilesRecursively(srcDir, destDir, relativePath) {
        const currentSrcDir = path.join(srcDir, relativePath);
        const currentDestDir = path.join(destDir, relativePath);

        if (!await fs.pathExists(currentSrcDir)) return;

        const files = await fs.readdir(currentSrcDir);

        for (const file of files) {
            const currentRelativePath = path.join(relativePath, file);

            if (await this.isIgnored(currentRelativePath)) continue;

            const srcPath = path.join(currentSrcDir, file);
            const destPath = path.join(currentDestDir, file);
            const stat = await fs.lstat(srcPath);

            if (stat.isDirectory()) {
                // 递归处理目录
                await this.copyFilesRecursively(srcDir, destDir, currentRelativePath);
            } else {
                // 处理文件 - 复制真实文件而不是创建软链接
                await fs.ensureDir(path.dirname(destPath));

                // 如果目标文件已存在，先删除
                if (await fs.pathExists(destPath)) {
                    await fs.remove(destPath);
                }

                // 复制文件而不是创建软链接
                await fs.copy(srcPath, destPath);
                // console.log(`📋 复制文件: ${currentRelativePath}`);
            }
        }
    }

    async applyPatches() {
        const patchDir = this.getFullPatchDir();
        if (!fs.existsSync(patchDir)) return;

        await this.applyPatchesRecursively(patchDir, this.config.outputDir, '');
    }

    // 递归应用补丁文件
    async applyPatchesRecursively(patchDir, destDir, relativePath) {
        const currentPatchDir = path.join(patchDir, relativePath);
        const currentDestDir = path.join(destDir, relativePath);

        if (!await fs.pathExists(currentPatchDir)) return;

        const files = await fs.readdir(currentPatchDir);

        for (const file of files) {
            const currentRelativePath = path.join(relativePath, file);

            if (await this.isIgnored(currentRelativePath)) continue;

            const patchPath = path.join(currentPatchDir, file);
            const destPath = path.join(currentDestDir, file);
            const stat = await fs.lstat(patchPath);

            if (stat.isDirectory()) {
                // 递归处理目录
                await this.applyPatchesRecursively(patchDir, destDir, currentRelativePath);
            } else {
                // 处理文件 - 复制真实文件而不是创建软链接
                if (await fs.pathExists(destPath)) {
                    await fs.remove(destPath);
                }

                // 确保父目录存在并复制文件
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(patchPath, destPath);
                // console.log(`🔄 应用补丁: ${currentRelativePath}`);
            }
        }
    }

    // 辅助方法
    // ===============================================
    getFullPatchDir() {
        return path.join(
            this.config.patchDir,
            this.config.patchChildDir || ''
        );
    }

    async isIgnored(filePath) {
        // 确保路径格式一致，使用正斜杠
        const normalizedPath = filePath.replace(/\\/g, '/');

        return this.config.ignoredPatterns.some(pattern => {
            const isMatch = minimatch(normalizedPath, pattern, {
                dot: true,  // 匹配以点开头的文件
                matchBase: true  // 允许基础名称匹配
            });

            // 调试日志
            if (isMatch) {
                console.log(`🚫 忽略文件: ${normalizedPath} (匹配模式: ${pattern})`);
            }

            return isMatch;
        });
    }
}

module.exports = Merger;