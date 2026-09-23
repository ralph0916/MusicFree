import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";
import Slider from "@react-native-community/slider";
import timeformat from "@/utils/timeformat";
import { fontSizeConst } from "@/constants/uiConst";
import TrackPlayer, {
    useCurrentMusic,
    useProgress,
} from "@/core/trackPlayer";
import Toast from "@/utils/toast";

interface ITimeLabelProps {
    time: number;
}

function TimeLabel(props: ITimeLabelProps) {
    return (
        <Text style={style.text}>{timeformat(Math.max(props.time, 0))}</Text>
    );
}

export default function SeekBar() {
    const progress = useProgress(250);
    const musicItem = useCurrentMusic();
    const [tmpProgress, setTmpProgress] = useState<number | null>(null);
    const slidingRef = useRef(false);

    // 显示用：优先播放器时长，否则元数据
    const displayDuration = useMemo(() => {
        if (progress.duration > 0) {
            return progress.duration;
        }
        return Number(musicItem?.duration) || 0;
    }, [progress.duration, musicItem?.duration]);

    // 真正可 seek 的时长必须来自播放器，否则拖动会被 ExoPlayer 重置到开头
    const seekable = progress.duration > 1;

    return (
        <View style={style.wrapper}>
            <TimeLabel time={tmpProgress ?? progress.position} />
            <Slider
                style={style.slider}
                minimumTrackTintColor={"#cccccc"}
                maximumTrackTintColor={"#999999"}
                thumbTintColor={"#dddddd"}
                minimumValue={0}
                maximumValue={Math.max(displayDuration, 0.1)}
                disabled={!seekable}
                onSlidingStart={() => {
                    slidingRef.current = true;
                }}
                onValueChange={val => {
                    if (slidingRef.current) {
                        setTmpProgress(val);
                    }
                }}
                onSlidingComplete={val => {
                    slidingRef.current = false;
                    setTmpProgress(null);
                    if (!seekable) {
                        Toast.warn("当前歌曲时长未就绪，暂无法拖动进度");
                        return;
                    }
                    const max = progress.duration;
                    let seekTo = Math.min(Math.max(0, val), max);
                    if (seekTo >= max - 1) {
                        seekTo = Math.max(0, max - 1);
                    }
                    TrackPlayer.seekTo(seekTo);
                }}
                value={Math.min(
                    progress.position,
                    displayDuration || progress.position,
                )}
            />
            <TimeLabel time={displayDuration} />
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(40),
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    slider: {
        width: "73%",
        height: rpx(40),
    },
    text: {
        fontSize: fontSizeConst.description,
        includeFontPadding: false,
        color: "#cccccc",
    },
});
