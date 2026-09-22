import axios from "axios";
import { qqPluginPlatform } from "@/constants/commonConst";
import { Plugin } from "./plugin";
import {
    getQqHeaders,
    getQqUin,
    isQqLoggedIn,
} from "./qqAuth";

const PAGE_SIZE = 30;

function mapSong(song: any): IMusic.IMusicItem {
    const album = song.album || {};
    const singers = song.singer || song.singers || [];
    const mid = song.mid || song.songmid;
    const id = String(song.id || song.songid || mid);
    const albumMid = album.mid || song.albummid;
    const artwork = albumMid
        ? `https://y.qq.com/music/photo_new/T002R500x500M000${albumMid}.jpg`
        : "";
    return {
        id,
        platform: qqPluginPlatform,
        title: song.title || song.name || song.songname || "未知歌曲",
        artist:
            (Array.isArray(singers)
                ? singers.map((s: any) => s.name).filter(Boolean).join(" / ")
                : "") || "未知歌手",
        album: album.name || song.albumname || "未知专辑",
        artwork,
        duration: Number(song.interval || song.duration) || 0,
        // 内部播放需要 mid
        // @ts-ignore
        mid,
        albumMid,
        createAt: song.time_public
            ? Date.parse(song.time_public)
            : undefined,
        publishTime: song.time_public
            ? Date.parse(song.time_public)
            : undefined,
        date: song.time_public,
    } as IMusic.IMusicItem;
}

function mapSheet(playlist: any): IMusic.IMusicSheetItemBase {
    const id = String(playlist.dissid || playlist.tid || playlist.id || "");
    const cover =
        playlist.logo ||
        playlist.picurl ||
        playlist.cover ||
        playlist.imgurl ||
        "";
    return {
        id,
        platform: qqPluginPlatform,
        title: playlist.dissname || playlist.title || playlist.name || "未命名歌单",
        artist: playlist.nickname || playlist.creator?.name || qqPluginPlatform,
        artwork: cover,
        coverImg: cover,
        worksNum: playlist.songnum || playlist.song_cnt,
        description: playlist.introduction || playlist.desc || "",
    };
}

async function qqGet(url: string, params: Record<string, any> = {}) {
    const { data } = await axios.get(url, {
        params,
        headers: getQqHeaders(),
        timeout: 15000,
    });
    return data;
}

async function qqMusicu(payload: Record<string, any>) {
    const { data } = await axios.post(
        "https://u.y.qq.com/cgi-bin/musicu.fcg",
        {
            comm: {
                uin: getQqUin(),
                format: "json",
                ct: 24,
                cv: 0,
            },
            ...payload,
        },
        {
            headers: {
                ...getQqHeaders(),
                "Content-Type": "application/json",
            },
            timeout: 15000,
        },
    );
    return data;
}

async function searchSongs(keyword: string, page: number) {
    const data = await qqGet(
        "https://c.y.qq.com/soso/fcgi-bin/client_search_cp",
        {
            ct: 24,
            qqmusic_ver: 1298,
            new_json: 1,
            remoteplace: "txt.yqq.song",
            t: 0,
            aggr: 1,
            cr: 1,
            catZhida: 1,
            lossless: 0,
            flag_qc: 0,
            p: page,
            n: PAGE_SIZE,
            w: keyword || "热门",
            format: "json",
        },
    );
    const list = data?.data?.song?.list || [];
    return {
        isEnd: list.length < PAGE_SIZE,
        data: list.map(mapSong),
    };
}

const qqPluginDefine: IPlugin.IPluginDefine = {
    platform: qqPluginPlatform,
    version: "1.0.0",
    appVersion: ">0.6.0",
    description:
        "QQ 音乐：支持 Cookie 登录、搜索、排行榜、歌单（不支持破解 VIP）。",
    author: "private",
    primaryKey: ["id"],
    cacheControl: "no-cache",
    defaultSearchType: "music",
    supportedSearchType: ["music", "sheet"],
    userVariables: [
        {
            key: "hint",
            name: "登录说明",
            hint: "请在「我的」页粘贴 QQ 音乐网页版 Cookie 登录",
        },
    ],

    async search(query, page, type) {
        if (type === "sheet") {
            if (!query) {
                return { isEnd: true, data: [] };
            }
            const data = await qqGet(
                "https://c.y.qq.com/soso/fcgi-bin/client_music_search_sheet",
                {
                    query,
                    page_no: page - 1,
                    num_per_page: PAGE_SIZE,
                    format: "json",
                },
            );
            const list = data?.data?.list || data?.data?.body?.songlist?.list || [];
            return {
                isEnd: list.length < PAGE_SIZE,
                data: list.map(mapSheet),
            };
        }
        return searchSongs(query, page);
    },

    async getMediaSource(musicItem, quality) {
        const mid = (musicItem as any).mid || musicItem.id;
        const fileMap: Record<IMusic.IQualityKey, { type: string; prefix: string }> = {
            low: { type: "128", prefix: "M500" },
            standard: { type: "128", prefix: "M500" },
            high: { type: "320", prefix: "M800" },
            super: { type: "flac", prefix: "F000" },
        };
        const q = fileMap[quality] || fileMap.standard;
        const filename = `${q.prefix}${mid}.mp3`;
        const data = await qqMusicu({
            req_0: {
                module: "vkey.GetVkeyServer",
                method: "CgiGetVkey",
                param: {
                    filename: [filename],
                    guid: "10000",
                    songmid: [mid],
                    songtype: [0],
                    uin: getQqUin(),
                    loginflag: 1,
                    platform: "20",
                },
            },
        });
        const midurlinfo = data?.req_0?.data?.midurlinfo?.[0];
        const sip = data?.req_0?.data?.sip?.[0] || "https://dl.stream.qqmusic.qq.com/";
        const purl = midurlinfo?.purl;
        if (!purl) {
            throw new Error("无法获取播放地址（可能是 VIP/无版权歌曲）");
        }
        return { url: sip + purl, quality };
    },

    async getLyric(musicItem) {
        try {
            const mid = (musicItem as any).mid || musicItem.id;
            const data = await qqGet(
                "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg",
                {
                    songmid: mid,
                    g_tk: 5381,
                    format: "json",
                    nobase64: 1,
                },
            );
            if (data?.lyric) {
                return { rawLrc: data.lyric };
            }
        } catch {
            // ignore
        }
        return null;
    },

    async getTopLists() {
        const lists: any[] = [
            {
                id: "toplist:26",
                title: "热歌榜",
                description: "QQ 音乐热歌榜",
                coverImg: "",
                platform: qqPluginPlatform,
            },
            {
                id: "toplist:27",
                title: "新歌榜",
                description: "QQ 音乐新歌榜",
                coverImg: "",
                platform: qqPluginPlatform,
            },
            {
                id: "toplist:62",
                title: "飙升榜",
                description: "QQ 音乐飙升榜",
                coverImg: "",
                platform: qqPluginPlatform,
            },
        ];
        if (isQqLoggedIn()) {
            lists.unshift({
                id: "daily",
                title: "每日推荐",
                description: "根据口味推荐的单曲",
                coverImg: "",
                platform: qqPluginPlatform,
            });
        }
        return [{ title: "单曲", data: lists }];
    },

    async getTopListDetail(topListItem, page) {
        const id = String(topListItem.id);
        if (id === "daily") {
            if (!isQqLoggedIn()) {
                throw new Error("请先登录 QQ 音乐账号");
            }
            if (page > 1) {
                return { isEnd: true, musicList: [] };
            }
            const data = await qqMusicu({
                req_0: {
                    module: "music.playlist.PlaylistSquare",
                    method: "GetRecommendFeed",
                    param: {
                        IdealNum: 30,
                    },
                },
            });
            // 退化为热歌榜
            const v_song = data?.req_0?.data?.v_song || [];
            if (v_song.length) {
                return {
                    isEnd: true,
                    musicList: v_song.map(mapSong),
                };
            }
            // 退化为热歌榜
            const fallback = await qqMusicu({
                detail: {
                    module: "musicToplist.ToplistInfoServer",
                    method: "GetDetail",
                    param: {
                        topId: 26,
                        offset: 0,
                        num: 100,
                        period: "",
                    },
                },
            });
            return {
                isEnd: true,
                musicList: (fallback?.detail?.data?.songInfoList || []).map(
                    mapSong,
                ),
            };
        }

        if (id.startsWith("toplist:")) {
            if (page > 1) {
                return { isEnd: true, musicList: [] };
            }
            const topId = id.replace("toplist:", "");
            const data = await qqMusicu({
                detail: {
                    module: "musicToplist.ToplistInfoServer",
                    method: "GetDetail",
                    param: {
                        topId: Number(topId),
                        offset: 0,
                        num: 100,
                        period: "",
                    },
                },
            });
            const list = data?.detail?.data?.songInfoList || [];
            return {
                isEnd: true,
                musicList: list.map(mapSong),
            };
        }

        // 歌单
        if (page > 1) {
            return { isEnd: true, musicList: [] };
        }
        const data = await qqGet(
            "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg",
            {
                type: 1,
                utf8: 1,
                disstid: id,
                format: "json",
            },
        );
        const cdlist = data?.cdlist?.[0];
        const songs = cdlist?.songlist || [];
        return {
            isEnd: true,
            musicList: songs.map(mapSong),
        };
    },

    async getRecommendSheetTags() {
        return {
            pinned: [
                {
                    id: "mine",
                    title: "我的歌单",
                    platform: qqPluginPlatform,
                },
            ],
            data: [],
        };
    },

    async getRecommendSheetsByTag(_tag, page = 1) {
        if (page > 1) {
            return { isEnd: true, data: [] };
        }
        const list = await getQqUserPlaylists();
        return { isEnd: true, data: list };
    },

    async getMusicSheetInfo(sheetItem, page) {
        if (page > 1) {
            return { isEnd: true, musicList: [] };
        }
        const data = await qqGet(
            "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg",
            {
                type: 1,
                utf8: 1,
                disstid: sheetItem.id,
                format: "json",
            },
        );
        const cdlist = data?.cdlist?.[0] || {};
        return {
            isEnd: true,
            sheetItem: mapSheet(cdlist),
            musicList: (cdlist.songlist || []).map(mapSong),
        };
    },
};

let likedIdCache: { ids: Set<string>; at: number } | null = null;

export async function getQqUserPlaylists() {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐账号");
    }
    const uin = getQqUin();
    const data = await qqMusicu({
        req_0: {
            module: "music.playlist.PlaylistPortal",
            method: "GetProfileFeed",
            param: {
                hostuin: Number(uin),
                page: 0,
            },
        },
    });
    const list =
        data?.req_0?.data?.vdiss?.list ||
        data?.req_0?.data?.playlist ||
        [];
    return list.map(mapSheet);
}

export async function likeQqSong(musicId: string, like = true) {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐账号");
    }
    // QQ 红心接口不稳定，先本地缓存；登录后尽量调用
    try {
        await qqMusicu({
            req_0: {
                module: "music.musicasset.SongFavWrite",
                method: like ? "FavSong" : "CancelFavSong",
                param: {
                    v_song: [{ songid: Number(musicId) || 0 }],
                },
            },
        });
    } catch {
        // ignore network shape differences
    }
    if (!likedIdCache) {
        likedIdCache = { ids: new Set(), at: Date.now() };
    }
    if (like) {
        likedIdCache.ids.add(String(musicId));
    } else {
        likedIdCache.ids.delete(String(musicId));
    }
    likedIdCache.at = Date.now();
    return true;
}

export async function isQqSongLiked(musicId: string) {
    if (!likedIdCache) {
        return false;
    }
    return likedIdCache.ids.has(String(musicId));
}

export async function createQqPlaylist(name: string) {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐账号");
    }
    const data = await qqMusicu({
        req_0: {
            module: "music.musicasset.PlaylistDetailWrite",
            method: "CreatePlaylist",
            param: {
                dirName: name.trim(),
            },
        },
    });
    if (data?.req_0?.code !== 0) {
        throw new Error(data?.req_0?.msg || "创建歌单失败（需有效 Cookie）");
    }
    return mapSheet({
        dissid: data?.req_0?.data?.dirId,
        dissname: name.trim(),
    });
}

export async function deleteQqPlaylist(playlistId: string) {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐账号");
    }
    const data = await qqMusicu({
        req_0: {
            module: "music.musicasset.PlaylistDetailWrite",
            method: "DeletePlaylist",
            param: {
                dirId: Number(playlistId),
            },
        },
    });
    if (data?.req_0?.code !== 0) {
        throw new Error(data?.req_0?.msg || "删除歌单失败");
    }
    return true;
}

export const qqPlugin = new Plugin(function () {
    return qqPluginDefine;
}, "internal-plugin://qq");
