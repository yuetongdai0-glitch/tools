declare module 'patch-tool' {
    import { EventEmitter } from 'events';

    /**
     * 插件接口定义
     */
    export interface Plugin {
        /**
         * 文件添加时触发
         * @param filePath 添加的文件路径
         */
        fileAdd?: (filePath: string) => Promise<void> | void;

        /**
         * 文件修改时触发
         * @param filePath 修改的文件路径
         */
        fileChange?: (filePath: string) => Promise<void> | void;

        /**
         * 文件删除时触发
         * @param filePath 删除的文件路径
         */
        fileDelete?: (filePath: string) => Promise<void> | void;

        /**
         * 监听器错误时触发
         * @param error 错误对象
         */
        watchError?: (error: Error) => void;

        /**
         * 生产模式启动前触发
         */
        beforeProdHook?: () => Promise<void> | void;

        /**
         * 开发模式启动前触发
         */
        beforeDevHook?: () => Promise<void> | void;

        /**
         * 合并完成后触发
         */
        afterMergeHook?: () => Promise<void> | void;

        /**
         * 应用启动后触发
         */
        afterStartHook?: () => Promise<void> | void;
    }

    /**
     * 应用运行配置
     */
    export interface AppConfig {
        /**
         * 启动命令
         */
        command: string;

        /**
         * 命令参数
         */
        args?: string[];

        /**
         * 工作目录
         */
        cwd?: string;

        /**
         * 环境变量
         */
        env?: Record<string, string>;

        /**
         * 是否在新窗口中运行
         */
        detached?: boolean;
    }

    /**
     * 配置文件接口定义
     */
    export interface Config {
        /**
         * 基础项目目录
         */
        baseDir: string;

        /**
         * 补丁根目录
         */
        patchDir: string;

        /**
         * 输出目录
         */
        outputDir: string;

        /**
         * 补丁子目录名称
         */
        patchChildDir?: string;

        /**
         * 是否启用文件监听
         * @default true
         */
        watch?: boolean;

        /**
         * 详细日志模式
         * @default false
         */
        verbose?: boolean;

        /**
         * 运行模式
         * @default 'development'
         */
        mode?: 'development' | 'production';

        /**
         * 忽略的文件/目录模式
         */
        ignoredPatterns?: Array<string | RegExp | ((path: string) => boolean)>;

        /**
         * 插件列表
         */
        plugins?: Plugin[];

        /**
         * 文件监听延迟时间（毫秒）
         * @default 100
         */
        watchDelay?: number;

        /**
         * 应用运行配置
         */
        app?: AppConfig;
    }

    /**
     * PatchMerger 构造函数选项
     */
    export interface PatchMergerOptions {
        /**
         * 配置文件路径
         */
        configPath: string;

        /**
         * 补丁子目录
         */
        patchChildDir?: string;

        /**
         * 是否启用监听
         * @default true
         */
        watch?: boolean;

        /**
         * 详细日志模式
         * @default false
         */
        verbose?: boolean;
    }

    /**
     * 合并器事件类型
     */
    export interface MergerEvents {
        'add': (filePath: string) => void;
        'change': (filePath: string) => void;
        'unlink': (filePath: string) => void;
        'error': (error: Error) => void;
    }

    /**
     * 文件监听器类
     */
    export class PatchWatcher extends EventEmitter {
        constructor(config: Config, merger: Merger);

        /**
         * 开始监听
         */
        start(): void;

        /**
         * 停止监听
         */
        stop(): void;

        /**
         * 获取完整补丁目录路径
         */
        getFullPatchDir(): string;
    }

    /**
     * 文件合并器类
     */
    export class Merger {
        constructor(config: Config);

        /**
         * 合并所有文件
         */
        mergeAll(): Promise<void>;

        /**
         * 检查文件是否被忽略
         */
        isIgnored(relativePath: string): Promise<boolean>;
    }

    /**
     * 应用运行器类
     */
    export class RunApp {
        constructor(config: Config);

        /**
         * 启动应用
         */
        start(): Promise<void>;

        /**
         * 停止应用
         */
        stop(): void;
    }

    /**
     * 主要的补丁合并器类
     */
    export class PatchMerger {
        /**
         * 创建 PatchMerger 实例
         */
        constructor(options: PatchMergerOptions);

        /**
         * 开发模式启动
         */
        dev(): Promise<void>;

        /**
         * 生产模式启动
         */
        prod(): Promise<void>;

        /**
         * 启动合并器
         */
        start(): Promise<void>;

        /**
         * 停止监听器
         */
        stop(): void;
    }

    /**
     * 配置加载函数
     */
    export function loadConfig(configPath: string): Config;

    /**
     * 默认导出 PatchMerger 类
     */
    export default PatchMerger;
}

/**
 * 配置文件 JSON Schema 类型
 */
export interface PatchConfigSchema {
    /**
     * 基础项目目录
     */
    baseDir: string;

    /**
     * 补丁根目录
     */
    patchDir: string;

    /**
     * 输出目录
     */
    outputDir: string;

    /**
     * 运行模式
     */
    mode?: 'development' | 'production';

    /**
     * 忽略的文件/目录模式
     */
    ignoredPatterns?: string[];

    /**
     * 文件监听延迟时间（毫秒）
     */
    watchDelay?: number;

    /**
     * 应用运行配置
     */
    app?: {
        command: string;
        args?: string[];
        cwd?: string;
        env?: Record<string, string>;
        detached?: boolean;
    };

    /**
     * 插件配置（插件通过代码动态加载）
     */
    plugins?: Array<{
        name: string;
        options?: Record<string, any>;
    }>;
}