import React, { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import Icon from "@/components/base/icon.tsx";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import { showPanel } from "@/components/panels/usePanel";
import {
    getNeteaseAuth,
    isNeteaseLoggedIn,
    logoutNetease,
} from "@/core/pluginManager/neteaseAuth";
import {
    getQqAuth,
    isQqLoggedIn,
    logoutQq,
} from "@/core/pluginManager/qqAuth";
import Toast from "@/utils/toast";
import Color from "color";
import Theme from "@/core/theme";
import { useSetAtom } from "jotai";
import { homeTabAtom } from "../store/homeTabAtom";

function SourceCard(props: {
    title: string;
    subtitle: string;
    icon: "home-outline" | "user" | "playlist" | "pencil-square";
    accent: string;
    onPress: () => void;
}) {
    const colors = useColors();
    return (
        <Pressable
            onPress={props.onPress}
            style={[
                styles.sourceCard,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.divider,
                },
            ]}>
            <View
                style={[
                    styles.sourceIcon,
                    { backgroundColor: Color(props.accent).alpha(0.15).toString() },
                ]}>
                <Icon name={props.icon} size={rpx(36)} color={props.accent} />
            </View>
            <View style={styles.sourceText}>
                <ThemeText fontWeight="bold" fontSize="content">
                    {props.title}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    numberOfLines={1}
                    style={{ marginTop: rpx(4) }}>
                    {props.subtitle}
                </ThemeText>
            </View>
            <ThemeText
                fontSize="title"
                color={colors.textSecondary}
                style={{ marginLeft: rpx(4) }}>
                ›
            </ThemeText>
        </Pressable>
    );
}

function QuickEntry(props: {
    title: string;
    icon:
        | "t-shirt-outline"
        | "clock-outline"
        | "cog-8-tooth"
        | "musical-note"
        | "pencil-square";
    color: string;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={props.onPress} style={styles.quickItem}>
            <View
                style={[
                    styles.quickIcon,
                    {
                        backgroundColor: Color(props.color)
                            .alpha(0.14)
                            .toString(),
                    },
                ]}>
                <Icon name={props.icon} size={rpx(40)} color={props.color} />
            </View>
            <ThemeText
                fontSize="description"
                style={{ marginTop: rpx(10) }}
                numberOfLines={1}>
                {props.title}
            </ThemeText>
        </Pressable>
    );
}

export default function MineTab() {
    const navigate = useNavigate();
    const colors = useColors();
    const theme = Theme.useTheme();
    const setTab = useSetAtom(homeTabAtom);
    const [, bump] = useState(0);
    const neteaseLoggedIn = isNeteaseLoggedIn();
    const neteaseProfile = getNeteaseAuth()?.profile;
    const qqLoggedIn = isQqLoggedIn();
    const qqProfile = getQqAuth()?.profile;

    const openNetease = () => {
        if (neteaseLoggedIn) {
            showPanel("SimpleSelect", {
                header: "网易云账号",
                candidates: [
                    { title: "重新登录", value: "relogin" },
                    { title: "退出登录", value: "logout" },
                ],
                onPress(item) {
                    if (item.value === "logout") {
                        logoutNetease();
                        Toast.success("已退出网易云");
                        bump(v => v + 1);
                        return;
                    }
                    showPanel("NeteaseLogin", {
                        onSuccess() {
                            bump(v => v + 1);
                        },
                    });
                },
            });
            return;
        }
        showPanel("NeteaseLogin", {
            onSuccess() {
                bump(v => v + 1);
            },
        });
    };

    const openQq = () => {
        if (qqLoggedIn) {
            showPanel("SimpleSelect", {
                header: "QQ 音乐账号",
                candidates: [
                    { title: "重新登录", value: "relogin" },
                    { title: "退出登录", value: "logout" },
                ],
                onPress(item) {
                    if (item.value === "logout") {
                        logoutQq();
                        Toast.success("已退出 QQ 音乐");
                        bump(v => v + 1);
                        return;
                    }
                    showPanel("QqLogin", {
                        onSuccess() {
                            bump(v => v + 1);
                        },
                    });
                },
            });
            return;
        }
        showPanel("QqLogin", {
            onSuccess() {
                bump(v => v + 1);
            },
        });
    };

    return (
        <ScrollView
            style={styles.wrapper}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <View
                style={[
                    styles.hero,
                    {
                        backgroundColor: theme.dark
                            ? Color(colors.primary).alpha(0.18).toString()
                            : Color(colors.primary).alpha(0.1).toString(),
                    },
                ]}>
                <View
                    style={[
                        styles.avatar,
                        { backgroundColor: colors.primary },
                    ]}>
                    <ThemeText color="#fff" fontSize="title" fontWeight="bold">
                        M
                    </ThemeText>
                </View>
                <View style={styles.heroText}>
                    <ThemeText fontSize="title" fontWeight="bold">
                        我的音乐库
                    </ThemeText>
                    <ThemeText
                        fontSize="description"
                        fontColor="textSecondary"
                        style={{ marginTop: rpx(8) }}>
                        NAS · 网易云 · QQ 音乐 统一管理
                    </ThemeText>
                </View>
            </View>

            <ThemeText fontWeight="bold" style={styles.section}>
                常用功能
            </ThemeText>
            <View style={styles.quickRow}>
                <QuickEntry
                    title="皮肤主题"
                    icon="t-shirt-outline"
                    color="#EC4141"
                    onPress={() =>
                        navigate(ROUTE_PATH.SETTING, { type: "theme" })
                    }
                />
                <QuickEntry
                    title="播放历史"
                    icon="clock-outline"
                    color="#3B82F6"
                    onPress={() => navigate(ROUTE_PATH.HISTORY)}
                />
                <QuickEntry
                    title="插件设置"
                    icon="cog-8-tooth"
                    color="#8B5CF6"
                    onPress={() =>
                        navigate(ROUTE_PATH.SETTING, { type: "plugin" })
                    }
                />
                <QuickEntry
                    title="全部设置"
                    icon="musical-note"
                    color="#10B981"
                    onPress={() => navigate(ROUTE_PATH.SETTING)}
                />
            </View>

            <ThemeText fontWeight="bold" style={styles.section}>
                音源账号
            </ThemeText>
            <SourceCard
                title="NAS / Navidrome"
                subtitle="配置服务器地址与账号密码"
                icon="home-outline"
                accent="#EC4141"
                onPress={() => showPanel("NavidromeConfig")}
            />
            <SourceCard
                title="网易云音乐"
                subtitle={
                    neteaseLoggedIn
                        ? `已登录 · ${neteaseProfile?.nickname || "用户"}`
                        : "未登录 · 手机号验证码"
                }
                icon="user"
                accent="#D33A31"
                onPress={openNetease}
            />
            <SourceCard
                title="QQ 音乐"
                subtitle={
                    qqLoggedIn
                        ? `已登录 · ${qqProfile?.nickname || qqProfile?.uin}`
                        : "未登录 · QQ号密码登录"
                }
                icon="playlist"
                accent="#31C27C"
                onPress={openQq}
            />
            <SourceCard
                title="MusicTag 标签编辑"
                subtitle="编辑 NAS 音乐封面 / 歌词 / 标题 / 歌手"
                icon="pencil-square"
                accent="#F59E0B"
                onPress={() => setTab("tag")}
            />

            <View style={{ height: rpx(40) }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    content: {
        paddingHorizontal: rpx(24),
        paddingBottom: rpx(24),
    },
    hero: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: rpx(28),
        padding: rpx(28),
        marginTop: rpx(8),
        marginBottom: rpx(8),
    },
    avatar: {
        width: rpx(100),
        height: rpx(100),
        borderRadius: rpx(50),
        alignItems: "center",
        justifyContent: "center",
    },
    heroText: {
        flex: 1,
        marginLeft: rpx(24),
    },
    section: {
        marginTop: rpx(28),
        marginBottom: rpx(16),
        fontSize: rpx(30),
    },
    quickRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    quickItem: {
        width: "23%",
        alignItems: "center",
    },
    quickIcon: {
        width: rpx(96),
        height: rpx(96),
        borderRadius: rpx(28),
        alignItems: "center",
        justifyContent: "center",
    },
    sourceCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: rpx(24),
        paddingVertical: rpx(22),
        paddingHorizontal: rpx(20),
        marginBottom: rpx(16),
        borderWidth: StyleSheet.hairlineWidth,
    },
    sourceIcon: {
        width: rpx(72),
        height: rpx(72),
        borderRadius: rpx(20),
        alignItems: "center",
        justifyContent: "center",
    },
    sourceText: {
        flex: 1,
        marginHorizontal: rpx(18),
        minWidth: 0,
    },
});
