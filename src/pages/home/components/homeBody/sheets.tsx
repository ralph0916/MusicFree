import Empty from "@/components/base/empty";
import IconButton from "@/components/base/iconButton";
import ListItem from "@/components/base/listItem";
import ThemeText from "@/components/base/themeText";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import { ImgAsset } from "@/constants/assetsConst";
import { localPluginPlatform } from "@/constants/commonConst";
import { useI18N } from "@/core/i18n";
import MusicSheet, { useSheetsBase, useStarredSheets } from "@/core/musicSheet";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";
import { FlashList } from "@shopify/flash-list";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import Color from "color";

export default function Sheets() {
    const [index, setIndex] = useState(0);
    const colors = useColors();
    const navigate = useNavigate();

    const allSheets = useSheetsBase();
    const staredSheets = useStarredSheets();
    const { t } = useI18N();

    return (
        <View
            style={[
                styles.section,
                {
                    backgroundColor: colors.card,
                },
            ]}>
            <View style={styles.subTitleContainer}>
                <TouchableWithoutFeedback
                    style={styles.tabContainer}
                    accessible
                    accessibilityLabel={t("home.myPlaylistsCount.a11y", {
                        count: allSheets.length,
                    })}
                    onPress={() => {
                        setIndex(0);
                    }}>
                    <View style={styles.tabInner}>
                        <ThemeText
                            accessible={false}
                            fontSize="title"
                            fontWeight={index === 0 ? "bold" : "regular"}
                            color={
                                index === 0 ? colors.primary : colors.text
                            }
                            style={styles.tabText}>
                            {t("home.myPlaylists")}
                        </ThemeText>
                        <ThemeText
                            accessible={false}
                            fontColor="textSecondary"
                            fontSize="description"
                            style={styles.countText}>
                            {allSheets.length}
                        </ThemeText>
                    </View>
                    <View
                        style={[
                            styles.underline,
                            {
                                backgroundColor:
                                    index === 0
                                        ? colors.primary
                                        : "transparent",
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                    style={styles.tabContainer}
                    accessible
                    accessibilityLabel={t("home.starredPlaylistsCount.a11y", {
                        count: staredSheets.length,
                    })}
                    onPress={() => {
                        setIndex(1);
                    }}>
                    <View style={styles.tabInner}>
                        <ThemeText
                            fontSize="title"
                            accessible={false}
                            fontWeight={index === 1 ? "bold" : "regular"}
                            color={
                                index === 1 ? colors.primary : colors.text
                            }
                            style={styles.tabText}>
                            {t("home.starredPlaylists")}
                        </ThemeText>
                        <ThemeText
                            fontColor="textSecondary"
                            fontSize="description"
                            accessible={false}
                            style={styles.countText}>
                            {staredSheets.length}
                        </ThemeText>
                    </View>
                    <View
                        style={[
                            styles.underline,
                            {
                                backgroundColor:
                                    index === 1
                                        ? colors.primary
                                        : "transparent",
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>
                <View style={styles.more}>
                    <IconButton
                        name="plus"
                        style={styles.newSheetButton}
                        sizeType="normal"
                        accessibilityLabel={t("home.newPlaylist.a11y")}
                        onPress={() => {
                            showPanel("CreateMusicSheet");
                        }}
                    />
                    <IconButton
                        name="inbox-arrow-down"
                        sizeType="normal"
                        accessibilityLabel={t("home.importPlaylist.a11y")}
                        onPress={() => {
                            showPanel("ImportMusicSheet");
                        }}
                    />
                </View>
            </View>
            <FlashList
                ListEmptyComponent={<Empty />}
                extraData={{ t }}
                data={(index === 0 ? allSheets : staredSheets) ?? []}
                estimatedItemSize={ListItem.Size.big}
                renderItem={({ item: sheet }) => {
                    const isLocalSheet = !(
                        sheet.platform &&
                        sheet.platform !== localPluginPlatform
                    );

                    return (
                        <ListItem
                            key={`${sheet.id}`}
                            heightType="big"
                            withHorizontalPadding
                            onPress={() => {
                                if (isLocalSheet) {
                                    navigate(ROUTE_PATH.LOCAL_SHEET_DETAIL, {
                                        id: sheet.id,
                                    });
                                } else {
                                    navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
                                        sheetInfo: sheet,
                                    });
                                }
                            }}>
                            <ListItem.ListItemImage
                                uri={sheet.coverImg ?? sheet.artwork}
                                fallbackImg={ImgAsset.albumDefault}
                                maskIcon={
                                    sheet.id === MusicSheet.defaultSheet.id
                                        ? "heart"
                                        : null
                                }
                            />
                            <ListItem.Content
                                title={sheet.title}
                                description={
                                    isLocalSheet
                                        ? t("home.songCount", {
                                            count: sheet.worksNum,
                                        })
                                        : `${sheet.artist ?? ""}`
                                }
                            />
                            {sheet.id !== MusicSheet.defaultSheet.id ? (
                                <ListItem.ListItemIcon
                                    position="right"
                                    icon="trash-outline"
                                    color={Color(colors.text)
                                        .alpha(0.35)
                                        .toString()}
                                    onPress={() => {
                                        showDialog("SimpleDialog", {
                                            title: t(
                                                "dialog.deleteSheetTitle",
                                            ),
                                            content: t(
                                                "dialog.deleteSheetContent",
                                                {
                                                    name: sheet.title,
                                                },
                                            ),
                                            onOk: async () => {
                                                if (isLocalSheet) {
                                                    await MusicSheet.removeSheet(
                                                        sheet.id,
                                                    );
                                                    Toast.success(
                                                        t(
                                                            "toast.deleteSuccess",
                                                        ),
                                                    );
                                                } else {
                                                    await MusicSheet.unstarMusicSheet(
                                                        sheet,
                                                    );
                                                    Toast.success(
                                                        t(
                                                            "toast.hasUnstarred",
                                                        ),
                                                    );
                                                }
                                            },
                                        });
                                    }}
                                />
                            ) : null}
                        </ListItem>
                    );
                }}
                nestedScrollEnabled
            />
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginHorizontal: rpx(24),
        borderTopLeftRadius: rpx(24),
        borderTopRightRadius: rpx(24),
        paddingTop: rpx(12),
        minHeight: rpx(600),
        overflow: "hidden",
    },
    subTitleContainer: {
        paddingHorizontal: rpx(24),
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: rpx(12),
    },
    tabContainer: {
        marginRight: rpx(28),
        alignItems: "center",
    },
    tabInner: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: rpx(10),
    },
    tabText: {
        lineHeight: rpx(48),
    },
    countText: {
        marginLeft: rpx(8),
        lineHeight: rpx(48),
    },
    underline: {
        width: rpx(40),
        height: rpx(6),
        borderRadius: rpx(3),
    },
    more: {
        height: rpx(56),
        flexGrow: 1,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    newSheetButton: {
        marginRight: rpx(16),
    },
});
