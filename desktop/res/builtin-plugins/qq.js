/**
 * MusicFree Desktop 内置插件：QQ 音乐
 * 通过粘贴含 uin / qm_keyst 的 Cookie 使用（不支持破解 VIP）
 */
/* global env */
const axios = require("axios");

const PLATFORM = "QQ音乐";
const PAGE_SIZE = 30;

function getCookie() {
  const vars = env.getUserVariables() || {};
  return String(vars.cookie || "")
    .trim()
    .replace(/\n/g, "; ")
    .replace(/;;+/g, ";");
}

function extractUin(cookie) {
  const match =
    cookie.match(/(?:^|;\s*)(?:uin|wxuin)=o?0*(\d+)/i) ||
    cookie.match(/(?:^|;\s*)uin=o?0*(\d+)/i);
  return (match && match[1]) || "0";
}

function getUin() {
  const cookie = getCookie();
  if (!cookie) {
    return "0";
  }
  return extractUin(cookie);
}

function getHeaders() {
  const cookie = getCookie();
  return {
    Referer: "https://y.qq.com/",
    Origin: "https://y.qq.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Cookie: cookie || "",
  };
}

async function qqGet(url, params) {
  const { data } = await axios.get(url, {
    params: params || {},
    headers: getHeaders(),
    timeout: 15000,
  });
  return data;
}

async function qqMusicu(payload) {
  const { data } = await axios.post(
    "https://u.y.qq.com/cgi-bin/musicu.fcg",
    Object.assign(
      {
        comm: {
          uin: getUin(),
          format: "json",
          ct: 24,
          cv: 0,
          g_tk: 5381,
          platform: "yqq.json",
        },
      },
      payload,
    ),
    {
      headers: Object.assign({}, getHeaders(), {
        "Content-Type": "application/json",
      }),
      timeout: 15000,
    },
  );
  return data;
}

function mapSong(song) {
  const album = song.album || {};
  const singers = song.singer || song.singers || [];
  const mid = song.mid || song.songmid;
  const id = String(song.id || song.songid || mid);
  const albumMid = album.mid || song.albummid;
  const artwork = albumMid
    ? "https://y.qq.com/music/photo_new/T002R500x500M000" + albumMid + ".jpg"
    : "";
  return {
    id: id,
    platform: PLATFORM,
    title: song.title || song.name || song.songname || "未知歌曲",
    artist:
      (Array.isArray(singers)
        ? singers
            .map(function (s) {
              return s.name;
            })
            .filter(Boolean)
            .join(" / ")
        : "") || "未知歌手",
    album: album.name || song.albumname || "未知专辑",
    artwork: artwork,
    duration: Number(song.interval || song.duration) || 0,
    mid: mid,
    albumMid: albumMid,
  };
}

function mapSheet(playlist) {
  const id = String(
    playlist.dissid || playlist.tid || playlist.id || "",
  );
  const cover =
    playlist.logo ||
    playlist.picurl ||
    playlist.cover ||
    playlist.imgurl ||
    "";
  return {
    id: id,
    platform: PLATFORM,
    title:
      playlist.dissname || playlist.title || playlist.name || "未命名歌单",
    artist:
      playlist.nickname ||
      (playlist.creator && playlist.creator.name) ||
      PLATFORM,
    artwork: cover,
    coverImg: cover,
    worksNum: playlist.songnum || playlist.song_cnt,
    description: playlist.introduction || playlist.desc || "",
  };
}

async function searchSongs(keyword, page) {
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
  const list =
    (data && data.data && data.data.song && data.data.song.list) || [];
  return {
    isEnd: list.length < PAGE_SIZE,
    data: list.map(mapSong),
  };
}

async function getUserPlaylists() {
  const uin = getUin();
  if (!getCookie() || uin === "0") {
    throw new Error("请先在插件设置中填写含 uin / qm_keyst 的 Cookie");
  }
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
    (data &&
      data.req_0 &&
      data.req_0.data &&
      data.req_0.data.vdiss &&
      data.req_0.data.vdiss.list) ||
    (data && data.req_0 && data.req_0.data && data.req_0.data.playlist) ||
    [];
  return list.map(mapSheet);
}

module.exports = {
  platform: PLATFORM,
  version: "1.0.0",
  appVersion: ">0.6.0",
  description:
    "QQ 音乐：粘贴含 uin 与 qm_keyst 的 Cookie 后支持搜索、播放、歌词、榜单与歌单（不支持破解 VIP）。",
  author: "private",
  primaryKey: ["id"],
  cacheControl: "no-cache",
  defaultSearchType: "music",
  supportedSearchType: ["music", "sheet"],
  userVariables: [
    {
      key: "cookie",
      name: "Cookie",
      hint: "从浏览器登录 y.qq.com 后粘贴 Cookie（需含 uin、qm_keyst）",
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
          query: query,
          page_no: page - 1,
          num_per_page: PAGE_SIZE,
          format: "json",
        },
      );
      const list =
        (data && data.data && data.data.list) ||
        (data &&
          data.data &&
          data.data.body &&
          data.data.body.songlist &&
          data.data.body.songlist.list) ||
        [];
      return {
        isEnd: list.length < PAGE_SIZE,
        data: list.map(mapSheet),
      };
    }
    return searchSongs(query, page);
  },

  async getMediaSource(musicItem, quality) {
    const mid = musicItem.mid || musicItem.id;
    const fileMap = {
      low: { prefix: "M500", ext: "mp3" },
      standard: { prefix: "M500", ext: "mp3" },
      high: { prefix: "M800", ext: "mp3" },
      super: { prefix: "F000", ext: "flac" },
    };
    async function tryQuality(qKey) {
      const q = fileMap[qKey] || fileMap.standard;
      const filename = q.prefix + mid + "." + q.ext;
      const data = await qqMusicu({
        req_0: {
          module: "vkey.GetVkeyServer",
          method: "CgiGetVkey",
          param: {
            filename: [filename],
            guid: "10000",
            songmid: [mid],
            songtype: [0],
            uin: getUin(),
            loginflag: 1,
            platform: "20",
          },
        },
      });
      const midurlinfo =
        data &&
        data.req_0 &&
        data.req_0.data &&
        data.req_0.data.midurlinfo &&
        data.req_0.data.midurlinfo[0];
      const sip =
        (data &&
          data.req_0 &&
          data.req_0.data &&
          data.req_0.data.sip &&
          data.req_0.data.sip[0]) ||
        "https://dl.stream.qqmusic.qq.com/";
      const purl = midurlinfo && midurlinfo.purl;
      if (!purl) {
        return null;
      }
      return { url: sip + purl, quality: qKey };
    }
    let result = await tryQuality(quality);
    if (!result && quality !== "standard" && quality !== "low") {
      result = await tryQuality("standard");
    }
    if (!result) {
      throw new Error("无法获取播放地址（可能是 VIP/无版权歌曲）");
    }
    return result;
  },

  async getLyric(musicItem) {
    try {
      const mid = musicItem.mid || musicItem.id;
      const data = await qqGet(
        "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg",
        {
          songmid: mid,
          g_tk: 5381,
          format: "json",
          nobase64: 1,
        },
      );
      if (data && data.lyric) {
        return { rawLrc: data.lyric };
      }
    } catch (e) {}
    return null;
  },

  async getTopLists() {
    const lists = [
      {
        id: "toplist:26",
        title: "热歌榜",
        description: "QQ 音乐热歌榜",
        coverImg: "",
        platform: PLATFORM,
      },
      {
        id: "toplist:27",
        title: "新歌榜",
        description: "QQ 音乐新歌榜",
        coverImg: "",
        platform: PLATFORM,
      },
      {
        id: "toplist:62",
        title: "飙升榜",
        description: "QQ 音乐飙升榜",
        coverImg: "",
        platform: PLATFORM,
      },
    ];
    if (getCookie() && getUin() !== "0") {
      lists.unshift({
        id: "daily",
        title: "每日推荐",
        description: "根据口味推荐的单曲",
        coverImg: "",
        platform: PLATFORM,
      });
    }
    return [{ title: "单曲", data: lists }];
  },

  async getTopListDetail(topListItem, page) {
    const id = String(topListItem.id);
    if (id === "daily") {
      if (!getCookie()) {
        throw new Error("请先在插件设置中填写 QQ 音乐 Cookie");
      }
      if (page > 1) {
        return { isEnd: true, musicList: [] };
      }
      try {
        const data = await qqMusicu({
          req_0: {
            module: "music.playlist.PlaylistSquare",
            method: "GetRecommendFeed",
            param: { IdealNum: 30 },
          },
        });
        const vSong =
          (data &&
            data.req_0 &&
            data.req_0.data &&
            data.req_0.data.v_song) ||
          [];
        if (vSong.length) {
          return { isEnd: true, musicList: vSong.map(mapSong) };
        }
      } catch (e) {}
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
        musicList: (
          (fallback &&
            fallback.detail &&
            fallback.detail.data &&
            fallback.detail.data.songInfoList) ||
          []
        ).map(mapSong),
      };
    }

    if (id.indexOf("toplist:") === 0) {
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
      const list =
        (data &&
          data.detail &&
          data.detail.data &&
          data.detail.data.songInfoList) ||
        [];
      return { isEnd: true, musicList: list.map(mapSong) };
    }

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
    const cdlist = data && data.cdlist && data.cdlist[0];
    const songs = (cdlist && cdlist.songlist) || [];
    return { isEnd: true, musicList: songs.map(mapSong) };
  },

  async getRecommendSheetTags() {
    return {
      pinned: getCookie()
        ? [{ id: "mine", title: "我的歌单", platform: PLATFORM }]
        : [],
      data: [],
    };
  },

  async getRecommendSheetsByTag(tag, page) {
    page = page || 1;
    if (page > 1) {
      return { isEnd: true, data: [] };
    }
    const tagId = (tag && tag.id) || "mine";
    if (tagId === "mine") {
      const list = await getUserPlaylists();
      return { isEnd: true, data: list };
    }
    return { isEnd: true, data: [] };
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
    const cdlist = (data && data.cdlist && data.cdlist[0]) || {};
    return {
      isEnd: true,
      sheetItem: mapSheet(cdlist),
      musicList: (cdlist.songlist || []).map(mapSong),
    };
  },
};
