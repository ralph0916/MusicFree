import { useEffect, useRef, useState } from "react";
import Base from "../Base";
import { hideModal } from "../..";
import { toast } from "react-toastify";
import {
    checkNeteaseQrStatus,
    createNeteaseQrUnikey,
    getNeteaseAuth,
    getNeteaseQrImageUrl,
    isNeteaseLoggedIn,
    loginNeteaseByCaptcha,
    logoutNetease,
    sendNeteaseCaptcha,
} from "@/renderer/core/auth/neteaseAuth";
import "./index.scss";

type Mode = "captcha" | "qr";

interface IProps {
    onSuccess?: () => void;
}

export default function NeteaseLogin(props: IProps) {
    const { onSuccess } = props;
    const [mode, setMode] = useState<Mode>("captcha");
    const [phone, setPhone] = useState("");
    const [captcha, setCaptcha] = useState("");
    const [sending, setSending] = useState(false);
    const [logging, setLogging] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [qrImg, setQrImg] = useState("");
    const [qrTip, setQrTip] = useState("正在生成二维码…");
    const [loggedIn, setLoggedIn] = useState(isNeteaseLoggedIn());
    const profile = getNeteaseAuth()?.profile;
    const abortRef = useRef(false);
    const unikeyRef = useRef("");

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
                const unikey = await createNeteaseQrUnikey();
                if (abortRef.current) {
                    return;
                }
                unikeyRef.current = unikey;
                setQrImg(getNeteaseQrImageUrl(unikey));
                setQrTip("请使用网易云 App 扫码");
                timer = setInterval(async () => {
                    if (abortRef.current || !unikeyRef.current) {
                        return;
                    }
                    try {
                        const status = await checkNeteaseQrStatus(
                            unikeyRef.current,
                        );
                        if (status.code === 803) {
                            if (timer) {
                                clearInterval(timer);
                            }
                            toast.success(
                                `登录成功：${status.profile.nickname || ""}`,
                            );
                            setLoggedIn(true);
                            onSuccess?.();
                            hideModal();
                            return;
                        }
                        if (status.code === 802) {
                            setQrTip(
                                status.nickname
                                    ? `${status.nickname} 已扫码，请确认`
                                    : "已扫码，请在手机上确认",
                            );
                        } else if (status.code === 800) {
                            setQrTip("二维码已过期，正在刷新…");
                            const next = await createNeteaseQrUnikey();
                            unikeyRef.current = next;
                            setQrImg(getNeteaseQrImageUrl(next));
                            setQrTip("请使用网易云 App 扫码");
                        } else {
                            setQrTip(status.message);
                        }
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

    const sendCode = async () => {
        if (!/^1\d{10}$/.test(phone.trim())) {
            toast.warn("请输入正确的手机号");
            return;
        }
        if (countdown > 0 || sending) {
            return;
        }
        try {
            setSending(true);
            await sendNeteaseCaptcha(phone.trim());
            toast.success("验证码已发送");
            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (e: any) {
            toast.warn(e?.message || "发送失败");
        } finally {
            setSending(false);
        }
    };

    const login = async () => {
        if (!phone.trim() || !captcha.trim()) {
            toast.warn("请输入手机号和验证码");
            return;
        }
        try {
            setLogging(true);
            const p = await loginNeteaseByCaptcha(phone.trim(), captcha.trim());
            toast.success(`登录成功：${p.nickname || ""}`);
            setLoggedIn(true);
            onSuccess?.();
            hideModal();
        } catch (e: any) {
            toast.warn(e?.message || "登录失败");
        } finally {
            setLogging(false);
        }
    };

    return (
        <Base withBlur={false} defaultClose>
            <div className="modal--account-login shadow backdrop-color">
                <Base.Header>网易云登录</Base.Header>
                {loggedIn ? (
                    <div className="login-body">
                        <p className="login-status">
                            已登录
                            {profile?.nickname ? `：${profile.nickname}` : ""}
                        </p>
                        <div className="login-actions">
                            <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                    logoutNetease();
                                    setLoggedIn(false);
                                    toast.success("已退出网易云");
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
                                    ["captcha", "手机验证码"],
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
                        {mode === "captcha" ? (
                            <>
                                <label>手机号</label>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="11 位手机号"
                                    maxLength={11}
                                />
                                <label>验证码</label>
                                <div className="row">
                                    <input
                                        value={captcha}
                                        onChange={(e) =>
                                            setCaptcha(e.target.value)
                                        }
                                        placeholder="短信验证码"
                                    />
                                    <button
                                        type="button"
                                        disabled={countdown > 0 || sending}
                                        onClick={sendCode}
                                    >
                                        {countdown > 0
                                            ? `${countdown}s`
                                            : sending
                                                ? "发送中"
                                                : "获取验证码"}
                                    </button>
                                </div>
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
                        ) : (
                            <div className="qr-area">
                                {qrImg ? (
                                    <img src={qrImg} alt="网易云二维码" />
                                ) : (
                                    <div className="qr-placeholder" />
                                )}
                                <p>{qrTip}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Base>
    );
}
