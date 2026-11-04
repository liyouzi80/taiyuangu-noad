# 桃园谷 去广告

屏蔽桃园谷 App 的广告位（含开屏 / 首页 getAppStAd）、穿山甲等第三方广告 SDK，以及行为上报。

## 安装

| 客户端 | 类型 | 订阅地址 |
|---|---|---|
| Loon | 插件 | `https://raw.githubusercontent.com/liyouzi80/taiyuangu-noad/main/taoyuangu.plugin` |
| Shadowrocket（小火箭） | 模块 | `https://raw.githubusercontent.com/liyouzi80/taiyuangu-noad/main/taoyuangu.sgmodule` |
| Surge | 模块 | 同上 `.sgmodule` |

**小火箭：** 配置 → 模块 → 右上角 `+` → 粘贴地址。
**Loon：** 配置 → 插件 → `+` → 粘贴地址。

装好后必须：

1. 开启 MITM / HTTPS 解密，安装并信任证书（设置 → 通用 → 关于本机 → 证书信任设置）。
2. 杀掉桃园谷后重新打开。

## 文件

| 文件 | 说明 |
|---|---|
| `taoyuangu.plugin` | Loon 插件 |
| `taoyuangu.sgmodule` | 小火箭 / Surge 模块（内容与插件一致） |
| `scripts/taoyuangu_ad.js` | 响应体净化脚本（v4） |
| `scripts/taoyuangu_diag.js` | 诊断日志：记录没被覆盖的 taoyuangu 请求，日志里搜 `TYG-DIAG` |

## 常见问题

- **白屏 / 启动异常：** 先关掉 `[Rule]` 段的 SDK 域名拦截试试。
- **还有广告：** 打开 App 看一遍广告，到日志里搜 `TYG-DIAG`，找到对应接口后补进规则。找完后可以把「诊断」脚本关掉。
- **修改规则时：** `taoyuangu.plugin` 和 `taoyuangu.sgmodule` 两份要一起改。

---

仅供学习与技术研究使用。
