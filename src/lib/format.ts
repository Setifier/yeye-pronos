/** Formats a number with narrow no-break space as thousands separator (e.g. 3 200).
 *  Deterministic — no locale dependency, safe for SSR/hydration. */
export const fmtPts = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
