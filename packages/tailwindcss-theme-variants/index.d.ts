declare module 'tailwind-theme-variants' {
    interface ThemeConfig {
        colors: Record<string, string>;
    }

    interface PluginConfig {
        themes: Record<string, ThemeConfig>;
        prefix?: string;
        defaultTheme?: string;
    }

    function tailwindcssThemeVariants(config: PluginConfig): any;
    export = tailwindcssThemeVariants;
}