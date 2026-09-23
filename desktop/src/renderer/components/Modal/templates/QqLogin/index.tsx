import { useEffect, useRef, useState } from "react";
import Base from "../Base";
import { hideModal } from "../..";
import { toast } from "react-toastify";
import {
    checkQqQrStatus,
    createQqQrSession,
    getQqAuth,
    isQqLoggedIn,
    loginQqByCookie,
    loginQqByPassword,
    logoutQq,
    QqQrSession,
} from "@/renderer/core/auth/qqAuth";
import "./index.scss";

type Mode = "password" | "cookie" | "qr";

interface IProps {
    onSuccess?: () => void;
}

export default function QqLogin(props: IProps) {
    const { onSuccess } = props;
    const [mode, setMode] = useState<Mode>("password");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [cookie, setCookie] = useState("");
    const [logging, setLogging] = useState(false);
    const [qrImg, setQrImg] = useState("");
    const [qrTip, setQrTip] = useState("正在生成二维码…");
    const [loggedIn, setLoggedIn] = useState(isQqLoggedIn());
    const profile = getQqAuth()?.profile;
    const abortRef = useRef(false);
    const sessionRef = useRef<QqQrSession | null>(null);

    useEffect(() => {
        abortRef.current = false;
        return () => {
            abortRef.current = true;
        };
    }, []);

    useEffect(() => {
        if (mode !== "qr") {
            return;
        }
        let timer: ReturnType<typeof setInterval> | null = null;
        const start = async () => {
            try {
                setQrTip("正在生成二维码…");
                const session = await createQqQrSession();
                if (abortRef.current) {
                    return;
                }
                sessionRef.current = session;
                setQrImg(session.imageUrl);
                setQrTip("请使用手机 QQ 扫码");
                timer = setInterval(async () => {
                    if (abortRef.current || !sessionRef.current) {
                        return;
                    }
                    try {
                        const { status, session: next } =
                            await checkQqQrStatus(sessionRef.current);
                        sessionRef.current = next;
                        if (status.code === "success") {
                            if (timer) {
                                clearInterval(timer);
                            }
                            toast.success(
                                `登录成功：${
                                    status.profile.nickname || status.profile.uin
                                }`,
                            );
                            setLoggedIn(true);
                            onSuccess?.();
                            hideModal();
                            return;
                        }
                        if (status.code === "expired") {
                            setQrTip("二维码已过期，正在刷新…");
                            const refreshed = await createQqQrSession();
                            sessionRef.current = refreshed;
                            setQrImg(refreshed.imageUrl);
                            setQrTip("请使用手机 QQ 扫码");
                            return;
                        }
                        setQrTip(status.message);
                    } catch (e: any) {
                        setQrTip(e?.message || "轮询失败");
                    }
                }, 2000);
            } catch (e: any) {
                setQrTip(e?.message || "获取二维码失败");
            }
        };
        start();
        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [mode, onSuccess]);

    const login = async () => {
        try {
            setLogging(true);
            if (mode === "cookie") {
                if (!cookie.trim()) {
                    toast.warn("请粘贴 QQ 音乐 Cookie");
                    return;
                }
                const p = loginQqByCookie(cookie.trim());
                toast.success(`登录成功：${p.nickname || p.uin}`);
            } else if (mode === "password") {
                if (!username.trim() || !password.trim()) {
                    toast.warn("请输入 QQ 号和密码");
                    return;
                }
                const p = await loginQqByPassword(
                    username.trim(),
                    password.trim(),
                );
                toast.success(`登录成功：${p.nickname || p.uin}`);
            }
            setLoggedIn(true);
            onSuccess?.();
            hideModal();
        } catch (e: any) {
            toast.warn(e?.message || "登录失败");
            if (
                mode === "password" &&
                String(e?.message || "").includes("Cookie")
            ) {
                setMode("cookie");
            }
        } finally {
            setLogging(false);
        }
    };

    return (
        <Base withBlur={false} defaultClose>
            <div className="modal--account-login shadow backdrop-color">
                <Base.Header>QQ 音乐登录</Base.Header>
                {loggedIn ? (
                    <div className="login-body">
                        <p className="login-status">
                            已登录
                            {profile?.nickname
                                ? `：${profile.nickname}`
                                : profile?.uin
                                    ? `：${profile.uin}`
                                    : ""}
                        </p>
                        <div className="login-actions">
                            <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                    logoutQq();
                                    setLoggedIn(false);
                                    toast.success("已退出 QQ 音乐");
                                    onSuccess?.();
                                }}
                            >
                                退出登录
                            </button>
                            <button type="button" onClick={() => hideModal()}>
                                关闭
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="login-body">
                        <div className="login-tabs">
                            {(
                                [
                                    ["password", "密码登录"],
                                    ["cookie", "Cookie"],
                                    ["qr", "扫码登录"],
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={mode === key ? "active" : ""}
                                    onClick={() => setMode(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {mode === "password" ? (
                            <>
                                <label>QQ 号</label>
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="QQ 号"
                                />
                                <label>密码</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="密码"
                                />
                                <p className="hint">
                                    若遇风控，请改用扫码或 Cookie 登录
                                </p>
                                <div className="login-actions">
                                    <button
                                        type="button"
                                        className="primary"
                                        disabled={logging}
                                        onClick={login}
                                    >
                                        {logging ? "登录中…" : "登录"}
                                    </button>
                                </div>
                            </>
                        ) : null}
                        {mode === "cookie" ? (
                            <>
                                <label>Cookie</label>
                                <textarea
                                    value={cookie}
                                    onChange={(e) => setCookie(e.target.value)}
                                    placeholder="从浏览器登录 y.qq.com 后粘贴 Cookie（需含 uin、qm_keyst）"
                                    rows={6}
                                />
                                <div className="login-actions">
                                    <button
                                        type="button"
                                        className="primary"
                                        disabled={logging}
                                        onClick={login}
                                    >
                                        {logging ? "登录中…" : "登录"}
                                    </button>
                                </div>
                            </>
                        ) : null}
                        {mode === "qr" ? (
                            <div className="qr-area">
                                {qrImg ? (
                                    <img src={qrImg} alt="QQ 二维码" />
                                ) : (
                                    <div className="qr-placeholder" />
                                )}
                                <p>{qrTip}</p>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </Base>
    );
}
