/**
 * 天翼智慧社区（w.shequ.189.cn，微信里打开的 H5）去广告 v1.1
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

var HIDE_CSS =
  "<style id=\"sq189-noad\">" +
  // 首页顶部横幅
  ".owner-my-home .top-bg,#bannerList.banner-xz{display:none!important}" +
  // 生活服务 / 社区精选（居家必备）/ 15分钟生活圈
  ".life-application,.shop-box,.life-circle{display:none!important}" +
  // 底部 tab：生活、活动；剩下的平分宽度
  ".nav-box a[href*=\"homeLife\"],.nav-box a[href*=\"homeActivity\"]{display:none!important}" +
  ".nav-box{display:flex!important}.nav-box>a.item,.nav-box>div{flex:1 1 0!important;width:auto!important}" +
  "</style>";

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
    $done({ headers: nh });
    return;
  }

  var body = $response.body;

  function log(msg) { console.log("[天翼社区] " + msg + " | " + url); }
  function has(s) { return url.indexOf(s) !== -1; }

  if (!body) { $done({}); return; }

  // 1) 页面入口：注入隐藏横幅的样式
  if (PAGE_RE.test(url) && body.indexOf("<html") !== -1) {
    var out = body.indexOf("sq189-noad") !== -1 ? body
      : body.indexOf("</head>") !== -1
        ? body.replace("</head>", HIDE_CSS + "</head>")
        : HIDE_CSS + body;
    var rh = {};
    var src = $response.headers || {};
    Object.keys(src).forEach(function (k) {
      var lk = k.toLowerCase();
      if (lk !== "etag" && lk !== "last-modified" && lk !== "cache-control" &&
          lk !== "expires" && lk !== "content-length") rh[k] = src[k];
    });
    rh["Cache-Control"] = "no-store, no-cache, must-revalidate";
    rh["Pragma"] = "no-cache";
    log("注入 CSS");
    $done({ body: out, headers: rh });
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
