import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Empty from "@/components/base/empty";
import ListItem from "@/components/base/listItem";
import { ImgAsset } from "@/constants/assetsConst";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import { HomePluginKey } from "../pluginSwitcher";
import {
    navidromePluginPlatform,
    neteasePluginPlatform,
    qqPluginPlatform,
} from "@/constants/commonConst";
import Toast from "@/utils/toast";
import { showPanel } from "@/components/panels/usePanel";
import { showDialog } from "@/components/dialogs/useDialog";
import {
    createNavidromePlaylist,
    deleteNavidromePlaylist,
    getNavidromePlaylists,
} from "@/core/pluginManager/navidromePlugin";
import {
    createNeteasePlaylist,
    deleteNeteasePlaylist,
    getNeteaseUserPlaylists,
} from "@/core/pluginManager/neteasePlugin";
import {
    createQqPlaylist,
    deleteQqPlaylist,
    getQqUserPlaylists,
} from "@/core/pluginManager/qqPlugin";
import { isNeteaseLoggedIn } from "@/core/pluginManager/neteaseAuth";
import { isQqLoggedIn } from "@/core/pluginManager/qqAuth";

interface IProps {
    pluginKey: HomePluginKey;
}

export default function SheetFeed(props: IProps) {
    const { pluginKey } = props;
    const colors = useColors();
    const navigate = useNavigate();
    const [sheets, setSheets] = useState<IMusic.IMusicSheetItemBase[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (pluginKey === navidromePluginPlatform) {
                const list = await getNavidromePlaylists();
                setSheets(list);
                return;
            }
            if (pluginKey === qqPluginPlatform) {
                if (!isQqLoggedIn()) {
                    setSheets([]);
                    setError("请先登录 QQ 音乐账号后查看我的歌单");
                    return;
                }
                const list = await getQqUserPlaylists();
                setSheets(list);
                return;
            }
            if (!isNeteaseLoggedIn()) {
                setSheets([]);
                setError("请先登录网易云账号后查看我的歌单");
                return;
            }
            const list = await getNeteaseUserPlaylists();
            setSheets(list);
        } catch (e: any) {
            setError(e?.message || "歌单加载失败");
            setSheets([]);
            if (pluginKey === navidromePluginPlatform) {
                Toast.warn("请先配置 Navidrome");
            }
        } finally {
            setLoading(false);
        }
    }, [pluginKey]);

    useEffect(() => {
        setSheets([]);
        load();
    }, [pluginKey, load]);

    const onCreate = () => {
        if (
            pluginKey === neteasePluginPlatform &&
            !isNeteaseLoggedIn()
        ) {
            Toast.warn("请先登录网易云账号");
            return;
        }
        if (pluginKey === qqPluginPlatform && !isQqLoggedIn()) {
            Toast.warn("请先登录 QQ 音乐账号");
            return;
        }
        showPanel("SimpleInput", {
            title: "新建歌单",
            placeholder: "输入歌单名称",
            async onOk(text, closePanel) {
                const name = text.trim();
                if (!name) {
                    Toast.warn("请输入歌单名称");
                    return;
                }
                try {
                    if (pluginKey === navidromePluginPlatform) {
                        await createNavidromePlaylist(name);
                    } else if (pluginKey === qqPluginPlatform) {
                        await createQqPlaylist(name);
                    } else {
                        await createNeteasePlaylist(name);
                    }
                    closePanel();
                    Toast.success("歌单已创建");
                    load();
                } catch (e: any) {
                    Toast.warn(e?.message || "创建失败");
                }
            },
        });
    };

    const onDelete = (item: IMusic.IMusicSheetItemBase) => {
        showDialog("SimpleDialog", {
            title: "删除歌单",
            content: `确定删除「${item.title}」吗？`,
            onOk: async () => {
                try {
                    if (pluginKey === navidromePluginPlatform) {
                        await deleteNavidromePlaylist(String(item.id));
                    } else if (pluginKey === qqPluginPlatform) {
                        await deleteQqPlaylist(String(item.id));
                    } else {
                        await deleteNeteasePlaylist(String(item.id));
                    }
                    Toast.success("已删除");
                    load();
                } catch (e: any) {
                    Toast.warn(e?.message || "删除失败");
                }
            },
        });
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.header}>
                <ThemeText fontSize="description" fontColor="textSecondary">
                    {pluginKey === neteasePluginPlatform
                        ? "我的网易云歌单"
                        : pluginKey === qqPluginPlatform
                            ? "我的 QQ 音乐歌单"
                            : "NAS 歌单"}
                </ThemeText>
                <Pressable
                    onPress={onCreate}
                    style={[
                        styles.createBtn,
                        { backgroundColor: colors.primary },
                    ]}>
                    <ThemeText fontSize="description" color="#fff">
                        新建
                    </ThemeText>
                </Pressable>
            </View>
            {error ? (
                <View style={styles.center}>
                    <ThemeText fontColor="textSecondary">{error}</ThemeText>
                    <Pressable
                        onPress={load}
                        style={[
                            styles.retry,
                            { backgroundColor: colors.primary },
                        ]}>
                        <ThemeText color="#fff">重试</ThemeText>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={sheets}
                    keyExtractor={(item, index) =>
                        `${item.platform}-${item.id}-${index}`
                    }
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator
                                style={{ marginTop: rpx(80) }}
                                color={colors.primary}
                            />
                        ) : (
                            <Empty />
                        )
                    }
                    renderItem={({ item }) => (
                        <ListItem
                            heightType="big"
                            withHorizontalPadding
                            onPress={() => {
                                navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
                                    sheetInfo: item,
                                });
                            }}
                            onLongPress={() => onDelete(item)}>
                            <ListItem.ListItemImage
                                uri={item.coverImg ?? item.artwork}
                                fallbackImg={ImgAsset.albumDefault}
                            />
                            <ListItem.Content
                                title={item.title}
                                description={
                                    item.artist ||
                                    (item.worksNum
                                        ? `${item.worksNum} 首`
                                        : "长按删除")
                                }
                            />
                        </ListItem>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: rpx(24),
        marginBottom: rpx(8),
    },
    createBtn: {
        paddingHorizontal: rpx(20),
        paddingVertical: rpx(10),
        borderRadius: rpx(20),
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    retry: {
        marginTop: rpx(24),
        paddingHorizontal: rpx(32),
        paddingVertical: rpx(14),
        borderRadius: rpx(28),
    },
});
