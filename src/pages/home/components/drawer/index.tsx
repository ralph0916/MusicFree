import Divider from "@/components/base/divider";
import { IIconName } from "@/components/base/icon.tsx";
import ListItem from "@/components/base/listItem";
import PageBackground from "@/components/base/pageBackground";
import ThemeText from "@/components/base/themeText";
import { showPanel } from "@/components/panels/usePanel";
import { useI18N } from "@/core/i18n";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import TrackPlayer from "@/core/trackPlayer";
import NativeUtils from "@/native/utils";
import rpx from "@/utils/rpx";
import { useScheduleCloseCountDown } from "@/utils/scheduleClose";
import timeformat from "@/utils/timeformat";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import React, { memo } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { default as DeviceInfo } from "react-native-device-info";
import useColors from "@/hooks/useColors";

const ITEM_HEIGHT = rpx(108);

interface ISettingOptions {
    icon: IIconName;
    title: string;
    onPress?: () => void;
}

function HomeDrawer(props: any) {
    const navigate = useNavigate();
    const colors = useColors();
    function navigateToSetting(settingType: string) {
        navigate(ROUTE_PATH.SETTING, {
            type: settingType,
        });
    }

    const { t } = useI18N();

    const basicSetting: ISettingOptions[] = [
        {
            icon: "cog-8-tooth",
            title: t("sidebar.basicSettings"),
            onPress: () => {
                navigateToSetting("basic");
            },
        },
        {
            icon: "javascript",
            title: t("sidebar.pluginManagement"),
            onPress: () => {
                navigateToSetting("plugin");
            },
        },
        {
            icon: "t-shirt-outline",
            title: t("sidebar.themeSettings"),
            onPress: () => {
                navigateToSetting("theme");
            },
        },
    ];

    const otherSetting: ISettingOptions[] = [
        {
            icon: "circle-stack",
            title: t("sidebar.backupAndResume"),
            onPress: () => {
                navigateToSetting("backup");
            },
        },
    ];

    if (Platform.OS === "android") {
        otherSetting.push({
            icon: "shield-keyhole-outline",
            title: t("sidebar.permissionManagement"),
            onPress: () => {
                navigate(ROUTE_PATH.PERMISSIONS);
            },
        });
    }

    return (
        <>
            <PageBackground />
            <DrawerContentScrollView {...[props]} style={style.scrollWrapper}>
                <View style={style.header}>
                    <View style={style.brandRow}>
                        <View style={style.brandDot} />
                        <ThemeText fontSize="appbar" fontWeight="bold">
                            {DeviceInfo.getApplicationName()}
                        </ThemeText>
                    </View>
                </View>
                <View
                    style={[
                        style.card,
                        {
                            backgroundColor: colors.card,
                        },
                    ]}>
                    <ListItem withHorizontalPadding heightType="smallest">
                        <ListItem.ListItemText
                            fontSize="subTitle"
                            fontWeight="bold">
                            {t("common.setting")}
                        </ListItem.ListItemText>
                    </ListItem>
                    {basicSetting.map((item, index) => (
                        <ListItem
                            withHorizontalPadding
                            key={"basic-setting-" + index}
                            onPress={item.onPress}>
                            <ListItem.ListItemIcon
                                icon={item.icon}
                                width={rpx(48)}
                            />
                            <ListItem.Content title={item.title} />
                        </ListItem>
                    ))}
                </View>
                <View
                    style={[
                        style.card,
                        {
                            backgroundColor: colors.card,
                        },
                    ]}>
                    <ListItem withHorizontalPadding heightType="smallest">
                        <ListItem.ListItemText
                            fontSize="subTitle"
                            fontWeight="bold">
                            {t("common.other")}
                        </ListItem.ListItemText>
                    </ListItem>
                    <CountDownItem />
                    {otherSetting.map((item, index) => (
                        <ListItem
                            withHorizontalPadding
                            key={"other-setting-" + index}
                            onPress={item.onPress}>
                            <ListItem.ListItemIcon
                                icon={item.icon}
                                width={rpx(48)}
                            />
                            <ListItem.Content title={item.title} />
                        </ListItem>
                    ))}
                </View>

                <Divider />
                <ListItem
                    withHorizontalPadding
                    onPress={() => {
                        BackHandler.exitApp();
                    }}>
                    <ListItem.ListItemIcon
                        icon={"home-outline"}
                        width={rpx(48)}
                    />
                    <ListItem.Content title={t("sidebar.backToDesktop")} />
                </ListItem>
                <ListItem
                    withHorizontalPadding
                    onPress={async () => {
                        await TrackPlayer.reset();
                        NativeUtils.exitApp();
                    }}>
                    <ListItem.ListItemIcon
                        icon={"power-outline"}
                        width={rpx(48)}
                    />
                    <ListItem.Content title={t("sidebar.exitApp")} />
                </ListItem>
            </DrawerContentScrollView>
        </>
    );
}

export default memo(HomeDrawer, () => true);

const style = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: "#999999",
    },
    scrollWrapper: {
        paddingTop: rpx(12),
    },
    header: {
        width: "100%",
        paddingHorizontal: rpx(24),
        paddingVertical: rpx(28),
        marginBottom: rpx(8),
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    brandDot: {
        width: rpx(16),
        height: rpx(16),
        borderRadius: rpx(8),
        backgroundColor: "#EC4141",
        marginRight: rpx(16),
    },
    card: {
        marginBottom: rpx(24),
        marginHorizontal: rpx(16),
        borderRadius: rpx(20),
        overflow: "hidden",
    },
    countDownText: {
        height: ITEM_HEIGHT,
        textAlignVertical: "center",
    },
});

function _CountDownItem() {
    const countDown = useScheduleCloseCountDown();
    const { t } = useI18N();

    return (
        <ListItem
            withHorizontalPadding
            onPress={() => {
                showPanel("TimingClose");
            }}>
            <ListItem.ListItemIcon icon="alarm-outline" width={rpx(48)} />
            <ListItem.Content title={t("sidebar.scheduleClose")} />
            <ListItem.ListItemText position="right" fontSize="subTitle">
                {countDown ? timeformat(countDown) : ""}
            </ListItem.ListItemText>
        </ListItem>
    );
}

const CountDownItem = memo(_CountDownItem, () => true);
