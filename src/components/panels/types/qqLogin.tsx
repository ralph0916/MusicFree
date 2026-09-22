import React, { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import PanelBase from "../base/panelBase";
import PanelHeader from "../base/panelHeader";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import { hidePanel } from "../usePanel";
import { loginQqByCookie } from "@/core/pluginManager/qqAuth";
import Toast from "@/utils/toast";
import { ScrollView } from "react-native-gesture-handler";

interface IProps {
    onSuccess?: () => void;
}

export default function QqLogin(props: IProps) {
    const { onSuccess } = props;
    const colors = useColors();
    const [cookie, setCookie] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        try {
            setSaving(true);
            const profile = loginQqByCookie(cookie);
            Toast.success(`已登录：${profile.nickname || profile.uin}`);
            onSuccess?.();
            hidePanel();
        } catch (e: any) {
            Toast.warn(e?.message || "登录失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <PanelBase
            height={vmax(55)}
            keyboardAvoidBehavior="height"
            renderBody={() => (
                <>
                    <PanelHeader
                        title="QQ 音乐登录"
                        onCancel={hidePanel}
                        onOk={save}
                        okText={saving ? "保存中" : "保存"}
                    />
                    <ScrollView style={styles.body}>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary">
                            在电脑浏览器打开 y.qq.com 并登录，按 F12 →
                            Network，刷新后复制请求 Cookie（需包含 uin、qm_keyst
                            等）。不支持破解 VIP。
                        </ThemeText>
                        <TextInput
                            value={cookie}
                            onChangeText={setCookie}
                            placeholder="粘贴 Cookie"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.placeholder,
                                    color: colors.text,
                                    height: rpx(280),
                                    textAlignVertical: "top",
                                },
                            ]}
                        />
                    </ScrollView>
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
        paddingVertical: rpx(16),
    },
});
