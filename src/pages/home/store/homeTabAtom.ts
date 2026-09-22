import { atom } from "jotai";
import { HomeTabKey } from "../components/bottomTabBar";

export const homeTabAtom = atom<HomeTabKey>("home");
