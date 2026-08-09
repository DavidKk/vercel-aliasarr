import Link from "next/link";
import { getHealthPayload } from "@/modules/app/health";
import { Shell, SiteNav } from "./components/site-chrome";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await getHealthPayload();

  return (
    <Shell>
      <SiteNav active="home" />
      <section className="hero">
        <h1>Aliasarr</h1>
        <p>
          部署在 Vercel 上的虚拟 Torznab Indexer。把 Sonarr 的英文标题 /
          TVDB ID 扩展为中文别名，再经 Prowlarr 搜索真实站点。
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/admin">
            打开试搜控制台
          </Link>
          <a className="btn btn-ghost" href="/api/health">
            查看 Health JSON
          </a>
        </div>
      </section>

      <div className="stack">
        <section className="panel">
          <h2>运行状态</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Service</span>
              <span className={`value ${health.status === "ok" ? "ok" : "bad"}`}>
                {health.status}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Prowlarr</span>
              <span
                className={`value ${
                  health.prowlarr === "reachable" ? "ok" : "bad"
                }`}
              >
                {health.prowlarr}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Runtime</span>
              <span className="value">{health.runtime}</span>
            </div>
            <div className="status-item">
              <span className="label">Version</span>
              <span className="value">{health.version}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Sonarr 接入</h2>
          <ul className="config-list">
            <li>
              <span className="muted">URL</span>
              <code>https://&lt;your-app&gt;.vercel.app</code>
            </li>
            <li>
              <span className="muted">API Path</span>
              <code>/api/torznab</code>
            </li>
            <li>
              <span className="muted">API Key</span>
              <code>TORZNAB_API_KEY</code>
            </li>
            <li>
              <span className="muted">Categories</span>
              <code>5000, 5030, 5040, 5045</code>
            </li>
          </ul>
        </section>
      </div>
    </Shell>
  );
}
