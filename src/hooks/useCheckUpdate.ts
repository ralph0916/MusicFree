import { useEffect } from "react";

/** 已禁用检查更新 */
export const checkUpdateAndShowResult = (
    _showToast = false,
    _checkSkip = false,
) => {
    // no-op
};

export default function (_callOnMount = true) {
    useEffect(() => {
        // 检查更新已关闭
    }, []);

    return checkUpdateAndShowResult;
}
