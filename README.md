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

# 天翼智慧社区 去广告（微信 H5）

针对微信里打开的 `w.shequ.189.cn/communityFw/h5/`（「我的社区」页面）：

- 清空首页顶部轮播、首页弹窗、「居家必备」、生活页、社区生活等广告位接口
- 用 CSS 隐藏首页顶部横幅（广告接口为空时，页面会换成一张默认横幅）
- 隐藏首页「生活服务」「社区精选」「15分钟生活圈」，底部 tab 去掉「生活」「活动」，只留 首页 / 一键开门 / 我的
- 去掉 index.html 的缓存（ETag → 304 时没有 body，CSS 注入不上，这是 v1.0 横幅没消失的原因）
- 屏蔽 `ux.21cn.com` 页面埋点

| 客户端 | 订阅地址 |
|---|---|
| Loon | `https://raw.githubusercontent.com/liyouzi80/taiyuangu-noad/main/shequ189.plugin` |
| Shadowrocket / Surge | `https://raw.githubusercontent.com/liyouzi80/taiyuangu-noad/main/shequ189.sgmodule` |

装好后同样要开启 MITM 并信任证书（模块会追加 `w.shequ.189.cn`、`h5-shequ.dlife.cn` 两个主机名）。然后在微信里**关掉这个页面重新打开**；如果横幅还在，到 微信 → 设置 → 通用 → 存储空间 清一下缓存。

脚本：`scripts/shequ189.js`。

---

仅供学习与技术研究使用。
