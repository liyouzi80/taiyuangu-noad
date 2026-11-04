/**
 * 桃园谷 诊断日志 v1（无 body 依赖）
 * 作用：把设备上 *.taoyuangu.com 的请求记到日志（Loon / 小火箭 / Surge 通用），用来定位「还有广告」是哪个接口
 * 用法：开着广告看一遍 App，到客户端日志里 → 搜 "TYG-DIAG"
 */
console.log("[TYG-DIAG] " + ($request.method || "GET") + " " + $request.url);
$done({});
