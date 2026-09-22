import React, { useCallback, useEffect, useState } from "react";
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

const LIKE_PLAYLIST = "喜欢";

interface IProps {
    color?: string;
    size?: number;
}

export default function MiniHeartButton(props: IProps) {
    const { color = "#fff", size = iconSizeConst.normal } = props;
    const musicItem = useCurrentMusic();
    const [liked, setLiked] = useState(false);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        if (!musicItem) {
            setLiked(false);
            return;
        }
        try {
            if (musicItem.platform === navidromePluginPlatform) {
                const state = await isSongInNavidromePlaylist(
                    LIKE_PLAYLIST,
                    String(musicItem.id),
                );
                setLiked(state.liked);
                return;
            }
            if (
                musicItem.platform === neteasePluginPlatform &&
                isNeteaseLoggedIn()
            ) {
                setLiked(await isNeteaseSongLiked(String(musicItem.id)));
                return;
            }
            if (musicItem.platform === qqPluginPlatform && isQqLoggedIn()) {
                setLiked(await isQqSongLiked(String(musicItem.id)));
                return;
            }
            setLiked(false);
        } catch {
            setLiked(false);
        }
    }, [musicItem]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const onPress = async () => {
        if (!musicItem || busy) {
            return;
        }
        setBusy(true);
        try {
            if (musicItem.platform === navidromePluginPlatform) {
                const next = await toggleSongInNavidromePlaylist(
                    LIKE_PLAYLIST,
                    String(musicItem.id),
                );
                setLiked(next);
                Toast.success(next ? "已添加到喜欢" : "已移出喜欢");
                return;
            }
            if (musicItem.platform === neteasePluginPlatform) {
                if (!isNeteaseLoggedIn()) {
                    Toast.warn("请先登录网易云账号");
                    return;
                }
                const next = !liked;
                await likeNeteaseSong(String(musicItem.id), next);
                setLiked(next);
                Toast.success(next ? "已添加到我喜欢" : "已取消喜欢");
                return;
            }
            if (musicItem.platform === qqPluginPlatform) {
                if (!isQqLoggedIn()) {
                    Toast.warn("请先配置 QQ 音乐账号");
                    return;
                }
                const next = !liked;
                await likeQqSong(String(musicItem.id), next);
                setLiked(next);
                Toast.success(next ? "已添加到我喜欢" : "已取消喜欢");
                return;
            }
            Toast.warn("当前音源不支持喜欢操作");
        } catch (e: any) {
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
                style={{ opacity: 0.35, marginLeft: rpx(12) }}
            />
        );
    }

    return (
        <Icon
            name={liked ? "heart" : "heart-outline"}
            size={size}
            color={liked ? "#EC4141" : color}
            style={{ marginLeft: rpx(12) }}
            onPress={onPress}
        />
    );
}
