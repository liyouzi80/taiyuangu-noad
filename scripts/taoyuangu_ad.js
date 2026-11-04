/**
 * 桃园谷 去广告脚本 v4.0
 * 新增：getAppStAd（首页/开屏第三方广告位，重装后新出现的接口）
 *       reportAppStAdServlet 上报已在插件里 reject，不进这里
 * 保留：v3 的结构化清空 + 兜底净化 + 日志
 */

var AD_KEYS = [
  "adList", "adInfo", "adConfig", "adSlot", "adSlots",
  "startAdCfg", "startAdSlot", "thirdAd", "thirdAdSlot",
  "screenAd", "screenAdSlot",
  "splashAd", "openAd", "popupAd", "bannerList", "promoList",
  "adUrl", "adPic", "adImage", "adLink"
];

function emptyLike(v) {
  if (Array.isArray(v)) return [];
  var t = typeof v;
  if (t === "string") return "";
  if (t === "number") return 0;
  if (t === "boolean") return false;
  if (v && t === "object") return {};
  return null;
}

function scrub(node, depth) {
  if (!node || typeof node !== "object" || depth > 6) return false;
  var hit = false;
  var keys = Object.keys(node);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], v = node[k];
    if (AD_KEYS.indexOf(k) !== -1) {
      var e = emptyLike(v);
      if (JSON.stringify(v) !== JSON.stringify(e)) { node[k] = e; hit = true; }
    } else if (v && typeof v === "object") {
      if (scrub(v, depth + 1)) hit = true;
    }
  }
  return hit;
}

(function () {
  var url = $request.url;
  var raw = $response.body;

  function log(msg) { console.log("[桃园谷] " + msg); }

  if (!raw) { $done({}); return; }

  var obj;
  try { obj = JSON.parse(raw); } catch (e) { $done({}); return; }

  function has(s) { return url.indexOf(s) !== -1; }

  var changed = false;
  var who = "";

  // 1) 广告位列表（002/004/009...）：保留结构，清空列表
  if (has("getAppPalyList")) {
    obj.result = "0";
    obj.reason = "";
    obj.bottomAd = { thirdAd: 0 };
    obj.sourceList = [];
    changed = true;
    who = "广告位列表";
  }

  // 2) 首页/开屏第三方广告位（重装后新抓到）
  else if (has("getAppStAd")) {
    obj.result = "0";
    obj.reason = "";
    if ("sourceList" in obj) obj.sourceList = [];
    if ("screenAdSlot" in obj) obj.screenAdSlot = "";
    if ("screenAd" in obj) obj.screenAd = 0;
    changed = true;
    who = "StAd 广告位";
  }

  // 3) 第三方广告 SDK 配置
  else if (has("getThirdAppAdConfig")) {
    obj.result = "0";
    obj.reason = "";
    obj.startAdCfg = 0;
    obj.thirdAd = 0;
    obj.startAdSlot = "";
    obj.thirdAdSlot = "";
    changed = true;
    who = "第三方广告配置";
  }

  // 4) 广告总开关（0=开，1=关）
  else if (has("appAdOpenStatus")) {
    obj.code = 0;
    obj.message = "";
    if (obj.data && typeof obj.data === "object") { obj.data.openStatus = "1"; }
    changed = true;
    who = "广告总开关";
  }

  // 5) 全局配置：尝试切到不带新版首页模块的布局
  else if (has("getAllConfigsServlet")) {
    if (obj.serverConfigs && obj.serverConfigs.length) {
      for (var i = 0; i < obj.serverConfigs.length; i++) {
        var it = obj.serverConfigs[i];
        if (it && it.key === "app_home_tab") { it.value = "1"; changed = true; }
      }
    }
    who = "全局配置";
    if (changed) log("app_home_tab -> 1");
  }

  // 6) 推送上报
  else if (has("isPushSettingReportServlet")) {
    obj.result = "0";
    obj.reason = "";
    changed = true;
    who = "推送上报";
  }

  // 7) 兜底：任何带 Ad 的接口里出现广告字段就清空
  if (!changed) {
    changed = scrub(obj, 0);
    if (changed) who = "兜底净化";
  }

  if (changed) log(who + " | " + url);

  $done(changed ? { body: JSON.stringify(obj) } : {});
})();
