import { useRef, useState } from "react";
import "./index.scss";

const FLAC_DOWNLOAD_URL = "https://flac.music.hi.cn/";

export default function FlacDownloadView() {
    const webRef = useRef<any>(null);
    const [reloadKey, setReloadKey] = useState(0);

    return (
        <div className="flac-download-view">
            <div className="flac-download-toolbar">
                <div className="flac-download-title">
                    <span className="flac-badge">FLAC</span>
                    <span className="flac-download-url" title={FLAC_DOWNLOAD_URL}>
                        无损音乐下载 · {FLAC_DOWNLOAD_URL}
                    </span>
                </div>
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
                <button
                    type="button"
                    className="primary"
                    onClick={() => {
                        setReloadKey((k) => k + 1);
                    }}
                >
                    重新打开
                </button>
            </div>
            {/* @ts-ignore electron webview */}
            <webview
                key={reloadKey}
                ref={webRef}
                className="flac-download-webview"
                src={FLAC_DOWNLOAD_URL}
                allowpopups={"true" as any}
            />
        </div>
    );
}
