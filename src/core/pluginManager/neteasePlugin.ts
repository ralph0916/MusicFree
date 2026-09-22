import axios from "axios";
import { neteasePluginPlatform } from "@/constants/commonConst";
import { Plugin } from "./plugin";
import {
    getNeteaseHeaders,
    isNeteaseLoggedIn,
    neteaseWeapiPost,
} from "./neteaseAuth";

const PAGE_SIZE = 30;

function mapSong(song: any): IMusic.IMusicItem {
    const album = song.al || song.album || {};
    const artists = song.ar || song.artists || [];
    const artistName = artists
        .map((a: any) => a?.name)
        .filter(Boolean)
        .join(" / ");
    const publishTime = Number(song.publishTime) || 0;
    return {
        id: String(song.id),
        platform: neteasePluginPlatform,
        title: song.name || "未知歌曲",
        artist: artistName || "未知歌手",
        album: album.name || "未知专辑",
        artwork: album.picUrl || song.album?.picUrl || "",
        duration: Math.floor((song.dt || song.duration || 0) / 1000),
        createAt: publishTime || undefined,
        publishTime: publishTime || undefined,
        date: publishTime ? String(publishTime) : undefined,
    } as IMusic.IMusicItem;
}

function mapSheet(playlist: any): IMusic.IMusicSheetItemBase {
    return {
        id: String(playlist.id),
        platform: neteasePluginPlatform,
        title: playlist.name || "未命名歌单",
        artist: playlist.creator?.nickname || neteasePluginPlatform,
        artwork: playlist.coverImgUrl || playlist.picUrl || "",
        coverImg: playlist.coverImgUrl || playlist.picUrl || "",
        worksNum: playlist.trackCount,
        description: playlist.description || "",
        createAt: playlist.createTime,
    };
}

async function searchSongs(keyword: string, page: number) {
    const offset = Math.max(0, (page - 1) * PAGE_SIZE);
    const { data } = await axios.get("https://music.163.com/api/cloudsearch/pc", {
        params: {
            s: keyword || "热门",
            type: 1,
            limit: PAGE_SIZE,
            offset,
        },
        headers: getNeteaseHeaders(),
        timeout: 15000,
    });
    const list = Array.isArray(data?.result?.songs) ? data.result.songs : [];
    return {
        isEnd: list.length < PAGE_SIZE,
        data: list.map(mapSong),
    };
}

const neteasePluginDefine: IPlugin.IPluginDefine = {
    platform: neteasePluginPlatform,
    version: "1.1.0",
    appVersion: ">0.6.0",
    description:
        "网易云音乐：支持验证码登录、每日推荐、搜索、喜欢（不支持破解 VIP）。",
    author: "private",
    primaryKey: ["id"],
    cacheControl: "no-cache",
    defaultSearchType: "music",
    supportedSearchType: ["music", "sheet"],
    userVariables: [
        {
            key: "hint",
            name: "登录说明",
            hint: "请在「我的」页使用手机号验证码登录网易云",
        },
    ],

    async search(query, page, type) {
        if (type === "sheet") {
            if (!query) {
                return { isEnd: true, data: [] };
            }
            const offset = Math.max(0, (page - 1) * PAGE_SIZE);
            const data = await neteaseWeapiPost(
                "https://music.163.com/weapi/cloudsearch/get/web",
                {
                    s: query,
                    type: 1000,
                    limit: PAGE_SIZE,
                    offset,
                    total: true,
                },
            );
            const list = data?.result?.playlists || [];
            return {
                isEnd: list.length < PAGE_SIZE,
                data: list.map(mapSheet),
            };
        }
        if (type !== "music") {
            return { isEnd: true, data: [] };
        }
        return searchSongs(query, page);
    },

    async getMediaSource(musicItem, quality) {
        const brMap: Record<IMusic.IQualityKey, number> = {
            low: 128000,
            standard: 192000,
            high: 320000,
            super: 320000,
        };
        const data = await neteaseWeapiPost(
            "https://music.163.com/weapi/song/enhance/player/url/v1",
            {
                ids: [musicItem.id],
                level:
                    quality === "low"
                        ? "standard"
                        : quality === "super"
                            ? "exhigh"
                            : "higher",
                encodeType: "mp3",
            },
        );
        let url = data?.data?.[0]?.url;
        if (!url) {
            const fallback = await axios.get(
                "https://interface.music.163.com/api/song/enhance/player/url",
                {
                    params: {
                        id: musicItem.id,
                        ids: `[${musicItem.id}]`,
                        br: brMap[quality] ?? 192000,
                    },
                    headers: getNeteaseHeaders(),
                    timeout: 15000,
                },
            );
            url = fallback.data?.data?.[0]?.url;
        }
        if (!url) {
            throw new Error("无法获取播放地址（可能是 VIP/无版权歌曲）");
        }
        return { url, quality };
    },

    async getLyric(musicItem) {
        try {
            const { data } = await axios.get(
                "https://music.163.com/api/song/lyric",
                {
                    params: { id: musicItem.id, lv: -1, kv: -1, tv: -1 },
                    headers: getNeteaseHeaders(),
                    timeout: 10000,
                },
            );
            if (data?.lrc?.lyric) {
                return { rawLrc: data.lrc.lyric };
            }
        } catch {
            // ignore
        }
        return null;
    },

    async getTopLists() {
        const lists = [
            {
                id: "3778678",
                title: "热歌榜",
                description: "网易云热歌榜单曲",
                coverImg: "",
            },
            {
                id: "19723756",
                title: "飙升榜",
                description: "网易云飙升榜单曲",
                coverImg: "",
            },
            {
                id: "3779629",
                title: "新歌榜",
                description: "网易云新歌榜单曲",
                coverImg: "",
            },
        ];
        if (isNeteaseLoggedIn()) {
            lists.unshift({
                id: "daily",
                title: "每日推荐",
                description: "根据口味推荐的单曲",
                coverImg: "",
            });
            lists.push({
                id: "likelist",
                title: "我喜欢的音乐",
                description: "红心收藏单曲",
                coverImg: "",
            });
        }
        return [{ title: "单曲", data: lists }];
    },

    async getTopListDetail(topListItem, page) {
        const id = String(topListItem.id);
        if (id === "daily") {
            if (!isNeteaseLoggedIn()) {
                throw new Error("请先登录网易云账号");
            }
            if (page > 1) {
                return { isEnd: true, musicList: [] };
            }
            const data = await neteaseWeapiPost(
                "https://music.163.com/weapi/v3/discovery/recommend/songs",
                { limit: 100, offset: 0 },
            );
            const tracks = data?.data?.dailySongs || data?.recommend || [];
            return {
                isEnd: true,
                musicList: tracks.map(mapSong),
            };
        }

        if (id === "likelist") {
            if (!isNeteaseLoggedIn()) {
                throw new Error("请先登录网易云账号");
            }
            if (page > 1) {
                return { isEnd: true, musicList: [] };
            }
            const profile = (await import("./neteaseAuth")).getNeteaseAuth()
                ?.profile;
            const uid = profile?.userId;
            if (!uid) {
                throw new Error("无法获取用户信息，请重新登录");
            }
            const likeData = await neteaseWeapiPost(
                "https://music.163.com/weapi/song/like/get",
                { uid },
            );
            const ids: string[] = (likeData?.ids || []).map(String);
            if (!ids.length) {
                return { isEnd: true, musicList: [] };
            }
            const detail = await neteaseWeapiPost(
                "https://music.163.com/weapi/v3/song/detail",
                {
                    c: JSON.stringify(ids.slice(0, 200).map(i => ({ id: i }))),
                    ids: JSON.stringify(ids.slice(0, 200)),
                },
            );
            return {
                isEnd: true,
                musicList: (detail?.songs || []).map(mapSong),
            };
        }

        if (page > 1) {
            return { isEnd: true, musicList: [] };
        }
        const { data } = await axios.get(
            "https://music.163.com/api/playlist/detail",
            {
                params: { id },
                headers: getNeteaseHeaders(),
                timeout: 15000,
            },
        );
        const tracks = data?.playlist?.tracks || [];
        return {
            isEnd: true,
            musicList: tracks.map(mapSong),
            topListItem: {
                ...topListItem,
                title: data?.playlist?.name || topListItem.title,
                coverImg: data?.playlist?.coverImgUrl || "",
            },
        };
    },

    async getRecommendSheetTags() {
        return {
            pinned: [
                {
                    id: "mine",
                    title: "我的歌单",
                    platform: neteasePluginPlatform,
                },
            ],
            data: [],
        };
    },

    async getRecommendSheetsByTag(tag, page = 1) {
        if (page > 1) {
            return { isEnd: true, data: [] };
        }
        const list = await getNeteaseUserPlaylists();
        return {
            isEnd: true,
            data: list,
        };
    },

    async getMusicSheetInfo(sheetItem, page) {
        if (page > 1) {
            return { isEnd: true, musicList: [] };
        }
        const data = await neteaseWeapiPost(
            "https://music.163.com/weapi/v3/playlist/detail",
            {
                id: sheetItem.id,
                n: 500,
                s: 8,
            },
        );
        const playlist = data?.playlist || {};
        const tracks = playlist.tracks || [];
        return {
            isEnd: true,
            sheetItem: mapSheet(playlist),
            musicList: tracks.map(mapSong),
        };
    },
};

let likedIdCache: { ids: Set<string>; at: number } | null = null;

export async function likeNeteaseSong(musicId: string, like = true) {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const data = await neteaseWeapiPost(
        "https://music.163.com/weapi/song/like",
        {
            alg: "itembased",
            trackId: musicId,
            like,
            time: 3,
        },
    );
    if (data?.code !== 200) {
        throw new Error(data?.message || "操作失败");
    }
    if (likedIdCache) {
        if (like) {
            likedIdCache.ids.add(String(musicId));
        } else {
            likedIdCache.ids.delete(String(musicId));
        }
        likedIdCache.at = Date.now();
    }
    return true;
}

export async function getNeteaseLikedIds(force = false) {
    if (!isNeteaseLoggedIn()) {
        return new Set<string>();
    }
    if (
        !force &&
        likedIdCache &&
        Date.now() - likedIdCache.at < 60_000
    ) {
        return likedIdCache.ids;
    }
    const { getNeteaseAuth } = await import("./neteaseAuth");
    const uid = getNeteaseAuth()?.profile?.userId;
    if (!uid) {
        return new Set<string>();
    }
    const likeData = await neteaseWeapiPost(
        "https://music.163.com/weapi/song/like/get",
        { uid },
    );
    const ids = new Set<string>((likeData?.ids || []).map(String));
    likedIdCache = { ids, at: Date.now() };
    return ids;
}

export async function isNeteaseSongLiked(musicId: string) {
    const ids = await getNeteaseLikedIds();
    return ids.has(String(musicId));
}

export async function getNeteaseUserPlaylists() {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const { getNeteaseAuth } = await import("./neteaseAuth");
    const uid = getNeteaseAuth()?.profile?.userId;
    if (!uid) {
        throw new Error("无法获取用户信息，请重新登录");
    }
    const data = await neteaseWeapiPost(
        "https://music.163.com/weapi/user/playlist",
        {
            uid,
            limit: 1000,
            offset: 0,
            includeVideo: true,
        },
    );
    const list = (data?.playlist || []).filter((item: any) => {
        // 仅当前账号创建的歌单（排除收藏的他人歌单）
        return String(item?.creator?.userId) === String(uid);
    });
    return list.map(mapSheet);
}

export async function createNeteasePlaylist(name: string) {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const data = await neteaseWeapiPost(
        "https://music.163.com/weapi/playlist/create",
        {
            name: name.trim(),
            privacy: 0,
        },
    );
    if (data?.code !== 200) {
        throw new Error(data?.message || "创建歌单失败");
    }
    return mapSheet(data.playlist || { id: data.id, name });
}

export async function addSongsToNeteasePlaylist(
    playlistId: string,
    songIds: string[],
) {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const ids = songIds.map(String);
    const data = await neteaseWeapiPost(
        "https://music.163.com/weapi/playlist/manipulate/tracks",
        {
            op: "add",
            pid: playlistId,
            trackIds: JSON.stringify(ids),
            tracks: JSON.stringify(ids),
        },
    );
    // 200 成功；502 表示部分已在歌单中，也视为成功
    if (data?.code !== 200 && data?.code !== 502) {
        throw new Error(data?.message || "加入歌单失败");
    }
    return true;
}

export async function deleteNeteasePlaylist(playlistId: string) {
    if (!isNeteaseLoggedIn()) {
        throw new Error("请先登录网易云账号");
    }
    const data = await neteaseWeapiPost(
        "https://music.163.com/weapi/playlist/delete",
        {
            ids: `[${playlistId}]`,
            pid: playlistId,
        },
    );
    if (data?.code !== 200) {
        throw new Error(data?.message || "删除歌单失败");
    }
    return true;
}

export const neteasePlugin = new Plugin(function () {
    return neteasePluginDefine;
}, "internal-plugin://netease");
