import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { ImgAsset } from "@/constants/assetsConst";
import { useCurrentMusic } from "@/core/trackPlayer";
import rpx from "@/utils/rpx";

function FloatingOrb(props: {
    size: number;
    color: string;
    x: number;
    y: number;
    delayMs: number;
}) {
    const { size, color, x, y, delayMs } = props;
    const t = useSharedValue(0);

    useEffect(() => {
        t.value = withDelay(
            delayMs,
            withRepeat(
                withTiming(1, {
                    duration: 7000 + delayMs,
                    easing: Easing.inOut(Easing.sin),
                }),
                -1,
                true,
            ),
        );
    }, [delayMs, t]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: x + (t.value - 0.5) * 40 },
            { translateY: y + Math.sin(t.value * Math.PI * 2) * 30 },
            { scale: interpolate(t.value, [0, 1], [0.85, 1.15]) },
        ],
        opacity: interpolate(t.value, [0, 0.5, 1], [0.2, 0.45, 0.25]),
    }));

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

export default function Background() {
    const musicItem = useCurrentMusic();
    const drift = useSharedValue(0);
    const hue = useSharedValue(0);

    useEffect(() => {
        drift.value = withRepeat(
            withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
        );
        hue.value = withRepeat(
            withTiming(1, { duration: 10000, easing: Easing.linear }),
            -1,
            false,
        );
    }, [drift, hue]);

    const artworkSource = (() => {
        if (!musicItem?.artwork) {
            return ImgAsset.albumDefault;
        }
        if (typeof musicItem.artwork === "string") {
            return { uri: musicItem.artwork };
        }
        return musicItem.artwork;
    })();

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: 1.2 + drift.value * 0.12 },
            { translateX: (drift.value - 0.5) * 36 },
            { translateY: (drift.value - 0.5) * -20 },
            { rotate: `${(drift.value - 0.5) * 6}deg` },
        ],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(hue.value, [0, 0.5, 1], [0.15, 0.35, 0.15]),
    }));

    return (
        <>
            <View style={style.background} />
            <Animated.View style={[style.blurWrap, animStyle]}>
                <Image style={style.blur} blurRadius={55} source={artworkSource} />
            </Animated.View>
            <FloatingOrb
                size={rpx(280)}
                color="rgba(236,65,65,0.35)"
                x={rpx(-40)}
                y={rpx(120)}
                delayMs={0}
            />
            <FloatingOrb
                size={rpx(220)}
                color="rgba(99,102,241,0.28)"
                x={rpx(420)}
                y={rpx(360)}
                delayMs={600}
            />
            <FloatingOrb
                size={rpx(180)}
                color="rgba(14,165,233,0.25)"
                x={rpx(80)}
                y={rpx(780)}
                delayMs={1200}
            />
            <Animated.View
                style={[
                    style.colorWash,
                    { backgroundColor: "rgba(236,65,65,0.25)" },
                    overlayStyle,
                ]}
            />
            <View style={style.vignette} />
        </>
    );
}

const style = StyleSheet.create({
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#000",
    },
    blurWrap: {
        ...StyleSheet.absoluteFillObject,
    },
    blur: {
        width: "100%",
        height: "100%",
        opacity: 0.55,
    },
    colorWash: {
        ...StyleSheet.absoluteFillObject,
    },
    vignette: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.32)",
    },
});
