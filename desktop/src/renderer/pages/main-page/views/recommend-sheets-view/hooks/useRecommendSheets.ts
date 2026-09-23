import { RequestStateCode } from "@/common/constant";
import { resetMediaItem } from "@/common/media-util";
import { useCallback, useEffect, useRef, useState } from "react";
import PluginManager from "@shared/plugin-manager/renderer";
import { fetchQqUserPlaylists } from "@/renderer/core/auth/qqPlaylists";
import { isQqLoggedIn } from "@/renderer/core/auth/qqAuth";
import { toast } from "react-toastify";

export default function (plugin: IPlugin.IPluginDelegate, tag: IMedia.IUnique | null) {
    const [sheets, setSheets] = useState<IMusic.IMusicSheetItem[]>([]);
    const [status, setStatus] = useState<RequestStateCode>(RequestStateCode.IDLE);
    const currentTagRef = useRef<string>();
    const pageRef = useRef(0);

    const query = useCallback(async () => {
        if (!tag) {
            return;
        }
        if (
            (RequestStateCode.PENDING_FIRST_PAGE & status ||
                RequestStateCode.FINISHED === status) &&
            currentTagRef.current === tag.id
        ) {
            return;
        }
        if (currentTagRef.current !== tag.id) {
            setSheets([]);
            pageRef.current = 0;
        }
        pageRef.current++;
        currentTagRef.current = tag.id;

        setStatus(
            pageRef.current === 1
                ? RequestStateCode.PENDING_FIRST_PAGE
                : RequestStateCode.PENDING_REST_PAGE,
        );

        try {
            // QQ：用渲染进程登录 Cookie 直拉，避免插件侧 Cookie 未同步导致空列表
            if (
                plugin.platform === "QQ音乐" &&
                (tag.id === "mine" || tag.id === "" || !tag.id)
            ) {
                if (!isQqLoggedIn()) {
                    toast.warn("请先登录 QQ 音乐账号");
                    setSheets([]);
                    setStatus(RequestStateCode.FINISHED);
                    return;
                }
                const list = await fetchQqUserPlaylists();
                if (tag.id === currentTagRef.current) {
                    setSheets(
                        list.map((item) =>
                            resetMediaItem(item as any, plugin.platform),
                        ),
                    );
                }
                if (!list.length) {
                    toast.warn(
                        "未获取到 QQ 歌单，请确认已登录且 Cookie 含 qm_keyst，可尝试重新登录",
                    );
                }
                setStatus(RequestStateCode.FINISHED);
                return;
            }

            const res = await PluginManager.callPluginDelegateMethod(
                plugin,
                "getRecommendSheetsByTag",
                tag,
                pageRef.current,
            );

            if (tag.id === currentTagRef.current) {
                setSheets((prev) => [
                    ...prev,
                    ...(res.data || []).map((item) =>
                        resetMediaItem(item, plugin.platform),
                    ),
                ]);
            }

            if (res.isEnd) {
                setStatus(RequestStateCode.FINISHED);
            } else {
                setStatus(RequestStateCode.PARTLY_DONE);
            }
        } catch (e: any) {
            toast.warn(e?.message || "加载歌单失败");
            setStatus(RequestStateCode.FINISHED);
            if (pageRef.current === 1) {
                setSheets([]);
            }
        }
    }, [tag, status, plugin]);

    useEffect(() => {
        if (tag) {
            query();
        }
    }, [tag]);

    return [query, sheets, status] as const;
}
