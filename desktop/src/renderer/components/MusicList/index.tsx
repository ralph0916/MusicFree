import {
    ColumnDef,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";

import "./index.scss";
import Tag from "../Tag";
import { secondsToDuration } from "@/common/time-util";
import MusicSheet from "@/renderer/core/music-sheet";
import trackPlayer from "@renderer/core/track-player";
import Condition, { IfTruthy } from "../Condition";
import Empty from "../Empty";
import MusicFavorite from "../MusicFavorite";
import { localPluginName, RequestStateCode } from "@/common/constant";
import BottomLoadingState from "../BottomLoadingState";
import { IContextMenuItem, showContextMenu } from "../ContextMenu";
import { getInternalData, getMediaPrimaryKey, isSameMedia } from "@/common/media-util";
import { CSSProperties, memo, useCallback, useEffect, useRef, useState } from "react";
import { showModal } from "../Modal";
import useVirtualList from "@/hooks/useVirtualList";
import hotkeys from "hotkeys-js";
import { toast } from "react-toastify";
import SwitchCase from "../SwitchCase";
import SvgAsset from "../SvgAsset";
import DragReceiver, { startDrag } from "../DragReceiver";
import { i18n } from "@/shared/i18n/renderer";
import AppConfig from "@shared/app-config/renderer";
import { shellUtil } from "@shared/utils/renderer";
import albumImg from "@/assets/imgs/album-cover.jpg";
import { setFallbackAlbum } from "@/renderer/utils/img-on-error";

interface IMusicListProps {
    /** 展示的播放列表 */
    musicList: IMusic.IMusicItem[];
    /** 实际的播放列表 */
    getAllMusicItems?: () => IMusic.IMusicItem[];
    /** 音乐列表所属的歌单信息 */
    musicSheet?: IMusic.IMusicSheetItem;
    // enablePagination?: boolean; // 分页/虚拟长列表
    state?: RequestStateCode; // 网络状态
    doubleClickBehavior?: "replace" | "normal"; // 双击行为
    onPageChange?: (page?: number) => void; // 分页
    /** 虚拟滚动参数 */
    virtualProps?: {
        offsetHeight?: number | (() => number); // 距离顶部的高度
        getScrollElement?: () => HTMLElement; // 滚动
        fallbackRenderCount?: number;
    };
    containerStyle?: CSSProperties;
    hideRows?: Array<
        | "like"
        | "artwork"
        | "index"
        | "title"
        | "artist"
        | "album"
        | "duration"
        | "platform"
    >;
    /** 允许拖拽 */
    enableDrag?: boolean;
    /** 拖拽结束 */
    onDragEnd?: (newMusicList: IMusic.IMusicItem[]) => void;
    /** context */
    contextMenu?: IContextMenuItem[];
}

const columnHelper = createColumnHelper<IMusic.IMusicItem>();
const columnDef: ColumnDef<IMusic.IMusicItem>[] = [
    columnHelper.display({
        id: "like",
        size: 42,
        minSize: 42,
        maxSize: 42,
        cell: (info) => (
            <div className="music-list-operations">
                <MusicFavorite musicItem={info.row.original} size={18}></MusicFavorite>
            </div>
        ),
        enableResizing: false,
        enableSorting: false,
    }),
    columnHelper.display({
        id: "artwork",
        size: 52,
        minSize: 52,
        maxSize: 52,
        header: "",
        cell: (info) => (
            <img
                className="music-list-artwork"
                src={info.row.original.artwork || albumImg}
                onError={setFallbackAlbum}
                alt=""
                draggable={false}
            />
        ),
        enableResizing: false,
        enableSorting: false,
    }),
    columnHelper.accessor((_, index) => index + 1, {
        cell: (info) => info.getValue(),
        header: "#",
        id: "index",
        minSize: 40,
        maxSize: 40,
        size: 40,
        enableResizing: false,
    }),
    columnHelper.accessor("title", {
        header: () => i18n.t("media.media_title"),
        size: 250,
        maxSize: 300,
        minSize: 100,
        cell: (info) => {
            const title = info?.getValue?.();
            return <span title={title}>{title}</span>;
        },
        sortingFn: (a, b) =>
            (a.original.title || "").localeCompare(b.original.title || "", "zh"),
        // @ts-ignore
        fr: 3,
    }),

    columnHelper.accessor("artist", {
        header: () => i18n.t("media.media_type_artist"),
        size: 130,
        maxSize: 200,
        minSize: 60,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
        sortingFn: (a, b) =>
            (a.original.artist || "").localeCompare(
                b.original.artist || "",
                "zh",
            ),
        // @ts-ignore
        fr: 2,
    }),
    columnHelper.accessor("album", {
        header: () => i18n.t("media.media_type_album"),
        size: 120,
        maxSize: 200,
        minSize: 60,
        cell: (info) => <span title={info.getValue()}>{info.getValue()}</span>,
        sortingFn: (a, b) =>
            (a.original.album || "").localeCompare(b.original.album || "", "zh"),
        // @ts-ignore
        fr: 2,
    }),
    columnHelper.accessor("duration", {
        header: () => i18n.t("media.media_duration"),
        size: 72,
        maxSize: 88,
        minSize: 64,
        cell: (info) =>
            info.getValue() ? secondsToDuration(info.getValue()) : "--:--",
        enableResizing: false,
    }),
    columnHelper.accessor("platform", {
        header: () => i18n.t("media.media_platform"),
        size: 108,
        minSize: 96,
        maxSize: 120,
        cell: (info) => <Tag fill>{info.getValue()}</Tag>,
        enableResizing: false,
        enableSorting: false,
    }),
];

/** 固定列像素宽；其余按 fr 分配剩余宽度 */
const FIXED_COL_IDS = new Set(["like", "artwork", "index", "duration", "platform"]);

function getColWidthStyle(
    columnId: string,
    columnDef: ColumnDef<IMusic.IMusicItem>,
) {
    if (FIXED_COL_IDS.has(columnId)) {
        const size = columnDef.size ?? 80;
        return { width: size, minWidth: size, maxWidth: size };
    }
    const fr = (columnDef as any).fr as number | undefined;
    if (fr) {
        // title3 / artist2 / album2
        const pct = Math.round((fr / 7) * 100);
        return { width: `${pct}%` };
    }
    return { width: columnDef.size };
}

const estimizeItemHeight = 3.6 * 13; // taller rows for artwork

export function showMusicContextMenu(
    musicItems: IMusic.IMusicItem | IMusic.IMusicItem[],
    x: number,
    y: number,
    sheetType?: string,
) {
    const menuItems: IContextMenuItem[] = [];
    const isArray = Array.isArray(musicItems);
    if (!isArray) {
        menuItems.push(
            {
                title: `ID: ${getMediaPrimaryKey(musicItems)}`,
                icon: "identification",
            },
            {
                title: `${i18n.t("media.media_type_artist")}: ${
                    musicItems.artist ?? i18n.t("media.unknown_artist")
                }`,
                icon: "user",
            },
            {
                title: `${i18n.t("media.media_type_album")}: ${
                    musicItems.album ?? i18n.t("media.unknown_album")
                }`,
                icon: "album",
                show: !!musicItems.album,
            },
            {
                divider: true,
            },
        );
    }
    menuItems.push(
        {
            title: i18n.t("music_list_context_menu.next_play"),
            icon: "motion-play",
            onClick() {
                trackPlayer.addNext(musicItems);
            },
        },
        {
            title: "添加到歌单",
            icon: "document-plus",
            onClick() {
                showModal("AddMusicToSheet", {
                    musicItems: musicItems,
                });
            },
        },
        {
            title: i18n.t("music_list_context_menu.remove_from_sheet"),
            icon: "trash",
            show: !!sheetType && sheetType !== "play-list",
            onClick() {
                MusicSheet.frontend.removeMusicFromSheet(musicItems, sheetType);
            },
        },
        {
            title: i18n.t("common.remove"),
            icon: "trash",
            show: sheetType === "play-list",
            onClick() {
                trackPlayer.removeMusic(musicItems);
            },
        },
    );

    menuItems.push(
        {
            title: i18n.t(
                "music_list_context_menu.reveal_local_music_in_file_explorer",
            ),
            icon: "folder-open",
            show: !isArray && musicItems?.platform === localPluginName,
            async onClick() {
                try {
                    if (!isArray) {
                        const localPath = getInternalData<IMusic.IMusicItemInternalData>(
                            musicItems,
                            "downloadData",
                        )?.path || (musicItems as any)?.$path;

                        const result = await shellUtil.showItemInFolder(localPath);
                        if (!result) {
                            throw new Error();
                        }
                    }
                } catch (e) {
                    toast.error(
                        `${i18n.t(
                            "music_list_context_menu.reveal_local_music_in_file_explorer_fail",
                        )} ${e?.message ?? ""}`,
                    );
                }
            },
        },
    );

    showContextMenu({
        x,
        y,
        menuItems,
    });
}

function _MusicList(props: IMusicListProps) {
    const {
        musicList,
        state = RequestStateCode.FINISHED,
        onPageChange,
        musicSheet,
        virtualProps,
        // getAllMusicItems,
        doubleClickBehavior,
        containerStyle,
        hideRows,
        enableDrag,
        onDragEnd,
    } = props;

    const [sorting, setSorting] = useState<SortingState>([]);

    const musicListRef = useRef(musicList);
    const columnShownRef = useRef(
        AppConfig.getConfig("normal.musicListColumnsShown").reduce(
            (prev, curr) => ({
                ...prev,
                [curr]: false,
            }),
            {},
        ),
    );

    const table = useReactTable({
        debugAll: false,
        data: musicList,
        columns: columnDef,
        state: {
            sorting: sorting,
            columnVisibility: hideRows
                ? hideRows.reduce((prev, curr) => ({ ...prev, [curr]: false }), {
                    ...columnShownRef.current,
                })
                : columnShownRef.current,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const tableContainerRef = useRef<HTMLDivElement>();
    const virtualController = useVirtualList({
        data: table.getRowModel().rows,
        getScrollElement: virtualProps?.getScrollElement,
        offsetHeight: () => tableContainerRef.current?.offsetTop ?? 0,
        estimateItemHeight: estimizeItemHeight,
        fallbackRenderCount: !(
            virtualProps?.getScrollElement
        )
            ? -1
            : virtualProps?.fallbackRenderCount ?? 50,
    });

    const [activeItems, setActiveItems] = useState<Set<number>>(new Set());
    const lastActiveIndexRef = useRef(0);

    useEffect(() => {
        setActiveItems(new Set());
        lastActiveIndexRef.current = 0;
        musicListRef.current = musicList;
    }, [musicList]);

    useEffect(() => {
        const ctrlAHandler = (evt: Event) => {
            evt.preventDefault();
            setActiveItems(new Set(Array.from({ length: musicListRef.current.length }, (_, i) => i)));
        };
        hotkeys("Ctrl+A", "music-list", ctrlAHandler);

        return () => {
            hotkeys.unbind("Ctrl+A", ctrlAHandler);
        };
    }, []);

    const _onDrop = useCallback(
        (fromIndex: number, toIndex: number) => {
            if (!onDragEnd || fromIndex === toIndex) {
                // 没有移动
                return;
            }
            const newData = musicList
                .slice(0, fromIndex)
                .concat(musicList.slice(fromIndex + 1));
            newData.splice(
                fromIndex > toIndex ? toIndex : toIndex - 1,
                0,
                musicList[fromIndex],
            );
            onDragEnd?.(newData);
        },
        [onDragEnd, musicList],
    );

    return (
        <div
            className="music-list-container"
            style={containerStyle}
            ref={tableContainerRef}
            tabIndex={-1}
            onFocus={() => {
                hotkeys.setScope("music-list");
            }}
            onBlur={() => {
                hotkeys.setScope("all");
            }}
        >
            <table
                style={{
                    height: virtualController.totalHeight + estimizeItemHeight,
                    tableLayout: "fixed",
                    width: "100%",
                }}
            >
                <thead>
                    <tr>
                        {table.getHeaderGroups()[0].headers.map((header) => (
                            <th
                                key={header.id}
                                data-id={header.id}
                                style={getColWidthStyle(
                                    header.id,
                                    header.column.columnDef,
                                )}
                                onClick={header.column.getToggleSortingHandler()}
                            >
                                {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                )}
                                <div
                                    className="sort-container"
                                    data-sorting={header.column.getIsSorted() !== false}
                                >
                                    <SwitchCase.Switch switch={header.column.getIsSorted()}>
                                        <SwitchCase.Case case={"asc"}>
                                            <SvgAsset iconName="sort-asc"></SvgAsset>
                                        </SwitchCase.Case>
                                        <SwitchCase.Case case={"desc"}>
                                            <SvgAsset iconName="sort-desc"></SvgAsset>
                                        </SwitchCase.Case>
                                        <SwitchCase.Case case={false}>
                                            <SvgAsset iconName="sort"></SvgAsset>
                                        </SwitchCase.Case>
                                    </SwitchCase.Switch>
                                </div>
                                {/* <div
                  onMouseDown={header.getResizeHandler()}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className={classNames({
                    resizer: true,
                    "resizer-resizing": header.column.getIsResizing(),
                  })}
                ></div> */}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody
                    style={{
                        transform: `translateY(${virtualController.startTop}px)`,
                    }}
                >
                    {virtualController.virtualItems.map((virtualItem, index) => {
                        const row = virtualItem.dataItem;

                        if (!row.original) {
                            return null;
                        }
                        // todo 拆出一个组件
                        return (
                            <tr
                                key={row.id}
                                data-active={
                                    activeItems.has(virtualItem.rowIndex)
                                }
                                onContextMenu={(e) => {
                                    if (
                                        activeItems.size > 1
                                    ) {
                                        const selectedItems: IMusic.IMusicItem[] = [];
                                        const rows = table.getRowModel().rows;
                                        activeItems.forEach(item => {
                                            selectedItems.push(rows[item].original);
                                        });

                                        showMusicContextMenu(
                                            selectedItems,
                                            e.clientX,
                                            e.clientY,
                                            musicSheet?.platform === localPluginName
                                                ? musicSheet.id
                                                : undefined,
                                        );
                                    } else {
                                        lastActiveIndexRef.current = virtualItem.rowIndex;
                                        setActiveItems(new Set([virtualItem.rowIndex]));
                                        showMusicContextMenu(
                                            row.original,
                                            e.clientX,
                                            e.clientY,
                                            musicSheet?.platform === localPluginName
                                                ? musicSheet.id
                                                : undefined,
                                        );
                                    }
                                }}
                                onClick={() => {
                                // 如果点击的时候按下shift
                                    if (hotkeys.shift) {
                                        let start = lastActiveIndexRef.current;
                                        let end = virtualItem.rowIndex;

                                        if (start >= end) {
                                            [start, end] = [end, start];
                                        }

                                        if (end > musicListRef.current.length) {
                                            end = musicListRef.current.length - 1;
                                        }

                                        setActiveItems(
                                            new Set(
                                                Array.from({ length: end - start + 1 }, (_, i) => start + i),
                                            ),
                                        );
                                    } else if (hotkeys.ctrl) {
                                        const newSet = new Set(activeItems);
                                        if (newSet.has(virtualItem.rowIndex)) {
                                            newSet.delete(virtualItem.rowIndex);
                                        } else {
                                            newSet.add(virtualItem.rowIndex);
                                        }
                                        setActiveItems(newSet);
                                    } else {
                                        setActiveItems(new Set([virtualItem.rowIndex]));
                                        lastActiveIndexRef.current = virtualItem.rowIndex;
                                    }
                                }}
                                onDoubleClick={() => {
                                    const config =
                                    doubleClickBehavior ??
                                    AppConfig.getConfig("playMusic.clickMusicList");
                                    if (config === "replace") {
                                        trackPlayer.playMusicWithReplaceQueue(
                                            table.getRowModel().rows.map((it) => it.original),
                                            row.original,
                                        );
                                    } else {
                                        trackPlayer.playMusic(row.original);
                                    }
                                }}
                                draggable={enableDrag}
                                onDragStart={(e) => {
                                // TODO
                                // if(activeItems) {

                                    // }
                                    startDrag(e, virtualItem.rowIndex, "musiclist");
                                }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        data-id={cell.column.id}
                                        style={getColWidthStyle(
                                            cell.column.id,
                                            cell.column.columnDef,
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                                <IfTruthy condition={enableDrag}>
                                    <IfTruthy condition={index === 0}>
                                        <DragReceiver
                                            position="top"
                                            rowIndex={virtualItem.rowIndex}
                                            onDrop={_onDrop}
                                            tag="musiclist"
                                            insideTable
                                        ></DragReceiver>
                                    </IfTruthy>
                                    <DragReceiver
                                        position="bottom"
                                        rowIndex={virtualItem.rowIndex + 1}
                                        onDrop={_onDrop}
                                        tag="musiclist"
                                        insideTable
                                    ></DragReceiver>
                                </IfTruthy>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot
                    style={{
                        height:
                            virtualController.totalHeight -
                            virtualController.virtualItems.length * estimizeItemHeight,
                    }}
                ></tfoot>
            </table>
            <Condition
                condition={musicList.length === 0}
                falsy={
                    <BottomLoadingState
                        state={state}
                        onLoadMore={onPageChange}
                    ></BottomLoadingState>
                }
            >
                <Empty></Empty>
            </Condition>
        </div>
    );
}

export default memo(
    _MusicList,
    (prev, curr) =>
        prev.state === curr.state &&
        prev.enableDrag === curr.enableDrag &&
        prev.musicList === curr.musicList &&
        prev.onPageChange === curr.onPageChange &&
        prev.onDragEnd === curr.onDragEnd &&
        prev.musicSheet &&
        curr.musicSheet &&
        isSameMedia(prev.musicSheet, curr.musicSheet),
);
