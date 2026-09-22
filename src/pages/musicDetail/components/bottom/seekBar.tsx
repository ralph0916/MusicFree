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

interface ITimeLabelProps {
    time: number;
}

function TimeLabel(props: ITimeLabelProps) {
    return (
        <Text style={style.text}>{timeformat(Math.max(props.time, 0))}</Text>
    );
}

export default function SeekBar() {
    const progress = useProgress(1000);
    const musicItem = useCurrentMusic();
    const [tmpProgress, setTmpProgress] = useState<number | null>(null);
    const slidingRef = useRef(false);

    const duration = useMemo(() => {
        if (progress.duration > 0) {
            return progress.duration;
        }
        return Number(musicItem?.duration) || 0;
    }, [progress.duration, musicItem?.duration]);

    return (
        <View style={style.wrapper}>
            <TimeLabel time={tmpProgress ?? progress.position} />
            <Slider
                style={style.slider}
                minimumTrackTintColor={"#cccccc"}
                maximumTrackTintColor={"#999999"}
                thumbTintColor={"#dddddd"}
                minimumValue={0}
                maximumValue={Math.max(duration, 0.1)}
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
                    let seekTo = val;
                    if (duration > 2 && seekTo >= duration - 2) {
                        seekTo = duration - 2;
                    }
                    TrackPlayer.seekTo(seekTo);
                }}
                value={Math.min(progress.position, duration || progress.position)}
            />
            <TimeLabel time={duration} />
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
