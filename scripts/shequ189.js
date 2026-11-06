/**
 * 天翼智慧社区（w.shequ.189.cn，微信里打开的 H5）去广告 v1.4
 *
 * v1.4：首页只保留「访客预约」「通行证」「全部」三个图标，其余卡片、提示条、编辑按钮全部隐藏
 *
 * v1.3：Loon 里脚本没命中 → 脚本改名（去掉 ?v=），匹配规则改成最简单的写法
 *
 * v1.2：
 *   - 小火箭会缓存 script-path 的内容，模块更新后仍跑旧脚本 → 模块里脚本地址加 ?v= 强制重新下载
 *   - 第二条注入路径：在 h5-shequ.dlife.cn 的 app.*.js 开头插入样式（index.html 没改到也能生效）
 *   - 请求阶段也打日志，方便确认脚本到底有没有跑
 *
 * v1.1：
 *   - 修复横幅不消失：index.html 带 ETag，微信回源拿到 304 空 body，CSS 注入不上。
 *     现在请求阶段删掉 If-None-Match / If-Modified-Since，响应阶段去掉 ETag 并禁止缓存。
 *   - 隐藏首页「生活服务」「社区精选」「15分钟生活圈」，以及底部 tab「生活」「活动」
 *
 * 接口来自前端代码 communityFw/h5 的分析：
 *   /community/toc/h5/saas-portal/mana/wechat/ad/query   首页顶部轮播  {code:0, data:{saasAllAdQueryVo, groupAdQueryVo}}
 *   /saas/all/ad/query                                     首页弹窗(position 51)等  {code:"1", result:[...]}
 *   /saas/all/ad/queryList                                 居家必备 / 生活页广告位  {code:"1", result:[{position, adVos}]}
 *   /aiot/wechat_accounts/community-life-ad/(list|info)    社区生活广告
 *   /communityFw/h5/index.html                             注入 CSS，隐藏首页顶部横幅（接口为空时会显示默认横幅）
 */

var CSS_TEXT =
  // 首页顶部横幅
  ".owner-my-home .top-bg,#bannerList.banner-xz{display:none!important}" +
  // 首页：除两个图标宫格外，其余卡片全部隐藏（消息公告、小区慧眼、15分钟生活圈、生活服务、社区团购、社区精选……）
  ".owner-my-home .container>:not(.menu-icon):not(.menu-list):not(.top-menu){display:none!important}" +
  // 顶部红色提示条（认证房屋 / 未缴物业费）、「编辑」按钮
  ".owner-my-home .header-tip,.owner-my-home .edit-btn{display:none!important}" +
  // 其他页面里同类模块
  ".life-application,.shop-box,.life-circle{display:none!important}" +
  // 底部 tab：生活、活动；剩下的平分宽度
  ".nav-box a[href*=\"homeLife\"],.nav-box a[href*=\"homeActivity\"]{display:none!important}" +
  ".nav-box{display:flex!important}.nav-box>a.item,.nav-box>div{flex:1 1 0!important;width:auto!important}";

// 首页图标只保留这几个（按显示文字匹配）
var KEEP_ICONS = ["访客预约", "通行证", "全部"];

// 在页面里运行：监听 DOM 变化，把首页不在白名单里的图标藏掉
function iconFilter(keep) {
  if (window.__sq189Icons) return;
  window.__sq189Icons = 1;
  var ITEMS = [
    [".owner-my-home .icon-item", ".ellipsis"],
    [".owner-my-home .menu-cmp .menu-list", ".app-menu-txt"],
    [".owner-my-home .main-p", null]
  ];
  var queued = false;
  function run() {
    queued = false;
    for (var i = 0; i < ITEMS.length; i++) {
      var els = document.querySelectorAll(ITEMS[i][0]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        var lb = ITEMS[i][1] ? el.querySelector(ITEMS[i][1]) : null;
        var t = ((lb || el).textContent || "").replace(/\s+/g, "");
        if (!t) continue;
        if (keep.indexOf(t) === -1) {
          el.style.setProperty("display", "none", "important");
          el.setAttribute("data-sq189", "1");
        } else if (el.getAttribute("data-sq189")) {
          el.style.removeProperty("display");
          el.removeAttribute("data-sq189");
        }
      }
    }
  }
  function schedule() { if (!queued) { queued = true; setTimeout(run, 0); } }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  schedule();
}

var FILTER_CALL = "(" + iconFilter.toString() + ")(" + JSON.stringify(KEEP_ICONS) + ");";

var HIDE_CSS = "<style id=\"sq189-noad\">" + CSS_TEXT + "</style>" +
  "<script>try{" + FILTER_CALL + "}catch(e){}</script>";

// 插到 JS 包开头：建一个 <style>（已有就跳过）+ 图标过滤
var JS_INJECT =
  ";(function(){try{if(!document.getElementById('sq189-noad')){" +
  "var s=document.createElement('style');s.id='sq189-noad';s.textContent=" +
  JSON.stringify(CSS_TEXT) + ";(document.head||document.documentElement).appendChild(s);}" +
  FILTER_CALL + "}catch(e){}})();\n";

var BUNDLE_RE = /\/communityFw\/h5\/app\.[0-9a-f]+\.js(\?|$)/;

function noCacheHeaders(src) {
  var rh = {};
  src = src || {};
  Object.keys(src).forEach(function (k) {
    var lk = k.toLowerCase();
    if (lk !== "etag" && lk !== "last-modified" && lk !== "cache-control" &&
        lk !== "expires" && lk !== "content-length" && lk !== "age") rh[k] = src[k];
  });
  rh["Cache-Control"] = "no-store, no-cache, must-revalidate";
  rh["Pragma"] = "no-cache";
  return rh;
}

var PAGE_RE = /\/communityFw\/h5\/(index\.html)?(\?|#|$)/;

(function () {
  var url = $request.url;

  // 0) 请求阶段：去掉条件请求头，强制服务器返回完整页面（否则 304 没有 body 可改）
  if (typeof $response === "undefined") {
    var h = $request.headers || {};
    var nh = {};
    Object.keys(h).forEach(function (k) {
      var lk = k.toLowerCase();
      if (lk !== "if-none-match" && lk !== "if-modified-since") nh[k] = h[k];
    });
    console.log("[天翼社区] 请求去缓存 | " + url);
    $done({ headers: nh });
    return;
  }

  var body = $response.body;

  function log(msg) { console.log("[天翼社区] " + msg + " | " + url); }

  if (!body) { log("响应没有 body（可能是 304 缓存）"); $done({}); return; }

  // 1b) JS 包：开头插入样式
  if (BUNDLE_RE.test(url)) {
    if (body.indexOf("sq189-noad") !== -1) { $done({}); return; }
    log("JS 包注入 CSS");
    $done({ body: JS_INJECT + body, headers: noCacheHeaders($response.headers) });
    return;
  }
  function has(s) { return url.indexOf(s) !== -1; }

  // 1) 页面入口：注入隐藏横幅的样式
  if (PAGE_RE.test(url) && body.indexOf("<html") !== -1) {
    var out = body.indexOf("sq189-noad") !== -1 ? body
      : body.indexOf("</head>") !== -1
        ? body.replace("</head>", HIDE_CSS + "</head>")
        : HIDE_CSS + body;
    log("页面注入 CSS");
    $done({ body: out, headers: noCacheHeaders($response.headers) });
    return;
  }

  var obj;
  try { obj = JSON.parse(body); } catch (e) { $done({}); return; }

  var changed = false;

  // 2) 首页顶部轮播
  if (has("/wechat/ad/query")) {
    if (obj.data && typeof obj.data === "object") {
      obj.data.saasAllAdQueryVo = [];
      obj.data.groupAdQueryVo = [];
      changed = true;
    }
  }

  // 3) 弹窗 / 居家必备 / 生活页广告位
  else if (has("/saas/all/ad/query")) {   // 同时覆盖 query 和 queryList
    if (Array.isArray(obj.result)) { obj.result = []; changed = true; }
    if (obj.data && Array.isArray(obj.data)) { obj.data = []; changed = true; }
  }

  // 4) 社区生活广告
  else if (has("/community-life-ad/")) {
    var d = obj.data;
    if (Array.isArray(d)) { obj.data = []; changed = true; }
    else if (d && typeof d === "object") {
      ["list", "records", "rows", "adList", "adVos"].forEach(function (k) {
        if (Array.isArray(d[k])) { d[k] = []; changed = true; }
      });
    }
    if (Array.isArray(obj.result)) { obj.result = []; changed = true; }
  }

  if (changed) log("已清空");
  $done(changed ? { body: JSON.stringify(obj) } : {});
})();
