import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import rpx from "@/utils/rpx";
import { ImgAsset } from "@/constants/assetsConst";
import FastImage from "@/components/base/fastImage";
import useOrientation from "@/hooks/useOrientation";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useCurrentMusic, useMusicState } from "@/core/trackPlayer";
import globalStyle from "@/constants/globalStyle";
import Operations from "./operations";
import { showPanel } from "@/components/panels/usePanel.ts";
import { musicIsPaused } from "@/utils/trackUtils";

interface IProps {
    onTurnPageClick?: () => void;
}

export default function AlbumCover(props: IProps) {
    const { onTurnPageClick } = props;

    const musicItem = useCurrentMusic();
    const musicState = useMusicState();
    const orientation = useOrientation();
    const paused = musicIsPaused(musicState);

    const coverSize = orientation === "vertical" ? rpx(460) : rpx(220);
    const discSize = coverSize * 1.18;
    const labelSize = coverSize * 0.42;

    const rotate = useSharedValue(0);
    const needle = useSharedValue(paused ? -32 : 0);
    const breathe = useSharedValue(0);

    useEffect(() => {
        breathe.value = withRepeat(
            withTiming(1, {
                duration: 2800,
                easing: Easing.inOut(Easing.sin),
            }),
            -1,
            true,
        );
    }, [breathe]);

    useEffect(() => {
        needle.value = withTiming(paused ? -32 : 0, {
            duration: 480,
            easing: Easing.out(Easing.cubic),
        });
        if (paused) {
            cancelAnimation(rotate);
            return;
        }
        rotate.value = withRepeat(
            withTiming(rotate.value + 360, {
                duration: 18000,
                easing: Easing.linear,
            }),
            -1,
            false,
        );
    }, [paused, rotate, needle, musicItem?.id]);

    const discStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotate.value % 360}deg` }],
    }));

    const shadowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(breathe.value, [0, 1], [0.28, 0.48]),
        transform: [
            { scale: interpolate(breathe.value, [0, 1], [0.96, 1.04]) },
        ],
    }));

    const needleStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${needle.value}deg` },
        ],
    }));

    const longPress = Gesture.LongPress()
        .onStart(() => {
            if (musicItem?.artwork) {
                showPanel("ImageViewer", {
                    url: musicItem.artwork,
                });
            }
        })
        .runOnJS(true);

    const tap = Gesture.Tap()
        .onStart(() => {
            onTurnPageClick?.();
        })
        .runOnJS(true);

    const combineGesture = Gesture.Race(tap, longPress);

    const grooves = [0.94, 0.86, 0.78, 0.7, 0.62].map(ratio => (
        <View
            key={ratio}
            style={[
                styles.groove,
                {
                    width: discSize * ratio,
                    height: discSize * ratio,
                    borderRadius: discSize,
                },
            ]}
        />
    ));

    return (
        <>
            <GestureDetector gesture={combineGesture}>
                <View style={globalStyle.fullCenter}>
                    <Animated.View
                        style={[
                            {
                                position: "absolute",
                                width: discSize * 1.2,
                                height: discSize * 1.2,
                                borderRadius: discSize,
                                backgroundColor: "rgba(0,0,0,0.35)",
                            },
                            shadowStyle,
                        ]}
                    />

                    <Animated.View
                        style={[
                            {
                                width: discSize,
                                height: discSize,
                                borderRadius: discSize / 2,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#1a1a1a",
                                borderWidth: rpx(10),
                                borderColor: "#2c2c2c",
                                overflow: "hidden",
                                elevation: 10,
                                shadowColor: "#000",
                                shadowOpacity: 0.45,
                                shadowRadius: 16,
                                shadowOffset: { width: 0, height: 8 },
                            },
                            discStyle,
                        ]}>
                        {grooves}
                        <View
                            style={[
                                styles.innerRing,
                                {
                                    width: labelSize * 1.18,
                                    height: labelSize * 1.18,
                                    borderRadius: labelSize,
                                },
                            ]}
                        />
                        <FastImage
                            style={{
                                width: labelSize,
                                height: labelSize,
                                borderRadius: labelSize / 2,
                            }}
                            source={musicItem?.artwork}
                            placeholderSource={ImgAsset.albumDefault}
                        />
                        <View
                            style={[
                                styles.spindle,
                                {
                                    width: rpx(18),
                                    height: rpx(18),
                                    borderRadius: rpx(9),
                                },
                            ]}
                        />
                    </Animated.View>

                    {/* tonearm */}
                    <View
                        pointerEvents="none"
                        style={[
                            styles.armWrap,
                            {
                                top: orientation === "vertical" ? "6%" : "2%",
                                right: orientation === "vertical" ? "10%" : "6%",
                                height: discSize * 0.58,
                            },
                        ]}>
                        <View style={styles.armPivot} />
                        <Animated.View style={[styles.arm, needleStyle]}>
                            <View style={styles.armBar} />
                            <View style={styles.armHead} />
                        </Animated.View>
                    </View>
                </View>
            </GestureDetector>
            <Operations />
        </>
    );
}

const styles = StyleSheet.create({
    groove: {
        position: "absolute",
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: "rgba(255,255,255,0.06)",
    },
    innerRing: {
        position: "absolute",
        borderWidth: rpx(4),
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    spindle: {
        position: "absolute",
        backgroundColor: "#c0c0c0",
        borderWidth: rpx(2),
        borderColor: "#8a8a8a",
    },
    armWrap: {
        position: "absolute",
        width: rpx(48),
        alignItems: "center",
    },
    armPivot: {
        width: rpx(28),
        height: rpx(28),
        borderRadius: rpx(14),
        backgroundColor: "#d8d8d8",
        borderWidth: rpx(3),
        borderColor: "#9a9a9a",
        zIndex: 2,
    },
    arm: {
        position: "absolute",
        top: rpx(10),
        width: rpx(48),
        height: "100%",
        alignItems: "center",
        transformOrigin: "top center",
    },
    armBar: {
        width: rpx(10),
        flex: 1,
        borderRadius: rpx(6),
        backgroundColor: "#e8e8e8",
    },
    armHead: {
        width: rpx(34),
        height: rpx(42),
        marginTop: -rpx(4),
        borderRadius: rpx(8),
        backgroundColor: "#EC4141",
        borderWidth: rpx(2),
        borderColor: "rgba(255,255,255,0.35)",
    },
});
