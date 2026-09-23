import AppConfig from "@shared/app-config/renderer";

/** 将登录得到的 Cookie 写入插件用户变量，供内置插件读取 */
export function syncPluginCookie(platform: string, cookie: string) {
    const meta = { ...(AppConfig.getConfig("private.pluginMeta") || {}) };
    const current = { ...(meta[platform] || {}) };
    current.userVariables = {
        ...(current.userVariables || {}),
        cookie,
    };
    meta[platform] = current;
    AppConfig.setConfig({
        "private.pluginMeta": meta,
    });
}

export function clearPluginCookie(platform: string) {
    const meta = { ...(AppConfig.getConfig("private.pluginMeta") || {}) };
    const current = { ...(meta[platform] || {}) };
    if (current.userVariables) {
        const next = { ...current.userVariables };
        delete next.cookie;
        current.userVariables = next;
    }
    meta[platform] = current;
    AppConfig.setConfig({
        "private.pluginMeta": meta,
    });
}
