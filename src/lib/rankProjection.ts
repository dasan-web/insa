export interface RankItem {
  id: number;
  step_order: number;
  rank_name: string;
  category: string | null;
  years: number;
  next_rank: string | null;
}

export interface Projections {
  baseRank: string;
  y1: string;
  y2: string;
  y3: string;
  y4: string;
  y5: string;
  y2027: string;
  y2028: string;
  y2029: string;
  y2030: string;
  y2031: string;
}

/**
 * Given a current 2026 rank, a list of rank items, and a base year (default 2026),
 * computes the base rank and the 5-year projections (baseYear+1 to baseYear+5).
 */
export function calculate5YearProjections(
  currentRank: string | null | undefined,
  rankList: RankItem[],
  baseYear: number = 2026
): Projections {
  const result: Projections = {
    baseRank: '-',
    y1: '-',
    y2: '-',
    y3: '-',
    y4: '-',
    y5: '-',
    y2027: '-',
    y2028: '-',
    y2029: '-',
    y2030: '-',
    y2031: '-',
  };

  if (!currentRank || currentRank === 'NaN' || currentRank.trim() === '') {
    return result;
  }

  const cleanCurrent = currentRank.trim();

  // Map by rank_name for fast lookup
  const rankMap = new Map<string, RankItem>();
  for (const r of rankList) {
    rankMap.set(r.rank_name.trim(), r);
  }

  // Helper function to get the next rank after a given rank
  const getNextRank = (rankName: string): string => {
    if (!rankName || rankName === '-') return '-';
    const trimmed = rankName.trim();

    // 1. Direct match in DB ranks
    const found = rankMap.get(trimmed);
    if (found && found.next_rank) {
      return found.next_rank;
    }

    // 2. Intelligent pattern fallback (e.g. "선임Ⅰ3년" -> "선임Ⅰ4년", "책임5년" -> "책임6년")
    const match = trimmed.match(/^(.+?)(\d+)년$/);
    if (match) {
      const title = match[1];
      const yr = parseInt(match[2], 10);
      const nextSameTitle = `${title}${yr + 1}년`;

      // If next year exists in rankMap, return it
      if (rankMap.has(nextSameTitle)) {
        return nextSameTitle;
      }

      // Check standard progression titles
      if (title.includes('사원')) {
        if (yr >= 8) return '주임1년';
        return `사원${yr + 1}년`;
      }
      if (title.includes('주임')) {
        if (yr >= 2) return '선임Ⅰ1년';
        return `주임${yr + 1}년`;
      }
      if (title.includes('선임Ⅰ') || title.includes('선임I')) {
        if (yr >= 4) return '선임Ⅱ1년';
        return `선임Ⅰ${yr + 1}년`;
      }
      if (title.includes('선임Ⅱ') || title.includes('선임II')) {
        if (yr >= 5) return '책임1년';
        return `선임Ⅱ${yr + 1}년`;
      }
      if (title.includes('책임')) {
        if (yr >= 4) return '수석1년';
        return `책임${yr + 1}년`;
      }
      if (title.includes('수석')) {
        if (yr >= 7) return '이사보';
        return `수석${yr + 1}년`;
      }
    }

    if (trimmed === '이사보') return '이사';
    if (trimmed === '이사') return '이사';

    return trimmed;
  };

  const offset = Math.max(0, baseYear - 2026);
  let baseRank = cleanCurrent;
  for (let i = 0; i < offset; i++) {
    baseRank = getNextRank(baseRank);
  }

  const y1 = getNextRank(baseRank);
  const y2 = getNextRank(y1);
  const y3 = getNextRank(y2);
  const y4 = getNextRank(y3);
  const y5 = getNextRank(y4);

  return {
    baseRank,
    y1,
    y2,
    y3,
    y4,
    y5,
    y2027: y1,
    y2028: y2,
    y2029: y3,
    y2030: y4,
    y2031: y5,
  };
}
