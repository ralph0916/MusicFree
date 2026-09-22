import React, { useMemo } from "react";
import { useAtom } from "jotai";
import { StyleSheet, View } from "react-native";

import NavBar from "./components/navBar";
import { createDrawerNavigator } from "@react-navigation/drawer";
import HomeDrawer from "./components/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import StatusBar from "@/components/base/statusBar";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import globalStyle from "@/constants/globalStyle";
import Theme from "@/core/theme";
import BottomTabBar, { HomeTabKey } from "./components/bottomTabBar";
import HomePlayerBar from "./components/homePlayerBar";
import PluginSwitcher, {
    HomePluginKey,
} from "./components/pluginSwitcher";
import SongFeed from "./components/songFeed";
import SheetFeed from "./components/sheetFeed";
import MineTab from "./components/mineTab";
import { navidromePluginPlatform } from "@/constants/commonConst";
import { homeTabAtom } from "./store/homeTabAtom";

function Home() {
    const [tab, setTab] = useAtom(homeTabAtom);
    const [pluginKey, setPluginKey] = React.useState<HomePluginKey>(
        navidromePluginPlatform,
    );

    const onTabChange = (key: HomeTabKey) => {
        setTab(key);
    };

    const showPlugin = useMemo(
        () => tab === "home" || tab === "sheet",
        [tab],
    );

    return (
        <SafeAreaView edges={["top", "bottom"]} style={styles.appWrapper}>
            <HomeStatusBar />
            <HorizontalSafeAreaView style={globalStyle.flex1}>
                <View style={styles.body}>
                    <NavBar />
                    {showPlugin ? (
                        <PluginSwitcher
                            active={pluginKey}
                            onChange={setPluginKey}
                        />
                    ) : null}
                    {tab === "home" ? (
                        <SongFeed
                            key={`song-${pluginKey}`}
                            pluginKey={pluginKey}
                        />
                    ) : null}
                    {tab === "sheet" ? (
                        <SheetFeed
                            key={`sheet-${pluginKey}`}
                            pluginKey={pluginKey}
                        />
                    ) : null}
                    {tab === "mine" ? <MineTab /> : null}
                </View>
            </HorizontalSafeAreaView>
            <HomePlayerBar />
            <BottomTabBar active={tab} onChange={onTabChange} />
        </SafeAreaView>
    );
}

function HomeStatusBar() {
    const theme = Theme.useTheme();

    return (
        <StatusBar
            backgroundColor="transparent"
            barStyle={theme.dark ? undefined : "dark-content"}
        />
    );
}

const LeftDrawer = createDrawerNavigator();
export default function App() {
    return (
        <LeftDrawer.Navigator
            screenOptions={{
                headerShown: false,
                drawerStyle: {
                    width: "80%",
                },
            }}
            initialRouteName="HOME-MAIN"
            drawerContent={props => <HomeDrawer {...props} />}>
            <LeftDrawer.Screen name="HOME-MAIN" component={Home} />
        </LeftDrawer.Navigator>
    );
}

const styles = StyleSheet.create({
    appWrapper: {
        flexDirection: "column",
        flex: 1,
    },
    body: {
        flex: 1,
    },
});
