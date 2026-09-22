import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";
import Config, { useAppConfig } from "@/core/appConfig";
import ThemeCard from "./themeCard";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import Theme, { themePresets } from "@/core/theme";

export default function Background() {
    const themeSelectedTheme = useAppConfig("theme.selectedTheme");
    const themeBackground = useAppConfig("theme.background");
    const navigate = useNavigate();

    const skins = themePresets.filter(t => t.group === "skin");
    const cool = themePresets.filter(t => t.group === "cool");
    const simple = themePresets.filter(t => t.group === "simple");

    const renderCards = (list: typeof themePresets) =>
        list.map(item => (
            <ThemeCard
                key={item.id}
                preview={item.preview}
                accent={item.accent}
                title={item.name}
                selected={themeSelectedTheme === item.id}
                onPress={() => {
                    if (themeSelectedTheme !== item.id) {
                        Theme.setTheme(item.id);
                        Config.setConfig("theme.followSystem", false);
                    }
                }}
            />
        ));

    return (
        <View>
            <ThemeText
                fontSize="subTitle"
                fontWeight="bold"
                style={style.header}>
                网易云风格皮肤
            </ThemeText>
            <View style={style.sectionWrapper}>{renderCards(skins)}</View>

            <ThemeText
                fontSize="subTitle"
                fontWeight="bold"
                style={style.header}>
                炫酷主题
            </ThemeText>
            <View style={style.sectionWrapper}>{renderCards(cool)}</View>

            <ThemeText
                fontSize="subTitle"
                fontWeight="bold"
                style={style.header}>
                简约主题
            </ThemeText>
            <View style={style.sectionWrapper}>{renderCards(simple)}</View>

            <ThemeText
                fontSize="subTitle"
                fontWeight="bold"
                style={style.header}>
                自定义
            </ThemeText>
            <View style={style.sectionWrapper}>
                <ThemeCard
                    title="自定义"
                    selected={themeSelectedTheme === "custom"}
                    preview={themeBackground}
                    onPress={() => {
                        if (themeSelectedTheme !== "custom") {
                            Config.setConfig("theme.followSystem", false);
                            Theme.setTheme("custom", {
                                colors: Config.getConfig("theme.customColors"),
                            });
                        }
                        navigate(ROUTE_PATH.SET_CUSTOM_THEME);
                    }}
                />
            </View>
        </View>
    );
}

const style = StyleSheet.create({
    header: {
        marginTop: rpx(36),
        paddingLeft: rpx(24),
    },
    sectionWrapper: {
        marginTop: rpx(28),
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: rpx(24),
    },
});
