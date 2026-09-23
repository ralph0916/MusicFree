import { useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import Themepack from "@/shared/themepack/renderer";
import logger from "@shared/logger/renderer";
import messageBus from "@shared/message-bus/renderer/main";

export default function useBootstrap() {
    const navigate = useNavigate();

    useLayoutEffect(() => {
        Themepack.setupThemePacks();
    }, []);

    useEffect(() => {
        messageBus.onCommand("Navigate", (route) => {
            navigate(route);
        });

        // 默认进入热门歌单
        const hash = window.location.hash || "";
        if (
            !hash ||
            hash === "#" ||
            hash === "#/" ||
            hash === "#/main" ||
            hash === "#/main/"
        ) {
            navigate("/main/recommend-sheets", { replace: true });
        }

        logger.logPerf("Bundle First Screen");
    }, []);
}
