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
     */
    watch?: boolean;

    /**
     * 详细日志模式
     */
    verbose?: boolean;

    /**
     * 运行模式
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
     */
    watch?: boolean;

    /**
     * 详细日志模式
     */
    verbose?: boolean;
}
