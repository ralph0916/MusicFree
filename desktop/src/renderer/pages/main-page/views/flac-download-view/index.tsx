import { useEffect, useRef, useState } from "react";
import "./index.scss";
import { toast } from "react-toastify";
import { appUtil } from "@shared/utils/renderer";

const FLAC_DOWNLOAD_URL = "https://flac.music.hi.cn/";

export default function FlacDownloadView() {
    const webRef = useRef<any>(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const web = webRef.current;
        if (!web) {
            return;
        }

        const injectClickHook = async () => {
            try {
                await web.executeJavaScript(`
                  (function () {
                    if (window.__ralphFlacHooked) return true;
                    window.__ralphFlacHooked = true;
                    document.addEventListener('click', async function (e) {
                      try {
                        var el = e.target;
                        if (!el) return;
                        var node = el.closest ? el.closest('button,a,span,div') : el;
                        var text = ((node && node.textContent) || '').trim();
                        var isDownload = /下载|download/i.test(text) ||
                          (node && /download/i.test(node.className || '')) ||
                          (node && node.getAttribute && /download/i.test(node.getAttribute('title') || ''));
                        if (!isDownload) return;
                        var btns = Array.from(document.querySelectorAll('button,a,span,div'));
                        var copyBtn = btns.find(function (b) {
                          return /复制名称|复制文件名|复制歌名/.test((b.textContent || '').trim());
                        });
                        if (copyBtn) {
                          copyBtn.click();
                          await new Promise(function (r) { setTimeout(r, 150); });
                        }
                        var name = '';
                        try { name = (await navigator.clipboard.readText() || '').trim(); } catch (err) {}
                        if (name) {
                          console.log('__FLAC_COPY_NAME__:' + name);
                        }
                      } catch (err) {}
                    }, true);
                    return true;
                  })();
                `);
            } catch {
                // ignore
            }
        };

        const onDomReady = () => {
            injectClickHook();
        };

        const onConsole = (e: any) => {
            const msg = String(e?.message || "");
            const m = msg.match(/__FLAC_COPY_NAME__:(.+)$/);
            if (m?.[1]) {
                appUtil.flacSetDownloadName(m[1].trim());
            }
        };

        const onNewWindow = (e: any) => {
            e.preventDefault?.();
        };

        web.addEventListener("dom-ready", onDomReady);
        web.addEventListener("console-message", onConsole);
        web.addEventListener("new-window", onNewWindow);

        return () => {
            try {
                web.removeEventListener("dom-ready", onDomReady);
                web.removeEventListener("console-message", onConsole);
                web.removeEventListener("new-window", onNewWindow);
            } catch {
                // ignore
            }
        };
    }, [reloadKey]);

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
                        toast.info("已重新打开页面");
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
                allowpopups={"false" as any}
                partition="persist:flac-download"
            />
        </div>
    );
}
