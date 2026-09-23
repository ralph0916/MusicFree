import { useEffect, useMemo, useRef, useState } from "react";
import "./index.scss";
import trackPlayer from "@renderer/core/track-player";
import {
    useCurrentMusic,
    useProgress,
} from "@renderer/core/track-player/hooks";
import { toast } from "react-toastify";

function resolveSeekDuration(
    progressDuration: number,
    metaDuration?: number,
) {
    if (isFinite(progressDuration) && progressDuration > 1) {
        return progressDuration;
    }
    const meta = Number(metaDuration) || 0;
    if (meta > 1) {
        return meta;
    }
    return 0;
}

export default function Slider() {
    const [seekPercent, _setSeekPercent] = useState<number | null>(null);
    const seekPercentRef = useRef<number | null>(null);
    const { currentTime, duration: progressDuration } = useProgress();
    const currentMusic = useCurrentMusic();
    const duration = useMemo(
        () => resolveSeekDuration(progressDuration, currentMusic?.duration),
        [progressDuration, currentMusic?.duration],
    );
    const durationRef = useRef(duration);
    const isPressedRef = useRef(false);
    const didDragRef = useRef(false);
    const seekable = duration > 1;

    durationRef.current = duration;

    function setSeekPercent(value: number | null) {
        _setSeekPercent(value);
        seekPercentRef.current = value;
    }

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isPressedRef.current) {
                didDragRef.current = true;
                setSeekPercent(
                    Math.max(0, Math.min(1, e.clientX / window.innerWidth)),
                );
            }
        };
        const onMouseUp = () => {
            if (!isPressedRef.current) {
                return;
            }
            isPressedRef.current = false;
            const percent = seekPercentRef.current;
            const dur = durationRef.current;
            if (!(dur > 1) || percent == null) {
                setSeekPercent(null);
                if (!(dur > 1)) {
                    toast.warn("当前歌曲时长未就绪，暂无法拖动进度");
                }
                return;
            }
            let seekTo = dur * percent;
            if (seekTo >= dur - 1) {
                seekTo = Math.max(0, dur - 1);
            }
            trackPlayer.seekTo(seekTo);
            setSeekPercent(null);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    return (
        <div
            className="music-bar--slider-container"
            data-disabled={!seekable}
            onMouseDown={() => {
                if (seekable) {
                    isPressedRef.current = true;
                    didDragRef.current = false;
                }
            }}
            onClick={(e) => {
                if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                }
                if (!seekable) {
                    toast.warn("当前歌曲时长未就绪，暂无法拖动进度");
                    return;
                }
                let seekTo = (duration * e.clientX) / window.innerWidth;
                if (seekTo >= duration - 1) {
                    seekTo = Math.max(0, duration - 1);
                }
                trackPlayer.seekTo(seekTo);
            }}
        >
            <div className="bar"></div>
            <div
                className="active-bar"
                style={{
                    transform: `translateX(${
                        seekPercent !== null
                            ? seekPercent * 100
                            : duration <= 0
                              ? 0
                              : (currentTime / duration) * 100
                    }%)`,
                }}
            ></div>
        </div>
    );
}
