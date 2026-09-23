import CryptoJS from "crypto-js";
import axios from "axios";
import AppConfig from "@shared/app-config/renderer";

const PLATFORM = "Navidrome";
const LIKE_PLAYLIST = "喜欢";
const API_VERSION = "1.16.1";

function getConfig() {
    const vars =
        AppConfig.getConfig("private.pluginMeta")?.[PLATFORM]?.userVariables ||
        {};
    let url = String(vars.url || "")
        .trim()
        .replace(/\/+$/, "");
    if (url && !/^https?:\/\//i.test(url)) {
        url = `http://${url}`;
    }
    return {
        url,
        username: String(vars.username || "").trim(),
        password: String(vars.password || "").trim(),
    };
}

function createAuth(username: string, password: string) {
    const salt = Math.random().toString(36).slice(2, 14);
    const token = CryptoJS.MD5(password + salt).toString(CryptoJS.enc.Hex);
    return { u: username, t: token, s: salt, v: API_VERSION, c: "RalphMusic", f: "json" };
}

async function request(endpoint: string, params: Record<string, any> = {}) {
    const config = getConfig();
    if (!config.url || !config.username || !config.password) {
        throw new Error("请先配置 Navidrome");
    }
    const auth = createAuth(config.username, config.password);
    const search = new URLSearchParams();
    Object.entries({ ...auth, ...params }).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
            search.set(k, String(v));
        }
    });
    const path = endpoint.includes(".view") ? endpoint : `${endpoint}.view`;
    const { data } = await axios.get(
        `${config.url}/rest/${path}?${search.toString()}`,
        { timeout: 20000 },
    );
    const body = data?.["subsonic-response"];
    if (!body || body.status !== "ok") {
        throw new Error(body?.error?.message || "Navidrome 请求失败");
    }
    return body;
}

async function findOrCreatePlaylist(name: string) {
    const data = await request("getPlaylists");
    const playlists = data.playlists?.playlist || [];
    let found = playlists.find((item: any) => String(item.name) === name);
    if (!found) {
        await request("createPlaylist", { name });
        const again = await request("getPlaylists");
        found = (again.playlists?.playlist || []).find(
            (item: any) => String(item.name) === name,
        );
    }
    if (!found) {
        throw new Error(`无法创建歌单「${name}」`);
    }
    return found;
}

export async function isNavidromeLiked(songId: string) {
    const playlist = await findOrCreatePlaylist(LIKE_PLAYLIST);
    const data = await request("getPlaylist", { id: playlist.id });
    const entries = data.playlist?.entry || [];
    return {
        liked: entries.some((item: any) => String(item.id) === String(songId)),
        playlistId: String(playlist.id),
        entries,
    };
}

export async function toggleNavidromeLike(songId: string, like?: boolean) {
    const state = await isNavidromeLiked(songId);
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

function mapPlaylist(item: any): IMusic.IMusicSheetItem {
    return {
        id: String(item.id),
        platform: PLATFORM,
        title: item.name || "未命名歌单",
        artwork: item.coverArt
            ? undefined
            : undefined,
        coverImg: "",
        worksNum: Number(item.songCount) || 0,
    };
}

export async function getNavidromePlaylists(): Promise<
    IMusic.IMusicSheetItem[]
> {
    const data = await request("getPlaylists");
    const playlists = data.playlists?.playlist || [];
    return playlists.map(mapPlaylist);
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
            const data = await request("getPlaylist", { id: pl.id });
            const entries = data.playlist?.entry || [];
            const idSet = new Set(entries.map((e: any) => String(e.id)));
            if (target.every((id) => idSet.has(id))) {
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
    const data = await request("getPlaylist", { id: playlistId });
    const entries: any[] = data.playlist?.entry || [];
    // 从后往前删，避免下标错位
    for (let i = entries.length - 1; i >= 0; i--) {
        if (target.has(String(entries[i]?.id))) {
            await request("updatePlaylist", {
                playlistId,
                songIndexToRemove: i,
            });
        }
    }
}
