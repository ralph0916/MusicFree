# RalphMusic 桌面版（Windows）

基于 MusicFreeDesktop，内置 **Navidrome / 网易云 / QQ 音乐** 插件。

## 产物

- 便携目录：`out/RalphMusic-win32-x64/RalphMusic.exe`
- 压缩包：`RalphMusic-win32-x64.zip`（或 `out/make/zip/win32/x64/`）

解压后直接运行 `RalphMusic.exe`。

## 首次使用

1. 打开应用 → 插件管理，确认已自动安装三个内置插件  
2. **Navidrome**：插件用户变量填写服务器地址 / 用户名 / 密码  
3. **网易云 / QQ**：在用户变量中粘贴 Cookie（密码登录易被风控）

## 重新打包

```bash
cd desktop
# 需已安装 VS Build Tools + Python setuptools<74
npm run dist:win
```

根目录也可：`npm run build-windows`
