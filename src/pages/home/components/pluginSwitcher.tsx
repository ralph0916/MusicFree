import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import {
    navidromePluginPlatform,
    neteasePluginPlatform,
    qqPluginPlatform,
} from "@/constants/commonConst";

export type HomePluginKey =
    | typeof navidromePluginPlatform
    | typeof neteasePluginPlatform
    | typeof qqPluginPlatform;

const PLUGINS: Array<{ key: HomePluginKey; label: string }> = [
    { key: navidromePluginPlatform, label: "NAS" },
    { key: neteasePluginPlatform, label: "网易云" },
    { key: qqPluginPlatform, label: "QQ音乐" },
];

interface IProps {
    active: HomePluginKey;
    onChange: (key: HomePluginKey) => void;
}

export default function PluginSwitcher(props: IProps) {
    const { active, onChange } = props;
    const colors = useColors();

    return (
        <View style={styles.wrapper}>
            {PLUGINS.map(item => {
                const selected = active === item.key;
                return (
                    <Pressable
                        key={item.key}
                        onPress={() => onChange(item.key)}
                        style={[
                            styles.tab,
                            selected
                                ? {
                                    backgroundColor: colors.primary,
                                }
                                : {
                                    backgroundColor: colors.placeholder,
                                },
                        ]}>
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight={selected ? "bold" : "medium"}
                            color={selected ? "#fff" : colors.text}>
                            {item.label}
                        </ThemeText>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: rpx(24),
        paddingBottom: rpx(12),
    },
    tab: {
        paddingHorizontal: rpx(28),
        paddingVertical: rpx(12),
        borderRadius: rpx(28),
        marginRight: rpx(16),
        marginBottom: rpx(8),
    },
});
