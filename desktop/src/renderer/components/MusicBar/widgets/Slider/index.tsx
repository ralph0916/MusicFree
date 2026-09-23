import { useEffect, useRef, useState } from "react";
import "./index.scss";
import trackPlayer from "@renderer/core/track-player";
import { useProgress } from "@renderer/core/track-player/hooks";
import { toast } from "react-toastify";

export default function Slider() {
    const [seekPercent, _setSeekPercent] = useState<number | null>(null);
    const seekPercentRef = useRef<number | null>(null);
    const { currentTime, duration } = useProgress();
    const isPressedRef = useRef(false);
    const seekable = isFinite(duration) && duration > 1;

    function setSeekPercent(value: number | null) {
        _setSeekPercent(value);
        seekPercentRef.current = value;
    }

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isPressedRef.current) {
                setSeekPercent(Math.max(0, Math.min(1, e.clientX / window.innerWidth)));
            }
        };
        const onMouseUp = () => {
            if (isPressedRef.current) {
                isPressedRef.current = false;
                const realProgress = trackPlayer.progress;
                if (!(realProgress.duration > 1) || seekPercentRef.current == null) {
                    setSeekPercent(null);
                    toast.warn("当前歌曲时长未就绪，暂无法拖动进度");
                    return;
                }
                let seekTo = realProgress.duration * seekPercentRef.current;
                if (seekTo >= realProgress.duration - 1) {
                    seekTo = Math.max(0, realProgress.duration - 1);
                }
                trackPlayer.seekTo(seekTo);
                setSeekPercent(null);
            }
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
                }
            }}
            onClick={(e) => {
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
                            : duration === 0
                                ? 0
                                : !isFinite(duration) || isNaN(duration)
                                    ? 0
                                    : (currentTime / duration) * 100
                    }%)`,
                }}
            ></div>
        </div>
    );
}
