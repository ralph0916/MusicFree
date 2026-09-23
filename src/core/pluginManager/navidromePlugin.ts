import axios from "axios";
import CryptoJs from "crypto-js";
import {
    navidromePluginHash,
    navidromePluginPlatform,
} from "@/constants/commonConst";
import { Plugin } from "./plugin";
import pluginMeta from "./meta";

const PAGE_SIZE = 30;
const CLIENT_NAME = "MusicFree";
const API_VERSION = "1.16.1";

type SubsonicAuth = {
    u: string;
    t: string;
    s: string;
    v: string;
    c: string;
    f: "json";
};

function getUserConfig() {
    const vars = pluginMeta.getUserVariables(navidromePluginPlatform) ?? {};
    let url = (vars.url ?? "").trim().replace(/\/+$/, "");
    if (url && !/^https?:\/\//i.test(url)) {
        url = `http://${url}`;
    }
    return {
        url,
        username: (vars.username ?? "").trim(),
        password: (vars.password ?? "").trim(),
    };
}

function ensureConfig() {
    const config = getUserConfig();
    if (!config.url) {
        throw new Error("请先在插件设置中填写 Navidrome 服务器地址");
    }
    if (!config.username || !config.password) {
        throw new Error("请先在插件设置中填写 Navidrome 用户名和密码");
    }
    return config;
}

function createAuth(username: string, password: string): SubsonicAuth {
    const salt = Math.random().toString(36).slice(2, 14);
    const token = CryptoJs.MD5(password + salt).toString(CryptoJs.enc.Hex);
    return {
        u: username,
        t: token,
        s: salt,
        v: API_VERSION,
        c: CLIENT_NAME,
        f: "json",
    };
}

function buildUrl(
    baseUrl: string,
    endpoint: string,
    auth: SubsonicAuth,
    params: Record<string, string | number | boolean | undefined> = {},
    options?: { omitJsonFormat?: boolean },
) {
    const search = new URLSearchParams();
    const authParams: Record<string, string> = {
        u: auth.u,
        t: auth.t,
        s: auth.s,
        v: auth.v,
        c: auth.c,
    };
    // stream/download 是二进制流，不要带 f=json，否则部分环境下播放器首请求会失败
    if (!options?.omitJsonFormat) {
        authParams.f = auth.f;
    }
    Object.entries({ ...authParams, ...params }).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }
        search.set(key, String(value));
    });
    const path = endpoint.endsWith(".view") ? endpoint : `${endpoint}.view`;
    return `${baseUrl}/rest/${path}?${search.toString()}`;
}

async function request(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
) {
    const config = ensureConfig();
    const auth = createAuth(config.username, config.password);
    const url = buildUrl(config.url, endpoint, auth, params);

    const response = await axios.get(url, {
        timeout: 30000,
    });
    const data = response?.data?.["subsonic-response"];
    if (!data) {
        throw new Error("Navidrome 返回数据异常");
    }
    if (data.status !== "ok") {
        throw new Error(data.error?.message || "Navidrome 请求失败");
    }
    return { data, auth, baseUrl: config.url };
}

function coverArtUrl(
    baseUrl: string,
    auth: SubsonicAuth,
    coverArt?: string | number,
    size = 400,
) {
    if (!coverArt) {
        return "";
    }
    return buildUrl(baseUrl, "getCoverArt", auth, {
        id: coverArt,
        size,
    });
}

function mapSong(song: any, baseUrl: string, auth: SubsonicAuth): IMusic.IMusicItem {
    const created = song.created ? Date.parse(song.created) : 0;
    const year = Number(song.year) || 0;
    return {
        id: String(song.id),
        platform: navidromePluginPlatform,
        title: song.title || "未知歌曲",
        artist: song.artist || song.displayArtist || "未知歌手",
        album: song.album || "未知专辑",
        artwork: coverArtUrl(baseUrl, auth, song.coverArt),
        duration: Number(song.duration) || 0,
        albumId: song.albumId ? String(song.albumId) : undefined,
        artistId: song.artistId ? String(song.artistId) : undefined,
        createAt: created || undefined,
        date: year ? String(year) : song.created,
        publishTime: year ? Date.UTC(year, 0, 1) : undefined,
    } as IMusic.IMusicItem;
}

function mapAlbum(album: any, baseUrl: string, auth: SubsonicAuth): IAlbum.IAlbumItemBase {
    return {
        id: String(album.id),
        platform: navidromePluginPlatform,
        title: album.name || album.title || "未知专辑",
        artist: album.artist || "未知歌手",
        artwork: coverArtUrl(baseUrl, auth, album.coverArt),
        description: album.year ? String(album.year) : "",
        worksNum: album.songCount,
    };
}

function mapArtist(artist: any, baseUrl: string, auth: SubsonicAuth): IArtist.IArtistItemBase {
    return {
        id: String(artist.id),
        platform: navidromePluginPlatform,
        name: artist.name || "未知歌手",
        avatar: coverArtUrl(baseUrl, auth, artist.coverArt || artist.id) || "",
        worksNum: artist.albumCount ?? 0,
        description: artist.albumCount
            ? `${artist.albumCount} 张专辑`
            : "",
    };
}

function mapAlbumAsSheet(
    album: any,
    baseUrl: string,
    auth: SubsonicAuth,
): IMusic.IMusicSheetItemBase {
    return {
        id: `album:${album.id}`,
        platform: navidromePluginPlatform,
        title: album.name || album.title || "未知专辑",
        artist: album.artist || "未知歌手",
        artwork: coverArtUrl(baseUrl, auth, album.coverArt),
        coverImg: coverArtUrl(baseUrl, auth, album.coverArt),
        worksNum: album.songCount,
        description: album.year ? String(album.year) : "",
    };
}

function mapPlaylist(playlist: any, baseUrl: string, auth: SubsonicAuth): IMusic.IMusicSheetItemBase {
    return {
        id: String(playlist.id),
        platform: navidromePluginPlatform,
        title: playlist.name || "未命名歌单",
        artist: playlist.owner || navidromePluginPlatform,
        artwork: coverArtUrl(baseUrl, auth, playlist.coverArt),
        worksNum: playlist.songCount,
        description: playlist.comment,
        createAt: playlist.created,
        playCount: playlist.playCount,
    };
}

const artistTrackCache = new Map<string, IMusic.IMusicItem[]>();

function paginateOffset(page: number) {
    return Math.max(0, (page - 1) * PAGE_SIZE);
}

async function listAllPlaylists() {
    const { data, auth, baseUrl } = await request("getPlaylists");
    const playlists = data.playlists?.playlist ?? [];
    return {
        playlists,
        auth,
        baseUrl,
    };
}

async function findOrCreatePlaylistByName(name: string) {
    const { playlists } = await listAllPlaylists();
    let found = playlists.find((item: any) => String(item.name) === name);
    if (!found) {
        await request("createPlaylist", { name });
        const again = await listAllPlaylists();
        found = again.playlists.find((item: any) => String(item.name) === name);
    }
    if (!found) {
        throw new Error(`无法创建歌单「${name}」`);
    }
    return found;
}

export async function getNavidromePlaylists() {
    const { playlists, auth, baseUrl } = await listAllPlaylists();
    return playlists.map((item: any) => mapPlaylist(item, baseUrl, auth));
}

export async function createNavidromePlaylist(name: string) {
    await request("createPlaylist", { name: name.trim() });
    return findOrCreatePlaylistByName(name.trim());
}

export async function deleteNavidromePlaylist(playlistId: string) {
    await request("deletePlaylist", { id: playlistId });
}

export async function isSongInNavidromePlaylist(
    playlistName: string,
    songId: string,
) {
    const playlist = await findOrCreatePlaylistByName(playlistName);
    const { data } = await request("getPlaylist", { id: playlist.id });
    const entries = data.playlist?.entry ?? [];
    return {
        playlistId: String(playlist.id),
        liked: entries.some((item: any) => String(item.id) === String(songId)),
        entries,
    };
}

export async function getNavidromePlaylistIdsContainingSongs(
    songIds: string[],
) {
    if (!songIds.length) {
        return new Set<string>();
    }
    const playlists = await getNavidromePlaylists();
    const target = songIds.map(String);
    const containing = new Set<string>();
    for (const pl of playlists) {
        if (pl.title === "全部" || pl.id === "全部") {
            continue;
        }
        try {
            const { data } = await request("getPlaylist", { id: pl.id });
            const entries = data.playlist?.entry ?? [];
            const idSet = new Set(entries.map((e: any) => String(e.id)));
            if (target.every(id => idSet.has(id))) {
                containing.add(String(pl.id));
            }
        } catch {
            // ignore
        }
    }
    return containing;
}

export async function addSongsToNavidromePlaylist(
    playlistId: string,
    songIds: string[],
) {
    for (const songId of songIds) {
        await request("updatePlaylist", {
            playlistId,
            songIdToAdd: songId,
        });
    }
}

export async function removeSongsFromNavidromePlaylist(
    playlistId: string,
    songIds: string[],
) {
    const target = new Set(songIds.map(String));
    if (!target.size) {
        return;
    }
    const { data } = await request("getPlaylist", { id: playlistId });
    const entries: any[] = data.playlist?.entry ?? [];
    for (let i = entries.length - 1; i >= 0; i--) {
        if (target.has(String(entries[i]?.id))) {
            await request("updatePlaylist", {
                playlistId,
                songIndexToRemove: i,
            });
        }
    }
}

export async function toggleSongInNavidromePlaylist(
    playlistName: string,
    songId: string,
    like?: boolean,
) {
    const state = await isSongInNavidromePlaylist(playlistName, songId);
    const shouldLike = like ?? !state.liked;
    if (shouldLike && !state.liked) {
        await request("updatePlaylist", {
            playlistId: state.playlistId,
            songIdToAdd: songId,
        });
        return true;
    }
    if (!shouldLike && state.liked) {
        const index = state.entries.findIndex(
            (item: any) => String(item.id) === String(songId),
        );
        if (index >= 0) {
            await request("updatePlaylist", {
                playlistId: state.playlistId,
                songIndexToRemove: index,
            });
        }
        return false;
    }
    return state.liked;
}

const navidromePluginDefine: IPlugin.IPluginDefine = {
    platform: navidromePluginPlatform,
    version: "1.0.0",
    appVersion: ">0.6.0",
    description:
        "连接自建 Navidrome / Subsonic 兼容服务器，播放 NAS 本地音乐库。请在「用户变量」中填写服务器地址、用户名和密码。",
    author: "private",
    primaryKey: ["id"],
    cacheControl: "no-store",
    defaultSearchType: "music",
    supportedSearchType: ["music", "album", "artist", "sheet"],
    userVariables: [
        {
            key: "url",
            name: "服务器地址",
            hint: "例如 http://192.168.1.10:4533",
        },
        {
            key: "username",
            name: "用户名",
            hint: "Navidrome 登录用户名",
        },
        {
            key: "password",
            name: "密码",
            hint: "Navidrome 登录密码",
        },
    ],
    hints: {
        importMusicSheet: [
            "支持导入 Navidrome 歌单链接，或直接填写歌单 ID",
        ],
    },

    async search(query, page, type) {
        const offset = paginateOffset(page);
        const common = {
            query: query || "",
            songCount: type === "music" ? PAGE_SIZE : 0,
            albumCount: type === "album" ? PAGE_SIZE : 0,
            artistCount: type === "artist" ? PAGE_SIZE : 0,
            songOffset: type === "music" ? offset : 0,
            albumOffset: type === "album" ? offset : 0,
            artistOffset: type === "artist" ? offset : 0,
        };

        if (type === "sheet") {
            const { data, auth, baseUrl } = await request("getPlaylists");
            const playlists = data.playlists?.playlist ?? [];
            const keyword = (query || "").trim().toLowerCase();
            const filtered = keyword
                ? playlists.filter((item: any) =>
                    String(item.name || "")
                        .toLowerCase()
                        .includes(keyword),
                )
                : playlists;
            const start = offset;
            const slice = filtered.slice(start, start + PAGE_SIZE);
            return {
                isEnd: start + slice.length >= filtered.length,
                data: slice.map((item: any) => mapPlaylist(item, baseUrl, auth)),
            };
        }

        const { data, auth, baseUrl } = await request("search3", common);
        const result = data.searchResult3 ?? {};

        if (type === "music") {
            const songs = result.song ?? [];
            return {
                isEnd: songs.length < PAGE_SIZE,
                data: songs.map((item: any) => mapSong(item, baseUrl, auth)),
            };
        }
        if (type === "album") {
            const albums = result.album ?? [];
            return {
                isEnd: albums.length < PAGE_SIZE,
                data: albums.map((item: any) => mapAlbum(item, baseUrl, auth)),
            };
        }
        if (type === "artist") {
            const artists = result.artist ?? [];
            return {
                isEnd: artists.length < PAGE_SIZE,
                data: artists.map((item: any) =>
                    mapArtist(item, baseUrl, auth),
                ),
            };
        }
        return {
            isEnd: true,
            data: [],
        };
    },

    async getMediaSource(musicItem, quality) {
        const config = ensureConfig();
        // 每次播放都生成新的 salt/token，避免复用失效链接
        const auth = createAuth(config.username, config.password);
        const maxBitRateMap: Record<IMusic.IQualityKey, number> = {
            low: 128,
            standard: 256,
            high: 320,
            super: 0,
        };
        const maxBitRate = maxBitRateMap[quality] ?? 0;
        // 始终带 estimateContentLength，便于播放器拿到真实时长从而支持拖动进度
        const url = buildUrl(
            config.url,
            "stream",
            auth,
            {
                id: musicItem.id,
                maxBitRate,
                estimateContentLength: true,
                _: Date.now(),
            },
            { omitJsonFormat: true },
        );
        return {
            url,
            quality,
            // 把元数据时长一并交给播放器
            // @ts-ignore
            duration: Number(musicItem.duration) || undefined,
            headers: {
                "User-Agent": "RalphMusic",
                Accept: "*/*",
                "Cache-Control": "no-store",
            },
        };
    },

    async getLyric(musicItem) {
        try {
            const { data } = await request("getLyricsBySongId", {
                id: musicItem.id,
            });
            const structured =
                data.lyricsList?.structuredLyrics?.[0] ||
                data.lyricsList?.structuredLyrics;
            if (structured?.line?.length) {
                const rawLrc = structured.line
                    .map((line: any) => {
                        const start = Number(line.start) || 0;
                        const minutes = Math.floor(start / 60000);
                        const seconds = Math.floor((start % 60000) / 1000);
                        const ms = Math.floor(start % 1000);
                        const time = `${String(minutes).padStart(2, "0")}:${String(
                            seconds,
                        ).padStart(2, "0")}.${String(ms)
                            .padStart(3, "0")
                            .slice(0, 2)}`;
                        return `[${time}]${line.value ?? ""}`;
                    })
                    .join("\n");
                return { rawLrc };
            }

            const { data: plain } = await request("getLyrics", {
                artist: musicItem.artist,
                title: musicItem.title,
            });
            const value = plain.lyrics?.value;
            if (value) {
                return { rawLrc: value };
            }
        } catch {
            // ignore lyric errors
        }
        return null;
    },

    async getAlbumInfo(albumItem, page) {
        if (page > 1) {
            return {
                isEnd: true,
                musicList: [],
            };
        }
        const { data, auth, baseUrl } = await request("getAlbum", {
            id: albumItem.id,
        });
        const album = data.album ?? {};
        const songs = album.song ?? [];
        return {
            isEnd: true,
            albumItem: mapAlbum(album, baseUrl, auth),
            musicList: songs.map((item: any) => mapSong(item, baseUrl, auth)),
        };
    },

    async getMusicSheetInfo(sheetItem, page) {
        const sheetId = String(sheetItem.id);

        if (sheetId.startsWith("album:")) {
            const albumId = sheetId.slice("album:".length);
            if (page > 1) {
                return {
                    isEnd: true,
                    musicList: [],
                };
            }
            const { data, auth, baseUrl } = await request("getAlbum", {
                id: albumId,
            });
            const album = data.album ?? {};
            const songs = album.song ?? [];
            return {
                isEnd: true,
                sheetItem: mapAlbumAsSheet(album, baseUrl, auth),
                musicList: songs.map((item: any) =>
                    mapSong(item, baseUrl, auth),
                ),
            };
        }

        const { data, auth, baseUrl } = await request("getPlaylist", {
            id: sheetId,
        });
        const playlist = data.playlist ?? {};
        const entries = playlist.entry ?? [];
        const start = paginateOffset(page);
        const slice = entries.slice(start, start + PAGE_SIZE);
        return {
            isEnd: start + slice.length >= entries.length,
            sheetItem: mapPlaylist(playlist, baseUrl, auth),
            musicList: slice.map((item: any) => mapSong(item, baseUrl, auth)),
        };
    },

    async getArtistWorks(artistItem, page, type) {
        const { data, auth, baseUrl } = await request("getArtist", {
            id: artistItem.id,
        });
        const artist = data.artist ?? {};
        const albums = artist.album ?? [];

        if (type === "album") {
            const start = paginateOffset(page);
            const slice = albums.slice(start, start + PAGE_SIZE);
            return {
                isEnd: start + slice.length >= albums.length,
                data: slice.map((item: any) => mapAlbum(item, baseUrl, auth)),
            };
        }

        // music: flatten album tracks with pagination
        const cacheKey = String(artistItem.id);
        let allTracks = artistTrackCache.get(cacheKey);
        if (!allTracks) {
            allTracks = [];
            for (const album of albums) {
                const albumResp = await request("getAlbum", { id: album.id });
                const songs = albumResp.data.album?.song ?? [];
                songs.forEach((song: any) => {
                    allTracks!.push(
                        mapSong(song, albumResp.baseUrl, albumResp.auth),
                    );
                });
            }
            artistTrackCache.set(cacheKey, allTracks);
        }
        const start = paginateOffset(page);
        const slice = allTracks.slice(start, start + PAGE_SIZE);
        return {
            isEnd: start + slice.length >= allTracks.length,
            data: slice,
        };
    },

    async getRecommendSheetTags() {
        return {
            pinned: [
                { id: "喜欢", title: "喜欢", platform: navidromePluginPlatform },
                { id: "全部", title: "全部", platform: navidromePluginPlatform },
                { id: "收藏", title: "收藏", platform: navidromePluginPlatform },
                { id: "车载", title: "车载", platform: navidromePluginPlatform },
                { id: "听腻了", title: "听腻了", platform: navidromePluginPlatform },
            ],
            data: [],
        };
    },

    async getRecommendSheetsByTag() {
        return { isEnd: true, data: [] };
    },

    async getTopLists() {
        return [
            {
                title: "歌单",
                data: [
                    { id: "喜欢", title: "喜欢", description: "喜欢歌单", coverImg: "" },
                    { id: "全部", title: "全部", description: "全部单曲", coverImg: "" },
                    { id: "收藏", title: "收藏", description: "收藏歌单", coverImg: "" },
                    { id: "车载", title: "车载", description: "车载歌单", coverImg: "" },
                    { id: "听腻了", title: "听腻了", description: "听腻了歌单", coverImg: "" },
                ],
            },
        ];
    },

    async getTopListDetail(topListItem, page) {
        const id = String(topListItem.id);

        if (id === "全部" || id === "songs-all" || id === "songs-recent") {
            const { data, auth, baseUrl } = await request("search3", {
                query: "",
                songCount: PAGE_SIZE,
                albumCount: 0,
                artistCount: 0,
                songOffset: paginateOffset(page),
            });
            const songs = data.searchResult3?.song ?? [];
            return {
                isEnd: songs.length < PAGE_SIZE,
                musicList: songs.map((item: any) =>
                    mapSong(item, baseUrl, auth),
                ),
            };
        }

        // 按歌单名称加载：喜欢 / 收藏 / 车载 / 听腻了 等
        if (
            id === "喜欢" ||
            id === "收藏" ||
            id === "车载" ||
            id === "听腻了" ||
            id.startsWith("playlist:")
        ) {
            const name = id.startsWith("playlist:") ? id.slice(9) : id;
            const playlist = await findOrCreatePlaylistByName(name);
            const { data, auth, baseUrl } = await request("getPlaylist", {
                id: playlist.id,
            });
            const entries = data.playlist?.entry ?? [];
            const start = paginateOffset(page);
            const slice = entries.slice(start, start + PAGE_SIZE);
            return {
                isEnd: start + slice.length >= entries.length,
                musicList: slice.map((item: any) =>
                    mapSong(item, baseUrl, auth),
                ),
            };
        }

        if (id === "songs-starred" || id === "starred") {
            const { data, auth, baseUrl } = await request("getStarred2");
            const songs = data.starred2?.song ?? [];
            const start = paginateOffset(page);
            const slice = songs.slice(start, start + PAGE_SIZE);
            return {
                isEnd: start + slice.length >= songs.length,
                musicList: slice.map((item: any) =>
                    mapSong(item, baseUrl, auth),
                ),
            };
        }

        if (id === "songs-random") {
            const { data, auth, baseUrl } = await request("getRandomSongs", {
                size: PAGE_SIZE,
            });
            const songs = data.randomSongs?.song ?? [];
            return {
                isEnd: true,
                musicList: songs.map((item: any) =>
                    mapSong(item, baseUrl, auth),
                ),
            };
        }

        // 直接按歌单 id 拉取
        try {
            const { data, auth, baseUrl } = await request("getPlaylist", {
                id,
            });
            if (data.playlist) {
                const entries = data.playlist.entry ?? [];
                const start = paginateOffset(page);
                const slice = entries.slice(start, start + PAGE_SIZE);
                return {
                    isEnd: start + slice.length >= entries.length,
                    musicList: slice.map((item: any) =>
                        mapSong(item, baseUrl, auth),
                    ),
                };
            }
        } catch {
            // fallthrough
        }

        return { isEnd: true, musicList: [] };
    },

    async importMusicSheet(urlLike) {
        const text = (urlLike || "").trim();
        let playlistId = text;
        const idMatch = text.match(/[?&]id=([^&]+)/i) || text.match(/playlist\/([^/?#]+)/i);
        if (idMatch?.[1]) {
            playlistId = decodeURIComponent(idMatch[1]);
        }
        const { data, auth, baseUrl } = await request("getPlaylist", {
            id: playlistId,
        });
        const entries = data.playlist?.entry ?? [];
        return entries.map((item: any) => mapSong(item, baseUrl, auth));
    },
};

export const navidromePlugin = new Plugin(function () {
    return navidromePluginDefine;
}, "internal-plugin://navidrome");

export function isInternalPluginPath(path?: string) {
    return !!path?.startsWith("internal-plugin://");
}

export { navidromePluginHash, navidromePluginPlatform };
