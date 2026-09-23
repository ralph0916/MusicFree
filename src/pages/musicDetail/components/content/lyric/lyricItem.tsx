import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import { fontSizeConst } from "@/constants/uiConst";

interface ILyricItemComponentProps {
    index?: number;
    light?: boolean;
    highlight?: boolean;
    /** 0~1，当前行从左到右着色进度 */
    progress?: number;
    text?: string;
    fontSize?: number;
    onLayout?: (index: number, height: number) => void;
}

function _LyricItemComponent(props: ILyricItemComponentProps) {
    const {
        light,
        highlight,
        text = "",
        onLayout,
        index,
        fontSize,
        progress = 0,
    } = props;

    const colors = useColors();
    const size = fontSize || fontSizeConst.content;
    const ratio = Math.min(1, Math.max(0, progress));

    const baseStyle = useMemo(
        () => [
            lyricStyles.item,
            { fontSize: size },
            light ? lyricStyles.draggingItem : null,
        ],
        [size, light],
    );

    if (!highlight) {
        return (
            <Text
                onLayout={({ nativeEvent }) => {
                    if (index !== undefined) {
                        onLayout?.(index, nativeEvent.layout.height);
                    }
                }}
                style={baseStyle}>
                {text}
            </Text>
        );
    }

    // 高亮行：以文字自身宽度为基准裁剪，实现从左到右依次变色（居中布局）
    return (
        <View
            onLayout={({ nativeEvent }) => {
                if (index !== undefined) {
                    onLayout?.(index, nativeEvent.layout.height);
                }
            }}
            style={lyricStyles.highlightOuter}>
            <View style={lyricStyles.highlightInner}>
                <Text
                    style={[
                        ...baseStyle,
                        lyricStyles.tightItem,
                        { color: "rgba(255,255,255,0.55)" },
                    ]}>
                    {text}
                </Text>
                <View
                    pointerEvents="none"
                    style={[
                        lyricStyles.progressClip,
                        {
                            width: `${Math.max(
                                ratio * 100,
                                ratio > 0 ? 1 : 0,
                            )}%`,
                        },
                    ]}>
                    <Text
                        style={[
                            ...baseStyle,
                            lyricStyles.tightItem,
                            {
                                color: colors.primary,
                            },
                        ]}>
                        {text}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const LyricItemComponent = memo(
    _LyricItemComponent,
    (prev, curr) =>
        prev.light === curr.light &&
        prev.highlight === curr.highlight &&
        prev.text === curr.text &&
        prev.index === curr.index &&
        prev.fontSize === curr.fontSize &&
        Math.abs((prev.progress || 0) - (curr.progress || 0)) < 0.008,
);

export default LyricItemComponent;

const lyricStyles = StyleSheet.create({
    highlightOuter: {
        width: "100%",
        alignItems: "center",
        paddingHorizontal: rpx(64),
        paddingVertical: rpx(24),
    },
    highlightInner: {
        position: "relative",
        alignSelf: "center",
        maxWidth: "100%",
    },
    progressClip: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        overflow: "hidden",
    },
    tightItem: {
        paddingHorizontal: 0,
        paddingVertical: 0,
        width: undefined,
        textAlign: "left",
    },
    item: {
        color: "white",
        opacity: 0.6,
        paddingHorizontal: rpx(64),
        paddingVertical: rpx(24),
        width: "100%",
        textAlign: "center",
        textAlignVertical: "center",
    },
    draggingItem: {
        opacity: 0.9,
        color: "white",
    },
});
