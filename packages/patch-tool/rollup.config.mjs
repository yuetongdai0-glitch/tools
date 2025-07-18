import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

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
                    module: 'es2015' // Rollup 需要 ES 模块作为输入
                }
            }
        })
    ]
};