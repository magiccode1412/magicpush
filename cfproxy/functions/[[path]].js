export async function onRequest(context) {
  const { request, env } = context;

  const targetUpstream = env.TARGET_UPSTREAM;
  if (!targetUpstream) {
    return new Response("请设置环境变量 TARGET_UPSTREAM", { status: 500 });
  }

  const url = new URL(request.url);
  const targetUrl = new URL(url.pathname + url.search, targetUpstream);

  // 强制 IPv6 回源（Cloudflare Pages 支持）
  const newHeaders = new Headers(request.headers);
  newHeaders.set("Host", targetUrl.host);

  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: "manual",
  });

  try {
    return await fetch(newRequest, {
      // 强制走 IPv6 访问源站（适配你的 IPv6-only）
      ipv6: true,
    });
  } catch (err) {
    return new Response(`代理错误：${err.message}`, { status: 502 });
  }
}