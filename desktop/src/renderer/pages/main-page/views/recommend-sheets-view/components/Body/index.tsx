import { useEffect, useMemo, useState } from "react";
import "./index.scss";
import classNames from "@/renderer/utils/classnames";
import useRecommendListTags from "../../hooks/useRecommendListTags";
import TagPanel from "./tag-panel";
import useRecommendSheets from "../../hooks/useRecommendSheets";
import useRecommendSongs from "../../hooks/useRecommendSongs";
import MusicSheetlikeList from "@/renderer/components/MusicSheetlikeList";
import MusicList from "@/renderer/components/MusicList";
import Condition from "@/renderer/components/Condition";
import { RequestStateCode } from "@/common/constant";
import Loading from "@/renderer/components/Loading";
import { useNavigate } from "react-router-dom";
import { i18n } from "@/shared/i18n/renderer";
import { fetchNeteaseFeedTags } from "@/renderer/core/auth/neteasePlaylists";
import { isNeteaseLoggedIn } from "@/renderer/core/auth/neteaseAuth";
import { fetchQqFeedTags } from "@/renderer/core/auth/qqPlaylists";
import { isQqLoggedIn } from "@/renderer/core/auth/qqAuth";
import SongSortBar, {
    SongSortField,
    SortOrder,
    sortSongs,
} from "./SongSortBar";

export function getDefaultTag(): IMedia.IUnique {
    return {
        title: i18n.t("common.default"),
        id: "",
    };
}

interface IBodyProps {
    plugin: IPlugin.IPluginDelegate;
}

function isSongFeedPlugin(plugin: IPlugin.IPluginDelegate) {
    return (
        plugin.platform === "Navidrome" ||
        plugin.platform === "网易云" ||
        plugin.platform === "QQ音乐"
    );
}

function tagInList(list: IMedia.IUnique[] | undefined, id: string | number) {
    return !!list?.some((t) => String(t.id) === String(id));
}

export default function Body(props: IBodyProps) {
    const { plugin } = props;
    const songFeed = isSongFeedPlugin(plugin);
    const isNetease = plugin.platform === "网易云";
    const isQq = plugin.platform === "QQ音乐";
    const [selectedTag, setSelectedTag] = useState<IMedia.IUnique | null>(null);
    const [firstTag, setFirstTag] = useState<IMedia.IUnique>(getDefaultTag);
    const pluginTags = useRecommendListTags(plugin);
    const [feedTags, setFeedTags] = useState<IMedia.IUnique[] | null>(null);
    const [showPanel, setShowPanel] = useState(false);
    const [sortField, setSortField] = useState<SongSortField>("createTime");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    const tags = useMemo(() => {
        if (isNetease || isQq) {
            return {
                pinned: feedTags || [],
                data: [] as IMusic.IMusicSheetGroupItem[],
            };
        }
        return pluginTags;
    }, [isNetease, isQq, feedTags, pluginTags]);

    const [querySheets, sheets, sheetStatus] = useRecommendSheets(
        plugin,
        songFeed ? null : selectedTag,
    );
    const [querySongs, songs, songStatus] = useRecommendSongs(
        plugin,
        songFeed ? selectedTag : null,
    );

    const sortedSongs = useMemo(
        () => (songFeed ? sortSongs(songs, sortField, sortOrder) : songs),
        [songFeed, songs, sortField, sortOrder],
    );

    const navigate = useNavigate();
    const status = songFeed ? songStatus : sheetStatus;

    useEffect(() => {
        if (!isNetease && !isQq) {
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                if (isNetease) {
                    if (!isNeteaseLoggedIn()) {
                        if (!cancelled) {
                            setFeedTags([{ id: "daily", title: "每日推荐" }]);
                        }
                        return;
                    }
                    const list = await fetchNeteaseFeedTags();
                    if (!cancelled) {
                        setFeedTags(list);
                    }
                    return;
                }
                if (!isQqLoggedIn()) {
                    if (!cancelled) {
                        setFeedTags([
                            { id: "toplist:26", title: "热歌" },
                            { id: "toplist:27", title: "新歌" },
                            { id: "toplist:62", title: "飙升" },
                        ]);
                    }
                    return;
                }
                const list = await fetchQqFeedTags();
                if (!cancelled) {
                    setFeedTags(list);
                }
            } catch {
                if (!cancelled) {
                    setFeedTags([{ id: "daily", title: "每日推荐" }]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isNetease, isQq, plugin.hash]);

    useEffect(() => {
        setFeedTags(null);
        setSelectedTag(null);
        setSortField("createTime");
        setSortOrder("desc");
    }, [plugin.hash]);

    // 仅在未选中或当前选中已失效时初始化，避免点标签被打回第一个
    useEffect(() => {
        if (!tags) {
            return;
        }
        if ((isNetease || isQq) && !feedTags) {
            return;
        }
        const pinned = tags.pinned || [];

        setSelectedTag((prev) => {
            if (prev && tagInList(pinned, prev.id)) {
                return prev;
            }
            const cachedTag =
                history.state?.usr?.tag ?? (history.state as any)?.tag;
            if (cachedTag && tagInList(pinned, cachedTag.id)) {
                return cachedTag;
            }
            if (songFeed && pinned[0]) {
                setFirstTag(pinned[0]);
                return pinned[0];
            }
            const mine = pinned.find?.((it) => it.id === "mine");
            if (mine) {
                setFirstTag(mine);
                return mine;
            }
            return getDefaultTag();
        });
    }, [tags, songFeed, isNetease, isQq, feedTags]);

    const selectTag = (tag: IMedia.IUnique, asFirst = false) => {
        setSelectedTag(tag);
        if (asFirst) {
            setFirstTag(tag);
        }
        const usr = history.state?.usr ?? {};
        navigate("", {
            replace: true,
            state: {
                ...usr,
                tag,
            },
        });
    };

    return (
        <div className="recommend-sheet-view--body-container">
            <div className="tags-container">
                {!songFeed ? (
                    <TagPanel
                        show={showPanel}
                        tagsGroups={tags?.data}
                        onTagClick={(tag) => {
                            selectTag(tag, true);
                            setShowPanel(false);
                        }}
                    ></TagPanel>
                ) : null}
                {!songFeed ? (
                    <div
                        className={classNames({
                            "first-tag": true,
                            active: selectedTag?.id === firstTag.id,
                        })}
                        role="button"
                        data-panel-open={showPanel}
                        title={firstTag.title}
                        onClick={() => {
                            setShowPanel((prev) => !prev);
                        }}
                    >
                        {firstTag.title}
                    </div>
                ) : null}
                {tags?.pinned?.map?.((tag) => (
                    <div
                        key={String(tag.id)}
                        className={classNames({
                            "feed-tag": true,
                            active:
                                String(selectedTag?.id) === String(tag.id),
                        })}
                        role="button"
                        title={tag.title}
                        onClick={() => {
                            selectTag(tag);
                        }}
                    >
                        {tag.title}
                    </div>
                ))}
                {songFeed ? (
                    <SongSortBar
                        field={sortField}
                        order={sortOrder}
                        onChange={(f, o) => {
                            setSortField(f);
                            setSortOrder(o);
                        }}
                    ></SongSortBar>
                ) : null}
            </div>
            <div className="list-container">
                <Condition
                    condition={status !== RequestStateCode.PENDING_FIRST_PAGE}
                    falsy={<Loading></Loading>}
                >
                    {songFeed ? (
                        <MusicList
                            musicList={sortedSongs}
                            state={status}
                            onPageChange={() => {
                                querySongs();
                            }}
                            virtualProps={{
                                getScrollElement: () =>
                                    document.querySelector(
                                        "#page-container",
                                    ) as HTMLElement,
                                fallbackRenderCount: 50,
                            }}
                        ></MusicList>
                    ) : (
                        <MusicSheetlikeList
                            data={sheets}
                            state={status}
                            onLoadMore={() => {
                                querySheets();
                            }}
                            onClick={(sheetItem) => {
                                navigate(
                                    `/main/musicsheet/${encodeURIComponent(sheetItem.platform)}/${encodeURIComponent(sheetItem.id)}`,
                                    {
                                        state: {
                                            sheetItem: sheetItem,
                                        },
                                    },
                                );
                            }}
                        ></MusicSheetlikeList>
                    )}
                </Condition>
            </div>
        </div>
    );
}
