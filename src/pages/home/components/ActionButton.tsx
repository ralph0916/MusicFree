import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import Color from "color";

interface IActionButtonProps {
    iconName: IIconName;
    iconColor?: string;
    title: string;
    action?: () => void;
    style?: StyleProp<ViewStyle>;
}

export default function ActionButton(props: IActionButtonProps) {
    const { iconName, iconColor, title, action, style } = props;
    const colors = useColors();
    const accent = iconColor ?? colors.primary;
    const chipBg = Color(accent).alpha(0.12).rgb().string();

    return (
        <TouchableOpacity
            onPress={action}
            activeOpacity={0.75}
            style={[
                styles.wrapper,
                {
                    backgroundColor: colors.card,
                },
                style,
            ]}>
            <View
                style={[
                    styles.iconChip,
                    {
                        backgroundColor: chipBg,
                    },
                ]}>
                <Icon
                    accessible={false}
                    name={iconName}
                    color={accent}
                    size={rpx(40)}
                />
            </View>
            <ThemeText
                accessible={false}
                fontSize="description"
                fontWeight="medium"
                style={styles.text}
                numberOfLines={1}>
                {title}
            </ThemeText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: rpx(140),
        height: rpx(156),
        borderRadius: rpx(20),
        flexGrow: 1,
        flexShrink: 0,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: rpx(8),
        // iOS
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        // Android
        elevation: 2,
    },
    iconChip: {
        width: rpx(72),
        height: rpx(72),
        borderRadius: rpx(36),
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        marginTop: rpx(14),
    },
});
