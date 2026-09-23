import CryptoJS from "crypto-js";
import bigInt from "big-integer";
import { appUtil } from "@shared/utils/renderer";
import { clearPluginCookie, syncPluginCookie } from "./syncPluginCookie";

const STORAGE_KEY = "ralphmusic.netease.auth";
export const NETEASE_PLATFORM = "网易云";

const modulus =
    "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";
const nonce = "0CoJUm6Qyw8W8jud";
const pubKey = "010001";
const iv = "0102030405060708";

export type NeteaseProfile = {
    userId?: number | string;
    nickname?: string;
    avatarUrl?: string;
};

type NeteaseAuthState = {
    cookie: string;
    profile?: NeteaseProfile;
};

/** 扫码流程中跨请求保留的临时 Cookie */
let qrSessionCookie = "";

function randomString(length: number) {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function aesEncrypt(text: string, key: string) {
    return CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(text),
        CryptoJS.enc.Utf8.parse(key),
        {
            iv: CryptoJS.enc.Utf8.parse(iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        },
    ).toString();
}

function strToHex(str: string) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex;
}

function rsaEncrypt(text: string) {
    const reversed = text.split("").reverse().join("");
    const hexText = strToHex(reversed);
    const encrypted = bigInt(hexText, 16)
        .modPow(bigInt(pubKey, 16), bigInt(modulus, 16))
        .toString(16);
    return encrypted.padStart(256, "0");
}

export function weapiEncrypt(object: Record<string, any>) {
    const text = JSON.stringify(object);
    const secKey = randomString(16);
    const params = aesEncrypt(aesEncrypt(text, nonce), secKey);
    const encSecKey = rsaEncrypt(secKey);
    return { params, encSecKey };
}

/** 解析接口 body 里的 cookie（可能是数组或逗号分隔的 Set-Cookie） */
function normalizeBodyCookie(cookie: any): string {
    if (!cookie) {
        return "";
    }
    if (Array.isArray(cookie)) {
        return cookie
            .map((item) => String(item).split(";")[0].trim())
            .filter(Boolean)
            .join("; ");
    }
    const text = String(cookie).trim();
    return text
        .split(/,(?=[^;]+?=)/)
        .map((part) => part.split(";")[0].trim())
        .filter((part) => part.includes("="))
        .join("; ");
}

function mergeCookie(oldCookie: string, newCookie: string | string[] | undefined) {
    const map = new Map<string, string>();
    const apply = (cookie: string) => {
        if (!cookie) {
            return;
        }
        cookie.split(";").forEach((part) => {
            const trimmed = part.trim();
            if (!trimmed || !trimmed.includes("=")) {
                return;
            }
            const idx = trimmed.indexOf("=");
            const key = trimmed.slice(0, idx).trim();
            const value = trimmed.slice(idx + 1).trim();
            if (!key || key.toLowerCase() === "path" || key.toLowerCase() === "expires" || key.toLowerCase() === "domain" || key.toLowerCase() === "max-age" || key.toLowerCase() === "httponly" || key.toLowerCase() === "secure" || key.toLowerCase() === "samesite") {
                return;
            }
            map.set(key, value);
        });
    };
    apply(oldCookie || "");
    if (Array.isArray(newCookie)) {
        newCookie.forEach((item) => apply(String(item).split(";")[0]));
    } else if (typeof newCookie === "string") {
        // 可能是 "a=1; b=2" 或 Set-Cookie 拼接
        if (newCookie.includes(",") && /,\s*[^;=]+=/.test(newCookie)) {
            apply(normalizeBodyCookie(newCookie));
        } else {
            apply(newCookie);
        }
    }
    return Array.from(map.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
}

function collectCookieFromResult(result: {
    setCookie?: string[];
    data?: any;
}, base = "") {
    let cookie = mergeCookie(base, result.setCookie);
    cookie = mergeCookie(cookie, normalizeBodyCookie(result.data?.cookie));
    // 有些接口把 cookie 放在根字段
    if (result.data && typeof result.data === "object") {
        for (const key of ["cookies", "Cookie", "COOKIES"]) {
            if (result.data[key]) {
                cookie = mergeCookie(cookie, normalizeBodyCookie(result.data[key]));
            }
        }
    }
    return cookie;
}

export function getNeteaseAuth(): NeteaseAuthState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setNeteaseAuth(auth: NeteaseAuthState | null) {
    if (!auth) {
        localStorage.removeItem(STORAGE_KEY);
        clearPluginCookie(NETEASE_PLATFORM);
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    syncPluginCookie(NETEASE_PLATFORM, auth.cookie);
}

export function isNeteaseLoggedIn() {
    const cookie = getNeteaseAuth()?.cookie || "";
    return !!cookie && /MUSIC_U=/i.test(cookie);
}

export function getNeteaseHeaders() {
    const auth = getNeteaseAuth();
    return {
        Referer: "https://music.163.com/",
        Origin: "https://music.163.com",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(auth?.cookie ? { Cookie: auth.cookie } : {}),
    };
}

async function weapiPost(url: string, payload: Record<string, any>, cookie?: string) {
    const body = weapiEncrypt(payload);
    const headers: Record<string, string> = {
        Referer: "https://music.163.com/",
        Origin: "https://music.163.com",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookie ? { Cookie: cookie } : getNeteaseHeaders().Cookie ? { Cookie: getNeteaseHeaders().Cookie! } : {}),
    };
    return appUtil.httpRequest({
        url,
        method: "POST",
        headers,
        data: new URLSearchParams(body as any).toString(),
        timeout: 20000,
    });
}

export async function sendNeteaseCaptcha(phone: string, countrycode = "86") {
    const result = await weapiPost(
        "https://music.163.com/weapi/sms/captcha/sent",
        {
            ctcode: countrycode,
            cellphone: phone,
        },
    );
    const data = result.data || {};
    if (data?.code !== 200) {
        throw new Error(data?.message || data?.msg || "验证码发送失败");
    }
    return data;
}

export async function loginNeteaseByCaptcha(
    phone: string,
    captcha: string,
    countrycode = "86",
) {
    // 必须走主进程：渲染进程 axios 读不到 Set-Cookie
    const result = await weapiPost(
        "https://music.163.com/weapi/login/cellphone",
        {
            phone,
            countrycode,
            captcha,
            rememberLogin: "true",
        },
    );
    const data = result.data || {};
    if (data?.code !== 200) {
        throw new Error(data?.message || data?.msg || "登录失败");
    }
    const old = getNeteaseAuth()?.cookie || "";
    let cookie = collectCookieFromResult(result, old);
    // 无 MUSIC_U 时再拉一次账号接口，部分环境 Cookie 在后续跳转里
    if (!/MUSIC_U=/i.test(cookie)) {
        try {
            const info = await weapiPost(
                "https://music.163.com/weapi/w/nuser/account/get",
                {},
                cookie,
            );
            cookie = collectCookieFromResult(info, cookie);
        } catch {
            // ignore
        }
    }
    if (!cookie || !/MUSIC_U=/i.test(cookie)) {
        throw new Error("登录成功但未获取到 Cookie，请重试");
    }
    const profile: NeteaseProfile = {
        userId: data.profile?.userId || data.account?.id,
        nickname: data.profile?.nickname,
        avatarUrl: data.profile?.avatarUrl,
    };
    setNeteaseAuth({ cookie, profile });
    return profile;
}

/** 创建二维码 unikey */
export async function createNeteaseQrUnikey() {
    qrSessionCookie = "";
    const result = await weapiPost(
        "https://music.163.com/weapi/login/qrcode/unikey",
        { type: 1 },
    );
    qrSessionCookie = collectCookieFromResult(result, "");
    const data = result.data || {};
    if (data?.code !== 200 || !data?.unikey) {
        throw new Error(data?.message || data?.msg || "获取二维码失败");
    }
    return String(data.unikey);
}

export function getNeteaseQrImageUrl(unikey: string) {
    const content = `https://music.163.com/login?codekey=${unikey}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(
        content,
    )}`;
}

export type NeteaseQrStatus =
    | { code: 800; message: string }
    | { code: 801; message: string }
    | { code: 802; message: string; nickname?: string }
    | { code: 803; message: string; profile: NeteaseProfile };

/** 轮询二维码状态 */
export async function checkNeteaseQrStatus(
    unikey: string,
): Promise<NeteaseQrStatus> {
    const result = await weapiPost(
        "https://music.163.com/weapi/login/qrcode/client/login",
        { key: unikey, type: 1 },
        qrSessionCookie || getNeteaseAuth()?.cookie,
    );
    qrSessionCookie = collectCookieFromResult(result, qrSessionCookie);
    const data = result.data || {};
    const code = Number(data.code);
    if (code === 803) {
        let cookie = collectCookieFromResult(result, qrSessionCookie);
        if (!/MUSIC_U=/i.test(cookie)) {
            // 官方有时把完整 cookie 放在 message 外的 cookie 字段（字符串）
            cookie = mergeCookie(cookie, normalizeBodyCookie(data.cookie));
        }
        if (!cookie || !/MUSIC_U=/i.test(cookie)) {
            throw new Error("扫码成功但未获取到 Cookie，请重试");
        }
        let profile: NeteaseProfile = {
            userId: data.profile?.userId || data.account?.id,
            nickname: data.profile?.nickname,
            avatarUrl: data.profile?.avatarUrl,
        };
        if (!profile.nickname) {
            try {
                const info = await weapiPost(
                    "https://music.163.com/weapi/w/nuser/account/get",
                    {},
                    cookie,
                );
                cookie = collectCookieFromResult(info, cookie);
                profile = {
                    userId: info.data?.profile?.userId || profile.userId,
                    nickname: info.data?.profile?.nickname || profile.nickname,
                    avatarUrl: info.data?.profile?.avatarUrl || profile.avatarUrl,
                };
            } catch {
                // ignore
            }
        }
        qrSessionCookie = "";
        setNeteaseAuth({ cookie, profile });
        return { code: 803, message: "登录成功", profile };
    }
    if (code === 802) {
        return {
            code: 802,
            message: "已扫码，请在手机上确认",
            nickname: data.nickname,
        };
    }
    if (code === 801) {
        return { code: 801, message: "等待扫码" };
    }
    return { code: 800, message: data.message || "二维码已过期" };
}

export function logoutNetease() {
    qrSessionCookie = "";
    setNeteaseAuth(null);
}
