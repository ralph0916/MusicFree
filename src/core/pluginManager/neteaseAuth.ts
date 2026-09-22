import CryptoJS from "crypto-js";
import bigInt from "big-integer";
import axios from "axios";
import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse, safeStringify } from "@/utils/jsonUtil";

const storage = getOrCreateMMKV("netease.auth");

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

function randomString(length: number) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function aesEncrypt(text: string, key: string) {
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text), CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    }).toString();
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

function parseSetCookie(headers: any): string {
    const raw = headers?.["set-cookie"] || headers?.["Set-Cookie"];
    if (!raw) {
        return "";
    }
    const list = Array.isArray(raw) ? raw : [raw];
    return list
        .map((item: string) => item.split(";")[0])
        .filter(Boolean)
        .join("; ");
}

function mergeCookie(oldCookie: string, newCookie: string) {
    const map = new Map<string, string>();
    const apply = (cookie: string) => {
        cookie.split(";").forEach(part => {
            const trimmed = part.trim();
            if (!trimmed || !trimmed.includes("=")) {
                return;
            }
            const idx = trimmed.indexOf("=");
            const key = trimmed.slice(0, idx);
            const value = trimmed.slice(idx + 1);
            map.set(key, value);
        });
    };
    apply(oldCookie);
    apply(newCookie);
    return Array.from(map.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
}

export function getNeteaseAuth(): NeteaseAuthState | null {
    return safeParse(storage.getString("auth"));
}

export function setNeteaseAuth(auth: NeteaseAuthState | null) {
    if (!auth) {
        storage.delete("auth");
        return;
    }
    storage.set("auth", safeStringify(auth));
}

export function isNeteaseLoggedIn() {
    return !!getNeteaseAuth()?.cookie;
}

export function getNeteaseHeaders() {
    const auth = getNeteaseAuth();
    return {
        Referer: "https://music.163.com/",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(auth?.cookie ? { Cookie: auth.cookie } : {}),
    };
}

export async function sendNeteaseCaptcha(phone: string, countrycode = "86") {
    const body = weapiEncrypt({
        ctcode: countrycode,
        cellphone: phone,
    });
    const { data } = await axios.post(
        "https://music.163.com/weapi/sms/captcha/sent",
        new URLSearchParams(body as any).toString(),
        {
            headers: {
                ...getNeteaseHeaders(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 15000,
        },
    );
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
    const body = weapiEncrypt({
        phone,
        countrycode,
        captcha,
        rememberLogin: "true",
    });
    const response = await axios.post(
        "https://music.163.com/weapi/login/cellphone",
        new URLSearchParams(body as any).toString(),
        {
            headers: {
                ...getNeteaseHeaders(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 20000,
        },
    );
    const data = response.data;
    if (data?.code !== 200) {
        throw new Error(data?.message || data?.msg || "登录失败");
    }
    const newCookie = parseSetCookie(response.headers);
    const old = getNeteaseAuth()?.cookie || "";
    const cookie = mergeCookie(old, newCookie);
    if (!cookie) {
        throw new Error("登录成功但未获取到 Cookie，请重试");
    }
    const profile: NeteaseProfile = {
        userId: data.profile?.userId,
        nickname: data.profile?.nickname,
        avatarUrl: data.profile?.avatarUrl,
    };
    setNeteaseAuth({ cookie, profile });
    return profile;
}

export function logoutNetease() {
    setNeteaseAuth(null);
}

export async function neteaseWeapiPost(url: string, data: Record<string, any>) {
    const body = weapiEncrypt(data);
    const response = await axios.post(
        url,
        new URLSearchParams(body as any).toString(),
        {
            headers: {
                ...getNeteaseHeaders(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 20000,
        },
    );
    // refresh cookie if any
    const setCookie = parseSetCookie(response.headers);
    if (setCookie) {
        const auth = getNeteaseAuth();
        if (auth) {
            setNeteaseAuth({
                ...auth,
                cookie: mergeCookie(auth.cookie, setCookie),
            });
        }
    }
    return response.data;
}
