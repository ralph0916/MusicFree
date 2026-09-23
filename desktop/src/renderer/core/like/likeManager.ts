import { useEffect, useState } from "react";
import EventEmitter from "eventemitter3";

export type LikeKey = string;

type Listener = (payload: {
    platform: string;
    id: string;
    liked: boolean;
}) => void;

const likeMap = new Map<LikeKey, boolean>();
const emitter = new EventEmitter();
const tickListeners = new Set<() => void>();

export function likeKeyOf(platform: string, id: string | number): LikeKey {
    return `${platform}@${String(id)}`;
}

export function setLikeState(
    platform: string,
    id: string | number,
    liked: boolean,
) {
    const key = likeKeyOf(platform, id);
    likeMap.set(key, liked);
    emitter.emit("change", { platform, id: String(id), liked });
    tickListeners.forEach((fn) => fn());
}

export function getLikeState(
    platform: string,
    id: string | number,
): boolean | undefined {
    return likeMap.get(likeKeyOf(platform, id));
}

export function useLikeState(platform?: string, id?: string | number) {
    const [, bump] = useState(0);
    useEffect(() => {
        const fn = () => bump((v) => v + 1);
        tickListeners.add(fn);
        return () => {
            tickListeners.delete(fn);
        };
    }, []);
    if (!platform || id === undefined || id === null) {
        return undefined;
    }
    return likeMap.get(likeKeyOf(platform, id));
}

export function onLikeChange(listener: Listener) {
    emitter.on("change", listener);
    return () => {
        emitter.off("change", listener);
    };
}
