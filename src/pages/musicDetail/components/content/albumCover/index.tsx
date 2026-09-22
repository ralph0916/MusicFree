import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
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

function OrbitDot(props: {
    size: number;
    radius: number;
    delayMs: number;
    color: string;
}) {
    const { size, radius, delayMs, color } = props;
    const t = useSharedValue(0);

    useEffect(() => {
        t.value = withDelay(
            delayMs,
            withRepeat(
                withTiming(1, {
                    duration: 6000 + delayMs,
                    easing: Easing.linear,
                }),
                -1,
                false,
            ),
        );
    }, [delayMs, t]);

    const style = useAnimatedStyle(() => {
        const angle = t.value * Math.PI * 2;
        return {
            transform: [
                { translateX: Math.cos(angle) * radius },
                { translateY: Math.sin(angle) * radius },
            ],
            opacity: 0.35 + 0.45 * Math.sin(t.value * Math.PI * 2),
        };
    });

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
                style,
            ]}
        />
    );
}

export default function AlbumCover(props: IProps) {
    const { onTurnPageClick } = props;

    const musicItem = useCurrentMusic();
    const musicState = useMusicState();
    const orientation = useOrientation();
    const paused = musicIsPaused(musicState);

    const coverSize = orientation === "vertical" ? rpx(480) : rpx(240);
    const discSize = coverSize * 1.22;

    const rotate = useSharedValue(0);
    const pulse = useSharedValue(0);
    const shine = useSharedValue(0);
    const ring = useSharedValue(0);
    const needle = useSharedValue(paused ? -28 : 0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, {
                duration: 2400,
                easing: Easing.inOut(Easing.sin),
            }),
            -1,
            true,
        );
        shine.value = withRepeat(
            withTiming(1, { duration: 4200, easing: Easing.linear }),
            -1,
            false,
        );
        ring.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }),
                withTiming(0, { duration: 0 }),
            ),
            -1,
            false,
        );
    }, [pulse, shine, ring]);

    useEffect(() => {
        needle.value = withTiming(paused ? -28 : 0, {
            duration: 420,
            easing: Easing.out(Easing.cubic),
        });
        if (paused) {
            cancelAnimation(rotate);
            return;
        }
        rotate.value = withRepeat(
            withTiming(rotate.value + 360, {
                duration: 16000,
                easing: Easing.linear,
            }),
            -1,
            false,
        );
    }, [paused, rotate, needle, musicItem?.id]);

    const discStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotate.value % 360}deg` }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.2, 0.55]),
        transform: [
            { scale: interpolate(pulse.value, [0, 1], [0.9, 1.12]) },
        ],
    }));

    const glow2Style = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.12, 0.35]),
        transform: [
            { scale: interpolate(pulse.value, [0, 1], [1.05, 1.28]) },
        ],
    }));

    const ringStyle = useAnimatedStyle(() => ({
        opacity: interpolate(ring.value, [0, 1], [0.45, 0]),
        transform: [{ scale: interpolate(ring.value, [0, 1], [0.85, 1.45]) }],
    }));

    const shineStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    shine.value,
                    [0, 1],
                    [-discSize * 0.6, discSize * 0.6],
                ),
            },
            { rotate: "25deg" },
        ],
        opacity: paused ? 0 : 0.35,
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

    return (
        <>
            <GestureDetector gesture={combineGesture}>
                <View style={globalStyle.fullCenter}>
                    <Animated.View
                        style={[
                            {
                                position: "absolute",
                                width: discSize * 1.55,
                                height: discSize * 1.55,
                                borderRadius: discSize,
                                backgroundColor: "rgba(236,65,65,0.22)",
                            },
                            glow2Style,
                        ]}
                    />
                    <Animated.View
                        style={[
                            {
                                position: "absolute",
                                width: discSize * 1.35,
                                height: discSize * 1.35,
                                borderRadius: discSize,
                                backgroundColor: "rgba(236,65,65,0.4)",
                            },
                            glowStyle,
                        ]}
                    />
                    <Animated.View
                        style={[
                            {
                                position: "absolute",
                                width: discSize,
                                height: discSize,
                                borderRadius: discSize / 2,
                                borderWidth: rpx(3),
                                borderColor: "rgba(255,255,255,0.35)",
                            },
                            ringStyle,
                        ]}
                    />

                    <OrbitDot
                        size={rpx(10)}
                        radius={discSize * 0.62}
                        delayMs={0}
                        color="#fff"
                    />
                    <OrbitDot
                        size={rpx(8)}
                        radius={discSize * 0.72}
                        delayMs={800}
                        color="rgba(236,65,65,0.9)"
                    />
                    <OrbitDot
                        size={rpx(6)}
                        radius={discSize * 0.8}
                        delayMs={1600}
                        color="rgba(255,255,255,0.7)"
                    />

                    <Animated.View
                        style={[
                            {
                                width: discSize,
                                height: discSize,
                                borderRadius: discSize / 2,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#121212",
                                borderWidth: rpx(12),
                                borderColor: "rgba(255,255,255,0.1)",
                                overflow: "hidden",
                            },
                            discStyle,
                        ]}>
                        {/* vinyl grooves */}
                        <View
                            style={{
                                position: "absolute",
                                width: discSize * 0.92,
                                height: discSize * 0.92,
                                borderRadius: discSize,
                                borderWidth: rpx(2),
                                borderColor: "rgba(255,255,255,0.06)",
                            }}
                        />
                        <View
                            style={{
                                position: "absolute",
                                width: discSize * 0.78,
                                height: discSize * 0.78,
                                borderRadius: discSize,
                                borderWidth: rpx(2),
                                borderColor: "rgba(255,255,255,0.05)",
                            }}
                        />
                        <FastImage
                            style={{
                                width: coverSize * 0.58,
                                height: coverSize * 0.58,
                                borderRadius: coverSize * 0.29,
                            }}
                            source={musicItem?.artwork}
                            placeholderSource={ImgAsset.albumDefault}
                        />
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                {
                                    position: "absolute",
                                    width: rpx(60),
                                    height: discSize,
                                    backgroundColor:
                                        "rgba(255,255,255,0.18)",
                                },
                                shineStyle,
                            ]}
                        />
                    </Animated.View>

                    {/* tonearm */}
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: "8%",
                            right: "12%",
                            width: rpx(40),
                            height: discSize * 0.55,
                            alignItems: "center",
                        }}>
                        <Animated.View
                            style={[
                                {
                                    width: rpx(16),
                                    height: "100%",
                                    borderRadius: rpx(10),
                                    backgroundColor: "rgba(230,230,230,0.9)",
                                    alignItems: "center",
                                },
                                needleStyle,
                            ]}>
                            <View
                                style={{
                                    position: "absolute",
                                    bottom: -rpx(4),
                                    width: rpx(28),
                                    height: rpx(28),
                                    borderRadius: rpx(6),
                                    backgroundColor: "#EC4141",
                                }}
                            />
                        </Animated.View>
                    </View>
                </View>
            </GestureDetector>
            <Operations />
        </>
    );
}
