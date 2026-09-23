import axios from "axios";
import CryptoJS from "crypto-js";
import bigInt from "big-integer";
import { qqTeaEncrypt } from "./qqTea";
import { clearPluginCookie, syncPluginCookie } from "./syncPluginCookie";

const STORAGE_KEY = "ralphmusic.qq.auth";
export const QQ_PLATFORM = "QQ音乐";

const APPID = "716027609";
const DAID = "383";
const U1 = "https://graph.qq.com/oauth2.0/login_jump";

const RSA_N =
    "F20CE00BAE5361F8FA3AE9CEFA495362FF7DA1BA628F64A347F0A8C012BF0B254A30CD92ABFFE7A6EE0DC424CB6166F8819EFA5BCCB20EDFB4AD02E412CCF579B1CA711D55B8B0B3AEB60153D5E0693A2A86F3167D7847A0CB8B00004716A9095D9BADC977CBB804DBDCBA6029A9710869A453F27DFDDF83C016D928B3CBF4C7";
const RSA_E = "3";

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
        localStorage.removeItem(STORAGE_KEY);
        clearPluginCookie(QQ_PLATFORM);
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    syncPluginCookie(QQ_PLATFORM, state.cookie);
}

export function getQqAuth(): QqAuthState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as QqAuthState) : null;
    } catch {
        return null;
    }
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

function mergeCookie(oldCookie: string, setCookie: string | string[] | undefined) {
    const map = new Map<string, string>();
    const absorb = (raw: string) => {
        raw.split(";").forEach((part) => {
            const kv = part.trim();
            if (!kv || !kv.includes("=")) {
                return;
            }
            const idx = kv.indexOf("=");
            const k = kv.slice(0, idx).trim();
            const v = kv.slice(idx + 1).trim();
            if (
                !k ||
                [
                    "path",
                    "domain",
                    "expires",
                    "max-age",
                    "secure",
                    "httponly",
                    "samesite",
                ].includes(k.toLowerCase())
            ) {
                return;
            }
            map.set(k, v);
        });
    };
    if (oldCookie) {
        absorb(oldCookie);
    }
    const list = Array.isArray(setCookie)
        ? setCookie
        : setCookie
            ? [setCookie]
            : [];
    list.forEach((item) => absorb(String(item).split(";")[0]));
    return Array.from(map.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
}

function parseSetCookie(headers: any): string[] {
    const raw = headers?.["set-cookie"] || headers?.["Set-Cookie"];
    if (!raw) {
        return [];
    }
    return Array.isArray(raw) ? raw : [raw];
}

function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function hexToBytes(hex: string) {
    const clean = hex.replace(/\\x/gi, "").replace(/\s/g, "");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return out;
}

function bytesToWordArray(bytes: Uint8Array) {
    const words: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
        words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wa: CryptoJS.lib.WordArray) {
    const { words, sigBytes } = wa;
    const out = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return out;
}

function md5Bytes(data: Uint8Array | string) {
    if (typeof data === "string") {
        return wordArrayToBytes(CryptoJS.MD5(data));
    }
    return wordArrayToBytes(CryptoJS.MD5(bytesToWordArray(data)));
}

function md5HexUpper(data: Uint8Array) {
    return bytesToHex(md5Bytes(data)).toUpperCase();
}

function rsaEncryptMd5(md5Digest: Uint8Array) {
    const hexText = bytesToHex(md5Digest);
    const encrypted = bigInt(hexText, 16)
        .modPow(bigInt(RSA_E, 16), bigInt(RSA_N, 16))
        .toString(16);
    return encrypted.padStart(256, "0");
}

function getEncryption(password: string, saltHex: string, verifycode: string) {
    const salt = hexToBytes(saltHex.replace(/\\x/gi, ""));
    const md5Pwd = md5Bytes(password);
    const teaKeyHex = md5HexUpper(
        (() => {
            const merged = new Uint8Array(md5Pwd.length + salt.length);
            merged.set(md5Pwd, 0);
            merged.set(salt, md5Pwd.length);
            return merged;
        })(),
    );
    const rsaHex = rsaEncryptMd5(md5Pwd);
    const rsaLen = (rsaHex.length / 2).toString(16).padStart(4, "0");
    const vcHex = bytesToHex(new TextEncoder().encode(verifycode.toUpperCase()));
    const vcLen = (vcHex.length / 2).toString(16).padStart(4, "0");
    const plainHex = rsaLen + rsaHex + bytesToHex(salt) + vcLen + vcHex;
    const encrypted = qqTeaEncrypt(hexToBytes(plainHex), hexToBytes(teaKeyHex));
    const b64 = CryptoJS.enc.Base64.stringify(bytesToWordArray(encrypted));
    return b64.replace(/\//g, "-").replace(/\+/g, "*").replace(/[=]/g, "_");
}

function parseQuoted(text: string) {
    return [...text.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

function hash33(qrsig: string) {
    let e = 0;
    for (let i = 0; i < qrsig.length; ++i) {
        e += (e << 5) + qrsig.charCodeAt(i);
        e &= 0x7fffffff;
    }
    return e;
}

async function exchangeMusicCookie(qqCookie: string, uin: string) {
    let cookie = qqCookie;
    try {
        const home = await axios.get("https://y.qq.com/", {
            headers: {
                Cookie: cookie,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Referer: "https://y.qq.com/",
            },
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: () => true,
        });
        cookie = mergeCookie(cookie, parseSetCookie(home.headers));
    } catch {
        // ignore
    }

    try {
        const { data, headers } = await axios.post(
            "https://u.y.qq.com/cgi-bin/musicu.fcg",
            {
                comm: {
                    g_tk: 5381,
                    uin,
                    format: "json",
                    inCharset: "utf-8",
                    outCharset: "utf-8",
                    notice: 0,
                    platform: "yqq.json",
                    needNewCode: 0,
                    ct: 24,
                    cv: 0,
                },
                req_0: {
                    module: "QQConnectLogin.LoginServer",
                    method: "QQLogin",
                    param: { keepCallback: 0 },
                },
            },
            {
                headers: {
                    Cookie: cookie,
                    Referer: "https://y.qq.com/",
                    Origin: "https://y.qq.com",
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                timeout: 15000,
                validateStatus: () => true,
            },
        );
        cookie = mergeCookie(cookie, parseSetCookie(headers));
        const musickey =
            data?.req_0?.data?.musickey ||
            data?.req_0?.data?.key ||
            data?.req_0?.data?.qm_keyst;
        if (musickey) {
            cookie = mergeCookie(cookie, [`qm_keyst=${musickey}`]);
            cookie = mergeCookie(cookie, [`qqmusic_key=${musickey}`]);
        }
    } catch {
        // ignore
    }

    return cookie;
}

async function fetchNickname(cookie: string, uin: string) {
    try {
        const { data } = await axios.get(
            "https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg",
            {
                params: {
                    cid: 205360838,
                    userid: uin,
                    reqfrom: 1,
                    reqtype: 0,
                    format: "json",
                },
                headers: {
                    Cookie: cookie,
                    Referer: "https://y.qq.com/",
                },
                timeout: 10000,
            },
        );
        return (
            data?.data?.creator?.nick ||
            data?.req_0?.data?.info?.base?.nick ||
            `QQ ${uin}`
        );
    } catch {
        return `QQ ${uin}`;
    }
}

function stripHtml(text: string) {
    return String(text || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function formatQqLoginError(raw: string, code?: string) {
    const text = stripHtml(raw);
    if (
        code === "22009" ||
        text.includes("登录异常") ||
        text.includes("号码登录异常")
    ) {
        return "QQ 风控拦截了密码登录。请改用 Cookie 或扫码登录。";
    }
    if (text.includes("密码") && text.includes("错误")) {
        return "QQ 号或密码错误";
    }
    return text || "登录失败，请检查 QQ 号和密码";
}

export async function loginQqByPassword(usernameRaw: string, password: string) {
    const uin = usernameRaw.trim().replace(/^o+/i, "");
    const pwd = password.trim();
    if (!/^\d{5,12}$/.test(uin)) {
        throw new Error("请输入正确的 QQ 号");
    }
    if (!pwd) {
        throw new Error("请输入密码");
    }

    let cookie = "";
    const commonHeaders = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://xui.ptlogin2.qq.com/",
        Accept: "*/*",
    };
    const jsVer = 24112114;

    const frame = await axios.get("https://xui.ptlogin2.qq.com/cgi-bin/xlogin", {
        params: {
            appid: APPID,
            daid: DAID,
            style: 35,
            s_url: U1,
            low_login: 0,
            hide_close_icon: 1,
        },
        headers: commonHeaders,
        timeout: 15000,
        validateStatus: () => true,
    });
    cookie = mergeCookie(cookie, parseSetCookie(frame.headers));
    const loginSig =
        cookie.match(/pt_login_sig=([^;]+)/)?.[1] ||
        cookie.match(/ptloginsig=([^;]+)/)?.[1] ||
        "";

    const check = await axios.get("https://ssl.ptlogin2.qq.com/check", {
        params: {
            regmaster: "",
            pt_tea: 2,
            pt_vcode: 1,
            uin,
            appid: APPID,
            js_ver: jsVer,
            js_type: 1,
            login_sig: loginSig,
            u1: U1,
            r: Math.random(),
            pt_uistyle: 40,
            daid: DAID,
        },
        headers: { ...commonHeaders, Cookie: cookie },
        timeout: 15000,
        validateStatus: () => true,
    });
    cookie = mergeCookie(cookie, parseSetCookie(check.headers));
    const checkParts = parseQuoted(String(check.data || ""));
    if (checkParts[0] !== "0") {
        throw new Error(
            "账号需要验证码或环境异常。请改用扫码或 Cookie 登录。",
        );
    }
    const verifycode = checkParts[1];
    const salt = checkParts[2];
    const ptVerifysession =
        checkParts[3] ||
        cookie.match(/ptvfsession=([^;]+)/)?.[1] ||
        cookie.match(/verifysession=([^;]+)/)?.[1] ||
        "";

    const p = getEncryption(pwd, salt, verifycode);

    const login = await axios.get("https://ssl.ptlogin2.qq.com/login", {
        params: {
            u: uin,
            verifycode,
            pt_vcode_v1: 0,
            pt_verifysession_v1: ptVerifysession,
            p,
            pt_randsalt: 2,
            u1: U1,
            ptredirect: 0,
            h: 1,
            t: 1,
            g: 1,
            from_ui: 1,
            ptlang: 2052,
            action: `3-9-${Date.now()}`,
            js_ver: jsVer,
            js_type: 1,
            login_sig: loginSig,
            pt_uistyle: 40,
            aid: APPID,
            daid: DAID,
        },
        headers: { ...commonHeaders, Cookie: cookie },
        timeout: 20000,
        validateStatus: () => true,
    });
    cookie = mergeCookie(cookie, parseSetCookie(login.headers));
    const loginParts = parseQuoted(String(login.data || ""));
    if (loginParts[0] !== "0") {
        throw new Error(formatQqLoginError(loginParts[4], loginParts[0]));
    }
    const jumpUrl = loginParts[2];
    const nicknameFromLogin = loginParts[5] || "";

    if (jumpUrl) {
        try {
            const jump = await axios.get(jumpUrl, {
                headers: { ...commonHeaders, Cookie: cookie },
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: () => true,
            });
            cookie = mergeCookie(cookie, parseSetCookie(jump.headers));
        } catch {
            // ignore
        }
    }

    cookie = mergeCookie(cookie, [`uin=o${uin.padStart(10, "0")}`]);
    cookie = await exchangeMusicCookie(cookie, uin);
    const nickname = nicknameFromLogin || (await fetchNickname(cookie, uin));
    const profile: QqProfile = { uin, nickname };
    setQqAuth({ cookie, uin, profile });
    return profile;
}

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
        throw new Error("Cookie 中未找到 uin");
    }
    const profile: QqProfile = {
        uin,
        nickname: nickname || `QQ ${uin}`,
    };
    setQqAuth({ cookie, uin, profile });
    return profile;
}

export type QqQrSession = {
    cookie: string;
    qrsig: string;
    ptqrtoken: number;
    imageUrl: string;
};

/** 获取 QQ 扫码二维码 */
export async function createQqQrSession(): Promise<QqQrSession> {
    const response = await axios.get("https://ssl.ptlogin2.qq.com/ptqrshow", {
        params: {
            appid: APPID,
            e: 2,
            l: "M",
            s: 3,
            d: 72,
            v: 4,
            t: Math.random(),
            daid: DAID,
            pt_3rd_aid: 0,
        },
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://xui.ptlogin2.qq.com/",
        },
        responseType: "arraybuffer",
        timeout: 15000,
        validateStatus: () => true,
    });
    const cookie = mergeCookie("", parseSetCookie(response.headers));
    const qrsig = cookie.match(/qrsig=([^;]+)/)?.[1] || "";
    if (!qrsig) {
        throw new Error("获取二维码失败，请重试");
    }
    const bytes = new Uint8Array(response.data);
    let binary = "";
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    const imageUrl = `data:image/png;base64,${btoa(binary)}`;
    return {
        cookie,
        qrsig,
        ptqrtoken: hash33(qrsig),
        imageUrl,
    };
}

export type QqQrStatus =
    | { code: "waiting" | "scanned" | "expired"; message: string }
    | { code: "success"; profile: QqProfile };

/** 轮询 QQ 扫码状态 */
export async function checkQqQrStatus(
    session: QqQrSession,
): Promise<{ status: QqQrStatus; session: QqQrSession }> {
    let cookie = session.cookie;
    const response = await axios.get("https://ssl.ptlogin2.qq.com/ptqrlogin", {
        params: {
            u1: U1,
            ptqrtoken: session.ptqrtoken,
            ptredirect: 0,
            h: 1,
            t: 1,
            g: 1,
            from_ui: 1,
            ptlang: 2052,
            action: `0-0-${Date.now()}`,
            js_ver: 24112114,
            js_type: 1,
            login_sig: "",
            pt_uistyle: 40,
            aid: APPID,
            daid: DAID,
        },
        headers: {
            Cookie: cookie,
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://xui.ptlogin2.qq.com/",
        },
        timeout: 15000,
        validateStatus: () => true,
    });
    cookie = mergeCookie(cookie, parseSetCookie(response.headers));
    const parts = parseQuoted(String(response.data || ""));
    const code = parts[0];
    const nextSession = { ...session, cookie };

    if (code === "65") {
        return {
            status: { code: "expired", message: "二维码已过期，请刷新" },
            session: nextSession,
        };
    }
    if (code === "67") {
        return {
            status: { code: "scanned", message: "已扫码，请在手机上确认" },
            session: nextSession,
        };
    }
    if (code === "0") {
        const jumpUrl = parts[2];
        const nicknameFromLogin = parts[5] || "";
        if (jumpUrl) {
            try {
                const jump = await axios.get(jumpUrl, {
                    headers: {
                        Cookie: cookie,
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    },
                    timeout: 15000,
                    maxRedirects: 5,
                    validateStatus: () => true,
                });
                cookie = mergeCookie(cookie, parseSetCookie(jump.headers));
            } catch {
                // ignore
            }
        }
        let uin = extractUin(cookie);
        if (!uin) {
            uin = parts[1]?.replace(/^o0*/, "") || "";
        }
        if (!uin) {
            throw new Error("扫码成功但未获取到 QQ 号");
        }
        cookie = mergeCookie(cookie, [`uin=o${uin.padStart(10, "0")}`]);
        cookie = await exchangeMusicCookie(cookie, uin);
        const nickname =
            nicknameFromLogin || (await fetchNickname(cookie, uin));
        const profile: QqProfile = { uin, nickname };
        setQqAuth({ cookie, uin, profile });
        return {
            status: { code: "success", profile },
            session: { ...nextSession, cookie },
        };
    }
    // 66 = waiting for scan
    return {
        status: { code: "waiting", message: "请使用手机 QQ 扫码" },
        session: nextSession,
    };
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
