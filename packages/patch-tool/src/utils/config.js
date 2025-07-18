const path = require('path');
const fs = require('fs');
const arg = require('arg');

const DEFAULT_CONFIG = {
    baseDir: 'public_src',
    patchDir: 'patch',
    outputDir: 'src',
    umiCommand: 'umi dev',
    watch: true,
    watchDelay: 500
};

const UMI_OPTIONS = {
    '--dir': String,
    '--watch': Boolean,
    '-d': '--dir',
    '-w': '--watch'
};

module.exports = {
    loadConfig(configPath) {
        const userConfig = fs.existsSync(configPath)
            ? require(path.resolve(configPath))
            : {};

        return { ...DEFAULT_CONFIG, ...userConfig };
    },

    parseArgs() {
        return arg(UMI_OPTIONS, { argv: process.argv.slice(2) });
    }
};