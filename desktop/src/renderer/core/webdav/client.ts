/** OpenList / AList WebDAV —— 复用项目已有 webdav 包 */
import { AuthType, createClient, FileStat } from "webdav";

export type WebDavConfig = {
    baseUrl: string;
    username: string;
    password: string;
};

export type WebDavEntry = {
    name: string;
    path: string;
    isDir: boolean;
    size: number;
    contentType: string;
    lastModified: string;
};

const STORAGE_KEY = "ralphmusic.webdav.config";

export function loadWebDavConfig(): WebDavConfig | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as WebDavConfig;
        if (!parsed?.baseUrl) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function saveWebDavConfig(config: WebDavConfig | null) {
    if (!config) {
        localStorage.removeItem(STORAGE_KEY);
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function makeClient(cfg: WebDavConfig) {
    return createClient(cfg.baseUrl.trim().replace(/\/+$/, ""), {
        authType: AuthType.Password,
        username: cfg.username || "",
        password: cfg.password || "",
    });
}

function mapStat(item: FileStat): WebDavEntry {
    const isDir = item.type === "directory";
    let path = item.filename || "/";
    if (!path.startsWith("/")) {
        path = `/${path}`;
    }
    if (isDir && !path.endsWith("/")) {
        path = `${path}/`;
    }
    return {
        name: item.basename || path.split("/").filter(Boolean).pop() || path,
        path,
        isDir,
        size: Number(item.size) || 0,
        contentType: item.mime || "",
        lastModified: item.lastmod || "",
    };
}

export async function webdavList(
    cfg: WebDavConfig,
    path = "/",
): Promise<WebDavEntry[]> {
    const client = makeClient(cfg);
    const dir = path || "/";
    const result = await client.getDirectoryContents(dir);
    const list = (Array.isArray(result) ? result : (result as any).data) as FileStat[];
    const entries = (list || []).map(mapStat);
    entries.sort((a, b) => {
        if (a.isDir !== b.isDir) {
            return a.isDir ? -1 : 1;
        }
        return a.name.localeCompare(b.name, "zh");
    });
    return entries;
}

export async function webdavDelete(cfg: WebDavConfig, path: string) {
    const client = makeClient(cfg);
    await client.deleteFile(path);
}

export async function webdavMkcol(cfg: WebDavConfig, path: string) {
    const client = makeClient(cfg);
    await client.createDirectory(path);
}

export async function webdavUpload(
    cfg: WebDavConfig,
    path: string,
    data: ArrayBuffer | Buffer | string,
) {
    const client = makeClient(cfg);
    await client.putFileContents(path, data as any, { overwrite: true });
}

export async function webdavDownload(
    cfg: WebDavConfig,
    path: string,
): Promise<ArrayBuffer> {
    const client = makeClient(cfg);
    const data = await client.getFileContents(path, { format: "binary" });
    if (data instanceof ArrayBuffer) {
        return data;
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
        return data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength,
        );
    }
    if (data instanceof Uint8Array) {
        return data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength,
        );
    }
    return new Uint8Array(data as any).buffer;
}

export function isAudioFile(name: string) {
    return /\.(mp3|flac|wav|aac|m4a|ogg|wma|ape|dsf|dff)$/i.test(name);
}

export function formatSize(n: number) {
    if (!n || n < 0) {
        return "-";
    }
    if (n < 1024) {
        return `${n} B`;
    }
    if (n < 1024 * 1024) {
        return `${(n / 1024).toFixed(1)} KB`;
    }
    if (n < 1024 * 1024 * 1024) {
        return `${(n / 1024 / 1024).toFixed(1)} MB`;
    }
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
