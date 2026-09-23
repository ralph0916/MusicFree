import { appUtil } from "@shared/utils/renderer";
import { getQqAuth, getQqHeaders, getQqUin, isQqLoggedIn } from "./qqAuth";
import { setLikeState } from "@/renderer/core/like/likeManager";

const PLATFORM = "QQ音乐";

function pickTitle(playlist: any): string {
    const candidates = [
        playlist?.dissname,
        playlist?.diss_name,
        playlist?.dirName,
        playlist?.dirname,
        playlist?.dir_name,
        playlist?.title,
        playlist?.name,
        playlist?.Name,
        playlist?.title_text,
        playlist?.diss_title,
    ];
    for (const c of candidates) {
        const t = String(c || "").trim();
        if (t) {
            return t;
        }
    }
    return "";
}

function pickId(playlist: any): string {
    const candidates = [
        playlist?.dissid,
        playlist?.diss_id,
        playlist?.tid,
        playlist?.dirId,
        playlist?.dirid,
        playlist?.dir_id,
        playlist?.id,
        playlist?.content_id,
    ];
    for (const c of candidates) {
        const id = String(c ?? "").trim();
        if (id && id !== "0" && id !== "undefined") {
            return id;
        }
    }
    return "";
}

function mapSheet(playlist: any): IMusic.IMusicSheetItem {
    const id = pickId(playlist);
    const cover =
        playlist.logo ||
        playlist.picurl ||
        playlist.cover ||
        playlist.imgurl ||
        playlist.pic_url ||
        playlist.cover_url ||
        "";
    const title = pickTitle(playlist) || (id ? `歌单 ${id}` : "未命名歌单");
    return {
        id,
        platform: PLATFORM,
        title,
        artist:
            playlist.nickname ||
            playlist.creator?.name ||
            playlist.creator_nickname ||
            PLATFORM,
        artwork: cover,
        coverImg: cover,
        worksNum:
            playlist.songnum ||
            playlist.song_cnt ||
            playlist.songNum ||
            playlist.song_num,
        description: playlist.introduction || playlist.desc || "",
    };
}

function mapSong(song: any): IMusic.IMusicItem {
    const album = song.album || {};
    const singers = song.singer || song.singer_list || [];
    const mid = song.mid || song.songmid || "";
    const albumMid = album.mid || song.albummid || "";
    const artwork =
        song.album?.picUrl ||
        (albumMid
            ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`
            : "") ||
        "";
    return {
        id: String(song.id || song.songid || song.songId || mid || ""),
        platform: PLATFORM,
        title: song.name || song.title || song.songname || "未知歌曲",
        artist:
            (Array.isArray(singers)
                ? singers.map((s: any) => s?.name).filter(Boolean).join(" / ")
                : "") ||
            song.singername ||
            "未知歌手",
        album: album.name || song.albumname || "未知专辑",
        artwork,
        duration: Number(song.interval || song.duration) || 0,
        mid,
        albumMid,
    } as IMusic.IMusicItem;
}

async function qqMusicu(payload: Record<string, any>) {
    const result = await appUtil.httpRequest({
        url: "https://u.y.qq.com/cgi-bin/musicu.fcg",
        method: "POST",
        headers: {
            ...getQqHeaders(),
            "Content-Type": "application/json",
        },
        data: JSON.stringify({
            comm: {
                uin: getQqUin(),
                format: "json",
                ct: 24,
                cv: 0,
                g_tk: 5381,
                platform: "yqq.json",
            },
            ...payload,
        }),
        timeout: 20000,
    });
    return result.data;
}

async function qqGet(url: string, params: Record<string, any>) {
    const result = await appUtil.httpRequest({
        url,
        method: "GET",
        params,
        headers: getQqHeaders(),
        timeout: 20000,
    });
    return result.data;
}

function unwrapPlaylistList(raw: any): any[] {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (Array.isArray(raw?.list)) {
        return raw.list;
    }
    if (Array.isArray(raw?.v_playlist)) {
        return raw.v_playlist;
    }
    return [];
}

/** 登录后拉取 QQ「我的歌单」 */
export async function fetchQqUserPlaylists(): Promise<IMusic.IMusicSheetItem[]> {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐");
    }
    const uin = getQqUin();
    if (!uin || uin === "0") {
        throw new Error("未获取到 QQ 号，请重新扫码登录");
    }

    // 1) 新接口：按 UIN 取创建歌单
    try {
        const data = await qqMusicu({
            req_0: {
                module: "music.musicasset.PlaylistBaseRead",
                method: "GetPlaylistByUin",
                param: { uin: String(uin) },
            },
        });
        const list = unwrapPlaylistList(
            data?.req_0?.data?.v_playlist ||
                data?.req_0?.data?.playlist ||
                data?.req_0?.data?.list ||
                data?.req_0?.data,
        );
        if (list.length) {
            return list.map(mapSheet).filter((s) => !!s.id);
        }
    } catch {
        // continue
    }

    // 2) 个人主页 Feed
    try {
        const data = await qqMusicu({
            req_0: {
                module: "music.playlist.PlaylistPortal",
                method: "GetProfileFeed",
                param: { hostuin: Number(uin), page: 0 },
            },
        });
        const list = unwrapPlaylistList(
            data?.req_0?.data?.vdiss?.list ||
                data?.req_0?.data?.playlist ||
                data?.req_0?.data?.v_playlist,
        );
        if (list.length) {
            return list.map(mapSheet).filter((s) => !!s.id);
        }
    } catch {
        // continue
    }

    // 3) 创建的歌单 CGI
    try {
        const data = await qqGet(
            "https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss",
            {
                hostUin: 0,
                hostuin: uin,
                sin: 0,
                size: 50,
                format: "json",
                inCharset: "utf8",
                outCharset: "utf-8",
                notice: 0,
                platform: "yqq.json",
                needNewCode: 0,
            },
        );
        const list = unwrapPlaylistList(
            data?.data?.disslist || data?.data?.list,
        );
        if (list.length) {
            return list.map(mapSheet).filter((s) => !!s.id);
        }
    } catch {
        // continue
    }

    // 4) 个人主页（含我喜欢）
    try {
        const data = await qqGet(
            "https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg",
            {
                cid: 205360838,
                userid: uin,
                reqfrom: 1,
                reqtype: 0,
                format: "json",
            },
        );
        const mine =
            data?.data?.creator?.diss ||
            data?.data?.mymusic ||
            data?.data?.mydiss?.list ||
            [];
        const list = unwrapPlaylistList(mine);
        if (list.length) {
            return list.map(mapSheet).filter((s) => !!s.id);
        }
    } catch {
        // continue
    }

    return [];
}

export type QqFeedTag = { id: string; title: string };

/** 顶部标签：每日推荐 + 我的歌单 */
export async function fetchQqFeedTags(): Promise<QqFeedTag[]> {
    const tags: QqFeedTag[] = [{ id: "daily", title: "每日推荐" }];
    if (!isQqLoggedIn()) {
        return [
            { id: "toplist:26", title: "热歌" },
            { id: "toplist:27", title: "新歌" },
            { id: "toplist:62", title: "飙升" },
        ];
    }
    try {
        const sheets = await fetchQqUserPlaylists();
        sheets.forEach((s) => {
            if (s.id) {
                tags.push({ id: String(s.id), title: s.title || "歌单" });
            }
        });
    } catch {
        // ignore
    }
    return tags;
}

export async function fetchQqFeedSongs(
    tagId: string,
    page = 1,
): Promise<{ musicList: IMusic.IMusicItem[]; isEnd: boolean }> {
    if (page > 1) {
        return { musicList: [], isEnd: true };
    }

    if (tagId === "daily") {
        if (!isQqLoggedIn()) {
            throw new Error("请先登录 QQ 音乐");
        }
        const data = await qqMusicu({
            req_0: {
                module: "music.playlist.PlaylistSquare",
                method: "GetRecommendFeed",
                param: { IdealNum: 30 },
            },
        });
        const vSong = data?.req_0?.data?.v_song || [];
        if (vSong.length) {
            return { isEnd: true, musicList: vSong.map(mapSong) };
        }
        const fallback = await qqMusicu({
            detail: {
                module: "musicToplist.ToplistInfoServer",
                method: "GetDetail",
                param: { topId: 26, offset: 0, num: 100, period: "" },
            },
        });
        return {
            isEnd: true,
            musicList: (fallback?.detail?.data?.songInfoList || []).map(
                mapSong,
            ),
        };
    }

    if (tagId.startsWith("toplist:")) {
        const topId = tagId.replace("toplist:", "");
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
        return {
            isEnd: true,
            musicList: (data?.detail?.data?.songInfoList || []).map(mapSong),
        };
    }

    // 歌单详情
    const data = await qqGet(
        "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg",
        {
            type: 1,
            utf8: 1,
            disstid: tagId,
            format: "json",
        },
    );
    const cdlist = data?.cdlist?.[0] || {};
    const songs = (cdlist.songlist || []).map(mapSong);
    if (/喜欢|我喜欢|红心/.test(String(cdlist.dissname || cdlist.title || ""))) {
        songs.forEach((item: IMusic.IMusicItem) => {
            setLikeState(item.platform, item.id, true);
        });
    }
    return { isEnd: true, musicList: songs };
}

export async function getQqPlaylistIdsContainingSongs(songIds: string[]) {
    if (!songIds.length || !isQqLoggedIn()) {
        return new Set<string>();
    }
    const playlists = await fetchQqUserPlaylists();
    const target = songIds.map(String);
    const containing = new Set<string>();
    for (const pl of playlists) {
        try {
            const data = await qqGet(
                "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg",
                {
                    type: 1,
                    utf8: 1,
                    disstid: pl.id,
                    format: "json",
                },
            );
            const songs = data?.cdlist?.[0]?.songlist || [];
            const idSet = new Set(
                songs.map((s: any) =>
                    String(s.id || s.songid || s.mid || ""),
                ),
            );
            if (target.every((id) => idSet.has(id))) {
                containing.add(String(pl.id));
            }
        } catch {
            // ignore
        }
    }
    return containing;
}

export async function addSongsToQqPlaylist(
    playlistId: string,
    songIds: string[],
) {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐");
    }
    const data = await qqMusicu({
        req_0: {
            module: "music.musicasset.PlaylistDetailWrite",
            method: "AddSongList",
            param: {
                dirId: Number(playlistId),
                v_songInfo: songIds.map((id) => ({
                    songId: Number(id) || 0,
                    songType: 0,
                })),
            },
        },
    });
    if (data?.req_0?.code !== 0 && data?.req_0?.code !== undefined) {
        if (data?.code && data.code !== 0) {
            throw new Error(
                data?.req_0?.msg || data?.msg || "加入歌单失败",
            );
        }
    }
    return true;
}

export async function removeSongsFromQqPlaylist(
    playlistId: string,
    songIds: string[],
) {
    if (!isQqLoggedIn()) {
        throw new Error("请先登录 QQ 音乐");
    }
    const data = await qqMusicu({
        req_0: {
            module: "music.musicasset.PlaylistDetailWrite",
            method: "DelSongList",
            param: {
                dirId: Number(playlistId),
                v_songInfo: songIds.map((id) => ({
                    songId: Number(id) || 0,
                    songType: 0,
                })),
            },
        },
    });
    if (data?.req_0?.code !== 0 && data?.req_0?.code !== undefined) {
        if (data?.code && data.code !== 0) {
            throw new Error(
                data?.req_0?.msg || data?.msg || "移出歌单失败",
            );
        }
    }
    return true;
}
