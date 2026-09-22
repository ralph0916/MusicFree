import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import PanelBase from "../base/panelBase";
import PanelHeader from "../base/panelHeader";
import Input from "@/components/base/input";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import { hidePanel } from "../usePanel";
import PluginManager from "@/core/pluginManager";
import { navidromePluginPlatform } from "@/constants/commonConst";
import Toast from "@/utils/toast";

interface IProps {
    onSuccess?: () => void;
}

export default function NavidromeConfig(props: IProps) {
    const { onSuccess } = props;
    const colors = useColors();
    const plugin = PluginManager.getByName(navidromePluginPlatform);
    const init = PluginManager.getUserVariables(plugin!) || {};
    const [url, setUrl] = useState(String(init.url || ""));
    const [username, setUsername] = useState(String(init.username || ""));
    const [password, setPassword] = useState(String(init.password || ""));

    const save = () => {
        if (!plugin) {
            Toast.warn("Navidrome 插件未就绪");
            return;
        }
        if (!url.trim()) {
            Toast.warn("请填写服务器地址");
            return;
        }
        PluginManager.setUserVariables(plugin, {
            url: url.trim(),
            username: username.trim(),
            password: password.trim(),
        });
        Toast.success("NAS 配置已保存");
        onSuccess?.();
        hidePanel();
    };

    return (
        <PanelBase
            height={vmax(50)}
            keyboardAvoidBehavior="height"
            renderBody={() => (
                <>
                    <PanelHeader
                        title="NAS / Navidrome"
                        onCancel={hidePanel}
                        onOk={save}
                        okText="保存"
                    />
                    <View style={styles.body}>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary">
                            填写自建 Navidrome / Subsonic 兼容地址与账号，例如
                            http://192.168.1.10:4533
                        </ThemeText>
                        <Input
                            value={url}
                            onChangeText={setUrl}
                            placeholder="服务器地址"
                            autoCapitalize="none"
                            style={[
                                styles.input,
                                { backgroundColor: colors.placeholder },
                            ]}
                        />
                        <Input
                            value={username}
                            onChangeText={setUsername}
                            placeholder="用户名"
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
