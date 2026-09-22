import React, { memo, useEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { CircularProgressBase } from "react-native-circular-progress-indicator";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showPanel } from "../panels/usePanel";
import useColors from "@/hooks/useColors";
import IconButton from "../base/iconButton";
import TrackPlayer, { useCurrentMusic, useMusicState, useProgress } from "@/core/trackPlayer";
import { musicIsPaused } from "@/utils/trackUtils";
import MusicInfo from "./musicInfo";
import Icon from "@/components/base/icon.tsx";
import Color from "color";
import MiniHeartButton from "@/components/miniHeartButton";

function CircularPlayBtn() {
    const progress = useProgress();
    const musicState = useMusicState();
    const colors = useColors();

    const isPaused = musicIsPaused(musicState);

    return (
        <CircularProgressBase
            activeStrokeWidth={rpx(5)}
            inActiveStrokeWidth={rpx(3)}
            inActiveStrokeOpacity={0.15}
            value={
                progress?.duration
                    ? (100 * progress.position) / progress.duration
                    : 0
            }
            duration={100}
            radius={rpx(34)}
            activeStrokeColor={colors.primary}
            inActiveStrokeColor={Color(colors.musicBarText)
                .alpha(0.2)
                .toString()}>
            <View
                style={[
                    styles.playInner,
                    {
                        backgroundColor: colors.primary,
                    },
                ]}>
                <IconButton
                    accessibilityLabel={"播放或暂停歌曲"}
                    name={isPaused ? "play" : "pause"}
                    sizeType={"small"}
                    hitSlop={{
                        top: 10,
                        left: 10,
                        right: 10,
                        bottom: 10,
                    }}
                    color="#FFFFFF"
                    onPress={async () => {
                        if (isPaused) {
                            await TrackPlayer.play();
                        } else {
                            await TrackPlayer.pause();
                        }
                    }}
                />
            </View>
        </CircularProgressBase>
    );
}
function MusicBar() {
    const musicItem = useCurrentMusic();

    const [showKeyboard, setKeyboardStatus] = useState(false);

    const colors = useColors();
    const safeAreaInsets = useSafeAreaInsets();

    useEffect(() => {
        const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
            setKeyboardStatus(true);
        });
        const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardStatus(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    return (
        <>
            {musicItem && !showKeyboard && (
                <View
                    style={[
                        styles.wrapper,
                        {
                            backgroundColor: colors.musicBar,
                            marginBottom: rpx(12),
                            paddingRight: rpx(20) + safeAreaInsets.right,
                        },
                    ]}
                    accessible
                    accessibilityLabel={`歌曲: ${musicItem.title} 歌手: ${musicItem.artist}`}>
                    <MusicInfo musicItem={musicItem} />
                    <View style={styles.actionGroup}>
                        <MiniHeartButton
                            color={colors.musicBarText}
                            size={rpx(42)}
                        />
                        <CircularPlayBtn />
                        <Icon
                            accessible
                            accessibilityLabel="播放列表"
                            name="playlist"
                            size={rpx(48)}
                            onPress={() => {
                                showPanel("PlayList");
                            }}
                            color={colors.musicBarText}
                            style={styles.actionIcon}
                        />
                    </View>
                </View>
            )}
        </>
    );
}

export default memo(MusicBar, () => true);

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: rpx(20),
        height: rpx(120),
        borderRadius: rpx(24),
        flexDirection: "row",
        alignItems: "center",
        // iOS shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        // Android
        elevation: 6,
    },
    actionGroup: {
        width: rpx(240),
        justifyContent: "flex-end",
        flexDirection: "row",
        alignItems: "center",
    },
    actionIcon: {
        marginLeft: rpx(28),
    },
    playInner: {
        width: rpx(52),
        height: rpx(52),
        borderRadius: rpx(26),
        alignItems: "center",
        justifyContent: "center",
    },
});
