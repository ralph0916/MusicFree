import { useMemo, useRef, useState } from "react";
import "./index.scss";
import { toast } from "react-toastify";

const STORAGE_KEY = "ralphmusic.musicTag.url";
const DEFAULT_MUSIC_TAG_URL = "https://ralphchen.myds.me:12831";

export default function MusicTagView() {
    const webRef = useRef<any>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saved, setSaved] = useState(
        () => localStorage.getItem(STORAGE_KEY) || "",
    );
    const [reloadKey, setReloadKey] = useState(0);

    const url = useMemo(() => {
        const custom = saved.trim().replace(/\/+$/, "");
        if (custom) {
            return custom;
        }
        return DEFAULT_MUSIC_TAG_URL;
    }, [saved]);

    const openEdit = () => {
        setDraft(url || DEFAULT_MUSIC_TAG_URL);
        setEditing(true);
    };

    const saveUrl = () => {
        let next = draft.trim().replace(/\/+$/, "");
        if (next && !/^https?:\/\//i.test(next)) {
            next = `http://${next}`;
        }
        if (next) {
            localStorage.setItem(STORAGE_KEY, next);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        setSaved(next);
        setEditing(false);
        setReloadKey((k) => k + 1);
        toast.success(next ? "MusicTag 地址已保存" : "已恢复默认地址");
    };

    if (editing) {
        return (
            <div className="music-tag-view">
                <div className="music-tag-edit">
                    <h2>MusicTag 服务地址</h2>
                    <p>
                        默认：{DEFAULT_MUSIC_TAG_URL}。可编辑 NAS
                        音乐的封面、歌词、标题、歌手等标签。
                    </p>
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={DEFAULT_MUSIC_TAG_URL}
                    />
                    <div className="music-tag-actions">
                        <button type="button" onClick={() => setEditing(false)}>
                            取消
                        </button>
                        <button type="button" className="primary" onClick={saveUrl}>
                            保存
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="music-tag-view">
            <div className="music-tag-toolbar">
                <span className="music-tag-url" title={url}>
                    {url}
                </span>
                <button
                    type="button"
                    onClick={() => {
                        try {
                            webRef.current?.reload?.();
                        } catch {
                            setReloadKey((k) => k + 1);
                        }
                    }}
                >
                    刷新
                </button>
                <button type="button" onClick={openEdit}>
                    设置
                </button>
            </div>
            {/* @ts-ignore electron webview */}
            <webview
                key={reloadKey}
                ref={webRef}
                className="music-tag-webview"
                src={url}
                allowpopups={"false" as any}
                partition="persist:music-tag"
            />
        </div>
    );
}
