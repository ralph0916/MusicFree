import { useMemo, useState } from "react";
import SvgAsset from "@/renderer/components/SvgAsset";
import classNames from "@/renderer/utils/classnames";
import "./song-sort-bar.scss";

export type SongSortField =
    | "title"
    | "artist"
    | "album"
    | "duration"
    | "createTime"
    | "publishTime";

export type SortOrder = "asc" | "desc";

const SORT_FIELDS: Array<{ key: SongSortField; label: string }> = [
    { key: "createTime", label: "添加时间" },
    { key: "publishTime", label: "发布日期" },
    { key: "title", label: "歌名" },
    { key: "artist", label: "歌手" },
    { key: "album", label: "专辑" },
    { key: "duration", label: "时长" },
];

function toTimeValue(
    item: IMusic.IMusicItem,
    field: "createTime" | "publishTime",
) {
    if (field === "createTime") {
        return (
            Number((item as any).createAt) ||
            Date.parse(String(item.date || "")) ||
            0
        );
    }
    const publish =
        Number((item as any).publishTime) ||
        Number((item as any).createAt) ||
        0;
    if (publish > 0) {
        return publish;
    }
    const year = Number(item.date);
    if (year > 1900 && year < 3000) {
        return Date.UTC(year, 0, 1);
    }
    return Date.parse(String(item.date || "")) || 0;
}

export function sortSongs(
    list: IMusic.IMusicItem[],
    field: SongSortField,
    order: SortOrder,
) {
    const next = [...list];
    const dir = order === "asc" ? 1 : -1;
    next.sort((a, b) => {
        let cmp = 0;
        if (field === "title") {
            cmp = (a.title || "").localeCompare(b.title || "", "zh");
        } else if (field === "artist") {
            cmp = (a.artist || "").localeCompare(b.artist || "", "zh");
        } else if (field === "album") {
            cmp = (a.album || "").localeCompare(b.album || "", "zh");
        } else if (field === "duration") {
            cmp = (a.duration || 0) - (b.duration || 0);
        } else if (field === "createTime" || field === "publishTime") {
            cmp = toTimeValue(a, field) - toTimeValue(b, field);
        }
        return cmp * dir;
    });
    return next;
}

interface IProps {
    field: SongSortField;
    order: SortOrder;
    onChange: (field: SongSortField, order: SortOrder) => void;
}

export default function SongSortBar(props: IProps) {
    const { field, order, onChange } = props;
    const [open, setOpen] = useState(false);
    const label = useMemo(
        () => SORT_FIELDS.find((f) => f.key === field)?.label || "排序",
        [field],
    );

    return (
        <div className="song-sort-bar">
            <div className="song-sort-bar-inner">
                <button
                    type="button"
                    className="song-sort-trigger"
                    onClick={() => setOpen((v) => !v)}
                >
                    <SvgAsset iconName="sort" size={14}></SvgAsset>
                    <span>{label}</span>
                    <SvgAsset iconName="chevron-down" size={12}></SvgAsset>
                </button>
                <button
                    type="button"
                    className="song-sort-order"
                    title={order === "asc" ? "升序" : "降序"}
                    onClick={() =>
                        onChange(field, order === "asc" ? "desc" : "asc")
                    }
                >
                    <SvgAsset
                        iconName={order === "asc" ? "sort-asc" : "sort-desc"}
                        size={14}
                    ></SvgAsset>
                    {order === "asc" ? "升序" : "降序"}
                </button>
            </div>
            {open ? (
                <div className="song-sort-menu">
                    {SORT_FIELDS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={classNames({
                                active: item.key === field,
                            })}
                            onClick={() => {
                                onChange(item.key, order);
                                setOpen(false);
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
