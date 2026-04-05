const html = `
<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CFProxy - IPv4/IPv6 代理网关</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #e8e8e8;
      padding: 20px;
    }

    .container {
      text-align: center;
      max-width: 600px;
    }

    .logo {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #f97316, #fb923c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 1.1rem;
      color: #94a3b8;
      margin-bottom: 2rem;
    }

    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    .card h2 {
      font-size: 1.2rem;
      color: #f97316;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .card p {
      line-height: 1.8;
      color: #cbd5e1;
    }

    .tech-stack {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1.5rem;
    }

    .tech-badge {
      background: rgba(249, 115, 22, 0.15);
      border: 1px solid rgba(249, 115, 22, 0.3);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      color: #fb923c;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 20px;
      font-size: 0.9rem;
      color: #22c55e;
    }

    .status::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {

      0%,
      100% {
        opacity: 1;
      }

      50% {
        opacity: 0.5;
      }
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="logo">🌐</div>
    <h1>CFProxy</h1>
    <p class="subtitle">MagicPush 专用转发服务</p>

    <div class="card">
      <h2>📖 项目用途</h2>
      <p>
        本服务专为 <a href="https://github.com/magiccode1412/magicpush" target="_blank"
          style="color: #f97316; text-decoration: none; font-weight: 600;">MagicPush</a> 项目提供，部署在 <strong>Cloudflare
          Pages</strong> 上，用于解决 IPv6-only 服务器无法被 IPv4-only 用户访问的问题。
      </p>
      <p style="margin-top: 1rem;">
        由于 Cloudflare 支持双栈 IP 协议（同时支持 IPv4 和 IPv6），本代理可将来自 IPv4 用户的请求转发至仅支持 IPv6 的 MagicPush 后端服务器，实现无缝访问。
      </p>
    </div>

    <div class="card">
      <h2>⚡ 工作原理</h2>
      <p>
        用户请求 → Cloudflare Edge (双栈) → IPv6 回源 → 您的服务器
      </p>
    </div>

    <div class="tech-stack">
      <span class="tech-badge">Cloudflare Pages</span>
      <span class="tech-badge">Workers Functions</span>
      <span class="tech-badge">IPv6 回源</span>
    </div>

    <div class="status">代理服务运行中</div>

    <p style="margin-top: 2rem; color: #64748b; font-size: 0.9rem;">
      项目地址：<a href="https://github.com/magiccode1412/magicpush" target="_blank"
        style="color: #94a3b8;">github.com/magiccode1412/magicpush</a>
    </p>
  </div>
</body>

</html>
`

export function onRequest(){
    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        }
    })
}