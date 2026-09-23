import Condition from "@/renderer/components/Condition";
import NoPlugin from "@/renderer/components/NoPlugin";
import { Tab } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import Body from "./components/Body";
import PluginManager from "@shared/plugin-manager/renderer";
import "./index.scss";

export default function RecommendSheetsView() {
    const rawPlugins = PluginManager.getSortedSupportedPlugin("getRecommendSheetsByTag");
    const availablePlugins = [...rawPlugins].sort((a, b) => {
        const order = (p: string) => {
            if (p === "Navidrome") {
                return 0;
            }
            if (p === "网易云") {
                return 1;
            }
            if (p === "QQ音乐") {
                return 2;
            }
            return 9;
        };
        return order(a.platform) - order(b.platform);
    });
    const navigate = useNavigate();

    return (
        <div className="recommend-sheets-view-root">
            <Condition
                condition={availablePlugins.length}
                falsy={<NoPlugin supportMethod="热门歌单" height={"100%"}></NoPlugin>}
            >
                <Tab.Group
                    defaultIndex={history.state?.usr?.pluginIndex}
                    onChange={(index) => {
                        const usr = history.state.usr ?? {};

                        navigate("", {
                            replace: true,
                            state: {
                                ...usr,
                                pluginHash: availablePlugins[index].hash,
                                pluginIndex: index,
                                tag: null,
                            },
                        });
                    }}
                >
                    <Tab.List className="tab-list-container">
                        {availablePlugins.map((plugin) => (
                            <Tab key={plugin.hash} as="div" className="tab-list-item">
                                {plugin.platform}
                            </Tab>
                        ))}
                    </Tab.List>
                    <Tab.Panels className={"tab-panels-container"}>
                        {availablePlugins.map((plugin) => (
                            <Tab.Panel className="tab-panel-container" key={plugin.hash}>
                                <Body plugin={plugin}></Body>
                            </Tab.Panel>
                        ))}
                    </Tab.Panels>
                </Tab.Group>
            </Condition>
        </div>
    );
}
