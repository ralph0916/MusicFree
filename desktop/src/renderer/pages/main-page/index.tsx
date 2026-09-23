import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SideBar from "./components/SideBar";
import PluginManagerView from "./views/plugin-manager-view";
import MusicSheetView from "./views/music-sheet-view";
import SearchView from "./views/search-view";
import AlbumView from "./views/album-view";
import ArtistView from "./views/artist-view";
import ToplistView from "./views/toplist-view";
import TopListDetailView from "./views/toplist-detail-view";
import RecommendSheetsView from "./views/recommend-sheets-view";
import SettingView from "./views/setting-view";
import ThemeView from "./views/theme-view";
import RecentlyPlayView from "./views/recently-play-view";
import MusicTagView from "./views/music-tag-view";
import FlacDownloadView from "./views/flac-download-view";
import MusicManageView from "./views/music-manage-view";

import "./index.scss";

export default function MainPage() {
    const location = useLocation();
    const showRecommend = location.pathname.includes("/recommend-sheets");
    const showFlac = location.pathname.includes("/flac-download");
    const showTag = location.pathname.includes("/music-tag");
    const showManage = location.pathname.includes("/music-manage");
    const showKeepAlive =
        showRecommend || showFlac || showTag || showManage;

    return (
        <>
            <SideBar></SideBar>
            <div
                style={{
                    display: showKeepAlive ? "none" : "flex",
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                }}
            >
                <Routes>
                    <Route path="search/:query" element={<SearchView></SearchView>}></Route>
                    <Route
                        path="plugin-manager-view"
                        element={<PluginManagerView></PluginManagerView>}
                    ></Route>
                    <Route
                        path="musicsheet/:platform/:id"
                        element={<MusicSheetView></MusicSheetView>}
                    ></Route>
                    <Route
                        path="album/:platform/:id"
                        element={<AlbumView></AlbumView>}
                    ></Route>
                    <Route
                        path="artist/:platform/:id"
                        element={<ArtistView></ArtistView>}
                    ></Route>
                    <Route path="toplist" element={<ToplistView></ToplistView>}></Route>
                    <Route
                        path="toplist-detail/:platform"
                        element={<TopListDetailView></TopListDetailView>}
                    ></Route>
                    <Route path="recommend-sheets" element={<div />}></Route>
                    <Route path="setting" element={<SettingView></SettingView>}></Route>
                    <Route path="theme" element={<ThemeView></ThemeView>}></Route>
                    <Route
                        path="recently_play"
                        element={<RecentlyPlayView></RecentlyPlayView>}
                    ></Route>
                    <Route path="flac-download" element={<div />}></Route>
                    <Route path="music-tag" element={<div />}></Route>
                    <Route path="music-manage" element={<div />}></Route>
                    <Route
                        path="*"
                        element={<Navigate to="/main/recommend-sheets" replace />}
                    ></Route>
                </Routes>
            </div>
            <div
                id={showRecommend ? "page-container" : undefined}
                className="page-container"
                style={{
                    display: showRecommend ? "flex" : "none",
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                }}
            >
                <RecommendSheetsView></RecommendSheetsView>
            </div>
            <div
                className="page-container"
                style={{
                    display: showFlac ? "flex" : "none",
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                    padding: 0,
                }}
            >
                <FlacDownloadView></FlacDownloadView>
            </div>
            <div
                className="page-container"
                style={{
                    display: showTag ? "flex" : "none",
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                    padding: 0,
                }}
            >
                <MusicTagView></MusicTagView>
            </div>
            <div
                className="page-container"
                style={{
                    display: showManage ? "flex" : "none",
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                    padding: 0,
                }}
            >
                <MusicManageView></MusicManageView>
            </div>
        </>
    );
}
