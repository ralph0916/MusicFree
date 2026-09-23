/**
 * RalphMusic Desktop 内置插件：网易云音乐
 * 推荐在「插件管理 → 账号登录」使用手机验证码或扫码登录
 */
/* global env */
const axios = require("axios");
const CryptoJs = require("crypto-js");
const bigInt = require("big-integer");
const qs = require("qs");

const PLATFORM = "网易云";
const PAGE_SIZE = 30;

const modulus =
  "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";
const nonce = "0CoJUm6Qyw8W8jud";
const pubKey = "010001";
const iv = "0102030405060708";

function getCookie() {
  const vars = env.getUserVariables() || {};
  return String(vars.cookie || "").trim();
}

function getHeaders() {
  const cookie = getCookie();
  const headers = {
    Referer: "https://music.163.com/",
    Origin: "https://music.163.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (cookie) {
    headers.Cookie = cookie;
  }
  return headers;
}

function randomString(length) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function aesEncrypt(text, key) {
  return CryptoJs.AES.encrypt(
    CryptoJs.enc.Utf8.parse(text),
    CryptoJs.enc.Utf8.parse(key),
    {
      iv: CryptoJs.enc.Utf8.parse(iv),
      mode: CryptoJs.mode.CBC,
      padding: CryptoJs.pad.Pkcs7,
    },
  ).toString();
}

function strToHex(str) {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

function rsaEncrypt(text) {
  const reversed = text.split("").reverse().join("");
  const hexText = strToHex(reversed);
  const encrypted = bigInt(hexText, 16)
    .modPow(bigInt(pubKey, 16), bigInt(modulus, 16))
    .toString(16);
  return encrypted.padStart(256, "0");
}

function weapiEncrypt(object) {
  const text = JSON.stringify(object);
  const secKey = randomString(16);
  const params = aesEncrypt(aesEncrypt(text, nonce), secKey);
  const encSecKey = rsaEncrypt(secKey);
  return { params: params, encSecKey: encSecKey };
}

async function weapiPost(url, data) {
  const body = weapiEncrypt(data || {});
  const response = await axios.post(url, qs.stringify(body), {
    headers: getHeaders(),
    timeout: 20000,
  });
  return response.data;
}

function mapSong(song) {
  const album = song.al || song.album || {};
  const artists = song.ar || song.artists || [];
  const artistName = artists
    .map(function (a) {
      return a && a.name;
    })
    .filter(Boolean)
    .join(" / ");
  return {
    id: String(song.id),
    platform: PLATFORM,
    title: song.name || "未知歌曲",
    artist: artistName || "未知歌手",
    album: album.name || "未知专辑",
    artwork: album.picUrl || (song.album && song.album.picUrl) || "",
    duration: Math.floor((song.dt || song.duration || 0) / 1000),
  };
}

function mapSheet(playlist) {
  return {
    id: String(playlist.id),
    platform: PLATFORM,
    title: playlist.name || "未命名歌单",
    artist:
      (playlist.creator && playlist.creator.nickname) || PLATFORM,
    artwork: playlist.coverImgUrl || playlist.picUrl || "",
    coverImg: playlist.coverImgUrl || playlist.picUrl || "",
    worksNum: playlist.trackCount,
    description: playlist.description || "",
    createAt: playlist.createTime,
  };
}

async function getAccountProfile() {
  const data = await weapiPost(
    "https://music.163.com/weapi/nuser/account/get",
    {},
  );
  return (data && data.profile) || null;
}

async function fetchPlaylistTracks(id, n) {
  n = n || 1000;
  const data = await weapiPost(
    "https://music.163.com/weapi/v3/playlist/detail",
    {
      id: id,
      n: n,
      s: 8,
    },
  );
  const playlist = (data && data.playlist) || {};
  let tracks = playlist.tracks || [];
  const trackIds = (playlist.trackIds || [])
    .map(function (t) {
      return String(t.id || t);
    })
    .filter(Boolean);
  if (trackIds.length > tracks.length) {
    const need = trackIds.slice(0, 500);
    const detail = await weapiPost(
      "https://music.163.com/weapi/v3/song/detail",
      {
        c: JSON.stringify(
          need.map(function (i) {
            return { id: i };
          }),
        ),
        ids: JSON.stringify(need),
      },
    );
    tracks = (detail && detail.songs) || tracks;
  }
  return { playlist: playlist, tracks: tracks };
}

module.exports = {
  platform: PLATFORM,
  version: "1.0.0",
  appVersion: ">0.6.0",
  description:
    "网易云音乐：支持手机验证码 / 扫码登录；支持搜索、播放、歌词、榜单与歌单（不支持破解 VIP）。",
  author: "private",
  primaryKey: ["id"],
  cacheControl: "no-cache",
  defaultSearchType: "music",
  supportedSearchType: ["music", "sheet"],
  userVariables: [
    {
      key: "cookie",
      name: "Cookie（可选）",
      hint: "一般无需手动填写；请优先使用「账号登录」",
    },
  ],

  async search(query, page, type) {
    const offset = Math.max(0, (page - 1) * PAGE_SIZE);
    if (type === "sheet") {
      if (!query) {
        return { isEnd: true, data: [] };
      }
      const data = await weapiPost(
        "https://music.163.com/weapi/cloudsearch/get/web",
        {
          s: query,
          type: 1000,
          limit: PAGE_SIZE,
          offset: offset,
          total: true,
        },
      );
      const list = (data && data.result && data.result.playlists) || [];
      return {
        isEnd: list.length < PAGE_SIZE,
        data: list.map(mapSheet),
      };
    }
    if (type && type !== "music") {
      return { isEnd: true, data: [] };
    }
    const data = await weapiPost(
      "https://music.163.com/weapi/cloudsearch/get/web",
      {
        s: query || "热门",
        type: 1,
        limit: PAGE_SIZE,
        offset: offset,
        total: true,
      },
    );
    const list = (data && data.result && data.result.songs) || [];
    return {
      isEnd: list.length < PAGE_SIZE,
      data: list.map(mapSong),
    };
  },

  async getMediaSource(musicItem, quality) {
    const levelMap = {
      low: "standard",
      standard: "higher",
      high: "exhigh",
      super: "lossless",
    };
    const brMap = {
      low: 128000,
      standard: 192000,
      high: 320000,
      super: 320000,
    };
    const data = await weapiPost(
      "https://music.163.com/weapi/song/enhance/player/url/v1",
      {
        ids: [musicItem.id],
        level: levelMap[quality] || "higher",
        encodeType: "mp3",
      },
    );
    let url = data && data.data && data.data[0] && data.data[0].url;
    if (!url) {
      try {
        const fallback = await axios.get(
          "https://interface.music.163.com/api/song/enhance/player/url",
          {
            params: {
              id: musicItem.id,
              ids: "[" + musicItem.id + "]",
              br: brMap[quality] || 192000,
            },
            headers: getHeaders(),
            timeout: 15000,
          },
        );
        url =
          fallback.data &&
          fallback.data.data &&
          fallback.data.data[0] &&
          fallback.data.data[0].url;
      } catch (e) {}
    }
    if (!url) {
      throw new Error("无法获取播放地址（可能是 VIP/无版权歌曲）");
    }
    return { url: url, quality: quality };
  },

  async getLyric(musicItem) {
    try {
      const data = await weapiPost(
        "https://music.163.com/weapi/song/lyric",
        {
          id: musicItem.id,
          lv: -1,
          kv: -1,
          tv: -1,
        },
      );
      if (data && data.lrc && data.lrc.lyric) {
        return {
          rawLrc: data.lrc.lyric,
          translation: (data.tlyric && data.tlyric.lyric) || undefined,
        };
      }
    } catch (e) {}
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
    if (getCookie()) {
      lists.unshift({
        id: "daily",
        title: "每日推荐",
        description: "根据口味推荐的单曲",
        coverImg: "",
      });
    }
    return [{ title: "单曲", data: lists }];
  },

  async getTopListDetail(topListItem, page) {
    const id = String(topListItem.id);
    if (id === "daily") {
      if (!getCookie()) {
        throw new Error("请先在插件设置中填写网易云 Cookie");
      }
      if (page > 1) {
        return { isEnd: true, musicList: [] };
      }
      const data = await weapiPost(
        "https://music.163.com/weapi/v3/discovery/recommend/songs",
        { limit: 100, offset: 0 },
      );
      const tracks =
        (data && data.data && data.data.dailySongs) ||
        (data && data.recommend) ||
        [];
      return {
        isEnd: true,
        musicList: tracks.map(mapSong),
      };
    }
    if (page > 1) {
      return { isEnd: true, musicList: [] };
    }
    const result = await fetchPlaylistTracks(id, 1000);
    return {
      isEnd: true,
      musicList: result.tracks.map(mapSong),
      topListItem: Object.assign({}, topListItem, {
        title: result.playlist.name || topListItem.title,
        coverImg: result.playlist.coverImgUrl || "",
      }),
    };
  },

  async getRecommendSheetTags() {
    try {
      const data = await weapiPost(
        "https://music.163.com/weapi/playlist/catalogue",
        {},
      );
      const cats = (data && data.categories) || {};
      const map = {};
      const catData = Object.keys(cats).map(function (key) {
        const tagData = { title: cats[key], data: [] };
        map[key] = tagData;
        return tagData;
      });
      const pinned = [];
      ((data && data.sub) || []).forEach(function (tag) {
        const item = { id: tag.name, title: tag.name };
        if (tag.hot) {
          pinned.push(item);
        }
        if (map[tag.category]) {
          map[tag.category].data.push(item);
        }
      });
      if (getCookie()) {
        pinned.unshift({
          id: "mine",
          title: "我的歌单",
          platform: PLATFORM,
        });
      }
      return { pinned: pinned, data: catData };
    } catch (e) {
      return {
        pinned: getCookie()
          ? [{ id: "mine", title: "我的歌单", platform: PLATFORM }]
          : [],
        data: [],
      };
    }
  },

  async getRecommendSheetsByTag(tag, page) {
    page = page || 1;
    const tagId = (tag && tag.id) || "";
    if (tagId === "mine") {
      if (page > 1) {
        return { isEnd: true, data: [] };
      }
      if (!getCookie()) {
        throw new Error("请先在插件设置中填写网易云 Cookie");
      }
      const profile = await getAccountProfile();
      const uid = profile && profile.userId;
      if (!uid) {
        throw new Error("无法获取用户信息，请检查 Cookie 是否有效");
      }
      const data = await weapiPost(
        "https://music.163.com/weapi/user/playlist",
        {
          uid: uid,
          limit: 1000,
          offset: 0,
          includeVideo: true,
        },
      );
      const list = ((data && data.playlist) || []).filter(function (item) {
        return (
          String(item.creator && item.creator.userId) === String(uid)
        );
      });
      return { isEnd: true, data: list.map(mapSheet) };
    }
    const data = await weapiPost(
      "https://music.163.com/weapi/playlist/list",
      {
        cat: tagId || "全部",
        order: "hot",
        limit: 20,
        offset: (page - 1) * 20,
        total: true,
      },
    );
    const playlists = (data && data.playlists) || [];
    return {
      isEnd: !(data && data.more === true),
      data: playlists.map(mapSheet),
    };
  },

  async getMusicSheetInfo(sheetItem, page) {
    if (page > 1) {
      return { isEnd: true, musicList: [] };
    }
    const result = await fetchPlaylistTracks(sheetItem.id, 500);
    return {
      isEnd: true,
      sheetItem: mapSheet(result.playlist),
      musicList: result.tracks.map(mapSong),
    };
  },
};
