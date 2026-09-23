import { RequestStateCode } from "@/common/constant";
import { resetMediaItem } from "@/common/media-util";
import { useCallback, useEffect, useRef, useState } from "react";
import PluginManager from "@shared/plugin-manager/renderer";
import { setLikeState } from "@/renderer/core/like/likeManager";
import {
    fetchNeteaseFeedSongs,
    refreshNeteaseLikedIds,
} from "@/renderer/core/auth/neteasePlaylists";
import { fetchQqFeedSongs } from "@/renderer/core/auth/qqPlaylists";

/** Navidrome / 网易云 / QQ：按标签拉取歌曲列表 */
export default function useRecommendSongs(
    plugin: IPlugin.IPluginDelegate,
    tag: IMedia.IUnique | null,
) {
    const [songs, setSongs] = useState<IMusic.IMusicItem[]>([]);
    const [status, setStatus] = useState<RequestStateCode>(RequestStateCode.IDLE);
    const currentTagRef = useRef<string>();
    const pageRef = useRef(0);

    const query = useCallback(async () => {
        if (!tag) {
            return;
        }
        if (
            (RequestStateCode.PENDING_FIRST_PAGE & status ||
                RequestStateCode.FINISHED === status) &&
            currentTagRef.current === tag.id
        ) {
            return;
        }
        if (currentTagRef.current !== tag.id) {
            setSongs([]);
            pageRef.current = 0;
        }
        pageRef.current++;
        currentTagRef.current = tag.id;

        setStatus(
            pageRef.current === 1
                ? RequestStateCode.PENDING_FIRST_PAGE
                : RequestStateCode.PENDING_REST_PAGE,
        );
        try {
            let list: IMusic.IMusicItem[] = [];
            let isEnd = true;

            if (plugin.platform === "网易云") {
                const res = await fetchNeteaseFeedSongs(
                    tag.id,
                    pageRef.current,
                );
                list = (res.musicList || []).map((item) =>
                    resetMediaItem(item, plugin.platform),
                );
                isEnd = res.isEnd !== false;
                // 喜欢的音乐：全部标红心，并刷新服务端喜欢列表缓存
                if (tag.title === "喜欢的音乐" || /喜欢/.test(tag.title || "")) {
                    try {
                        await refreshNeteaseLikedIds();
                    } catch {
                        // ignore
                    }
                    list.forEach((item) => {
                        setLikeState(item.platform, item.id, true);
                    });
                }
            } else if (plugin.platform === "QQ音乐") {
                const res = await fetchQqFeedSongs(tag.id, pageRef.current);
                list = (res.musicList || []).map((item) =>
                    resetMediaItem(item, plugin.platform),
                );
                isEnd = res.isEnd !== false;
                if (/喜欢|我喜欢|红心/.test(tag.title || "")) {
                    list.forEach((item) => {
                        setLikeState(item.platform, item.id, true);
                    });
                }
            } else {
                const res = await PluginManager.callPluginDelegateMethod(
                    plugin,
                    "getTopListDetail",
                    {
                        id: tag.id,
                        title: tag.title,
                        platform: plugin.platform,
                    },
                    pageRef.current,
                );
                list = (res?.musicList || []).map((item: IMusic.IMusicItem) =>
                    resetMediaItem(item, plugin.platform),
                );
                isEnd = res?.isEnd !== false;
                if (tag.id === "喜欢" || tag.title === "喜欢") {
                    list.forEach((item: IMusic.IMusicItem) => {
                        setLikeState(item.platform, item.id, true);
                    });
                }
            }

            if (tag.id === currentTagRef.current) {
                setSongs((prev) => [...prev, ...list]);
            }

            setStatus(
                isEnd
                    ? RequestStateCode.FINISHED
                    : RequestStateCode.PARTLY_DONE,
            );
        } catch {
            setStatus(RequestStateCode.FINISHED);
            if (pageRef.current === 1) {
                setSongs([]);
            }
        }
    }, [tag, status, plugin]);

    useEffect(() => {
        if (tag) {
            query();
        }
    }, [tag]);

    return [query, songs, status] as const;
}
