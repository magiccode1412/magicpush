const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function onRequest(context) {
  const { request, env } = context;

  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // 路径判断
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/push")) {
    return new Response(JSON.stringify({
      "msg": `不支持代理此路径：${url.pathname}`
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // 检查必要环境变量
  const targetUpstream = env.TARGET_UPSTREAM;
  if (!targetUpstream) {
    return new Response("请设置环境变量 TARGET_UPSTREAM", { status: 500, headers: corsHeaders });
  }
  
  const targetUrl = new URL(url.pathname + url.search, targetUpstream);
  const newHeaders = new Headers(request.headers);
  newHeaders.set("Host", targetUrl.host);

  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: "manual",
  });

  try {
    const response = await fetch(newRequest);
    // 添加 CORS 头部到代理响应
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    return newResponse;
  } catch (err) {
    return new Response(`代理错误：${err.message}`, { status: 502, headers: corsHeaders });
  }
}