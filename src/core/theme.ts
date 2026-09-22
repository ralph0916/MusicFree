import Config from "@/core/appConfig";

import { DarkTheme as _DarkTheme, DefaultTheme as _DefaultTheme } from "@react-navigation/native";
import { GlobalState } from "@/utils/stateMapper";
import { CustomizedColors } from "@/hooks/useColors";
import Color from "color";

type ThemePreset = {
    id: string;
    name: string;
    group: "cool" | "simple" | "skin";
    dark: boolean;
    preview: string;
    accent: string;
    colors: CustomizedColors;
};

function buildTheme(
    id: string,
    name: string,
    group: "cool" | "simple" | "skin",
    dark: boolean,
    primary: string,
    pageBackground: string,
    card: string,
    text: string,
    extras: Record<string, string> = {},
): ThemePreset {
    const textSecondary = Color(text).alpha(0.55).toString();
    const divider = dark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.06)";
    const listActive = dark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.06)";
    return {
        id,
        name,
        group,
        dark,
        preview: pageBackground,
        accent: primary,
        colors: {
            ...(dark ? _DarkTheme.colors : _DefaultTheme.colors),
            background: "transparent",
            text,
            textSecondary,
            primary,
            pageBackground,
            shadow: "#000",
            appBar: extras.appBar ?? (dark ? card : primary),
            appBarText: extras.appBarText ?? (dark ? text : "#FFFFFF"),
            musicBar: extras.musicBar ?? card,
            musicBarText: extras.musicBarText ?? text,
            divider,
            listActive,
            mask: dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
            backdrop: card,
            tabBar: card,
            placeholder: extras.placeholder ?? (dark ? "#2A2A2A" : "#F0F0F0"),
            success: "#08A34C",
            danger: extras.danger ?? primary,
            info: extras.info ?? (dark ? "#6B9BD1" : "#507DAF"),
            card,
            notification: card,
            ...extras,
        } as CustomizedColors,
    };
}

/** 炫酷主题 */
const coolThemes: ThemePreset[] = [
    buildTheme("p-night-red", "暗夜红", "cool", true, "#EC4141", "#0D0D0D", "#1A1A1A", "#F5F5F5"),
    buildTheme("p-cyber-purple", "赛博紫", "cool", true, "#B24BF3", "#0E0618", "#1A0F2E", "#F3E8FF", {
        appBar: "#1A0F2E",
        info: "#C084FC",
    }),
    buildTheme("p-neon-blue", "电光蓝", "cool", true, "#3B82F6", "#050B18", "#0F172A", "#E2E8F0", {
        appBar: "#0F172A",
        info: "#60A5FA",
    }),
    buildTheme("p-aurora-cyan", "极光青", "cool", true, "#06B6D4", "#041416", "#0B2428", "#E0F7FA", {
        appBar: "#0B2428",
        info: "#22D3EE",
    }),
    buildTheme("p-sunset-orange", "落日橙", "cool", true, "#F97316", "#140A05", "#24140C", "#FFF7ED", {
        appBar: "#24140C",
        info: "#FB923C",
    }),
    buildTheme("p-rose-gold", "玫瑰金", "cool", true, "#E11D48", "#12080C", "#1F1218", "#FFE4E6", {
        appBar: "#1F1218",
        info: "#FB7185",
    }),
];

/** 网易云风格皮肤 */
const skinThemes: ThemePreset[] = [
    buildTheme("p-skin-official", "官方红", "skin", false, "#EC4141", "#F5F5F5", "#FFFFFF", "#1A1A1A"),
    buildTheme("p-skin-nightcat", "夜猫子", "skin", true, "#EC4141", "#0A0A0A", "#161616", "#F2F2F2", {
        appBar: "#161616",
    }),
    buildTheme("p-skin-sakura", "樱花粉", "skin", false, "#F472B6", "#FFF1F5", "#FFFFFF", "#831843", {
        appBar: "#F472B6",
        placeholder: "#FCE7F3",
    }),
    buildTheme("p-skin-ocean", "海洋蓝", "skin", false, "#0EA5E9", "#EFF9FF", "#FFFFFF", "#0C4A6E", {
        appBar: "#0EA5E9",
        placeholder: "#E0F2FE",
    }),
    buildTheme("p-skin-matcha", "抹茶绿", "skin", false, "#22C55E", "#F0FDF4", "#FFFFFF", "#14532D", {
        appBar: "#22C55E",
        placeholder: "#DCFCE7",
    }),
    buildTheme("p-skin-starry", "星空黑", "skin", true, "#818CF8", "#050514", "#12122A", "#EEF2FF", {
        appBar: "#12122A",
        info: "#A5B4FC",
    }),
    buildTheme("p-skin-lemon", "柠檬黄", "skin", false, "#EAB308", "#FFFBEB", "#FFFFFF", "#713F12", {
        appBar: "#EAB308",
        appBarText: "#422006",
        placeholder: "#FEF3C7",
    }),
    buildTheme("p-skin-grape", "葡萄紫", "skin", true, "#A855F7", "#14081F", "#241235", "#FAF5FF", {
        appBar: "#241235",
        info: "#D8B4FE",
    }),
    buildTheme("p-skin-coral", "珊瑚粉", "skin", false, "#FB7185", "#FFF1F2", "#FFFFFF", "#881337", {
        appBar: "#FB7185",
        placeholder: "#FFE4E6",
    }),
    buildTheme("p-skin-glacier", "冰川灰", "skin", false, "#64748B", "#F8FAFC", "#FFFFFF", "#0F172A", {
        appBar: "#64748B",
        placeholder: "#E2E8F0",
    }),
];

/** 简约主题 */
const simpleThemes: ThemePreset[] = [
    buildTheme("p-light", "极简白", "simple", false, "#EC4141", "#F7F7F7", "#FFFFFF", "#1A1A1A"),
    buildTheme("p-dark", "纯黑", "simple", true, "#EC4141", "#111111", "#1C1C1C", "#F5F5F5"),
    buildTheme("p-cream", "米白", "simple", false, "#C45C26", "#F7F3EE", "#FFFcf8", "#2C241B", {
        appBar: "#C45C26",
        placeholder: "#EFE8DF",
    }),
    buildTheme("p-fog", "雾灰", "simple", false, "#5B6B7A", "#F2F3F5", "#FFFFFF", "#1F2933", {
        appBar: "#5B6B7A",
        placeholder: "#E8EAED",
    }),
    buildTheme("p-mint", "清新绿", "simple", false, "#2BAE85", "#F3FAF7", "#FFFFFF", "#14352C", {
        appBar: "#2BAE85",
        placeholder: "#E6F4EF",
    }),
    buildTheme("p-ink", "墨黑简", "simple", true, "#A3A3A3", "#090909", "#141414", "#FAFAFA", {
        appBar: "#141414",
        primary: "#FAFAFA",
        danger: "#EF4444",
    }),
    buildTheme("p-sky", "天空蓝", "simple", false, "#3B82F6", "#F0F7FF", "#FFFFFF", "#0F172A", {
        appBar: "#3B82F6",
        placeholder: "#E5EFFF",
    }),
];

export const themePresets: ThemePreset[] = [
    ...skinThemes,
    ...coolThemes,
    ...simpleThemes,
];

export const lightTheme = {
    id: "p-light",
    ..._DefaultTheme,
    colors: themePresets.find(t => t.id === "p-light")!.colors,
};

export const darkTheme = {
    id: "p-dark",
    ..._DarkTheme,
    colors: themePresets.find(t => t.id === "p-dark")!.colors,
};

function presetToNavTheme(preset: ThemePreset) {
    return {
        id: preset.id,
        dark: preset.dark,
        colors: preset.colors,
    };
}

interface IBackgroundInfo {
    url?: string;
    blur?: number;
    opacity?: number;
}

const themeStore = new GlobalState(lightTheme as any);
const backgroundStore = new GlobalState<IBackgroundInfo | null>(null);

function findPreset(themeName: string) {
    return themePresets.find(t => t.id === themeName);
}

function setup() {
    const currentTheme = Config.getConfig("theme.selectedTheme") ?? "p-light";
    const preset = findPreset(currentTheme);

    if (preset) {
        themeStore.setValue(presetToNavTheme(preset) as any);
    } else if (currentTheme === "custom") {
        themeStore.setValue({
            id: currentTheme,
            dark: true,
            // @ts-ignore
            colors:
                (Config.getConfig("theme.colors") as CustomizedColors) ??
                darkTheme.colors,
        });
    } else {
        themeStore.setValue(lightTheme as any);
    }

    const bgUrl = Config.getConfig("theme.background");
    const bgBlur = Config.getConfig("theme.backgroundBlur");
    const bgOpacity = Config.getConfig("theme.backgroundOpacity");

    backgroundStore.setValue({
        url: bgUrl,
        blur: bgBlur ?? 20,
        opacity: bgOpacity ?? 0.6,
    });
}

function setTheme(
    themeName: string,
    extra?: {
        colors?: Partial<CustomizedColors>;
        background?: IBackgroundInfo;
    },
) {
    const preset = findPreset(themeName);
    if (preset) {
        themeStore.setValue(presetToNavTheme(preset) as any);
    } else {
        themeStore.setValue({
            id: themeName,
            dark: true,
            colors: {
                ...darkTheme.colors,
                ...(extra?.colors ?? {}),
            },
        } as any);
    }

    Config.setConfig("theme.selectedTheme", themeName);
    Config.setConfig("theme.colors", themeStore.getValue().colors);

    if (extra?.background) {
        const currentBg = backgroundStore.getValue();
        let newBg: IBackgroundInfo = {
            blur: 20,
            opacity: 0.6,
            ...(currentBg ?? {}),
            url: undefined,
        };
        if (typeof extra.background.blur === "number") {
            newBg.blur = extra.background.blur;
        }
        if (typeof extra.background.opacity === "number") {
            newBg.opacity = extra.background.opacity;
        }
        if (extra.background.url) {
            newBg.url = extra.background.url;
        }

        Config.setConfig("theme.background", newBg.url);
        Config.setConfig("theme.backgroundBlur", newBg.blur);
        Config.setConfig("theme.backgroundOpacity", newBg.opacity);

        backgroundStore.setValue(newBg);
    }
}

function setColors(colors: Partial<CustomizedColors>) {
    const currentTheme = themeStore.getValue();
    if (!findPreset(currentTheme.id)) {
        const newTheme = {
            ...currentTheme,
            colors: {
                ...currentTheme.colors,
                ...colors,
            },
        };
        Config.setConfig("theme.customColors", newTheme.colors);
        Config.setConfig("theme.colors", newTheme.colors);
        themeStore.setValue(newTheme);
    }
}

function setBackground(backgroundInfo: Partial<IBackgroundInfo>) {
    const currentBackgroundInfo = backgroundStore.getValue();
    let newBgInfo = {
        ...(currentBackgroundInfo ?? {
            opacity: 0.6,
            blur: 20,
        }),
    };
    if (typeof backgroundInfo.blur === "number") {
        Config.setConfig("theme.backgroundBlur", backgroundInfo.blur);
        newBgInfo.blur = backgroundInfo.blur;
    }
    if (typeof backgroundInfo.opacity === "number") {
        Config.setConfig("theme.backgroundOpacity", backgroundInfo.opacity);
        newBgInfo.opacity = backgroundInfo.opacity;
    }
    if (backgroundInfo.url !== undefined) {
        Config.setConfig("theme.background", backgroundInfo.url);
        newBgInfo.url = backgroundInfo.url;
    }
    backgroundStore.setValue(newBgInfo);
}

const configableColorKey: Array<keyof CustomizedColors> = [
    "primary",
    "text",
    "appBar",
    "appBarText",
    "musicBar",
    "musicBarText",
    "pageBackground",
    "backdrop",
    "card",
    "placeholder",
    "tabBar",
    "notification",
];

const Theme = {
    setup,
    setTheme,
    setBackground,
    setColors,
    useTheme: themeStore.useValue,
    getTheme: themeStore.getValue,
    useBackground: backgroundStore.useValue,
    configableColorKey,
    presets: themePresets,
};

export default Theme;
