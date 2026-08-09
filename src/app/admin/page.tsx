"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Shell, SiteNav } from "../components/site-chrome";

type DebugResponse = {
  media: {
    primaryTitle: string | null;
    aliases: string[];
    originalLanguage?: string;
  };
  titles: string[];
  queries: string[];
  resultCount: number;
  deduplicatedCount: number;
  results: Array<{
    title: string;
    indexerName?: string;
    size?: number;
    seeders?: number;
    guid: string;
  }>;
  error?: string;
};

function formatSize(size?: number) {
  if (size == null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(2)} GB`;
}

export default function AdminPage() {
  const [apikey, setApikey] = useState("");
  const [tvdbId, setTvdbId] = useState("366625");
  const [season, setSeason] = useState("2");
  const [episode, setEpisode] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DebugResponse | null>(null);

  const canSubmit = useMemo(
    () => apikey.trim().length >= 16 && tvdbId.trim().length > 0,
    [apikey, tvdbId]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debug/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: apikey.trim(),
          tvdbId: Number(tvdbId),
          season: season ? Number(season) : undefined,
          episode: episode ? Number(episode) : undefined,
        }),
      });
      const json = (await res.json()) as DebugResponse;
      if (!res.ok) {
        setData(null);
        setError(json.error ?? `请求失败 (${res.status})`);
        return;
      }
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <SiteNav active="admin" />
      <header className="page-head">
        <h1>试搜控制台</h1>
        <p>用 TVDB ID 验证别名扩展与 Prowlarr 聚合结果。API Key 仅用于本次请求。</p>
      </header>

      <div className="stack">
        <section className="panel">
          <h2>参数</h2>
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="apikey">Torznab API Key</label>
                <input
                  id="apikey"
                  type="password"
                  autoComplete="off"
                  value={apikey}
                  onChange={(e) => setApikey(e.target.value)}
                  placeholder="与 TORZNAB_API_KEY 相同"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="tvdbId">TVDB ID</label>
                <input
                  id="tvdbId"
                  inputMode="numeric"
                  value={tvdbId}
                  onChange={(e) => setTvdbId(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="season">Season</label>
                <input
                  id="season"
                  inputMode="numeric"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="episode">Episode</label>
                <input
                  id="episode"
                  inputMode="numeric"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                />
              </div>
            </div>
            <div className="cta-row">
              <button className="btn btn-primary" type="submit" disabled={!canSubmit || loading}>
                {loading ? "搜索中…" : "执行试搜"}
              </button>
            </div>
            {error ? <p className="error">{error}</p> : null}
          </form>
        </section>

        {data ? (
          <>
            <section className="panel">
              <h2>媒体与别名</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {data.media.primaryTitle ?? "未找到别名配置"}
                {data.media.originalLanguage
                  ? ` · ${data.media.originalLanguage}`
                  : ""}
              </p>
              <div className="chips" style={{ marginBottom: "0.9rem" }}>
                {data.media.aliases.length
                  ? data.media.aliases.map((a) => (
                      <span className="chip" key={a}>
                        {a}
                      </span>
                    ))
                  : (
                      <span className="muted">无 YAML 别名，将回退标题搜索</span>
                    )}
              </div>
              <h2>扩展标题</h2>
              <div className="chips">
                {data.titles.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>生成查询</h2>
              <div className="chips">
                {data.queries.map((q) => (
                  <span className="chip" key={q}>
                    {q}
                  </span>
                ))}
              </div>
              <div className="status-grid" style={{ marginTop: "1rem" }}>
                <div className="status-item">
                  <span className="label">Raw</span>
                  <span className="value">{data.resultCount}</span>
                </div>
                <div className="status-item">
                  <span className="label">Deduped</span>
                  <span className="value">{data.deduplicatedCount}</span>
                </div>
              </div>
            </section>

            <section className="panel">
              <h2>结果预览</h2>
              {data.results.length === 0 ? (
                <p className="muted">无结果（空 RSS 对 Sonarr 仍合法）</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Indexer</th>
                        <th>Size</th>
                        <th>Seeders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((r) => (
                        <tr key={r.guid}>
                          <td>{r.title}</td>
                          <td>{r.indexerName ?? "—"}</td>
                          <td>{formatSize(r.size)}</td>
                          <td>{r.seeders ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
