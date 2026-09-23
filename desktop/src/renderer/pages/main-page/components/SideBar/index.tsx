import ListItem from "./widgets/ListItem";
import "./index.scss";
import { useMatch, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

export default function () {
    const navigate = useNavigate();
    const routePathMatch = useMatch("/main/:routePath");
    const { t } = useTranslation();

    const options = [
        {
            iconName: "fire",
            title: t("side_bar.recommend_sheets"),
            route: "recommend-sheets",
        },
        {
            iconName: "trophy",
            title: t("side_bar.toplist"),
            route: "toplist",
        },
        {
            iconName: "array-download-tray",
            title: t("side_bar.flac_download"),
            route: "flac-download",
        },
        {
            iconName: "pencil-square",
            title: t("side_bar.music_tag"),
            route: "music-tag",
        },
        {
            iconName: "musical-note",
            title: "音乐管理",
            route: "music-manage",
        },
        {
            iconName: "code-bracket-square",
            title: t("side_bar.plugin_management"),
            route: "plugin-manager-view",
        },
        {
            iconName: "clock",
            title: t("side_bar.recently_play"),
            route: "recently_play",
        },
    ] as const;

    return (
        <div className="side-bar-container">
            <div className="side-bar-brand">RalphMusic</div>
            <div className="side-bar-section">发现</div>
            {options.slice(0, 2).map((item) => (
                <ListItem
                    key={item.route}
                    iconName={item.iconName}
                    title={item.title}
                    selected={routePathMatch?.params?.routePath === item.route}
                    onClick={() => {
                        navigate(`/main/${item.route}`);
                    }}
                ></ListItem>
            ))}
            <div className="side-bar-section">工具</div>
            {options.slice(2).map((item) => (
                <ListItem
                    key={item.route}
                    iconName={item.iconName}
                    title={item.title}
                    selected={routePathMatch?.params?.routePath === item.route}
                    onClick={() => {
                        navigate(`/main/${item.route}`);
                    }}
                ></ListItem>
            ))}
        </div>
    );
}
