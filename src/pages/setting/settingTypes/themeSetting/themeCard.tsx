import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Image from "@/components/base/image";
import { ImgAsset } from "@/constants/assetsConst";

interface IThemeCardProps {
    selected?: boolean;
    preview?: string;
    accent?: string;
    onPress?: () => void;
    title?: string;
}
export default function ThemeCard(props: IThemeCardProps) {
    const { selected, preview, accent, onPress, title } = props;

    const isPreviewColor = preview?.startsWith("#") ? true : false;

    const colors = useColors();

    return (
        <View>
            <Pressable
                onPress={onPress}
                style={[
                    styles.borderContainer,
                    selected
                        ? {
                            borderWidth: 2,
                            borderStyle: "solid",
                            borderColor: colors.primary,
                        }
                        : null,
                ]}>
                <View
                    style={[
                        styles.container,
                        isPreviewColor
                            ? {
                                backgroundColor: preview,
                            }
                            : null,
                    ]}>
                    {isPreviewColor ? (
                        <>
                            <View
                                style={[
                                    styles.accentBar,
                                    {
                                        backgroundColor:
                                            accent || colors.primary,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.accentDot,
                                    {
                                        backgroundColor:
                                            accent || colors.primary,
                                    },
                                ]}
                            />
                        </>
                    ) : (
                        <Image
                            style={styles.image}
                            uri={preview}
                            emptySrc={ImgAsset.add}
                        />
                    )}
                </View>
            </Pressable>
            <ThemeText
                numberOfLines={1}
                fontSize="subTitle"
                style={styles.title}
                fontColor={selected ? "primary" : "text"}>
                {title}
            </ThemeText>
        </View>
    );
}

const styles = StyleSheet.create({
    borderContainer: {
        width: rpx(160),
        height: rpx(160),
        borderRadius: rpx(22),
        marginRight: rpx(24),
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        width: rpx(136),
        height: rpx(136),
        borderRadius: rpx(12),
        overflow: "hidden",
    },
    accentBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: rpx(18),
    },
    accentDot: {
        position: "absolute",
        right: rpx(14),
        bottom: rpx(14),
        width: rpx(28),
        height: rpx(28),
        borderRadius: rpx(14),
    },
    title: {
        textAlign: "center",
        marginTop: rpx(12),
        width: rpx(160),
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: rpx(12),
    },
});
