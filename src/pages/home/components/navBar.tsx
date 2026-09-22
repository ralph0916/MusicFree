import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import IconButton from "@/components/base/iconButton";
import { useI18N } from "@/core/i18n";
import { ROUTE_PATH, useNavigate } from "@/core/router";

export default function NavBar() {
    const navigation = useNavigation<any>();
    const colors = useColors();
    const { t } = useI18N();
    const navigate = useNavigate();

    const openDrawer = () => {
        navigation?.openDrawer();
    };

    return (
        <View style={styles.appbar}>
            <Pressable
                onPress={openDrawer}
                hitSlop={16}
                style={styles.menu}
                accessibilityRole="button"
                accessibilityLabel={t("home.openSidebar.a11y")}>
                <IconButton
                    accessibilityLabel={t("home.openSidebar.a11y")}
                    name="bars-3"
                    color={colors.text}
                    onPress={openDrawer}
                />
            </Pressable>
            <Pressable
                style={styles.brand}
                onPress={openDrawer}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("home.openSidebar.a11y")}>
                <ThemeText fontSize="title" fontWeight="bold">
                    RalphMusic
                </ThemeText>
            </Pressable>
            <IconButton
                accessibilityLabel="搜索"
                name="magnifying-glass"
                style={styles.search}
                color={colors.text}
                onPress={() => navigate(ROUTE_PATH.SEARCH_PAGE)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    appbar: {
        backgroundColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        height: rpx(88),
        paddingRight: rpx(12),
    },
    brand: {
        marginLeft: rpx(8),
        flex: 1,
        justifyContent: "center",
        minHeight: rpx(88),
    },
    menu: {
        marginLeft: rpx(16),
    },
    search: {
        marginRight: rpx(8),
    },
});
