import React, { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import PersistStatus from "@/utils/persistStatus";
import pluginMeta from "@/core/pluginManager/meta";
import { navidromePluginPlatform } from "@/constants/commonConst";
import Toast from "@/utils/toast";
import Icon from "@/components/base/icon.tsx";

function deriveDefaultMusicTagUrl(): string {
    const vars = pluginMeta.getUserVariables(navidromePluginPlatform) ?? {};
    let url = (vars.url ?? "").trim().replace(/\/+$/, "");
    if (!url) {
        return "";
    }
    if (!/^https?:\/\//i.test(url)) {
        url = `http://${url}`;
    }
    try {
        const u = new URL(url);
        u.port = "8002";
        u.pathname = "/";
        u.search = "";
        u.hash = "";
        return u.toString().replace(/\/+$/, "");
    } catch {
        return "";
    }
}

export default function MusicTagTab() {
    const colors = useColors();
    const webRef = useRef<WebView>(null);
    const saved = PersistStatus.useValue("musicTag.url");
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const url = useMemo(() => {
        const custom = (saved || "").trim().replace(/\/+$/, "");
        if (custom) {
            return custom;
        }
        return deriveDefaultMusicTagUrl();
    }, [saved]);

    const openEdit = () => {
        setDraft(url || "http://192.168.1.10:8002");
        setEditing(true);
    };

    const saveUrl = () => {
        let next = draft.trim().replace(/\/+$/, "");
        if (next && !/^https?:\/\//i.test(next)) {
            next = `http://${next}`;
        }
        PersistStatus.set("musicTag.url", next || undefined);
        setEditing(false);
        setLoading(true);
        setReloadKey(k => k + 1);
        Toast.success(next ? "MusicTag 地址已保存" : "已恢复默认地址");
    };

    if (editing) {
        return (
            <View style={[styles.wrapper, { backgroundColor: colors.pageBackground }]}>
                <ThemeText fontWeight="bold" fontSize="title" style={styles.title}>
                    MusicTag 服务地址
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    style={styles.hint}>
                    Docker 镜像 xhongc/music_tag_web:latest，默认端口 8002。可编辑
                    NAS 音乐的封面、歌词、标题、歌手等标签。
                </ThemeText>
                <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="http://192.168.x.x:8002"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                        styles.input,
                        {
                            color: colors.text,
                            borderColor: colors.divider,
                            backgroundColor: colors.card,
                        },
                    ]}
                />
                <View style={styles.row}>
                    <Pressable
                        style={[styles.btn, { backgroundColor: colors.divider }]}
                        onPress={() => setEditing(false)}>
                        <ThemeText>取消</ThemeText>
                    </Pressable>
                    <Pressable
                        style={[styles.btn, { backgroundColor: colors.primary }]}
                        onPress={saveUrl}>
                        <ThemeText color="#fff">保存</ThemeText>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (!url) {
        return (
            <View style={[styles.empty, { backgroundColor: colors.pageBackground }]}>
                <ThemeText fontSize="content" style={{ textAlign: "center" }}>
                    请先配置 MusicTag 地址，或在「我的」中配置 Navidrome
                    服务器（将自动使用同主机 :8002）
                </ThemeText>
                <Pressable
                    style={[styles.btn, { backgroundColor: colors.primary, marginTop: rpx(32) }]}
                    onPress={openEdit}>
                    <ThemeText color="#fff">填写地址</ThemeText>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <View
                style={[
                    styles.toolbar,
                    {
                        backgroundColor: colors.card,
                        borderBottomColor: colors.divider,
                    },
                ]}>
                <ThemeText fontSize="description" numberOfLines={1} style={styles.urlText}>
                    {url}
                </ThemeText>
                <Pressable onPress={() => webRef.current?.reload()} hitSlop={10}>
                    <Icon name="arrow-path" size={rpx(36)} color={colors.text} />
                </Pressable>
                <Pressable
                    onPress={openEdit}
                    hitSlop={10}
                    style={{ marginLeft: rpx(20) }}>
                    <Icon name="cog-8-tooth" size={rpx(36)} color={colors.text} />
                </Pressable>
            </View>
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : null}
            <WebView
                key={reloadKey}
                ref={webRef}
                source={{ uri: url }}
                style={styles.webview}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    Toast.warn("无法打开 MusicTag，请检查地址与网络");
                }}
                allowsBackForwardNavigationGestures
                setSupportMultipleWindows={false}
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: rpx(20),
        paddingVertical: rpx(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    urlText: { flex: 1, marginRight: rpx(12) },
    webview: { flex: 1 },
    loading: {
        position: "absolute",
        top: rpx(80),
        left: 0,
        right: 0,
        zIndex: 2,
        alignItems: "center",
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: rpx(48),
    },
    title: { marginTop: rpx(24), marginHorizontal: rpx(24) },
    hint: {
        marginTop: rpx(12),
        marginHorizontal: rpx(24),
        lineHeight: rpx(36),
    },
    input: {
        marginHorizontal: rpx(24),
        marginTop: rpx(28),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: rpx(16),
        paddingHorizontal: rpx(20),
        paddingVertical: rpx(18),
        fontSize: rpx(28),
    },
    row: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: rpx(28),
        marginHorizontal: rpx(24),
        gap: rpx(16),
    },
    btn: {
        paddingHorizontal: rpx(36),
        paddingVertical: rpx(18),
        borderRadius: rpx(16),
        alignItems: "center",
    },
});
