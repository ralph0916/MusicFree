/**
 * MusicFree 独立插件版本（可选安装）
 * 主工程已内置相同能力，一般无需再装此文件。
 *
 * 安装方式：侧边栏 → 设置 → 插件设置 → 从本地安装
 */
/* global env */
const axios = require("axios");
const CryptoJs = require("crypto-js");

const PLATFORM = "Navidrome";
const PAGE_SIZE = 30;
const CLIENT_NAME = "RalphMusic";
const API_VERSION = "1.16.1";

function getUserConfig() {
  const vars = env.getUserVariables() || {};
  let url = (vars.url || "").trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    url = "http://" + url;
  }
  return {
    url: url,
    username: (vars.username || "").trim(),
    password: (vars.password || "").trim(),
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

function createAuth(username, password) {
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

function buildUrl(baseUrl, endpoint, auth, params) {
  params = params || {};
  const search = new URLSearchParams();
  const merged = Object.assign({}, auth, params);
  Object.keys(merged).forEach(function (key) {
    const value = merged[key];
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const path = endpoint.indexOf(".view") >= 0 ? endpoint : endpoint + ".view";
  return baseUrl + "/rest/" + path + "?" + search.toString();
}

async function request(endpoint, params) {
  const config = ensureConfig();
  const auth = createAuth(config.username, config.password);
  const url = buildUrl(config.url, endpoint, auth, params || {});
  const response = await axios.get(url, { timeout: 30000 });
  const data = response && response.data && response.data["subsonic-response"];
  if (!data) {
    throw new Error("Navidrome 返回数据异常");
  }
  if (data.status !== "ok") {
    throw new Error((data.error && data.error.message) || "Navidrome 请求失败");
  }
  return { data: data, auth: auth, baseUrl: config.url };
}

function coverArtUrl(baseUrl, auth, coverArt, size) {
  if (!coverArt) {
    return "";
  }
  return buildUrl(baseUrl, "getCoverArt", auth, {
    id: coverArt,
    size: size || 400,
  });
}

function mapSong(song, baseUrl, auth) {
  return {
    id: String(song.id),
    platform: PLATFORM,
    title: song.title || "未知歌曲",
    artist: song.artist || song.displayArtist || "未知歌手",
    album: song.album || "未知专辑",
    artwork: coverArtUrl(baseUrl, auth, song.coverArt),
    duration: Number(song.duration) || 0,
    albumId: song.albumId ? String(song.albumId) : undefined,
    artistId: song.artistId ? String(song.artistId) : undefined,
  };
}

function mapAlbum(album, baseUrl, auth) {
  return {
    id: String(album.id),
    platform: PLATFORM,
    title: album.name || album.title || "未知专辑",
    artist: album.artist || "未知歌手",
    artwork: coverArtUrl(baseUrl, auth, album.coverArt),
    description: album.year ? String(album.year) : "",
    worksNum: album.songCount,
  };
}

function mapAlbumAsSheet(album, baseUrl, auth) {
  return {
    id: "album:" + album.id,
    platform: PLATFORM,
    title: album.name || album.title || "未知专辑",
    artist: album.artist || "未知歌手",
    artwork: coverArtUrl(baseUrl, auth, album.coverArt),
    coverImg: coverArtUrl(baseUrl, auth, album.coverArt),
    worksNum: album.songCount,
    description: album.year ? String(album.year) : "",
  };
}

function mapArtist(artist, baseUrl, auth) {
  return {
    id: String(artist.id),
    platform: PLATFORM,
    name: artist.name || "未知歌手",
    avatar: coverArtUrl(baseUrl, auth, artist.coverArt || artist.id) || "",
    worksNum: artist.albumCount || 0,
    description: artist.albumCount ? artist.albumCount + " 张专辑" : "",
  };
}

function mapPlaylist(playlist, baseUrl, auth) {
  return {
    id: String(playlist.id),
    platform: PLATFORM,
    title: playlist.name || "未命名歌单",
    artist: playlist.owner || PLATFORM,
    artwork: coverArtUrl(baseUrl, auth, playlist.coverArt),
    worksNum: playlist.songCount,
    description: playlist.comment,
    createAt: playlist.created,
    playCount: playlist.playCount,
  };
}

function paginateOffset(page) {
  return Math.max(0, (page - 1) * PAGE_SIZE);
}

async function listAllPlaylists() {
  const res = await request("getPlaylists");
  return {
    playlists: (res.data.playlists && res.data.playlists.playlist) || [],
    auth: res.auth,
    baseUrl: res.baseUrl,
  };
}

async function findOrCreatePlaylistByName(name) {
  const listed = await listAllPlaylists();
  let found = listed.playlists.find(function (item) {
    return String(item.name) === name;
  });
  if (!found) {
    await request("createPlaylist", { name: name });
    const again = await listAllPlaylists();
    found = again.playlists.find(function (item) {
      return String(item.name) === name;
    });
  }
  if (!found) {
    throw new Error("无法创建歌单「" + name + "」");
  }
  return found;
}

module.exports = {
  platform: PLATFORM,
  version: "1.1.0",
  appVersion: ">0.6.0",
  description:
    "连接自建 Navidrome / Subsonic 兼容服务器，播放 NAS 本地音乐库。",
  author: "private",
  primaryKey: ["id"],
  cacheControl: "no-cache",
  defaultSearchType: "music",
  supportedSearchType: ["music", "album", "artist", "sheet"],
  userVariables: [
    { key: "url", name: "服务器地址", hint: "例如 http://192.168.1.10:4533" },
    { key: "username", name: "用户名", hint: "Navidrome 登录用户名" },
    { key: "password", name: "密码", hint: "Navidrome 登录密码" },
  ],
  async search(query, page, type) {
    const offset = paginateOffset(page);
    if (type === "sheet") {
      const res = await request("getPlaylists");
      const playlists = (res.data.playlists && res.data.playlists.playlist) || [];
      const keyword = (query || "").trim().toLowerCase();
      const filtered = keyword
        ? playlists.filter(function (item) {
            return String(item.name || "")
              .toLowerCase()
              .includes(keyword);
          })
        : playlists;
      const slice = filtered.slice(offset, offset + PAGE_SIZE);
      return {
        isEnd: offset + slice.length >= filtered.length,
        data: slice.map(function (item) {
          return mapPlaylist(item, res.baseUrl, res.auth);
        }),
      };
    }

    const res = await request("search3", {
      query: query || "",
      songCount: type === "music" ? PAGE_SIZE : 0,
      albumCount: type === "album" ? PAGE_SIZE : 0,
      artistCount: type === "artist" ? PAGE_SIZE : 0,
      songOffset: type === "music" ? offset : 0,
      albumOffset: type === "album" ? offset : 0,
      artistOffset: type === "artist" ? offset : 0,
    });
    const result = res.data.searchResult3 || {};
    if (type === "music") {
      const songs = result.song || [];
      return {
        isEnd: songs.length < PAGE_SIZE,
        data: songs.map(function (item) {
          return mapSong(item, res.baseUrl, res.auth);
        }),
      };
    }
    if (type === "album") {
      const albums = result.album || [];
      return {
        isEnd: albums.length < PAGE_SIZE,
        data: albums.map(function (item) {
          return mapAlbum(item, res.baseUrl, res.auth);
        }),
      };
    }
    if (type === "artist") {
      const artists = result.artist || [];
      return {
        isEnd: artists.length < PAGE_SIZE,
        data: artists.map(function (item) {
          return mapArtist(item, res.baseUrl, res.auth);
        }),
      };
    }
    return { isEnd: true, data: [] };
  },
  async getMediaSource(musicItem, quality) {
    const config = ensureConfig();
    const auth = createAuth(config.username, config.password);
    // stream 接口不要带 f=json，否则部分客户端无法正确播放
    const streamAuth = Object.assign({}, auth);
    delete streamAuth.f;
    const maxBitRateMap = { low: 128, standard: 256, high: 320, super: 0 };
    const maxBitRate =
      maxBitRateMap[quality] !== undefined ? maxBitRateMap[quality] : 0;
    const params = {
      id: musicItem.id,
      maxBitRate: maxBitRate,
      estimateContentLength: true,
      _: Date.now(),
    };
    return {
      url: buildUrl(config.url, "stream", streamAuth, params),
      quality: quality,
      cacheControl: "no-store",
      headers: {
        "User-Agent": "RalphMusic",
        Accept: "*/*",
        "Cache-Control": "no-store",
      },
    };
  },
  async getLyric(musicItem) {
    try {
      const res = await request("getLyricsBySongId", { id: musicItem.id });
      const list =
        res.data.lyricsList &&
        (res.data.lyricsList.structuredLyrics || [])[0];
      if (list && list.line && list.line.length) {
        const rawLrc = list.line
          .map(function (line) {
            const start = Number(line.start) || 0;
            const minutes = Math.floor(start / 60000);
            const seconds = Math.floor((start % 60000) / 1000);
            const ms = Math.floor(start % 1000);
            const time =
              String(minutes).padStart(2, "0") +
              ":" +
              String(seconds).padStart(2, "0") +
              "." +
              String(ms).padStart(3, "0").slice(0, 2);
            return "[" + time + "]" + (line.value || "");
          })
          .join("\n");
        return { rawLrc: rawLrc };
      }
      const plain = await request("getLyrics", {
        artist: musicItem.artist,
        title: musicItem.title,
      });
      if (plain.data.lyrics && plain.data.lyrics.value) {
        return { rawLrc: plain.data.lyrics.value };
      }
    } catch (e) {}
    return null;
  },
  async getAlbumInfo(albumItem, page) {
    if (page > 1) {
      return { isEnd: true, musicList: [] };
    }
    const res = await request("getAlbum", { id: albumItem.id });
    const album = res.data.album || {};
    const songs = album.song || [];
    return {
      isEnd: true,
      albumItem: mapAlbum(album, res.baseUrl, res.auth),
      musicList: songs.map(function (item) {
        return mapSong(item, res.baseUrl, res.auth);
      }),
    };
  },
  async getMusicSheetInfo(sheetItem, page) {
    const sheetId = String(sheetItem.id);
    if (sheetId.indexOf("album:") === 0) {
      if (page > 1) {
        return { isEnd: true, musicList: [] };
      }
      const albumId = sheetId.slice(6);
      const res = await request("getAlbum", { id: albumId });
      const album = res.data.album || {};
      const songs = album.song || [];
      return {
        isEnd: true,
        sheetItem: mapAlbumAsSheet(album, res.baseUrl, res.auth),
        musicList: songs.map(function (item) {
          return mapSong(item, res.baseUrl, res.auth);
        }),
      };
    }
    const res = await request("getPlaylist", { id: sheetId });
    const playlist = res.data.playlist || {};
    const entries = playlist.entry || [];
    const start = paginateOffset(page);
    const slice = entries.slice(start, start + PAGE_SIZE);
    return {
      isEnd: start + slice.length >= entries.length,
      sheetItem: mapPlaylist(playlist, res.baseUrl, res.auth),
      musicList: slice.map(function (item) {
        return mapSong(item, res.baseUrl, res.auth);
      }),
    };
  },
  async getArtistWorks(artistItem, page, type) {
    const res = await request("getArtist", { id: artistItem.id });
    const artist = res.data.artist || {};
    const albums = artist.album || [];
    if (type === "album") {
      const start = paginateOffset(page);
      const slice = albums.slice(start, start + PAGE_SIZE);
      return {
        isEnd: start + slice.length >= albums.length,
        data: slice.map(function (item) {
          return mapAlbum(item, res.baseUrl, res.auth);
        }),
      };
    }
    const musicList = [];
    for (let i = 0; i < albums.length; i++) {
      const albumResp = await request("getAlbum", { id: albums[i].id });
      const songs = (albumResp.data.album && albumResp.data.album.song) || [];
      for (let j = 0; j < songs.length; j++) {
        musicList.push(mapSong(songs[j], albumResp.baseUrl, albumResp.auth));
      }
    }
    const start = paginateOffset(page);
    const slice = musicList.slice(start, start + PAGE_SIZE);
    return {
      isEnd: start + slice.length >= musicList.length,
      data: slice,
    };
  },
  async getRecommendSheetTags() {
    // 与移动端首页 SongFeed 一致：分类单曲列表
    return {
      pinned: [
        { id: "喜欢", title: "喜欢", platform: PLATFORM },
        { id: "全部", title: "全部", platform: PLATFORM },
        { id: "收藏", title: "收藏", platform: PLATFORM },
        { id: "车载", title: "车载", platform: PLATFORM },
        { id: "听腻了", title: "听腻了", platform: PLATFORM },
      ],
      data: [],
    };
  },
  async getRecommendSheetsByTag() {
    // Navidrome 热门歌单走歌曲列表（getTopListDetail），此处占位
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
    page = page || 1;
    const id = String(topListItem && topListItem.id);

    if (id === "全部" || id === "songs-all" || id === "songs-recent") {
      const res = await request("search3", {
        query: "",
        songCount: PAGE_SIZE,
        albumCount: 0,
        artistCount: 0,
        songOffset: paginateOffset(page),
      });
      const songs =
        (res.data.searchResult3 && res.data.searchResult3.song) || [];
      return {
        isEnd: songs.length < PAGE_SIZE,
        musicList: songs.map(function (item) {
          return mapSong(item, res.baseUrl, res.auth);
        }),
      };
    }

    if (
      id === "喜欢" ||
      id === "收藏" ||
      id === "车载" ||
      id === "听腻了" ||
      id.indexOf("playlist:") === 0
    ) {
      const name = id.indexOf("playlist:") === 0 ? id.slice(9) : id;
      const playlist = await findOrCreatePlaylistByName(name);
      const res = await request("getPlaylist", { id: playlist.id });
      const entries = (res.data.playlist && res.data.playlist.entry) || [];
      const start = paginateOffset(page);
      const slice = entries.slice(start, start + PAGE_SIZE);
      return {
        isEnd: start + slice.length >= entries.length,
        musicList: slice.map(function (item) {
          return mapSong(item, res.baseUrl, res.auth);
        }),
      };
    }

    if (id === "songs-starred" || id === "starred") {
      const res = await request("getStarred2");
      const songs = (res.data.starred2 && res.data.starred2.song) || [];
      const start = paginateOffset(page);
      const slice = songs.slice(start, start + PAGE_SIZE);
      return {
        isEnd: start + slice.length >= songs.length,
        musicList: slice.map(function (item) {
          return mapSong(item, res.baseUrl, res.auth);
        }),
      };
    }

    if (id === "songs-random") {
      const res = await request("getRandomSongs", { size: PAGE_SIZE });
      const songs =
        (res.data.randomSongs && res.data.randomSongs.song) || [];
      return {
        isEnd: true,
        musicList: songs.map(function (item) {
          return mapSong(item, res.baseUrl, res.auth);
        }),
      };
    }

    try {
      const res = await request("getPlaylist", { id: id });
      if (res.data.playlist) {
        const entries = res.data.playlist.entry || [];
        const start = paginateOffset(page);
        const slice = entries.slice(start, start + PAGE_SIZE);
        return {
          isEnd: start + slice.length >= entries.length,
          musicList: slice.map(function (item) {
            return mapSong(item, res.baseUrl, res.auth);
          }),
        };
      }
    } catch (e) {
      // fallthrough
    }

    return { isEnd: true, musicList: [] };
  },
  async importMusicSheet(urlLike) {
    const text = (urlLike || "").trim();
    let playlistId = text;
    const idMatch =
      text.match(/[?&]id=([^&]+)/i) || text.match(/playlist\/([^/?#]+)/i);
    if (idMatch && idMatch[1]) {
      playlistId = decodeURIComponent(idMatch[1]);
    }
    const res = await request("getPlaylist", { id: playlistId });
    const entries = (res.data.playlist && res.data.playlist.entry) || [];
    return entries.map(function (item) {
      return mapSong(item, res.baseUrl, res.auth);
    });
  },
};
