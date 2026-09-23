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
    const discSize = coverSize * 1.22;
    const labelSize = coverSize * 0.4;

    const rotate = useSharedValue(0);
    const needle = useSharedValue(paused ? -28 : 0);
    const breathe = useSharedValue(0);

    useEffect(() => {
        breathe.value = withRepeat(
            withTiming(1, {
                duration: 3200,
                easing: Easing.inOut(Easing.sin),
            }),
            -1,
            true,
        );
    }, [breathe]);

    useEffect(() => {
        needle.value = withTiming(paused ? -28 : 0, {
            duration: 520,
            easing: Easing.out(Easing.cubic),
        });
        if (paused) {
            cancelAnimation(rotate);
            return;
        }
        rotate.value = withRepeat(
            withTiming(rotate.value + 360, {
                duration: 20000,
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
        opacity: interpolate(breathe.value, [0, 1], [0.32, 0.55]),
        transform: [
            { scale: interpolate(breathe.value, [0, 1], [0.97, 1.05]) },
        ],
    }));

    const needleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${needle.value}deg` }],
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

    const grooves = [0.96, 0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54].map(
        (ratio, i) => (
            <View
                key={ratio}
                style={[
                    styles.groove,
                    {
                        width: discSize * ratio,
                        height: discSize * ratio,
                        borderRadius: discSize,
                        borderColor:
                            i % 2 === 0
                                ? "rgba(255,255,255,0.045)"
                                : "rgba(0,0,0,0.35)",
                    },
                ]}
            />
        ),
    );

    return (
        <>
            <GestureDetector gesture={combineGesture}>
                <View style={globalStyle.fullCenter}>
                    {/* soft floor shadow */}
                    <Animated.View
                        style={[
                            {
                                position: "absolute",
                                width: discSize * 1.15,
                                height: discSize * 1.15,
                                borderRadius: discSize,
                                backgroundColor: "rgba(0,0,0,0.42)",
                            },
                            shadowStyle,
                        ]}
                    />

                    {/* platter base */}
                    <View
                        style={[
                            styles.platter,
                            {
                                width: discSize + rpx(28),
                                height: discSize + rpx(28),
                                borderRadius: (discSize + rpx(28)) / 2,
                            },
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
                                backgroundColor: "#0d0d0d",
                                borderWidth: rpx(6),
                                borderColor: "#2a2a2a",
                                overflow: "hidden",
                                elevation: 14,
                                shadowColor: "#000",
                                shadowOpacity: 0.5,
                                shadowRadius: 18,
                                shadowOffset: { width: 0, height: 10 },
                            },
                            discStyle,
                        ]}>
                        {/* vinyl sheen */}
                        <View style={styles.sheen} />
                        {grooves}
                        <View
                            style={[
                                styles.innerRing,
                                {
                                    width: labelSize * 1.22,
                                    height: labelSize * 1.22,
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
                                styles.spindleOuter,
                                {
                                    width: rpx(28),
                                    height: rpx(28),
                                    borderRadius: rpx(14),
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.spindle,
                                {
                                    width: rpx(12),
                                    height: rpx(12),
                                    borderRadius: rpx(6),
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
                                top:
                                    orientation === "vertical" ? "4%" : "0%",
                                right:
                                    orientation === "vertical" ? "8%" : "4%",
                                height: discSize * 0.62,
                            },
                        ]}>
                        <View style={styles.armBase} />
                        <View style={styles.armPivot} />
                        <Animated.View style={[styles.arm, needleStyle]}>
                            <View style={styles.armBar} />
                            <View style={styles.armJoint} />
                            <View style={styles.armHead}>
                                <View style={styles.stylus} />
                            </View>
                        </Animated.View>
                    </View>
                </View>
            </GestureDetector>
            <Operations />
        </>
    );
}

const styles = StyleSheet.create({
    platter: {
        position: "absolute",
        backgroundColor: "#1c1c1e",
        borderWidth: rpx(4),
        borderColor: "#3a3a3c",
    },
    groove: {
        position: "absolute",
        borderWidth: StyleSheet.hairlineWidth * 2,
    },
    sheen: {
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: 9999,
        backgroundColor: "transparent",
        borderWidth: rpx(2),
        borderColor: "rgba(255,255,255,0.06)",
    },
    innerRing: {
        position: "absolute",
        borderWidth: rpx(5),
        borderColor: "rgba(255,255,255,0.14)",
        backgroundColor: "rgba(20,20,20,0.55)",
    },
    spindleOuter: {
        position: "absolute",
        backgroundColor: "#8a8a8a",
        borderWidth: rpx(2),
        borderColor: "#cfcfcf",
    },
    spindle: {
        position: "absolute",
        backgroundColor: "#e8e8e8",
    },
    armWrap: {
        position: "absolute",
        width: rpx(56),
        alignItems: "center",
    },
    armBase: {
        position: "absolute",
        top: rpx(4),
        width: rpx(48),
        height: rpx(48),
        borderRadius: rpx(12),
        backgroundColor: "#2c2c2e",
        borderWidth: rpx(2),
        borderColor: "#555",
    },
    armPivot: {
        width: rpx(30),
        height: rpx(30),
        borderRadius: rpx(15),
        backgroundColor: "#d4d4d8",
        borderWidth: rpx(4),
        borderColor: "#71717a",
        zIndex: 2,
        marginTop: rpx(12),
    },
    arm: {
        position: "absolute",
        top: rpx(22),
        width: rpx(56),
        height: "100%",
        alignItems: "center",
        transformOrigin: "top center",
    },
    armBar: {
        width: rpx(9),
        flex: 1,
        borderRadius: rpx(5),
        backgroundColor: "#e4e4e7",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#a1a1aa",
    },
    armJoint: {
        width: rpx(18),
        height: rpx(18),
        borderRadius: rpx(9),
        marginTop: -rpx(6),
        backgroundColor: "#a1a1aa",
        borderWidth: rpx(2),
        borderColor: "#71717a",
    },
    armHead: {
        width: rpx(36),
        height: rpx(48),
        marginTop: -rpx(2),
        borderRadius: rpx(8),
        backgroundColor: "#EC4141",
        borderWidth: rpx(2),
        borderColor: "rgba(255,255,255,0.4)",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: rpx(6),
    },
    stylus: {
        width: rpx(4),
        height: rpx(14),
        borderRadius: rpx(2),
        backgroundColor: "#1a1a1a",
    },
});
