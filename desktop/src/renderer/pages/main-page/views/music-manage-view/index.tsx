import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import SvgAsset from "@/renderer/components/SvgAsset";
import {
    formatSize,
    isAudioFile,
    loadWebDavConfig,
    saveWebDavConfig,
    webdavDelete,
    webdavDownload,
    webdavList,
    webdavMkcol,
    webdavUpload,
    WebDavConfig,
    WebDavEntry,
} from "@/renderer/core/webdav/client";
import "./index.scss";

function joinPath(dir: string, name: string) {
    const base = dir.endsWith("/") ? dir : `${dir}/`;
    return `${base}${name}`.replace(/\/+/g, "/");
}

export default function MusicManageView() {
    const [cfg, setCfg] = useState<WebDavConfig>(() => {
        return (
            loadWebDavConfig() || {
                baseUrl: "",
                username: "",
                password: "",
            }
        );
    });
    const [draft, setDraft] = useState<WebDavConfig>(cfg);
    const [showSettings, setShowSettings] = useState(!cfg.baseUrl);
    const [path, setPath] = useState("/");
    const [entries, setEntries] = useState<WebDavEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const crumbs = useMemo(() => {
        const parts = path.split("/").filter(Boolean);
        const list = [{ name: "根目录", path: "/" }];
        let acc = "";
        parts.forEach((p) => {
            acc += `/${p}`;
            list.push({ name: p, path: `${acc}/` });
        });
        return list;
    }, [path]);

    const refresh = useCallback(async (targetPath?: string) => {
        const current = loadWebDavConfig();
        if (!current?.baseUrl) {
            setShowSettings(true);
            return;
        }
        const p = targetPath ?? path;
        setLoading(true);
        try {
            const list = await webdavList(current, p);
            setEntries(list);
            setPath(p.endsWith("/") || p === "/" ? p : `${p}/`);
        } catch (e: any) {
            toast.warn(e?.message || "加载目录失败，请检查 WebDAV 配置");
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [path]);

    useEffect(() => {
        if (cfg.baseUrl) {
            refresh("/");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const saveConfig = () => {
        if (!draft.baseUrl.trim()) {
            toast.warn("请填写 OpenList WebDAV 地址");
            return;
        }
        const next = {
            baseUrl: draft.baseUrl.trim().replace(/\/+$/, ""),
            username: draft.username.trim(),
            password: draft.password,
        };
        saveWebDavConfig(next);
        setCfg(next);
        setShowSettings(false);
        toast.success("配置已保存");
        setTimeout(() => refresh("/"), 0);
    };

    const onUpload = async (files: FileList | null) => {
        const current = loadWebDavConfig();
        if (!current?.baseUrl || !files?.length) {
            return;
        }
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const target = joinPath(path, file.name);
                const buf = await file.arrayBuffer();
                await webdavUpload(current, target, buf);
            }
            toast.success(`已上传 ${files.length} 个文件`);
            await refresh(path);
        } catch (e: any) {
            toast.warn(e?.message || "上传失败");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const onDelete = async (entry: WebDavEntry) => {
        const current = loadWebDavConfig();
        if (!current?.baseUrl) {
            return;
        }
        if (!window.confirm(`确定删除「${entry.name}」？`)) {
            return;
        }
        try {
            await webdavDelete(current, entry.path);
            toast.success("已删除");
            await refresh(path);
        } catch (e: any) {
            toast.warn(e?.message || "删除失败");
        }
    };

    const onMkdir = async () => {
        const current = loadWebDavConfig();
        if (!current?.baseUrl) {
            return;
        }
        const name = window.prompt("新建文件夹名称");
        if (!name?.trim()) {
            return;
        }
        try {
            await webdavMkcol(current, joinPath(path, name.trim()));
            toast.success("文件夹已创建");
            await refresh(path);
        } catch (e: any) {
            toast.warn(e?.message || "创建失败");
        }
    };

    const onPreview = async (entry: WebDavEntry) => {
        const current = loadWebDavConfig();
        if (!current?.baseUrl) {
            return;
        }
        try {
            const buf = await webdavDownload(current, entry.path);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            const blob = new Blob([buf]);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewName(entry.name);
        } catch (e: any) {
            toast.warn(e?.message || "读取失败");
        }
    };

    return (
        <div className="music-manage-view">
            <div className="music-manage-toolbar">
                <div className="music-manage-title">
                    <SvgAsset iconName="musical-note" size={20}></SvgAsset>
                    <span>音乐管理</span>
                    <span className="music-manage-sub">OpenList WebDAV</span>
                </div>
                <div className="music-manage-actions">
                    <button
                        type="button"
                        data-type="normalButton"
                        onClick={() => setShowSettings((v) => !v)}
                    >
                        {showSettings ? "关闭设置" : "连接设置"}
                    </button>
                    <button
                        type="button"
                        data-type="normalButton"
                        disabled={!cfg.baseUrl || loading}
                        onClick={() => refresh(path)}
                    >
                        刷新
                    </button>
                    <button
                        type="button"
                        data-type="normalButton"
                        disabled={!cfg.baseUrl || uploading}
                        onClick={onMkdir}
                    >
                        新建文件夹
                    </button>
                    <button
                        type="button"
                        data-type="primaryButton"
                        disabled={!cfg.baseUrl || uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? "上传中…" : "上传文件"}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="audio/*,.flac,.ape,.dsf,.dff"
                        style={{ display: "none" }}
                        onChange={(e) => onUpload(e.target.files)}
                    />
                </div>
            </div>

            {showSettings ? (
                <div className="music-manage-settings">
                    <div className="music-manage-settings-tip">
                        填写 OpenList 的 WebDAV 地址（通常以 /dav 结尾），配置后可浏览、上传、删除音乐文件。
                    </div>
                    <label>
                        <span>WebDAV 地址</span>
                        <input
                            value={draft.baseUrl}
                            placeholder="https://your-openlist.example/dav"
                            onChange={(e) =>
                                setDraft((d) => ({
                                    ...d,
                                    baseUrl: e.target.value,
                                }))
                            }
                        />
                    </label>
                    <label>
                        <span>用户名</span>
                        <input
                            value={draft.username}
                            onChange={(e) =>
                                setDraft((d) => ({
                                    ...d,
                                    username: e.target.value,
                                }))
                            }
                        />
                    </label>
                    <label>
                        <span>密码</span>
                        <input
                            type="password"
                            value={draft.password}
                            onChange={(e) =>
                                setDraft((d) => ({
                                    ...d,
                                    password: e.target.value,
                                }))
                            }
                        />
                    </label>
                    <div className="music-manage-settings-actions">
                        <button
                            type="button"
                            data-type="primaryButton"
                            onClick={saveConfig}
                        >
                            保存并连接
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="music-manage-crumbs">
                {crumbs.map((c, i) => (
                    <button
                        key={c.path}
                        type="button"
                        className="crumb"
                        onClick={() => refresh(c.path)}
                    >
                        {i > 0 ? <span className="sep">/</span> : null}
                        {c.name}
                    </button>
                ))}
            </div>

            <div className="music-manage-list">
                {loading ? (
                    <div className="music-manage-empty">加载中…</div>
                ) : entries.length === 0 ? (
                    <div className="music-manage-empty">
                        {cfg.baseUrl ? "当前目录为空" : "请先配置 WebDAV"}
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: "48%" }}>名称</th>
                                <th style={{ width: "14%" }}>大小</th>
                                <th style={{ width: "22%" }}>修改时间</th>
                                <th style={{ width: "16%" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {path !== "/" ? (
                                <tr
                                    className="clickable"
                                    onDoubleClick={() => {
                                        const parent =
                                            path
                                                .replace(/\/+$/, "")
                                                .split("/")
                                                .slice(0, -1)
                                                .join("/") || "/";
                                        refresh(
                                            parent.endsWith("/")
                                                ? parent
                                                : `${parent}/`,
                                        );
                                    }}
                                >
                                    <td colSpan={4}>
                                        <span className="entry-name">
                                            <SvgAsset
                                                iconName="folder-open"
                                                size={18}
                                            ></SvgAsset>
                                            ..
                                        </span>
                                    </td>
                                </tr>
                            ) : null}
                            {entries.map((entry) => (
                                <tr
                                    key={entry.path}
                                    className="clickable"
                                    onDoubleClick={() => {
                                        if (entry.isDir) {
                                            refresh(entry.path);
                                        } else if (isAudioFile(entry.name)) {
                                            onPreview(entry);
                                        }
                                    }}
                                >
                                    <td>
                                        <span className="entry-name">
                                            <SvgAsset
                                                iconName={
                                                    entry.isDir
                                                        ? "folder-open"
                                                        : "musical-note"
                                                }
                                                size={18}
                                            ></SvgAsset>
                                            {entry.name}
                                        </span>
                                    </td>
                                    <td>
                                        {entry.isDir
                                            ? "-"
                                            : formatSize(entry.size)}
                                    </td>
                                    <td>
                                        {entry.lastModified
                                            ? new Date(
                                                  entry.lastModified,
                                              ).toLocaleString()
                                            : "-"}
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            {!entry.isDir &&
                                            isAudioFile(entry.name) ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onPreview(entry)
                                                    }
                                                >
                                                    试听
                                                </button>
                                            ) : null}
                                            {entry.isDir ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        refresh(entry.path)
                                                    }
                                                >
                                                    打开
                                                </button>
                                            ) : null}
                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() => onDelete(entry)}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {previewUrl ? (
                <div className="music-manage-player">
                    <div className="player-name" title={previewName}>
                        {previewName}
                    </div>
                    <audio src={previewUrl} controls autoPlay />
                    <button
                        type="button"
                        onClick={() => {
                            URL.revokeObjectURL(previewUrl);
                            setPreviewUrl(null);
                            setPreviewName("");
                        }}
                    >
                        关闭
                    </button>
                </div>
            ) : null}
        </div>
    );
}
