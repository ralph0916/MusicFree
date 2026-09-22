import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Icon from "@/components/base/icon.tsx";
import FastImage from "@/components/base/fastImage";
import { ImgAsset } from "@/constants/assetsConst";
import TrackPlayer, {
    useCurrentMusic,
    useMusicState,
    useProgress,
} from "@/core/trackPlayer";
import { musicIsPaused } from "@/utils/trackUtils";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import { showPanel } from "@/components/panels/usePanel";
import Color from "color";
import MiniHeartButton from "@/components/miniHeartButton";
import { useCurrentLyricItem } from "@/core/lyricManager";

function formatTime(sec = 0) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
}

function HomePlayerBar() {
    const musicItem = useCurrentMusic();
    const musicState = useMusicState();
    const progress = useProgress();
    const lyricItem = useCurrentLyricItem();
    const colors = useColors();
    const navigate = useNavigate();
    const paused = musicIsPaused(musicState);

    const ratio = (() => {
        const duration =
            progress?.duration > 0
                ? progress.duration
                : Number(musicItem?.duration) || 0;
        if (duration <= 0) {
            return 0;
        }
        return Math.min(1, Math.max(0, (progress?.position || 0) / duration));
    })();

    const endTime = (() => {
        if (progress?.duration > 0) {
            return progress.duration;
        }
        return Number(musicItem?.duration) || 0;
    })();

    const lyricText =
        lyricItem?.lrc?.trim() ||
        (musicItem ? "暂无歌词" : "选择一首歌曲开始播放");

    return (
        <View
            style={[
                styles.wrapper,
                {
                    backgroundColor: colors.musicBar,
                },
            ]}>
            <Pressable
                style={styles.main}
                onPress={() => {
                    if (musicItem) {
                        navigate(ROUTE_PATH.MUSIC_DETAIL);
                    }
                }}>
                <FastImage
                    style={styles.cover}
                    source={musicItem?.artwork}
                    placeholderSource={ImgAsset.albumDefault}
                />
                <View style={styles.textBox}>
                    <ThemeText
                        fontSize="content"
                        fontWeight="medium"
                        fontColor="musicBarText"
                        numberOfLines={1}>
                        {musicItem
                            ? `${musicItem.title}${
                                musicItem.artist
                                    ? ` - ${musicItem.artist}`
                                    : ""
                            }`
                            : "暂无播放"}
                    </ThemeText>
                    <ThemeText
                        fontSize="description"
                        numberOfLines={1}
                        color={Color(colors.primary).toString()}
                        style={styles.lyric}>
                        {lyricText}
                    </ThemeText>
                    <View style={styles.progressRow}>
                        <ThemeText
                            fontSize="description"
                            color={Color(colors.musicBarText)
                                .alpha(0.45)
                                .toString()}
                            style={styles.time}>
                            {formatTime(progress?.position)}
                        </ThemeText>
                        <View
                            style={[
                                styles.progressTrack,
                                {
                                    backgroundColor: Color(colors.musicBarText)
                                        .alpha(0.12)
                                        .toString(),
                                },
                            ]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${ratio * 100}%`,
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                            />
                        </View>
                        <ThemeText
                            fontSize="description"
                            color={Color(colors.musicBarText)
                                .alpha(0.45)
                                .toString()}
                            style={styles.time}>
                            {formatTime(endTime)}
                        </ThemeText>
                    </View>
                </View>
            </Pressable>

            <View style={styles.actions}>
                <MiniHeartButton color={colors.musicBarText} size={rpx(44)} />
                <Icon
                    name="skip-left"
                    size={rpx(52)}
                    color={colors.musicBarText}
                    style={styles.actionIcon}
                    onPress={() => TrackPlayer.skipToPrevious()}
                />
                <Pressable
                    style={[
                        styles.playBtn,
                        { backgroundColor: colors.primary },
                    ]}
                    onPress={async () => {
                        if (!musicItem) {
                            return;
                        }
                        if (paused) {
                            await TrackPlayer.play();
                        } else {
                            await TrackPlayer.pause();
                        }
                    }}>
                    <Icon
                        name={paused ? "play" : "pause"}
                        size={rpx(36)}
                        color="#fff"
                    />
                </Pressable>
                <Icon
                    name="skip-right"
                    size={rpx(52)}
                    color={colors.musicBarText}
                    style={styles.actionIcon}
                    onPress={() => TrackPlayer.skipToNext()}
                />
                <Icon
                    name="playlist"
                    size={rpx(46)}
                    color={colors.musicBarText}
                    style={styles.actionIcon}
                    onPress={() => showPanel("PlayList")}
                />
            </View>
        </View>
    );
}

export default memo(HomePlayerBar);

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: rpx(16),
        marginBottom: rpx(8),
        borderRadius: rpx(20),
        paddingTop: rpx(14),
        paddingBottom: rpx(14),
        paddingLeft: rpx(16),
        paddingRight: rpx(16),
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    main: {
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
    },
    cover: {
        width: rpx(88),
        height: rpx(88),
        borderRadius: rpx(12),
        marginRight: rpx(16),
    },
    textBox: {
        flex: 1,
        minWidth: 0,
    },
    lyric: {
        marginTop: rpx(4),
    },
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: rpx(10),
    },
    progressTrack: {
        flex: 1,
        height: rpx(6),
        borderRadius: rpx(3),
        overflow: "hidden",
        marginHorizontal: rpx(10),
    },
    progressFill: {
        height: "100%",
        borderRadius: rpx(3),
    },
    time: {
        minWidth: rpx(56),
        textAlign: "center",
        fontSize: rpx(18),
    },
    actions: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: rpx(14),
        gap: rpx(28),
    },
    actionIcon: {
        marginLeft: 0,
    },
    playBtn: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: rpx(32),
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 0,
    },
});
