#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { Command } = require('commander');
const  {PatchMerger} = require(path.join(__dirname,'../dist/index.js'));
// 初始化命令行程序
const program = new Command();

program
    .name('patch-cli')
    .version(require('../package.json').version)
    .description('项目补丁合并工具')
    .option('-d, --dir <dirname>', '指定补丁子目录 (必须)')
    .option('-c, --config <path>', '配置文件路径', 'patch.config.json')
    .option('--no-watch', '禁用文件监听模式')
    .option('-v, --verbose', '显示详细日志输出')
    .allowUnknownOption(true)
    .action(async (options) => {
        try {
            // 参数验证
            if (!options.dir && !process.env.PATCH_DIR) {
                throw new Error('必须通过 --dir 参数或 PATCH_DIR 环境变量指定补丁子目录');
            }

            // 加载配置
            const configPath = path.resolve(options.config);
            if (!fs.existsSync(configPath)) {
                console.warn(chalk.yellow(`⚠  配置文件 ${options.config} 不存在，使用默认配置`));
            }

            // 初始化合并器
            const merger = new PatchMerger({
                configPath,
                patchChildDir: options.dir,
                verbose: options.verbose
            });

            // 启动
            await merger.start();

            console.log(chalk.green('✅  补丁合并工具已启动'));
        } catch (err) {
            console.error(chalk.red('❌  启动失败:'), err.message);
            process.exit(1);
        }
    });

// 帮助信息补充
program.addHelpText('after', `
示例:
  $ patch-cli --dir projectA
  $ PATCH_DIR=projectB patch-cli --verbose
  $ patch-cli --config custom.config.json --no-watch
`);

// 解析命令行参数
program.parse(process.argv);