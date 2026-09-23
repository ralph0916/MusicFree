import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import { IWindowManager } from "@/types/main/window-manager";
import fs from "fs/promises";
import path from "path";
import { appUpdateSources } from "@/common/constant";
import axios from "axios";
import { compare } from "compare-versions";

class Utils {
    private windowManager: IWindowManager;
    private flacPendingName = "";

    public setup(windowManager: IWindowManager) {
        this.windowManager = windowManager;

        this.setupAppUtil();
        this.setupWindowUtil();
        this.setupShellUtil();
        this.setupDialogUtil();
        this.setupFlacDownload();
    }


    private setupAppUtil() {
        ipcMain.on("@shared/utils/exit-app", () => {
            app.exit(0);
        });

        ipcMain.handle("@shared/utils/app-get-path", (_, pathName) => {
            return app.getPath(pathName);
        });

        ipcMain.handle("@shared/utils/check-update", async () => {
            const currentVersion = app.getVersion();
            const updateInfo: ICommon.IUpdateInfo = {
                version: currentVersion,
            };
            for (let i = 0; i < appUpdateSources.length; ++i) {
                try {
                    const rawInfo = (await axios.get(appUpdateSources[i])).data;
                    if (compare(rawInfo.version, currentVersion, ">")) {
                        updateInfo.update = rawInfo;
                        return updateInfo;
                    }
                } catch {
                    // pass
                }
            }
            return updateInfo;
        });

        ipcMain.on("@shared/utils/clear-cache", () => {
            const mainWindow = this.windowManager.mainWindow;
            if (mainWindow) {
                mainWindow.webContents.session.clearCache?.();
            }
        });

        ipcMain.handle("@shared/utils/get-cache-size", async () => {
            const mainWindow = this.windowManager.mainWindow;
            if (mainWindow) {
                return mainWindow.webContents.session.getCacheSize?.();
            }
            return NaN;
        });

        // 主进程发请求，才能读到 Set-Cookie（渲染进程会被浏览器屏蔽）
        ipcMain.handle("@shared/utils/http-request", async (_, options: {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            params?: Record<string, any>;
            data?: any;
            responseType?: "json" | "text" | "arraybuffer";
            timeout?: number;
            maxRedirects?: number;
        }) => {
            const responseType = options.responseType || "json";
            const collectedCookies: string[] = [];
            const response = await axios({
                url: options.url,
                method: (options.method || "GET") as any,
                headers: {
                    ...(options.headers || {}),
                },
                params: options.params,
                data: options.data,
                responseType: responseType === "arraybuffer" ? "arraybuffer" : undefined,
                timeout: options.timeout ?? 20000,
                validateStatus: () => true,
                maxRedirects: options.maxRedirects ?? 5,
                beforeRedirect: (redirectOptions, responseDetails) => {
                    const h: any = responseDetails?.headers || {};
                    const raw = h["set-cookie"] || h["Set-Cookie"];
                    if (raw) {
                        (Array.isArray(raw) ? raw : [raw]).forEach((item: string) => {
                            const part = String(item).split(";")[0].trim();
                            if (part) {
                                collectedCookies.push(part);
                            }
                        });
                    }
                },
            });
            const headers: any = response.headers || {};
            let setCookie: string[] = [...collectedCookies];
            if (typeof headers.getSetCookie === "function") {
                setCookie = setCookie.concat(headers.getSetCookie() || []);
            } else {
                const raw =
                    headers["set-cookie"] ||
                    headers["Set-Cookie"] ||
                    headers["SET-COOKIE"];
                if (raw) {
                    setCookie = setCookie.concat(Array.isArray(raw) ? raw : [raw]);
                }
            }
            setCookie = setCookie
                .map((item: string) => String(item).split(";")[0].trim())
                .filter(Boolean);
            // 去重（保留后者）
            const cookieMap = new Map<string, string>();
            setCookie.forEach((item) => {
                const idx = item.indexOf("=");
                if (idx > 0) {
                    cookieMap.set(item.slice(0, idx), item.slice(idx + 1));
                }
            });
            setCookie = Array.from(cookieMap.entries()).map(
                ([k, v]) => `${k}=${v}`,
            );
            let data: any = response.data;
            if (responseType === "arraybuffer") {
                data = Buffer.from(response.data).toString("base64");
            }
            return {
                status: response.status,
                data,
                setCookie,
            };
        });
    }

    private setupWindowUtil() {
        ipcMain.on("@shared/utils/min-main-window", (_, { skipTaskBar }) => {
            const mainWindow = this.windowManager.mainWindow;
            if (mainWindow) {
                if (skipTaskBar) {
                    mainWindow.hide();
                    mainWindow.setSkipTaskbar(true);
                } else {
                    mainWindow.minimize();
                }
            }
        });

        ipcMain.on("@shared/utils/show-main-window", () => {
            this.windowManager.showMainWindow();
        });

        ipcMain.on("@shared/utils/set-lyric-window", (_, enabled) => {
            if (enabled) {
                this.windowManager.showLyricWindow();
            } else {
                this.windowManager.closeLyricWindow();
            }
        });

        ipcMain.on("@shared/utils/set-minimode-window", (_, enabled) => {
            if (enabled) {
                this.windowManager.showMiniModeWindow();
            } else {
                this.windowManager.closeMiniModeWindow();
            }
        });


        ipcMain.on("@shared/utils/ignore-mouse-event", (evt, ignore) => {
            const targetWindow = BrowserWindow.fromWebContents(evt.sender);
            if (!targetWindow) {
                return;
            }
            targetWindow.setIgnoreMouseEvents(ignore, {
                forward: true,
            });
        });

        ipcMain.on("@shared/utils/toggle-maximize-main-window", () => {
            const mainWindow = this.windowManager.mainWindow;

            if (mainWindow) {
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                } else {
                    mainWindow.maximize();
                }
            }
        });

        ipcMain.on("@shared/utils/toggle-main-window-visible", () => {
            const mainWindow = this.windowManager.mainWindow;

            if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
                mainWindow.show();
            } else {
                mainWindow.hide();
                mainWindow.setSkipTaskbar(true);
            }
        });

    }

    private setupShellUtil() {
        ipcMain.on("@shared/utils/open-url", (_, url) => {
            shell.openExternal(url);
        });

        ipcMain.on("@shared/utils/open-path", (_, path) => {
            shell.openPath(path);
        });

        ipcMain.handle("@shared/utils/show-item-in-folder", async (_, path) => {
            try {
                await fs.stat(path);
                shell.showItemInFolder(path);
                return true;
            } catch {
                return false;
            }
        });
    }

    private setupDialogUtil() {
        ipcMain.handle("@shared/utils/show-open-dialog", async (_, options) => {
            const mainWindow = this.windowManager.mainWindow;
            if (!mainWindow) {
                throw new Error("Invalid Window");
            }
            return dialog.showOpenDialog(options);
        });

        ipcMain.handle("@shared/utils/show-save-dialog", async (_, options) => {
            const mainWindow = this.windowManager.mainWindow;
            if (!mainWindow) {
                throw new Error("Invalid Window");
            }
            return dialog.showSaveDialog(options);
        });
    }

    private setupFlacDownload() {
        ipcMain.on("@shared/utils/flac-set-download-name", (_, name: string) => {
            this.flacPendingName = String(name || "").trim();
        });

        const sanitize = (name: string) =>
            name
                .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 120);

        try {
            const flacSession = session.fromPartition("persist:flac-download");
            flacSession.setPermissionRequestHandler((_wc, _permission, callback) => {
                callback(true);
            });
            flacSession.on("will-download", (_event, item) => {
                const original = item.getFilename() || "download.flac";
                const ext = path.extname(original) || ".flac";
                const base = sanitize(
                    (this.flacPendingName || original.replace(ext, "")).replace(
                        /\.[a-z0-9]{2,5}$/i,
                        "",
                    ),
                );
                const finalName = `${base || "download"}${ext}`;
                const savePath = path.join(app.getPath("downloads"), finalName);
                item.setSavePath(savePath);
                this.flacPendingName = "";

                // 关闭可能残留的空白子窗口
                const closeBlank = () => {
                    BrowserWindow.getAllWindows().forEach((win) => {
                        try {
                            if (win === this.windowManager.mainWindow) {
                                return;
                            }
                            const url = win.webContents.getURL();
                            if (!url || url === "about:blank") {
                                win.close();
                            }
                        } catch {
                            // ignore
                        }
                    });
                };
                closeBlank();
                item.once("done", () => {
                    closeBlank();
                });
            });
        } catch {
            // ignore
        }
    }

}

export default new Utils();
