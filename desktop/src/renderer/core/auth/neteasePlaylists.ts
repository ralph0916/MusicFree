import { appUtil } from "@shared/utils/renderer";
import {
    getNeteaseAuth,
    getNeteaseHeaders,
    isNeteaseLoggedIn,
    weapiEncrypt,
} from "./neteaseAuth";
import { setLikeState } from "@/renderer/core/like/likeManager";

const PLATFORM = "网易云";

async function weapiPost(url: string, payload: Record<string, any>) {
    const body = weapiEncrypt(payload);
    const result = await appUtil.httpRequest({
        url,
        method: "POST",
        headers: {
            ...getNeteaseHeaders(),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams(body as any).toString(),
        timeout: 20000,
    });
    return result.data;
}

export type NeteaseFeedTag = {
    id: string;
    title: string;
};

/** 顶部标签：每日推荐 / 喜欢的音乐 / 下载 */
export async function fetchNeteaseFeedTags(): Promise<NeteaseFeedTag[]> {
    const tags: NeteaseFeedTag[] = [
        { id: "daily", title: "每日推荐" },
    ];
    if (!isNeteaseLoggedIn()) {
        return tags;
    }
    const uid = getNeteaseAuth()?.profile?.userId;
    if (!uid) {
        return tags;
    }
    try {
        const data = await weapiPost(
            "https://music.163.com/weapi/user/playlist",
            {
                uid,
                limit: 1000,
                offset: 0,
                includeVideo: true,
            },
        );
        const list = (data?.playlist || []).filter(
            (item: any) =>
                String(item?.creator?.userId) === String(uid),
        );
        const liked =
            list.find((item: any) =>
                /喜欢的音乐|我喜欢/.test(String(item.name || "")),
            ) || list[0];
        const download = list.find((item: any) =>
            /^下载$|下载的音乐|我的下载/.test(String(item.name || "")),
        );
        if (liked?.id) {
            tags.push({
                id: String(liked.id),
                title: "喜欢的音乐",
            });
        }
        if (download?.id) {
            tags.push({
                id: String(download.id),
                title: "下载",
            });
        }
    } catch {
        // ignore
    }
    return tags;
}

export async function fetchNeteaseFeedSongs(
    tagId: string,
    page = 1,
): Promise<{ musicList: IMusic.IMusicItem[]; isEnd: boolean }> {
    if (page > 1) {
        return { musicList: [], isEnd: true };
    }
    if (!isNeteaseLoggedIn() && tagId !== "daily") {
        throw new Error("请先登录网易云账号");
    }

    if (tagId === "daily") {
        if (!isNeteaseLoggedIn()) {
            throw new Error("请先登录网易云账号");
        }
        const data = await weapiPost(
            "https://music.163.com/weapi/v3/discovery/recommend/songs",
            { limit: 100, offset: 0 },
        );
        const tracks =
            data?.data?.dailySongs || data?.recommend || [];
        return {
            isEnd: true,
            musicList: tracks.map(mapSong),
        };
    }

    // 歌单详情
    const detail = await weapiPost(
        "https://music.163.com/weapi/v3/playlist/detail",
        { id: tagId, n: 1000, s: 8 },
    );
    const trackIds: any[] =
        detail?.playlist?.trackIds ||
        (detail?.playlist?.tracks || []).map((t: any) => ({ id: t.id })) ||
        [];
    if (!trackIds.length) {
        return { isEnd: true, musicList: [] };
    }
    const ids = trackIds.slice(0, 1000).map((t) => ({ id: t.id }));
    const songsData = await weapiPost(
        "https://music.163.com/weapi/v3/song/detail",
        { c: JSON.stringify(ids), ids: JSON.stringify(ids.map((i) => i.id)) },
    );
    const songs = (songsData?.songs || []).map(mapSong);
    return { isEnd: true, musicList: songs };
}

function mapSong(song: any): IMusic.IMusicItem {
    const album = song.al || song.album || {};
    const artists = song.ar || song.artists || [];
    return {
        id: String(song.id),
        platform: PLATFORM,
        title: song.name || "未知歌曲",
        artist:
            artists
                .map((a: any) => a?.name)
                .filter(Boolean)
                .join(" / ") || "未知歌手",
        album: album.name || "未知专辑",
        artwork: album.picUrl || song.album?.picUrl || "",
        duration: Math.floor(Number(song.dt || song.duration || 0) / 1000),
    };
}

/** 拉取「我喜欢」ID 集合并写入 likeManager */
let likedIdsCache: { ids: Set<string>; at: number } | null = null;

export async function refreshNeteaseLikedIds(
    force = false,
): Promise<Set<string>> {
    if (!isNeteaseLoggedIn()) {
        return new Set();
    }
    if (
        !force &&
        likedIdsCache &&
        Date.now() - likedIdsCache.at < 60_000
    ) {
        likedIdsCache.ids.forEach((id) => setLikeState(PLATFORM, id, true));
        return likedIdsCache.ids;
    }
    const uid = getNeteaseAuth()?.profile?.userId;
    if (!uid) {
        return new Set();
    }
    const likeData = await weapiPost(
        "https://music.163.com/weapi/song/like/get",
        { uid },
    );
    const ids = new Set<string>((likeData?.ids || []).map(String));
    likedIdsCache = { ids, at: Date.now() };
    ids.forEach((id) => setLikeState(PLATFORM, id, true));
    return ids;
}

export async function isNeteaseSongLikedRemote(musicId: string) {
    const ids = await refreshNeteaseLikedIds();
    return ids.has(String(musicId));
}

/** 本地同步喜欢状态（切换后立即生效，避免等下次拉取） */
export function markNeteaseLikedLocal(musicId: string, liked: boolean) {
    const id = String(musicId);
    if (!likedIdsCache) {
        likedIdsCache = { ids: new Set(), at: Date.now() };
    }
    if (liked) {
        likedIdsCache.ids.add(id);
    } else {
        likedIdsCache.ids.delete(id);
    }
    likedIdsCache.at = Date.now();
    setLikeState(PLATFORM, id, liked);
}

function mapUserSheet(playlist: any): IMusic.IMusicSheetItem {
    return {
        id: String(playlist.id),
        platform: PLATFORM,
        title: playlist.name || "未命名歌单",
        artwork: playlist.coverImgUrl || "",
        coverImg: playlist.coverImgUrl || "",
        worksNum: playlist.trackCount,
    };
}

/** 当前账号自建歌单 */
export async function getNeteaseUserPlaylists(): Promise<
    IMusic.IMusicSheetItem[]
> {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const uid = getNeteaseAuth()?.profile?.userId;
    if (!uid) {
        throw new Error("无法获取用户信息，请重新登录");
    }
    const data = await weapiPost(
        "https://music.163.com/weapi/user/playlist",
        {
            uid,
            limit: 1000,
            offset: 0,
            includeVideo: true,
        },
    );
    const list = (data?.playlist || []).filter(
        (item: any) => String(item?.creator?.userId) === String(uid),
    );
    return list.map(mapUserSheet);
}

export async function getNeteasePlaylistIdsContainingSongs(
    songIds: string[],
) {
    if (!songIds.length || !isNeteaseLoggedIn()) {
        return new Set<string>();
    }
    const playlists = await getNeteaseUserPlaylists();
    const target = songIds.map(String);
    const containing = new Set<string>();
    for (const pl of playlists) {
        try {
            const data = await weapiPost(
                "https://music.163.com/weapi/v3/playlist/detail",
                { id: pl.id, n: 1000, s: 8 },
            );
            const playlist = data?.playlist || {};
            const idSet = new Set<string>(
                (playlist.trackIds || [])
                    .map((t: any) => String(t.id || t))
                    .filter(Boolean),
            );
            if (!idSet.size) {
                (playlist.tracks || []).forEach((t: any) =>
                    idSet.add(String(t.id)),
                );
            }
            if (target.every((id) => idSet.has(id))) {
                containing.add(String(pl.id));
            }
        } catch {
            // ignore
        }
    }
    return containing;
}

export async function addSongsToNeteasePlaylist(
    playlistId: string,
    songIds: string[],
) {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const ids = songIds.map(String);
    const data = await weapiPost(
        "https://music.163.com/weapi/playlist/manipulate/tracks",
        {
            op: "add",
            pid: playlistId,
            trackIds: JSON.stringify(ids),
            tracks: JSON.stringify(ids),
        },
    );
    if (data?.code !== 200 && data?.code !== 502) {
        throw new Error(data?.message || "加入歌单失败");
    }
    return true;
}

export async function removeSongsFromNeteasePlaylist(
    playlistId: string,
    songIds: string[],
) {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const ids = songIds.map(String);
    const data = await weapiPost(
        "https://music.163.com/weapi/playlist/manipulate/tracks",
        {
            op: "del",
            pid: playlistId,
            trackIds: JSON.stringify(ids),
            tracks: JSON.stringify(ids),
        },
    );
    if (data?.code !== 200 && data?.code !== 502) {
        throw new Error(data?.message || "移出歌单失败");
    }
    return true;
}
