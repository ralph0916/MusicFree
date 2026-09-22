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
    loginQqByCookie,
    loginQqByPassword,
} from "@/core/pluginManager/qqAuth";
import Toast from "@/utils/toast";

interface IProps {
    onSuccess?: () => void;
}

type LoginMode = "password" | "cookie";

export default function QqLogin(props: IProps) {
    const { onSuccess } = props;
    const colors = useColors();
    const [mode, setMode] = useState<LoginMode>("password");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [cookie, setCookie] = useState("");
    const [logging, setLogging] = useState(false);

    const login = async () => {
        try {
            setLogging(true);
            if (mode === "cookie") {
                if (!cookie.trim()) {
                    Toast.warn("请粘贴 QQ 音乐 Cookie");
                    return;
                }
                const profile = loginQqByCookie(cookie.trim());
                Toast.success(`登录成功：${profile.nickname || profile.uin}`);
            } else {
                if (!username.trim() || !password.trim()) {
                    Toast.warn("请输入 QQ 号和密码");
                    return;
                }
                const profile = await loginQqByPassword(
                    username.trim(),
                    password.trim(),
                );
                Toast.success(`登录成功：${profile.nickname || profile.uin}`);
            }
            onSuccess?.();
            hidePanel();
        } catch (e: any) {
            Toast.warn(e?.message || "登录失败");
            // 密码登录被风控时，引导切到 Cookie
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
        <PanelBase
            height={rpx(880)}
            keyboardAvoidBehavior="height"
            renderBody={() => (
                <>
                    <PanelHeader
                        title="QQ 音乐登录"
                        onCancel={hidePanel}
                        onOk={login}
                        okText={logging ? "登录中" : "登录"}
                    />
                    <View style={styles.body}>
                        <View style={styles.tabs}>
                            {(
                                [
                                    ["password", "密码登录"],
                                    ["cookie", "Cookie 登录"],
                                ] as const
                            ).map(([key, label]) => {
                                const active = mode === key;
                                return (
                                    <Pressable
                                        key={key}
                                        onPress={() => setMode(key)}
                                        style={[
                                            styles.tab,
                                            {
                                                backgroundColor: active
                                                    ? colors.primary
                                                    : colors.placeholder,
                                            },
                                        ]}>
                                        <ThemeText
                                            fontSize="description"
                                            color={active ? "#fff" : colors.text}>
                                            {label}
                                        </ThemeText>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {mode === "password" ? (
                            <>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary">
                                    若提示「登录异常」，多为 QQ
                                    风控，请改用 Cookie 登录。
                                </ThemeText>
                                <Input
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="QQ 号"
                                    keyboardType="number-pad"
                                    autoCapitalize="none"
                                    style={[
                                        styles.input,
                                        { backgroundColor: colors.placeholder },
                                    ]}
                                />
                                <Input
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="密码"
                                    secureTextEntry
                                    style={[
                                        styles.input,
                                        { backgroundColor: colors.placeholder },
                                    ]}
                                />
                            </>
                        ) : (
                            <>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary">
                                    浏览器打开 y.qq.com
                                    登录后，F12→Network→随便点一个请求，复制
                                    Cookie（需含 uin / qm_keyst）。
                                </ThemeText>
                                <Input
                                    value={cookie}
                                    onChangeText={setCookie}
                                    placeholder="粘贴 Cookie"
                                    multiline
                                    style={[
                                        styles.cookieInput,
                                        { backgroundColor: colors.placeholder },
                                    ]}
                                />
                            </>
                        )}
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
    tabs: {
        flexDirection: "row",
        marginBottom: rpx(20),
        gap: rpx(16),
    },
    tab: {
        paddingHorizontal: rpx(24),
        paddingVertical: rpx(12),
        borderRadius: rpx(20),
    },
    input: {
        marginTop: rpx(24),
        borderRadius: rpx(12),
        paddingHorizontal: rpx(20),
        height: rpx(80),
    },
    cookieInput: {
        marginTop: rpx(24),
        borderRadius: rpx(12),
        paddingHorizontal: rpx(20),
        paddingVertical: rpx(16),
        minHeight: rpx(200),
        textAlignVertical: "top",
    },
});
