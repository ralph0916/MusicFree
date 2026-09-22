import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import PanelBase from "../base/panelBase";
import PanelHeader from "../base/panelHeader";
import Input from "@/components/base/input";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import { hidePanel } from "../usePanel";
import { loginQqByPassword } from "@/core/pluginManager/qqAuth";
import Toast from "@/utils/toast";

interface IProps {
    onSuccess?: () => void;
}

export default function QqLogin(props: IProps) {
    const { onSuccess } = props;
    const colors = useColors();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [logging, setLogging] = useState(false);

    const login = async () => {
        if (!username.trim() || !password.trim()) {
            Toast.warn("请输入 QQ 号和密码");
            return;
        }
        try {
            setLogging(true);
            const profile = await loginQqByPassword(
                username.trim(),
                password.trim(),
            );
            Toast.success(`登录成功：${profile.nickname || profile.uin}`);
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
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary">
                            使用 QQ 号和密码登录。若触发安全验证码，请先在网页端
                            y.qq.com 完成验证后再试。不支持破解 VIP。
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
});
