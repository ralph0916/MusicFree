import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse, safeStringify } from "@/utils/jsonUtil";

const storage = getOrCreateMMKV("qq.auth");

export type QqProfile = {
    uin?: string;
    nickname?: string;
};

type QqAuthState = {
    cookie: string;
    uin: string;
    profile?: QqProfile;
};

function setQqAuth(state: QqAuthState | null) {
    if (!state) {
        storage.delete("auth");
        return;
    }
    storage.set("auth", safeStringify(state));
}

export function getQqAuth(): QqAuthState | null {
    const raw = storage.getString("auth");
    if (!raw) {
        return null;
    }
    return safeParse(raw) as QqAuthState | null;
}

export function isQqLoggedIn() {
    const auth = getQqAuth();
    return Boolean(auth?.cookie && auth?.uin);
}

export function logoutQq() {
    setQqAuth(null);
}

function extractUin(cookie: string) {
    const match =
        cookie.match(/(?:^|;\s*)(?:uin|wxuin)=o?0*(\d+)/i) ||
        cookie.match(/(?:^|;\s*)uin=o?0*(\d+)/i);
    return match?.[1] || "";
}

/** 保存 QQ 音乐 Cookie（需包含 uin / qm_keyst 等） */
export function loginQqByCookie(cookieRaw: string, nickname?: string) {
    const cookie = cookieRaw
        .trim()
        .replace(/\n/g, "; ")
        .replace(/;;+/g, ";");
    if (!cookie) {
        throw new Error("请粘贴 QQ 音乐 Cookie");
    }
    const uin = extractUin(cookie);
    if (!uin) {
        throw new Error("Cookie 中未找到 uin，请确认从 y.qq.com 复制完整 Cookie");
    }
    const profile: QqProfile = {
        uin,
        nickname: nickname || `QQ ${uin}`,
    };
    setQqAuth({ cookie, uin, profile });
    return profile;
}

export function getQqHeaders() {
    const auth = getQqAuth();
    return {
        Referer: "https://y.qq.com/",
        Origin: "https://y.qq.com",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: auth?.cookie || "",
    };
}

export function getQqUin() {
    return getQqAuth()?.uin || "0";
}
