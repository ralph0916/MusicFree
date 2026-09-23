import React, { useCallback, useEffect, useRef, useState } from "react";
import { iconSizeConst } from "@/constants/uiConst";
import { useCurrentMusic } from "@/core/trackPlayer";
import Icon from "@/components/base/icon.tsx";
import {
    navidromePluginPlatform,
    neteasePluginPlatform,
    qqPluginPlatform,
} from "@/constants/commonConst";
import {
    isSongInNavidromePlaylist,
    toggleSongInNavidromePlaylist,
} from "@/core/pluginManager/navidromePlugin";
import {
    isNeteaseSongLiked,
    likeNeteaseSong,
} from "@/core/pluginManager/neteasePlugin";
import {
    isQqSongLiked,
    likeQqSong,
} from "@/core/pluginManager/qqPlugin";
import { isNeteaseLoggedIn } from "@/core/pluginManager/neteaseAuth";
import { isQqLoggedIn } from "@/core/pluginManager/qqAuth";
import Toast from "@/utils/toast";
import rpx from "@/utils/rpx";
import {
    getLikeState,
    setLikeState,
    useLikeState,
} from "@/core/likeManager";

const LIKE_PLAYLIST = "喜欢";

interface IProps {
    color?: string;
    size?: number;
    /** 不传则跟随当前播放曲目 */
    musicItem?: IMusic.IMusicItem | null;
}

export default function MiniHeartButton(props: IProps) {
    const { color = "#fff", size = iconSizeConst.normal, musicItem: propItem } =
        props;
    const current = useCurrentMusic();
    const musicItem = propItem === undefined ? current : propItem;
    const sharedLiked = useLikeState(musicItem?.platform, musicItem?.id);
    const [liked, setLiked] = useState(false);
    const [busy, setBusy] = useState(false);
    const fetchGen = useRef(0);

    const refresh = useCallback(async () => {
        if (!musicItem) {
            setLiked(false);
            return;
        }
        const cached = getLikeState(musicItem.platform, musicItem.id);
        if (cached !== undefined) {
            setLiked(cached);
        }
        const gen = ++fetchGen.current;
        try {
            let next = false;
            if (musicItem.platform === navidromePluginPlatform) {
                const state = await isSongInNavidromePlaylist(
                    LIKE_PLAYLIST,
                    String(musicItem.id),
                );
                next = state.liked;
            } else if (
                musicItem.platform === neteasePluginPlatform &&
                isNeteaseLoggedIn()
            ) {
                next = await isNeteaseSongLiked(String(musicItem.id));
            } else if (
                musicItem.platform === qqPluginPlatform &&
                isQqLoggedIn()
            ) {
                next = await isQqSongLiked(String(musicItem.id));
            } else {
                next = false;
            }
            // 忽略过期请求，避免把本地刚切换的喜欢状态覆盖回去
            if (gen !== fetchGen.current) {
                return;
            }
            const newer = getLikeState(musicItem.platform, musicItem.id);
            if (newer !== undefined && newer !== next) {
                // 本地已有更新结果，以本地为准
                setLiked(newer);
                return;
            }
            setLiked(next);
            setLikeState(musicItem.platform, musicItem.id, next);
        } catch {
            if (gen === fetchGen.current && cached === undefined) {
                setLiked(false);
            }
        }
    }, [musicItem]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (sharedLiked !== undefined) {
            setLiked(sharedLiked);
        }
    }, [sharedLiked]);

    const onPress = async () => {
        if (!musicItem || busy) {
            return;
        }
        setBusy(true);
        // 作废进行中的 refresh，防止异步结果回写旧状态
        fetchGen.current += 1;
        const optimistic = !liked;
        setLiked(optimistic);
        setLikeState(musicItem.platform, musicItem.id, optimistic);
        try {
            if (musicItem.platform === navidromePluginPlatform) {
                const next = await toggleSongInNavidromePlaylist(
                    LIKE_PLAYLIST,
                    String(musicItem.id),
                );
                setLiked(next);
                setLikeState(musicItem.platform, musicItem.id, next);
                Toast.success(next ? "已添加到喜欢" : "已移出喜欢");
                return;
            }
            if (musicItem.platform === neteasePluginPlatform) {
                if (!isNeteaseLoggedIn()) {
                    setLiked(!optimistic);
                    setLikeState(musicItem.platform, musicItem.id, !optimistic);
                    Toast.warn("请先登录网易云账号");
                    return;
                }
                await likeNeteaseSong(String(musicItem.id), optimistic);
                Toast.success(optimistic ? "已添加到我喜欢" : "已取消喜欢");
                return;
            }
            if (musicItem.platform === qqPluginPlatform) {
                if (!isQqLoggedIn()) {
                    setLiked(!optimistic);
                    setLikeState(musicItem.platform, musicItem.id, !optimistic);
                    Toast.warn("请先配置 QQ 音乐账号");
                    return;
                }
                await likeQqSong(String(musicItem.id), optimistic);
                Toast.success(optimistic ? "已添加到我喜欢" : "已取消喜欢");
                return;
            }
            setLiked(!optimistic);
            setLikeState(musicItem.platform, musicItem.id, !optimistic);
            Toast.warn("当前音源不支持喜欢操作");
        } catch (e: any) {
            setLiked(!optimistic);
            setLikeState(musicItem.platform, musicItem.id, !optimistic);
            Toast.warn(e?.message || "操作失败");
        } finally {
            setBusy(false);
        }
    };

    if (!musicItem) {
        return (
            <Icon
                name="heart-outline"
                size={size}
                color={color}
                style={{ opacity: 0.35, marginLeft: rpx(8) }}
            />
        );
    }

    return (
        <Icon
            name={liked ? "heart" : "heart-outline"}
            size={size}
            color={liked ? "#EC4141" : color}
            style={{ marginLeft: rpx(8) }}
            onPress={onPress}
        />
    );
}
