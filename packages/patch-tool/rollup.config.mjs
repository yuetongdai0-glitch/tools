import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import obfuscator from 'rollup-plugin-obfuscator';

export default {
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'cjs'
    },
    external: ['fs-extra', 'chokidar', 'minimatch', 'tree-kill', 'child_process', 'path', 'events'],
    plugins: [
        resolve({
            preferBuiltins: true
        }),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
            useTsconfigDeclarationDir: true,
            tsconfigOverride: {
                compilerOptions: {
                    module: 'es2015'
                }
            }
        }),
        obfuscator({
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            stringArray: true,
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false
        }),
        terser({
            compress: {
                // drop_console: true,
                // drop_debugger: true
            },
            mangle: {
                toplevel: true
            }
        })
    ]
};