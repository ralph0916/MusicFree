import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import rpx from "@/utils/rpx";
import ListItem from "../base/listItem";

import LocalMusicSheet from "@/core/localMusicSheet";
import { showPanel } from "../panels/usePanel";
import TitleAndTag from "./titleAndTag";
import ThemeText from "../base/themeText";
import TrackPlayer from "@/core/trackPlayer";
import Icon from "@/components/base/icon.tsx";
import { ImgAsset } from "@/constants/assetsConst";
import MiniHeartButton from "@/components/miniHeartButton";
import {
    navidromePluginPlatform,
    neteasePluginPlatform,
    qqPluginPlatform,
} from "@/constants/commonConst";

interface IMusicItemProps {
    index?: string | number;
    showMoreIcon?: boolean;
    showArtwork?: boolean;
    showHeart?: boolean;
    musicItem: IMusic.IMusicItem;
    musicSheet?: IMusic.IMusicSheetItem;
    onItemPress?: (musicItem: IMusic.IMusicItem) => void;
    onItemLongPress?: () => void;
    itemPaddingRight?: number;
    left?: () => JSX.Element;
    containerStyle?: StyleProp<ViewStyle>;
    highlight?: boolean;
}

function canShowHeart(platform: string) {
    return (
        platform === navidromePluginPlatform ||
        platform === neteasePluginPlatform ||
        platform === qqPluginPlatform
    );
}

export default function MusicItem(props: IMusicItemProps) {
    const {
        musicItem,
        index,
        onItemPress,
        onItemLongPress,
        musicSheet,
        itemPaddingRight,
        showMoreIcon = true,
        showArtwork = true,
        showHeart = true,
        left: Left,
        containerStyle,
        highlight = false,
    } = props;

    return (
        <ListItem
            heightType="big"
            style={containerStyle}
            withHorizontalPadding
            leftPadding={index !== undefined || showArtwork ? 0 : undefined}
            rightPadding={itemPaddingRight}
            onLongPress={onItemLongPress}
            onPress={() => {
                if (onItemPress) {
                    onItemPress(musicItem);
                } else {
                    TrackPlayer.play(musicItem);
                }
            }}>
            {Left ? <Left /> : null}
            {showArtwork ? (
                <ListItem.ListItemImage
                    uri={musicItem.artwork}
                    fallbackImg={ImgAsset.albumDefault}
                />
            ) : null}
            {index !== undefined ? (
                <ListItem.ListItemText
                    width={rpx(64)}
                    position="none"
                    fixedWidth
                    fontColor={highlight ? "primary" : "text"}
                    contentStyle={styles.indexText}>
                    {index}
                </ListItem.ListItemText>
            ) : null}
            <ListItem.Content
                title={
                    <TitleAndTag
                        title={musicItem.title}
                        titleFontColor={highlight ? "primary" : "text"}
                        tag={musicItem.platform}
                    />
                }
                description={
                    <View style={styles.descContainer}>
                        {LocalMusicSheet.isLocalMusic(musicItem) && (
                            <Icon
                                style={styles.icon}
                                color="#11659a"
                                name="check-circle"
                                size={rpx(22)}
                            />
                        )}
                        <ThemeText
                            numberOfLines={1}
                            fontSize="description"
                            fontColor={highlight ? "primary" : "textSecondary"}>
                            {musicItem.artist}
                            {musicItem.album ? ` - ${musicItem.album}` : ""}
                        </ThemeText>
                    </View>
                }
            />
            {showHeart && canShowHeart(musicItem.platform) ? (
                <View style={styles.heartWrap}>
                    <MiniHeartButton
                        musicItem={musicItem}
                        size={rpx(36)}
                        color="#999"
                    />
                </View>
            ) : null}
            {showMoreIcon ? (
                <ListItem.ListItemIcon
                    width={rpx(48)}
                    position="none"
                    icon="ellipsis-vertical"
                    onPress={() => {
                        showPanel("MusicItemOptions", {
                            musicItem,
                            musicSheet,
                        });
                    }}
                />
            ) : null}
        </ListItem>
    );
}

const styles = StyleSheet.create({
    icon: {
        marginRight: rpx(6),
    },
    descContainer: {
        flexDirection: "row",
        marginTop: rpx(16),
    },
    indexText: {
        fontStyle: "italic",
        textAlign: "center",
        padding: rpx(2),
    },
    heartWrap: {
        width: rpx(56),
        alignItems: "center",
        justifyContent: "center",
    },
});
