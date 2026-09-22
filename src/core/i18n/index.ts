import type { ILanguage, ILanguageData } from "@/types/core/i18n";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import PersistStatus from "@/utils/persistStatus";

import zhCN from "./languages/zh-cn.json";
import enUS from "./languages/en-us.json";
import zhTW from "./languages/zh-tw.json";


const allLanguages: ILanguage[] = [{
    locale: "zh-CN",
    name: "简体中文",
    languageData: zhCN,
}, {
    locale: "zh-TW",
    name: "繁体中文",
    languageData: zhTW,
}, {
    locale: "en-US",
    name: "English",
    languageData: enUS,
}];

const defaultLocale = "zh-CN";
const currentLanguageAtom = atom<ILanguage>(
    allLanguages.find(item => item.locale === defaultLocale) ?? allLanguages[0],
);


class I18N<K extends keyof ILanguageData> {
    setup() {
        // 锁定简体中文
        PersistStatus.set("app.language", "zh-CN");
        getDefaultStore().set(currentLanguageAtom, allLanguages[0]);
    }

    getSupportedLanguages() {
        return [allLanguages[0]];
    }

    getLanguage() {
        return allLanguages[0];
    }

    setLanguage(_locale: string) {
        // 锁定中文，忽略切换
        getDefaultStore().set(currentLanguageAtom, allLanguages[0]);
        PersistStatus.set("app.language", "zh-CN");
    }

    t(key: K, args?: Record<string, any>): ILanguageData[K] {
        const language = getDefaultStore().get(currentLanguageAtom);
        if (!language) {
            return "";
        }
        const value = language.languageData[key] ?? allLanguages[0].languageData[key] ?? "";
        if (!args) {
            return value as ILanguageData[K];
        }

        return value.replace(/{(\w+)}/g, (_, argKey) => args[argKey] ?? "");
    }
}

const i18n = new I18N();
export default i18n;

export function useI18N(): I18N<keyof ILanguageData> {
    useAtomValue(currentLanguageAtom); // 用来通知组件刷新

    return i18n;
}
