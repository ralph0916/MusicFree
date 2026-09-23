import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import MusicItem from "@/components/mediaItem/musicItem";
import Empty from "@/components/base/empty";
import PluginManager from "@/core/pluginManager";
import TrackPlayer from "@/core/trackPlayer";
import { showPanel } from "@/components/panels/usePanel";
import Toast from "@/utils/toast";
import { HomePluginKey } from "../pluginSwitcher";
import {
    navidromePluginPlatform,
    neteasePluginPlatform,
    qqPluginPlatform,
} from "@/constants/commonConst";
import { isNeteaseLoggedIn } from "@/core/pluginManager/neteaseAuth";
import { isQqLoggedIn } from "@/core/pluginManager/qqAuth";
import {
    getNeteaseUserPlaylists,
    likeNeteaseSong,
} from "@/core/pluginManager/neteasePlugin";
import { getQqUserPlaylists } from "@/core/pluginManager/qqPlugin";
import { setLikeState } from "@/core/likeManager";

export type SongSortField =
    | "title"
    | "artist"
    | "album"
    | "duration"
    | "createTime"
    | "publishTime";

export type SortOrder = "asc" | "desc";

type FeedOption = { id: string; title: string };

const SORT_FIELDS: Array<{ key: SongSortField; label: string }> = [
    { key: "createTime", label: "添加时间" },
    { key: "publishTime", label: "发布日期" },
    { key: "title", label: "歌名" },
    { key: "artist", label: "歌手" },
    { key: "album", label: "专辑" },
    { key: "duration", label: "时长" },
];

const NAS_FEEDS: FeedOption[] = [
    { id: "喜欢", title: "喜欢" },
    { id: "全部", title: "全部" },
    { id: "收藏", title: "收藏" },
    { id: "车载", title: "车载" },
    { id: "听腻了", title: "听腻了" },
];

function toTimeValue(
    item: IMusic.IMusicItem,
    field: "createTime" | "publishTime",
) {
    if (field === "createTime") {
        return (
            Number((item as any).createAt) ||
            Date.parse(String(item.date || "")) ||
            0
        );
    }
    const publish =
        Number((item as any).publishTime) ||
        Number((item as any).createAt) ||
        0;
    if (publish > 0) {
        return publish;
    }
    const year = Number(item.date);
    if (year > 1900 && year < 3000) {
        return Date.UTC(year, 0, 1);
    }
    return Date.parse(String(item.date || "")) || 0;
}

function sortSongs(
    list: IMusic.IMusicItem[],
    field: SongSortField,
    order: SortOrder,
) {
    const next = [...list];
    const dir = order === "asc" ? 1 : -1;
    next.sort((a, b) => {
        let cmp = 0;
        if (field === "title") {
            cmp = (a.title || "").localeCompare(b.title || "", "zh");
        } else if (field === "artist") {
            cmp = (a.artist || "").localeCompare(b.artist || "", "zh");
        } else if (field === "album") {
            cmp = (a.album || "").localeCompare(b.album || "", "zh");
        } else if (field === "duration") {
            cmp = (a.duration || 0) - (b.duration || 0);
        } else if (field === "createTime" || field === "publishTime") {
            cmp = toTimeValue(a, field) - toTimeValue(b, field);
        }
        return cmp * dir;
    });
    return next;
}

interface IProps {
    pluginKey: HomePluginKey;
}

export default function SongFeed(props: IProps) {
    const { pluginKey } = props;
    const colors = useColors();
    const [feedOptions, setFeedOptions] = useState<FeedOption[]>(
        pluginKey === navidromePluginPlatform ? NAS_FEEDS : [],
    );
    const [feedId, setFeedId] = useState(
        pluginKey === navidromePluginPlatform ? NAS_FEEDS[0].id : "daily",
    );
    const [sortField, setSortField] = useState<SongSortField>("createTime");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [songs, setSongs] = useState<IMusic.IMusicItem[]>([]);
    const [page, setPage] = useState(1);
    const [isEnd, setIsEnd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadNeteaseFeeds = useCallback(async () => {
        const base: FeedOption[] = [{ id: "daily", title: "每日推荐" }];
        if (!isNeteaseLoggedIn()) {
            setFeedOptions([
                ...base,
                { id: "3778678", title: "热歌" },
                { id: "19723756", title: "飙升" },
                { id: "3779629", title: "新歌" },
            ]);
            setFeedId("daily");
            return;
        }
        try {
            const sheets = await getNeteaseUserPlaylists();
            const extras = sheets.map(item => ({
                id: String(item.id),
                title: item.title || "歌单",
            }));
            setFeedOptions([...base, ...extras]);
            setFeedId("daily");
        } catch {
            setFeedOptions([
                ...base,
                { id: "likelist", title: "我喜欢的音乐" },
            ]);
            setFeedId("daily");
        }
    }, []);

    const loadQqFeeds = useCallback(async () => {
        const base: FeedOption[] = [
            { id: "daily", title: "每日推荐" },
            { id: "toplist:26", title: "热歌" },
            { id: "toplist:27", title: "新歌" },
            { id: "toplist:62", title: "飙升" },
        ];
        if (!isQqLoggedIn()) {
            setFeedOptions(base.filter(i => i.id !== "daily").length
                ? [
                    { id: "toplist:26", title: "热歌" },
                    { id: "toplist:27", title: "新歌" },
                    { id: "toplist:62", title: "飙升" },
                ]
                : base);
            setFeedId("toplist:26");
            return;
        }
        try {
            const sheets = await getQqUserPlaylists();
            const extras = sheets.map(item => ({
                id: String(item.id),
                title: item.title || "歌单",
            }));
            setFeedOptions([
                { id: "daily", title: "每日推荐" },
                ...extras,
                { id: "toplist:26", title: "热歌" },
            ]);
            setFeedId("daily");
        } catch {
            setFeedOptions(base);
            setFeedId("daily");
        }
    }, []);

    useEffect(() => {
        setSortField("createTime");
        setSortOrder("desc");
        setSongs([]);
        setError(null);
        setPage(1);
        setIsEnd(false);
        setFeedOptions([]);
        if (pluginKey === navidromePluginPlatform) {
            setFeedOptions(NAS_FEEDS);
            setFeedId(NAS_FEEDS[0].id);
        } else if (pluginKey === qqPluginPlatform) {
            loadQqFeeds();
        } else {
            setFeedId("daily");
            loadNeteaseFeeds();
        }
    }, [pluginKey, loadNeteaseFeeds, loadQqFeeds]);

    const load = useCallback(
        async (targetPage: number, replace: boolean, activeFeedId: string) => {
            const plugin = PluginManager.getByName(pluginKey);
            if (!plugin?.methods?.getTopListDetail) {
                setError("插件未就绪");
                setSongs([]);
                return;
            }
            if (
                pluginKey === neteasePluginPlatform &&
                activeFeedId === "daily" &&
                !isNeteaseLoggedIn()
            ) {
                setError("请先在「我的」中登录网易云账号");
                setSongs([]);
                return;
            }
            if (
                pluginKey === qqPluginPlatform &&
                activeFeedId === "daily" &&
                !isQqLoggedIn()
            ) {
                setError("请先在「我的」中配置 QQ 音乐 Cookie");
                setSongs([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const res = await plugin.methods.getTopListDetail(
                    {
                        id: activeFeedId,
                        title:
                            feedOptions.find(i => i.id === activeFeedId)
                                ?.title || "",
                        platform: pluginKey,
                    } as any,
                    targetPage,
                );
                const list = res?.musicList ?? [];
                setIsEnd(res?.isEnd !== false);
                setPage(targetPage);
                setSongs(prev => (replace ? list : [...prev, ...list]));
            } catch (e: any) {
                setError(e?.message || "加载失败");
                if (replace) {
                    setSongs([]);
                }
                if (pluginKey === navidromePluginPlatform) {
                    Toast.warn("请先在「我的」中配置 Navidrome 地址和账号");
                }
            } finally {
                setLoading(false);
            }
        },
        [pluginKey, feedOptions],
    );

    useEffect(() => {
        if (!feedId || feedOptions.length === 0) {
            return;
        }
        const valid = feedOptions.some(i => i.id === feedId);
        if (!valid) {
            return;
        }
        load(1, true, feedId);
    }, [feedId, pluginKey, feedOptions, load]);

    const displaySongs = useMemo(
        () => sortSongs(songs, sortField, sortOrder),
        [songs, sortField, sortOrder],
    );

    const sortLabel = useMemo(() => {
        return (
            SORT_FIELDS.find(i => i.key === sortField)?.label || "添加时间"
        );
    }, [sortField]);

    return (
        <View style={styles.wrapper}>
            <View style={styles.row}>
                {feedOptions.map(item => {
                    const selected = feedId === item.id;
                    return (
                        <Pressable
                            key={item.id}
                            onPress={() => setFeedId(item.id)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: selected
                                        ? colors.primary
                                        : colors.placeholder,
                                },
                            ]}>
                            <ThemeText
                                fontSize="description"
                                color={selected ? "#fff" : colors.text}>
                                {item.title}
                            </ThemeText>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.sortRow}>
                <ThemeText fontSize="description" fontColor="textSecondary">
                    排序
                </ThemeText>
                <View style={styles.sortActions}>
                    <Pressable
                        style={styles.sortBtn}
                        onPress={() => {
                            showPanel("SimpleSelect", {
                                header: "排序字段",
                                candidates: SORT_FIELDS.map(item => ({
                                    title: item.label,
                                    value: item.key,
                                })),
                                onPress(item) {
                                    setSortField(item.value as SongSortField);
                                },
                            });
                        }}>
                        <ThemeText fontSize="description" fontColor="primary">
                            {sortLabel}
                        </ThemeText>
                    </Pressable>
                    <Pressable
                        style={styles.orderBtn}
                        hitSlop={8}
                        onPress={() =>
                            setSortOrder(prev =>
                                prev === "asc" ? "desc" : "asc",
                            )
                        }>
                        <ThemeText
                            fontSize="title"
                            fontColor="primary"
                            style={styles.orderArrow}>
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </ThemeText>
                    </Pressable>
                </View>
            </View>

            {error ? (
                <View style={styles.center}>
                    <ThemeText fontColor="textSecondary">{error}</ThemeText>
                    <Pressable
                        onPress={() => load(1, true, feedId)}
                        style={[
                            styles.retry,
                            { backgroundColor: colors.primary },
                        ]}>
                        <ThemeText color="#fff">重试</ThemeText>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={displaySongs}
                    keyExtractor={(item, index) =>
                        `${item.platform}-${item.id}-${index}`
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={loading && displaySongs.length > 0}
                            onRefresh={() => load(1, true, feedId)}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
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
                    renderItem={({ item, index }) => (
                        <MusicItem
                            musicItem={item}
                            index={index + 1}
                            onItemPress={() => {
                                TrackPlayer.playWithReplacePlayList(
                                    item,
                                    displaySongs,
                                );
                            }}
                            onItemLongPress={() => {
                                if (
                                    pluginKey === neteasePluginPlatform &&
                                    isNeteaseLoggedIn()
                                ) {
                                    showPanel("SimpleSelect", {
                                        header: "歌曲操作",
                                        candidates: [
                                            {
                                                title: "添加到我喜欢",
                                                value: "like",
                                            },
                                            {
                                                title: "取消喜欢",
                                                value: "unlike",
                                            },
                                        ],
                                        async onPress(opt) {
                                            try {
                                                const liked =
                                                    opt.value === "like";
                                                await likeNeteaseSong(
                                                    String(item.id),
                                                    liked,
                                                );
                                                setLikeState(
                                                    item.platform,
                                                    item.id,
                                                    liked,
                                                );
                                                Toast.success(
                                                    liked
                                                        ? "已添加到我喜欢"
                                                        : "已取消喜欢",
                                                );
                                            } catch (e: any) {
                                                Toast.warn(
                                                    e?.message || "操作失败",
                                                );
                                            }
                                        },
                                    });
                                }
                            }}
                        />
                    )}
                    onEndReached={() => {
                        if (!loading && !isEnd) {
                            load(page + 1, false, feedId);
                        }
                    }}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loading && displaySongs.length > 0 ? (
                            <ActivityIndicator
                                color={colors.primary}
                                style={{ marginVertical: rpx(24) }}
                            />
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: rpx(24),
        paddingBottom: rpx(8),
    },
    chip: {
        paddingHorizontal: rpx(20),
        paddingVertical: rpx(10),
        borderRadius: rpx(20),
        marginRight: rpx(12),
        marginBottom: rpx(12),
    },
    sortRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: rpx(24),
        paddingBottom: rpx(8),
    },
    sortActions: { flexDirection: "row", alignItems: "center" },
    sortBtn: { flexDirection: "row", alignItems: "center" },
    orderBtn: {
        marginLeft: rpx(12),
        paddingHorizontal: rpx(8),
        paddingVertical: rpx(4),
    },
    orderArrow: {
        lineHeight: rpx(36),
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: rpx(48),
    },
    retry: {
        marginTop: rpx(24),
        paddingHorizontal: rpx(32),
        paddingVertical: rpx(14),
        borderRadius: rpx(28),
    },
});
