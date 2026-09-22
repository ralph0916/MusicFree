import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import PanelBase from "../base/panelBase";
import PanelHeader from "../base/panelHeader";
import Input from "@/components/base/input";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import { hidePanel } from "../usePanel";
import {
    loginNeteaseByCaptcha,
    sendNeteaseCaptcha,
} from "@/core/pluginManager/neteaseAuth";
import Toast from "@/utils/toast";

interface IProps {
    onSuccess?: () => void;
}

export default function NeteaseLogin(props: IProps) {
    const { onSuccess } = props;
    const colors = useColors();
    const [phone, setPhone] = useState("");
    const [captcha, setCaptcha] = useState("");
    const [sending, setSending] = useState(false);
    const [logging, setLogging] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const sendCode = async () => {
        if (!/^1\d{10}$/.test(phone.trim())) {
            Toast.warn("请输入正确的手机号");
            return;
        }
        if (countdown > 0 || sending) {
            return;
        }
        try {
            setSending(true);
            await sendNeteaseCaptcha(phone.trim());
            Toast.success("验证码已发送");
            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (e: any) {
            Toast.warn(e?.message || "发送失败");
        } finally {
            setSending(false);
        }
    };

    const login = async () => {
        if (!phone.trim() || !captcha.trim()) {
            Toast.warn("请输入手机号和验证码");
            return;
        }
        try {
            setLogging(true);
            const profile = await loginNeteaseByCaptcha(
                phone.trim(),
                captcha.trim(),
            );
            Toast.success(`登录成功：${profile.nickname || ""}`);
            onSuccess?.();
            hidePanel();
        } catch (e: any) {
            Toast.warn(e?.message || "登录失败");
        } finally {
            setLogging(false);
        }
    };

    return (
        <PanelBase
            height={rpx(720)}
            renderBody={() => (
                <>
                    <PanelHeader
                        title="网易云登录"
                        onCancel={hidePanel}
                        onOk={login}
                        okText={logging ? "登录中" : "登录"}
                    />
                    <View style={styles.body}>
                        <ThemeText fontSize="description" fontColor="textSecondary">
                            使用手机号验证码登录后，可查看每日推荐并收藏喜欢的歌曲。不支持破解 VIP。
                        </ThemeText>
                        <Input
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="手机号"
                            keyboardType="phone-pad"
                            style={[
                                styles.input,
                                { backgroundColor: colors.placeholder },
                            ]}
                        />
                        <View style={styles.row}>
                            <Input
                                value={captcha}
                                onChangeText={setCaptcha}
                                placeholder="验证码"
                                keyboardType="number-pad"
                                style={[
                                    styles.input,
                                    styles.codeInput,
                                    { backgroundColor: colors.placeholder },
                                ]}
                            />
                            <Pressable
                                onPress={sendCode}
                                style={[
                                    styles.codeBtn,
                                    { backgroundColor: colors.primary },
                                ]}>
                                <ThemeText color="#fff" fontSize="description">
                                    {countdown > 0
                                        ? `${countdown}s`
                                        : sending
                                            ? "发送中"
                                            : "获取验证码"}
                                </ThemeText>
                            </Pressable>
                        </View>
                    </View>
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    body: {
        paddingHorizontal: rpx(24),
        paddingTop: rpx(12),
    },
    input: {
        marginTop: rpx(24),
        borderRadius: rpx(12),
        paddingHorizontal: rpx(20),
        height: rpx(80),
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    codeInput: {
        flex: 1,
        marginRight: rpx(16),
    },
    codeBtn: {
        marginTop: rpx(24),
        height: rpx(80),
        paddingHorizontal: rpx(20),
        borderRadius: rpx(12),
        alignItems: "center",
        justifyContent: "center",
    },
});
