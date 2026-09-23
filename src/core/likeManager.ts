import EventEmitter from "eventemitter3";
import { atom, getDefaultStore, useAtomValue } from "jotai";

export type LikeKey = string; // platform@id

const likeMapAtom = atom<Record<LikeKey, boolean>>({});
const emitter = new EventEmitter();

export function likeKeyOf(platform: string, id: string | number): LikeKey {
    return `${platform}@${String(id)}`;
}

export function setLikeState(
    platform: string,
    id: string | number,
    liked: boolean,
) {
    const key = likeKeyOf(platform, id);
    const store = getDefaultStore();
    const prev = store.get(likeMapAtom);
    store.set(likeMapAtom, { ...prev, [key]: liked });
    emitter.emit("change", { platform, id: String(id), liked });
}

export function getLikeState(
    platform: string,
    id: string | number,
): boolean | undefined {
    const key = likeKeyOf(platform, id);
    return getDefaultStore().get(likeMapAtom)[key];
}

export function useLikeState(platform?: string, id?: string | number) {
    const map = useAtomValue(likeMapAtom);
    if (!platform || id === undefined || id === null) {
        return undefined;
    }
    return map[likeKeyOf(platform, id)];
}

export function onLikeChange(
    listener: (payload: {
        platform: string;
        id: string;
        liked: boolean;
    }) => void,
) {
    emitter.on("change", listener);
    return () => {
        emitter.off("change", listener);
    };
}
