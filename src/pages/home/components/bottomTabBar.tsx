import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Icon, { IIconName } from "@/components/base/icon.tsx";

export type HomeTabKey = "home" | "sheet" | "tag" | "mine";

const TABS: Array<{
    key: HomeTabKey;
    label: string;
    icon: IIconName;
}> = [
    { key: "home", label: "首页", icon: "home-outline" },
    { key: "sheet", label: "歌单", icon: "playlist" },
    { key: "tag", label: "标签", icon: "pencil-square" },
    { key: "mine", label: "我的", icon: "user" },
];

interface IProps {
    active: HomeTabKey;
    onChange: (key: HomeTabKey) => void;
}

export default function BottomTabBar(props: IProps) {
    const { active, onChange } = props;
    const colors = useColors();

    return (
        <View
            style={[
                styles.wrapper,
                {
                    backgroundColor: colors.card,
                    borderTopColor: colors.divider,
                },
            ]}>
            {TABS.map(tab => {
                const selected = active === tab.key;
                const color = selected ? colors.primary : colors.textSecondary;
                return (
                    <Pressable
                        key={tab.key}
                        style={styles.item}
                        onPress={() => onChange(tab.key)}>
                        <Icon name={tab.icon} size={rpx(40)} color={color} />
                        <ThemeText
                            fontSize="description"
                            color={color}
                            style={styles.label}>
                            {tab.label}
                        </ThemeText>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        height: rpx(110),
        flexDirection: "row",
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        marginTop: rpx(6),
    },
});
