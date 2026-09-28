// 編集画面（/manage/{teamId}/...）と閲覧ページ（/t/{token}/... または /teams/{slug}/...）の対応

/** 管理画面のパス → 対応する閲覧ページのパス */
export function toViewPath(pathname: string, teamId: string, publicBase: string): string {
  const rest = pathname.startsWith(`/manage/${teamId}`) ? pathname.slice(`/manage/${teamId}`.length) : "";
  const game = /^\/games\/([^/]+)/.exec(rest);
  if (game && game[1] !== "new") return `${publicBase}/games/${game[1]}`;
  if (rest.startsWith("/games")) return `${publicBase}/games`;
  const player = /^\/players\/([^/]+)/.exec(rest);
  if (player) return `${publicBase}/players/${player[1]}`;
  if (rest.startsWith("/players")) return `${publicBase}/players`;
  if (rest.startsWith("/stats")) return `${publicBase}/stats`;
  if (rest.startsWith("/settings") || rest.startsWith("/profile") || rest.startsWith("/me")) return `${publicBase}/profile`;
  return publicBase;
}

/** 閲覧ページのパス → 対応する管理画面のパス。プロフィールはオーナーだけが編集できる */
export function toEditPath(pathname: string, publicBase: string, teamId: string, isOwner: boolean): string {
  const base = `/manage/${teamId}`;
  const rest = pathname.startsWith(publicBase) ? pathname.slice(publicBase.length) : "";
  const game = /^\/games\/([^/]+)/.exec(rest);
  if (game) return `${base}/games/${game[1]}`;
  const player = /^\/players\/([^/]+)/.exec(rest);
  if (player) return `${base}/players/${player[1]}`;
  if (rest.startsWith("/players")) return `${base}/players`;
  if (rest.startsWith("/stats")) return `${base}/stats`;
  if (rest.startsWith("/profile")) return isOwner ? `${base}/profile` : `${base}/settings`;
  return base;
}

/** 年・打者/投手の切り替えは引き継ぐ */
export function keepQuery(search: URLSearchParams): string {
  const kept = new URLSearchParams();
  for (const key of ["year", "tab"]) {
    const v = search.get(key);
    if (v) kept.set(key, v);
  }
  const q = kept.toString();
  return q ? `?${q}` : "";
}
