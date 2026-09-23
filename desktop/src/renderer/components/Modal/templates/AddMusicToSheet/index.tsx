import { useEffect, useMemo, useState } from "react";
import MusicSheet, { defaultSheet } from "@/renderer/core/music-sheet";
import Base from "../Base";
import "./index.scss";
import { setFallbackAlbum } from "@/renderer/utils/img-on-error";
import albumImg from "@/assets/imgs/album-cover.jpg";
import addImg from "@/assets/imgs/add.png";
import { hideModal, showModal } from "../..";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import classNames from "@/renderer/utils/classnames";
import {
    addSongsToNavidromePlaylist,
    getNavidromePlaylistIdsContainingSongs,
    getNavidromePlaylists,
    removeSongsFromNavidromePlaylist,
} from "@/renderer/core/like/navidromeLike";
import {
    addSongsToNeteasePlaylist,
    getNeteasePlaylistIdsContainingSongs,
    getNeteaseUserPlaylists,
    removeSongsFromNeteasePlaylist,
} from "@/renderer/core/auth/neteasePlaylists";
import {
    addSongsToQqPlaylist,
    fetchQqUserPlaylists,
    getQqPlaylistIdsContainingSongs,
    removeSongsFromQqPlaylist,
} from "@/renderer/core/auth/qqPlaylists";
import { isNeteaseLoggedIn } from "@/renderer/core/auth/neteaseAuth";
import { isQqLoggedIn } from "@/renderer/core/auth/qqAuth";

interface IAddMusicToSheetProps {
    musicItems: IMusic.IMusicItem | IMusic.IMusicItem[];
}

const NAVIDROME = "Navidrome";
const NETEASE = "网易云";
const QQ = "QQ音乐";

function normalizeItems(
    musicItems: IMusic.IMusicItem | IMusic.IMusicItem[],
) {
    return Array.isArray(musicItems) ? musicItems : [musicItems];
}

function supportsRemote(platform?: string) {
    return (
        platform === NAVIDROME || platform === NETEASE || platform === QQ
    );
}

export default function AddMusicToSheet(props: IAddMusicToSheetProps) {
    const { musicItems } = props;
    const { t } = useTranslation();
    const items = useMemo(() => normalizeItems(musicItems), [musicItems]);
    const platform = items[0]?.platform || "";
    const remote = supportsRemote(platform);

    const allSheets = MusicSheet.frontend.useAllSheets();
    const [sheets, setSheets] = useState<IMusic.IMusicSheetItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [initialSelected, setInitialSelected] = useState<Set<string>>(
        new Set(),
    );
    const [loading, setLoading] = useState(remote);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!remote) {
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                let list: IMusic.IMusicSheetItem[] = [];
                const songIds = items.map((i) => String(i.id));
                let containing = new Set<string>();

                if (platform === NAVIDROME) {
                    list = await getNavidromePlaylists();
                    list = list.filter(
                        (s) => s.title !== "全部" && s.id !== "全部",
                    );
                    containing =
                        await getNavidromePlaylistIdsContainingSongs(songIds);
                } else if (platform === NETEASE) {
                    if (!isNeteaseLoggedIn()) {
                        throw new Error("请先登录网易云账号");
                    }
                    list = await getNeteaseUserPlaylists();
                    containing =
                        await getNeteasePlaylistIdsContainingSongs(songIds);
                } else if (platform === QQ) {
                    if (!isQqLoggedIn()) {
                        throw new Error("请先登录 QQ 音乐");
                    }
                    list = await fetchQqUserPlaylists();
                    containing =
                        await getQqPlaylistIdsContainingSongs(songIds);
                }
                if (!cancelled) {
                    setSheets(list);
                    setSelected(new Set(containing));
                    setInitialSelected(new Set(containing));
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message || "歌单加载失败");
                    setSheets([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [remote, platform, items]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const onConfirmRemote = async () => {
        if (submitting) {
            return;
        }
        const toAdd = [...selected].filter((id) => !initialSelected.has(id));
        const toRemove = [...initialSelected].filter(
            (id) => !selected.has(id),
        );
        if (toAdd.length === 0 && toRemove.length === 0) {
            hideModal();
            return;
        }
        setSubmitting(true);
        try {
            const songIds = items.map((i) => String(i.id));
            if (platform === NAVIDROME) {
                for (const playlistId of toRemove) {
                    await removeSongsFromNavidromePlaylist(
                        playlistId,
                        songIds,
                    );
                }
                for (const playlistId of toAdd) {
                    await addSongsToNavidromePlaylist(playlistId, songIds);
                }
            } else if (platform === NETEASE) {
                for (const playlistId of toRemove) {
                    await removeSongsFromNeteasePlaylist(playlistId, songIds);
                }
                for (const playlistId of toAdd) {
                    await addSongsToNeteasePlaylist(playlistId, songIds);
                }
            } else if (platform === QQ) {
                for (const playlistId of toRemove) {
                    await removeSongsFromQqPlaylist(playlistId, songIds);
                }
                for (const playlistId of toAdd) {
                    await addSongsToQqPlaylist(playlistId, songIds);
                }
            }
            const parts: string[] = [];
            if (toAdd.length) {
                parts.push(`加入 ${toAdd.length} 个`);
            }
            if (toRemove.length) {
                parts.push(`移出 ${toRemove.length} 个`);
            }
            toast.success(`已${parts.join("，")}歌单`);
            hideModal();
        } catch (e: any) {
            toast.warn(e?.message || "操作失败");
        } finally {
            setSubmitting(false);
        }
    };

    if (remote) {
        return (
            <Base withBlur={false}>
                <div className="modal--add-music-to-sheet-container shadow backdrop-color remote">
                    <Base.Header>
                        <span>
                            加入歌单{" "}
                            <span className="music-length">
                                （{items.length} 首）
                            </span>
                        </span>
                    </Base.Header>
                    <div className="remote-hint">
                        已在歌单中的会自动勾选；取消勾选并确定后将从该歌单移除
                    </div>
                    {error ? (
                        <div className="remote-error">{error}</div>
                    ) : null}
                    <div className="music-sheets remote-sheets">
                        {loading ? (
                            <div className="remote-empty">加载中…</div>
                        ) : sheets.length === 0 ? (
                            <div className="remote-empty">暂无可加入的歌单</div>
                        ) : (
                            sheets.map((sheet) => {
                                const id = String(sheet.id);
                                const checked = selected.has(id);
                                return (
                                    <div
                                        className={classNames({
                                            "sheet-item": true,
                                            checked,
                                        })}
                                        key={id}
                                        role="button"
                                        onClick={() => toggle(id)}
                                    >
                                        <img
                                            src={
                                                sheet.coverImg ||
                                                sheet.artwork ||
                                                albumImg
                                            }
                                            onError={setFallbackAlbum}
                                            alt=""
                                        />
                                        <div className="sheet-meta">
                                            <span className="sheet-title">
                                                {sheet.title}
                                            </span>
                                            {sheet.worksNum ? (
                                                <span className="sheet-count">
                                                    {sheet.worksNum} 首
                                                </span>
                                            ) : null}
                                        </div>
                                        <span
                                            className={classNames({
                                                "check-mark": true,
                                                on: checked,
                                            })}
                                        >
                                            {checked ? "✓" : ""}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="remote-footer">
                        <button
                            type="button"
                            data-type="normalButton"
                            onClick={() => hideModal()}
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            data-type="primaryButton"
                            disabled={submitting || loading}
                            onClick={onConfirmRemote}
                        >
                            {submitting
                                ? "加入中…"
                                : selected.size
                                  ? `确定(${selected.size})`
                                  : "完成"}
                        </button>
                    </div>
                </div>
            </Base>
        );
    }

    return (
        <Base withBlur={false}>
            <div className="modal--add-music-to-sheet-container shadow backdrop-color">
                <Base.Header>
                    <span>
                        {t("modal.add_to_my_sheets")}{" "}
                        <span className="music-length">
                            (
                            <Trans
                                i18nKey={"modal.total_music_num"}
                                values={{
                                    number: items.length,
                                }}
                            ></Trans>
                            )
                        </span>
                    </span>
                </Base.Header>
                <div className="music-sheets">
                    <div
                        className="sheet-item"
                        role="button"
                        onClick={() => {
                            showModal("AddNewSheet", {
                                initMusicItems: musicItems,
                            });
                        }}
                    >
                        <img src={addImg}></img>
                        <span>{t("modal.create_local_sheet")}</span>
                    </div>
                    {allSheets.map((sheet) => (
                        <div
                            className="sheet-item"
                            key={sheet.id}
                            role="button"
                            onClick={() => {
                                MusicSheet.frontend.addMusicToSheet(
                                    musicItems,
                                    sheet.id,
                                );
                                hideModal();
                            }}
                        >
                            <img
                                src={sheet.artwork ?? albumImg}
                                onError={setFallbackAlbum}
                            ></img>
                            <span>
                                {sheet.id === defaultSheet.id
                                    ? t("media.default_favorite_sheet_name")
                                    : sheet.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Base>
    );
}
