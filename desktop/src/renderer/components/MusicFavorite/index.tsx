import SvgAsset from "../SvgAsset";
import MusicSheet from "@/renderer/core/music-sheet";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
    getLikeState,
    setLikeState,
    useLikeState,
} from "@/renderer/core/like/likeManager";
import {
    isNavidromeLiked,
    toggleNavidromeLike,
} from "@/renderer/core/like/navidromeLike";
import {
    getNeteaseHeaders,
    isNeteaseLoggedIn,
    weapiEncrypt,
} from "@/renderer/core/auth/neteaseAuth";
import { getQqAuth, isQqLoggedIn } from "@/renderer/core/auth/qqAuth";
import { appUtil } from "@shared/utils/renderer";
import { isNeteaseSongLikedRemote, markNeteaseLikedLocal } from "@/renderer/core/auth/neteasePlaylists";

interface IMusicFavoriteProps {
    musicItem: IMusic.IMusicItem;
    size: number;
}

const NAVIDROME = "Navidrome";
const NETEASE = "网易云";
const QQ = "QQ音乐";

async function isNeteaseLiked(id: string) {
    if (!isNeteaseLoggedIn()) {
        return false;
    }
    // 与移动端一致：以 song/like/get 结果为准，不因本地缓存误判
    try {
        return await isNeteaseSongLikedRemote(id);
    } catch {
        return getLikeState(NETEASE, id) ?? false;
    }
}

async function toggleNeteaseLike(id: string, like: boolean) {
    const body = weapiEncrypt({
        alg: "itembased",
        trackId: id,
        like,
        time: 3,
    });
    const result = await appUtil.httpRequest({
        url: "https://music.163.com/weapi/song/like",
        method: "POST",
        headers: {
            ...getNeteaseHeaders(),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams(body as any).toString(),
        timeout: 15000,
    });
    if (result.data?.code !== 200) {
        throw new Error(
            result.data?.message || result.data?.msg || "网易云喜欢操作失败",
        );
    }
    markNeteaseLikedLocal(id, like);
}

async function toggleQqLike(id: string, like: boolean) {
    const auth = getQqAuth();
    if (!auth?.uin) {
        throw new Error("请先登录 QQ 音乐");
    }
    // 本地乐观；接口不稳定
    await appUtil.httpRequest({
        url: "https://u.y.qq.com/cgi-bin/musicu.fcg",
        method: "POST",
        headers: {
            Referer: "https://y.qq.com/",
            Origin: "https://y.qq.com",
            Cookie: auth.cookie,
            "Content-Type": "application/json",
        },
        data: JSON.stringify({
            comm: { uin: auth.uin, format: "json", ct: 24, cv: 0 },
            req_0: {
                module: "music.musicasset.SongFavWrite",
                method: like ? "FavSong" : "CancelFavSong",
                param: { v_song: [{ songid: Number(id) || 0 }] },
            },
        }),
        timeout: 15000,
    });
}

function supportsPlatformLike(platform?: string) {
    return platform === NAVIDROME || platform === NETEASE || platform === QQ;
}

export default function MusicFavorite(props: IMusicFavoriteProps) {
    const { musicItem, size } = props;
    const localFav = MusicSheet.frontend.useMusicIsFavorite(musicItem);
    const shared = useLikeState(musicItem?.platform, musicItem?.id);
    const [liked, setLiked] = useState(false);
    const [busy, setBusy] = useState(false);
    const fetchGen = useRef(0);

    const platformLike = supportsPlatformLike(musicItem?.platform);

    const refresh = useCallback(async () => {
        if (!musicItem) {
            setLiked(false);
            return;
        }
        if (!platformLike) {
            setLiked(!!localFav);
            return;
        }
        const cached = getLikeState(musicItem.platform, musicItem.id);
        if (cached !== undefined) {
            setLiked(cached);
        }
        const gen = ++fetchGen.current;
        try {
            let next = false;
            if (musicItem.platform === NAVIDROME) {
                next = (await isNavidromeLiked(String(musicItem.id))).liked;
            } else if (musicItem.platform === NETEASE && isNeteaseLoggedIn()) {
                next = await isNeteaseLiked(String(musicItem.id));
            } else if (musicItem.platform === QQ && isQqLoggedIn()) {
                next = getLikeState(musicItem.platform, musicItem.id) ?? false;
            }
            if (gen !== fetchGen.current) {
                return;
            }
            const newer = getLikeState(musicItem.platform, musicItem.id);
            if (newer !== undefined && newer !== next) {
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
    }, [musicItem, platformLike, localFav]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (shared !== undefined) {
            setLiked(shared);
        }
    }, [shared]);

    useEffect(() => {
        if (!platformLike) {
            setLiked(!!localFav);
        }
    }, [localFav, platformLike]);

    const onClick = async (e: MouseEvent) => {
        e.stopPropagation();
        if (!musicItem || busy) {
            return;
        }
        if (!platformLike) {
            if (localFav) {
                MusicSheet.frontend.removeMusicFromFavorite(musicItem);
            } else {
                MusicSheet.frontend.addMusicToFavorite(musicItem);
            }
            return;
        }
        setBusy(true);
        fetchGen.current += 1;
        const optimistic = !liked;
        setLiked(optimistic);
        setLikeState(musicItem.platform, musicItem.id, optimistic);
        try {
            if (musicItem.platform === NAVIDROME) {
                const next = await toggleNavidromeLike(
                    String(musicItem.id),
                    optimistic,
                );
                setLiked(next);
                setLikeState(musicItem.platform, musicItem.id, next);
                toast.success(next ? "已添加到喜欢" : "已移出喜欢");
            } else if (musicItem.platform === NETEASE) {
                if (!isNeteaseLoggedIn()) {
                    setLiked(!optimistic);
                    setLikeState(musicItem.platform, musicItem.id, !optimistic);
                    toast.warn("请先登录网易云账号");
                    return;
                }
                await toggleNeteaseLike(String(musicItem.id), optimistic);
                toast.success(optimistic ? "已添加到我喜欢" : "已取消喜欢");
            } else if (musicItem.platform === QQ) {
                if (!isQqLoggedIn()) {
                    setLiked(!optimistic);
                    setLikeState(musicItem.platform, musicItem.id, !optimistic);
                    toast.warn("请先登录 QQ 音乐");
                    return;
                }
                await toggleQqLike(String(musicItem.id), optimistic);
                toast.success(optimistic ? "已添加到我喜欢" : "已取消喜欢");
            }
        } catch (err: any) {
            setLiked(!optimistic);
            setLikeState(musicItem.platform, musicItem.id, !optimistic);
            toast.warn(err?.message || "操作失败");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            role="button"
            onClick={onClick}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
                color: liked ? "#EC4141" : "var(--textColor)",
                width: size,
                height: size,
            }}
        >
            <SvgAsset
                iconName={liked ? "heart" : "heart-outline"}
                size={size}
            ></SvgAsset>
        </div>
    );
}
