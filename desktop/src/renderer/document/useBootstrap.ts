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

        logger.logPerf("Bundle First Screen");
    }, []);
}
