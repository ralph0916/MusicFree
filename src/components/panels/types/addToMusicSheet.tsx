import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import ListItem from "@/components/base/listItem";
import { ImgAsset } from "@/constants/assetsConst";
import Toast from "@/utils/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PanelBase from "../base/panelBase";
import { FlatList } from "react-native-gesture-handler";
import { hidePanel } from "../usePanel";
import PanelHeader from "../base/panelHeader";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import Icon from "@/components/base/icon.tsx";
import {
    navidromePluginPlatform,
    neteasePluginPlatform,
    qqPluginPlatform,
} from "@/constants/commonConst";
import {
    addSongsToNavidromePlaylist,
    getNavidromePlaylists,
} from "@/core/pluginManager/navidromePlugin";
import {
    addSongsToNeteasePlaylist,
    getNeteaseUserPlaylists,
} from "@/core/pluginManager/neteasePlugin";
import {
    addSongsToQqPlaylist,
    getQqUserPlaylists,
} from "@/core/pluginManager/qqPlugin";
import { isNeteaseLoggedIn } from "@/core/pluginManager/neteaseAuth";
import { isQqLoggedIn } from "@/core/pluginManager/qqAuth";

interface IAddToMusicSheetProps {
    musicItem: IMusic.IMusicItem | IMusic.IMusicItem[];
    newSheetDefaultName?: string;
}

function normalizeItems(
    musicItem: IMusic.IMusicItem | IMusic.IMusicItem[],
): IMusic.IMusicItem[] {
    return Array.isArray(musicItem) ? musicItem : [musicItem];
}

export default function AddToMusicSheet(props: IAddToMusicSheetProps) {
    const { musicItem = [] } = props ?? {};
    const items = useMemo(() => normalizeItems(musicItem), [musicItem]);
    const platform = items[0]?.platform || "";
    const colors = useColors();
    const safeAreaInsets = useSafeAreaInsets();
    const [sheets, setSheets] = useState<IMusic.IMusicSheetItemBase[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                let list: IMusic.IMusicSheetItemBase[] = [];
                if (platform === navidromePluginPlatform) {
                    list = await getNavidromePlaylists();
                    // 「全部」不是歌单，仅展示真实歌单
                    list = list.filter(
                        s => s.title !== "全部" && s.id !== "全部",
                    );
                } else if (platform === neteasePluginPlatform) {
                    if (!isNeteaseLoggedIn()) {
                        throw new Error("请先登录网易云账号");
                    }
                    list = await getNeteaseUserPlaylists();
                } else if (platform === qqPluginPlatform) {
                    if (!isQqLoggedIn()) {
                        throw new Error("请先登录 QQ 音乐账号");
                    }
                    list = await getQqUserPlaylists();
                } else {
                    throw new Error("当前音源不支持加入远端歌单");
                }
                if (!cancelled) {
                    setSheets(list);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message || "歌单加载失败");
                    setSheets([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [platform]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const onConfirm = async () => {
        if (submitting) {
            return;
        }
        const ids = [...selected];
        if (ids.length === 0) {
            hidePanel();
            return;
        }
        setSubmitting(true);
        try {
            const songIds = items.map(i => String(i.id));
            if (platform === navidromePluginPlatform) {
                for (const playlistId of ids) {
                    await addSongsToNavidromePlaylist(playlistId, songIds);
                }
            } else if (platform === neteasePluginPlatform) {
                for (const playlistId of ids) {
                    await addSongsToNeteasePlaylist(playlistId, songIds);
                }
            } else if (platform === qqPluginPlatform) {
                for (const playlistId of ids) {
                    await addSongsToQqPlaylist(playlistId, songIds);
                }
            }
            Toast.success(`已加入 ${ids.length} 个歌单`);
            hidePanel();
        } catch (e: any) {
            Toast.warn(e?.message || "加入歌单失败");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PanelBase
            height={vmax(70)}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={`加入歌单（${items.length} 首）`}
                        onCancel={hidePanel}
                        onOk={onConfirm}
                        okText={
                            submitting
                                ? "加入中"
                                : selected.size
                                    ? `确定(${selected.size})`
                                    : "完成"
                        }
                    />
                    <View
                        style={[
                            style.wrapper,
                            { marginBottom: safeAreaInsets.bottom },
                        ]}>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            style={style.hint}>
                            可多选当前渠道歌单；也可以不选直接完成
                        </ThemeText>
                        {error ? (
                            <ThemeText
                                fontColor="textSecondary"
                                style={style.hint}>
                                {error}
                            </ThemeText>
                        ) : null}
                        <FlatList
                            data={sheets}
                            keyExtractor={sheet => String(sheet.id)}
                            ListEmptyComponent={
                                loading ? (
                                    <ThemeText
                                        style={style.hint}
                                        fontColor="textSecondary">
                                        加载中…
                                    </ThemeText>
                                ) : (
                                    <ThemeText
                                        style={style.hint}
                                        fontColor="textSecondary">
                                        暂无可加入的歌单
                                    </ThemeText>
                                )
                            }
                            renderItem={({ item: sheet }) => {
                                const checked = selected.has(String(sheet.id));
                                return (
                                    <ListItem
                                        withHorizontalPadding
                                        onPress={() =>
                                            toggle(String(sheet.id))
                                        }>
                                        <ListItem.ListItemImage
                                            uri={
                                                sheet.coverImg ?? sheet.artwork
                                            }
                                            fallbackImg={ImgAsset.albumDefault}
                                        />
                                        <ListItem.Content
                                            title={sheet.title}
                                            description={
                                                sheet.worksNum
                                                    ? `${sheet.worksNum} 首`
                                                    : ""
                                            }
                                        />
                                        <Pressable
                                            hitSlop={8}
                                            onPress={() =>
                                                toggle(String(sheet.id))
                                            }>
                                            <Icon
                                                name={
                                                    checked
                                                        ? "check-circle"
                                                        : "check-circle-outline"
                                                }
                                                size={rpx(40)}
                                                color={
                                                    checked
                                                        ? colors.primary
                                                        : colors.textSecondary
                                                }
                                            />
                                        </Pressable>
                                    </ListItem>
                                );
                            }}
                        />
                    </View>
                </>
            )}
        />
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    hint: {
        paddingHorizontal: rpx(24),
        marginBottom: rpx(12),
    },
});
