import { useI18N } from "@/core/i18n";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import rpx from "@/utils/rpx";
import React from "react";
import { StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import ActionButton from "../ActionButton";
import useColors from "@/hooks/useColors";

export default function Operations() {
    const navigate = useNavigate();
    const { t } = useI18N();
    const colors = useColors();

    const actionButtons = [
        {
            iconName: "fire" as const,
            iconColor: colors.primary,
            title: t("home.recommendSheet"),
            action() {
                navigate(ROUTE_PATH.RECOMMEND_SHEETS);
            },
        },
        {
            iconName: "trophy" as const,
            iconColor: "#F5A623",
            title: t("home.topList"),
            action() {
                navigate(ROUTE_PATH.TOP_LIST);
            },
        },
        {
            iconName: "clock-outline" as const,
            iconColor: "#507DAF",
            title: t("home.playHistory"),
            action() {
                navigate(ROUTE_PATH.HISTORY);
            },
        },
    ];

    return (
        <ScrollView style={styles.container}>
            {actionButtons.map((action, index) => (
                <ActionButton
                    style={[
                        styles.actionButtonStyle,
                        index % 4 ? styles.actionMarginLeft : null,
                    ]}
                    key={action.title}
                    {...action}
                />
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        width: rpx(200),
        flexGrow: 0,
        flexShrink: 0,
        paddingHorizontal: rpx(24),
        marginVertical: rpx(24),
        flexDirection: "row",
        flexWrap: "wrap",
    },
    actionButtonStyle: {
        width: rpx(157.5),
        height: rpx(168),
        borderRadius: rpx(20),
    },
    actionMarginLeft: {
        marginTop: rpx(20),
    },
});
