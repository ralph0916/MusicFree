import "./index.scss";
import { useTranslation } from "react-i18next";
import { getGlobalContext } from "@/shared/global-context/renderer";

export default function About() {
    const { t } = useTranslation();

    return (
        <div className="setting-view--about-container">
            <div className="setting-row about-version">
                RalphMusic
            </div>
            <div className="setting-row about-version">
                {t("settings.about.current_version", {
                    version: getGlobalContext().appVersion,
                })}
            </div>
            <div className="setting-row about-version">
                私人音乐播放器 · 支持 NAS / 网易云 / QQ 音乐
            </div>
        </div>
    );
}
