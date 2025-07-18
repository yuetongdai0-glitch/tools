const plugin = require("tailwindcss/plugin");

const DEFAULT_PREFIX = "p";

/**
 * 将十六进制颜色值转换为RGB值
 * @param {string} hex - 十六进制颜色值，支持 #fff 或 #ffffff 格式
 * @returns {{r: number, g: number, b: number}} RGB颜色对象
 * @example
 * hexToRgb('#ff0000') // 返回 { r: 255, g: 0, b: 0 }
 * hexToRgb('#f00') // 返回 { r: 255, g: 0, b: 0 }
 */
const hexToRgb = (hex) => {
    hex = hex.replace("#", "");

    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((char) => char + char)
            .join("");
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
};

/**
 * 将驼峰命名转换为短横线命名
 * @param {string} str - 驼峰命名的字符串
 * @returns {string} 短横线命名的字符串
 * @example
 * camelToKebab('foregroundSecondary') // 返回 'foreground-secondary'
 * camelToKebab('backgroundColor') // 返回 'background-color'
 */
const camelToKebab = (str) => {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
};

/**
 * 解析主题配置，生成Tailwind CSS所需的工具类和颜色配置
 * @param {Object} themes - 主题配置对象
 * @param {Object} themes.themeName - 主题名称作为键
 * @param {Object} themes.themeName.colors - 该主题的颜色配置
 * @param {string} prefix - CSS变量前缀，默认为 'p'
 * @param {string} defaultTheme - 默认主题名称，该主题的颜色将设置到:root选择器
 * @returns {Object} 解析后的配置对象
 * @returns {Array} returns.variants - 主题变体配置
 * @returns {Object} returns.utilities - CSS工具类配置
 * @returns {Object} returns.colors - Tailwind颜色函数配置
 * @example
 * const themes = {
 *   light: {
 *     colors: {
 *       primary: '#ff0000',
 *       secondary: '#00ff00'
 *     }
 *   },
 *   dark: {
 *     colors: {
 *       primary: '#ff6666',
 *       secondary: '#66ff66'
 *     }
 *   }
 * }
 * resolveConfig(themes, 'color', 'light')
 */
const resolveConfig = (themes = {}, prefix = DEFAULT_PREFIX, defaultTheme = null) => {
    const resolved = {
        variants: [],
        utilities: {},
        colors: {},
    };

    // 处理默认主题，将其颜色变量设置到:root选择器
    if (defaultTheme && themes[defaultTheme]?.colors) {
        const rootSelector = ":root";
        resolved.utilities[rootSelector] = {};

        for (const [colorName, colorValue] of Object.entries(themes[defaultTheme].colors)) {
            if (!colorValue) continue;

            try {
                const colorVariable = `--${prefix}-${camelToKebab(colorName)}`;
                const { r, g, b } = hexToRgb(colorValue);
                resolved.utilities[rootSelector][colorVariable] = `${r}, ${g}, ${b}`;
            } catch (error) {
                console.log("defaultThemeColorProcessingError", error?.message);
            }
        }
    }

    // 处理所有主题
    for (const [themeName, { colors }] of Object.entries(themes)) {
        const cssSelector = `.${themeName},.${themeName}-theme`;

        // 添加主题变体配置
        resolved.variants.push({
            name: themeName,
            definition: [`&.${themeName}`, `&.${themeName}-theme`],
        });

        // 遍历颜色表生成utilities css环境变量
        for (const [colorName, colorValue] of Object.entries(colors)) {
            if (!colorValue) continue;

            try {
                const colorVariable = `--${prefix}-${camelToKebab(colorName)}`;

                if (!resolved.utilities[cssSelector]) {
                    resolved.utilities[cssSelector] = {};
                }

                const { r, g, b } = hexToRgb(colorValue);

                resolved.utilities[cssSelector][colorVariable] = `${r}, ${g}, ${b}`;

                // 只为第一个主题配置Tailwind颜色函数，避免重复
                if (!resolved.colors[colorName]) {
                    resolved.colors[colorName] = ({ opacityValue }) => {
                        if (opacityValue === undefined) {
                            return `rgb(var(${colorVariable}))`;
                        }
                        return `rgba(var(${colorVariable}), ${opacityValue})`;
                    };
                }
            } catch (error) {
                console.log("colorProcessingError", error?.message);
            }
        }
    }
    return resolved;
};

/**
 * 创建Tailwind CSS插件的核心函数
 * @param {Object} themes - 主题配置对象
 * @param {string} prefix - CSS变量前缀
 * @param {string} defaultTheme - 默认主题名称
 * @returns {Function} Tailwind CSS插件函数
 * @description 将解析后的主题配置转换为Tailwind CSS插件，添加CSS工具类和主题变体
 */
const corePlugin = (themes, prefix, defaultTheme) => {
    const resolved = resolveConfig(themes, prefix, defaultTheme);

    return plugin(
        ({ addUtilities, addVariant }) => {
            addUtilities(resolved.utilities);

            resolved?.variants.forEach((variant) => {
                addVariant(variant.name, variant.definition);
            });
        },
        {
            theme: {
                extend: {
                    colors: {
                        ...resolved?.colors,
                    },
                },
            },
        }
    );
};

/**
 * Tailwind主题插件主函数
 * @param {Object} config - 插件配置对象
 * @param {Object} config.themes - 主题配置，必需参数
 * @param {string} [config.prefix='p'] - CSS变量前缀，可选参数
 * @param {string} [config.defaultTheme] - 默认主题名称，该主题的颜色将设置到:root选择器，可选参数
 * @returns {Function|undefined} Tailwind CSS插件函数，如果没有主题配置则返回undefined
 * @description 创建一个支持多主题切换的Tailwind CSS插件，支持设置默认主题到:root选择器
 * @example
 * // 在 tailwind.config.js 中使用
 * const tailWindTheme = require('./plugins/tailwind/theme');

 */
const tailWindTheme = (config) => {
    if (!config.themes) return;

    const { themes = {}, prefix: defaultPrefix = DEFAULT_PREFIX, defaultTheme = null } = config;

    return corePlugin(themes, defaultPrefix, defaultTheme);
};

/**
 * 导出Tailwind主题插件
 * @module tailWindTheme
 */
module.exports = tailWindTheme;
