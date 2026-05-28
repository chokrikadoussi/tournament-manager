const ROUND_LABEL = (r, total) => {
  const d = total - r;
  if (d === 0) return 'FINALE';
  if (d === 1) return 'Demi-Finale';
  if (d === 2) return 'Quart de Finale';
  if (d === 3) return '1/8 de Finale';
  return `Round ${r}`;
};

const NAVY    = [14,  42, 100];
const NAVY2   = [22,  62, 148];
const CHONG   = [30,  90, 200];
const HONG    = [196, 32,  32];
const GOLD_C  = [172, 130,  0];
const SILV_C  = [110, 110, 122];
const BRNZ_C  = [152,  84,  20];
const DARK    = [18,  18,  28];
const MID     = [95,  98, 112];
const LIGHT   = [208, 210, 220];
const BG_INFO = [246, 248, 252];
const BG_CARD = [251, 251, 254];
const WHITE   = [255, 255, 255];

function formatDateFR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Core drawing function — operates on an existing jsPDF instance / current page
// ─────────────────────────────────────────────────────────────────────────────
function _drawPage(pdf, { bracketMap, totalRounds, categoryName, tournamentName = '', lieu = '', date = '', aire = '' }) {
  const PW = 297, PH = 210;
  const M  = 7;

  const BANNER_H = 22;
  const INFO_H   = 11;
  const HH       = BANNER_H + INFO_H;
  const FH       = 22;
  const MH       = 13;
  const FW       = 54;
  const BT       = HH;
  const BH       = PH - HH - FH;

  const sideR     = Math.max(totalRounds - 1, 1);
  const sideAvail = (PW - 2 * M - FW) / 2;
  const colW      = sideAvail / sideR;
  const MW        = colW * 0.68;

  // White page base
  pdf.setFillColor(...WHITE);
  pdf.rect(0, 0, PW, PH, 'F');

  // ── BANNER ─────────────────────────────────────────────────────────────────
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PW, BANNER_H, 'F');

  pdf.setFillColor(...NAVY2);
  pdf.rect(0, 0, PW, 2.8, 'F');

  pdf.setFillColor(...CHONG);
  pdf.rect(0, BANNER_H - 1.8, PW / 2, 1.8, 'F');
  pdf.setFillColor(...HONG);
  pdf.rect(PW / 2, BANNER_H - 1.8, PW / 2, 1.8, 'F');

  const hasTournamentName = tournamentName && tournamentName !== categoryName;

  if (hasTournamentName) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(...WHITE);
    pdf.text(tournamentName, PW / 2, 10, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(180, 205, 255);
    pdf.text(categoryName, PW / 2, 17.5, { align: 'center' });
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(...WHITE);
    pdf.text(categoryName, PW / 2, 13, { align: 'center' });
  }

  // ── INFO BAR ───────────────────────────────────────────────────────────────
  pdf.setFillColor(...BG_INFO);
  pdf.rect(0, BANNER_H, PW, INFO_H, 'F');

  pdf.setDrawColor(...LIGHT);
  pdf.setLineWidth(0.25);
  pdf.line(0, BANNER_H + INFO_H, PW, BANNER_H + INFO_H);

  const infoItems = [];
  if (date) infoItems.push(`Date : ${formatDateFR(date)}`);
  if (lieu) infoItems.push(`Lieu : ${lieu}`);
  if (aire) infoItems.push(`Aire N° ${aire}`);

  if (infoItems.length > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...MID);
    pdf.text(infoItems.join('     •     '), PW / 2, BANNER_H + INFO_H / 2 + 1.5, { align: 'center' });
  }

  // ── GEOMETRY ───────────────────────────────────────────────────────────────
  const cy     = (i, n) => BT + (i + 0.5) * BH / n;
  const lx     = (r)   => M + (r - 1) * colW;
  const rx     = (r)   => PW - M - (r - 1) * colW - MW;
  const finalX = (PW - FW) / 2;
  const finalY = BT + BH / 2;

  const STRIP = 2.2;

  // ── MATCH BOX ──────────────────────────────────────────────────────────────
  const drawBox = (x, y, match, side = 'left', w = MW) => {
    const bx      = x, by = y - MH / 2;
    const isRight = side === 'right';

    pdf.setFillColor(210, 212, 220);
    pdf.rect(bx + 0.6, by + 0.6, w, MH, 'F');

    pdf.setFillColor(...BG_CARD);
    pdf.setDrawColor(...LIGHT);
    pdf.setLineWidth(0.28);
    pdf.rect(bx, by, w, MH, 'FD');

    pdf.setDrawColor(222, 224, 232);
    pdf.setLineWidth(0.18);
    const divX1 = isRight ? bx             : bx + STRIP;
    const divX2 = isRight ? bx + w - STRIP : bx + w;
    pdf.line(divX1, by + MH / 2, divX2, by + MH / 2);

    [0, 1].forEach((slot) => {
      const p     = match.participants.find((pt) => pt.slot === slot);
      const slotY = by + slot * MH / 2;
      const isWin = match.winnerId && p?.competitorId === match.winnerId;
      const name  = p?.competitor?.name;
      const isBye = p && !name;
      const isTbd = !p;
      const sColor = slot === 0 ? CHONG : HONG;

      const stripX = isRight ? bx + w - STRIP : bx;
      pdf.setFillColor(...sColor);
      pdf.rect(stripX, slotY, STRIP, MH / 2, 'F');

      if (isWin) {
        const hlX = isRight ? bx : bx + STRIP;
        pdf.setFillColor(...(slot === 0 ? [230, 241, 255] : [255, 230, 230]));
        pdf.rect(hlX, slotY, w - STRIP, MH / 2, 'F');
        pdf.setFillColor(...sColor);
        pdf.rect(stripX, slotY, STRIP, MH / 2, 'F');
      }

      const availW = w - STRIP - 2.5;
      const maxCh  = Math.floor(availW / 1.72);
      const raw    = name ?? (isBye ? 'BYE' : '—');
      const label  = raw.length > maxCh ? raw.slice(0, maxCh - 1) + '…' : raw;

      pdf.setFont('helvetica', isWin ? 'bold' : 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(...(isTbd || isBye ? [162, 164, 175] : DARK));
      if (isRight) {
        pdf.text(label, bx + w - STRIP - 2, slotY + MH / 4 + 1.3, { align: 'right' });
      } else {
        pdf.text(label, bx + STRIP + 2, slotY + MH / 4 + 1.3);
      }

      const club = p?.competitor?.club;
      if (club && !isBye && !isTbd) {
        const maxC = Math.floor(availW / 1.38);
        const cl   = club.length > maxC ? club.slice(0, maxC - 1) + '…' : club;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(4.5);
        pdf.setTextColor(...MID);
        if (isRight) {
          pdf.text(cl, bx + w - STRIP - 2, slotY + MH / 4 + 4.4, { align: 'right' });
        } else {
          pdf.text(cl, bx + STRIP + 2, slotY + MH / 4 + 4.4);
        }
      }
    });
  };

  // ── CONNECTORS ─────────────────────────────────────────────────────────────
  const drawConn = (srcX, yTop, yBot, dstX, yTgt) => {
    const mx = (srcX + dstX) / 2;
    pdf.setDrawColor(...LIGHT);
    pdf.setLineWidth(0.3);
    pdf.line(srcX, yTop, mx, yTop);
    pdf.line(srcX, yBot, mx, yBot);
    pdf.line(mx, yTop, mx, yBot);
    pdf.line(mx, yTgt, dstX, yTgt);
  };

  const drawLine = (x1, y1, x2, y2) => {
    pdf.setDrawColor(...LIGHT);
    pdf.setLineWidth(0.3);
    pdf.line(x1, y1, x2, y2);
  };

  // ── ROUNDS ─────────────────────────────────────────────────────────────────
  for (let r = 1; r <= totalRounds; r++) {
    const matches = bracketMap.get(r) ?? [];

    if (r === totalRounds) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...NAVY);
      pdf.text('FINALE', PW / 2, finalY - MH / 2 - 3, { align: 'center' });
      if (matches[0]) drawBox(finalX, finalY, matches[0], 'final', FW);
      break;
    }

    const halfN = Math.ceil(matches.length / 2);
    const lM    = matches.slice(0, halfN);
    const rM    = matches.slice(halfN);

    lM.forEach((m, i) => drawBox(lx(r), cy(i, lM.length), m, 'left'));
    rM.forEach((m, i) => drawBox(rx(r), cy(i, rM.length), m, 'right'));

    const nextR    = r + 1;
    const nextM    = bracketMap.get(nextR) ?? [];
    const nextHalf = Math.ceil(nextM.length / 2);
    const nL       = nextM.slice(0, nextHalf);
    const nR       = nextM.slice(nextHalf);

    if (nextR === totalRounds) {
      if (lM.length === 1) {
        drawLine(lx(r) + MW, cy(0, 1), finalX, finalY);
      } else {
        for (let i = 0; i < Math.floor(lM.length / 2); i++)
          drawConn(lx(r) + MW, cy(2*i, lM.length), cy(2*i+1, lM.length), finalX, cy(i, nL.length));
      }
      if (rM.length === 1) {
        drawLine(rx(r), cy(0, 1), finalX + FW, finalY);
      } else {
        for (let i = 0; i < Math.floor(rM.length / 2); i++)
          drawConn(rx(r), cy(2*i, rM.length), cy(2*i+1, rM.length), rx(nextR) + MW, cy(i, nR.length));
      }
    } else {
      for (let i = 0; i < Math.floor(lM.length / 2); i++)
        drawConn(lx(r) + MW, cy(2*i, lM.length), cy(2*i+1, lM.length), lx(nextR), cy(i, nL.length));
      for (let i = 0; i < Math.floor(rM.length / 2); i++)
        drawConn(rx(r), cy(2*i, rM.length), cy(2*i+1, rM.length), rx(nextR) + MW, cy(i, nR.length));
    }
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const footerY = PH - FH;

  pdf.setFillColor(...BG_INFO);
  pdf.rect(0, footerY, PW, FH, 'F');

  pdf.setDrawColor(...LIGHT);
  pdf.setLineWidth(0.25);
  pdf.line(0, footerY, PW, footerY);

  const rlY = footerY + 7;
  for (let r = 1; r <= totalRounds; r++) {
    const matches = bracketMap.get(r) ?? [];
    const halfN   = Math.ceil(matches.length / 2);
    const lM      = matches.slice(0, halfN);
    const rM      = matches.slice(halfN);
    const label   = ROUND_LABEL(r, totalRounds);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.8);
    pdf.setTextColor(...MID);

    if (r === totalRounds) {
      pdf.text(label, PW / 2, rlY, { align: 'center' });
    } else {
      if (lM.length > 0) pdf.text(label, lx(r) + MW / 2, rlY, { align: 'center' });
      if (rM.length > 0) pdf.text(label, rx(r) + MW / 2, rlY, { align: 'center' });
    }
  }

  // ── MEDALS ─────────────────────────────────────────────────────────────────
  const finalMatch = bracketMap.get(totalRounds)?.[0];
  const medalY     = footerY + 13;
  const PILL_W     = 18, PILL_H = 4.5;

  const drawMedal = (cx, color, labelText, names) => {
    if (!names || names.length === 0) return;
    pdf.setFillColor(...color);
    pdf.rect(cx - PILL_W / 2, medalY - PILL_H, PILL_W, PILL_H, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.8);
    pdf.setTextColor(...WHITE);
    pdf.text(labelText, cx, medalY - 1.3, { align: 'center' });
    const joined    = names.join(' · ');
    const truncated = joined.length > 38 ? joined.slice(0, 37) + '…' : joined;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...DARK);
    pdf.text(truncated, cx, medalY + 4.2, { align: 'center' });
  };

  if (finalMatch?.winnerId) {
    const winner = finalMatch.participants.find((p) => p.competitorId === finalMatch.winnerId);
    if (winner?.competitor?.name)
      drawMedal(PW / 2, GOLD_C, 'OR', [winner.competitor.name]);

    const silver = finalMatch.participants.find((p) => p.competitorId !== finalMatch.winnerId);
    if (silver?.competitor?.name)
      drawMedal(PW / 2 - 56, SILV_C, 'ARGENT', [silver.competitor.name]);
  }

  if (totalRounds >= 2) {
    const bronzeNames = (bracketMap.get(totalRounds - 1) ?? [])
      .filter((m) => m.winnerId)
      .map((m) => {
        const loser = m.participants.find((p) => p.competitorId !== m.winnerId);
        return loser?.competitor?.name ?? null;
      })
      .filter(Boolean);
    if (bronzeNames.length > 0)
      drawMedal(PW / 2 + 56, BRNZ_C, 'BRONZE', bronzeNames);
  }

  // ── LÉGENDE (bas-gauche) ────────────────────────────────────────────────────
  {
    const lgX  = M;
    const lgY0 = footerY + 10.5;
    const lgY1 = footerY + 15;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(4.5);
    pdf.setTextColor(...MID);
    pdf.text('LÉGENDE', lgX, lgY0);

    const legendItems = [
      { code: 'PTF', desc: 'Corps' },
      { code: 'PTG', desc: 'Tête' },
      { code: 'KO',  desc: 'K.O.' },
      { code: 'RSC', desc: 'Supér.' },
      { code: 'DSQ', desc: 'Disqual.' },
      { code: 'WD',  desc: 'Abandon' },
    ];

    pdf.setFontSize(4.0);
    let lgCurX = lgX;
    legendItems.forEach((item, i) => {
      if (i > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...LIGHT);
        pdf.text('  ·  ', lgCurX, lgY1);
        lgCurX += pdf.getTextWidth('  ·  ');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...DARK);
      pdf.text(item.code, lgCurX, lgY1);
      lgCurX += pdf.getTextWidth(item.code);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...MID);
      pdf.text(' ' + item.desc, lgCurX, lgY1);
      lgCurX += pdf.getTextWidth(' ' + item.desc);
    });
  }

  // Competitor count (bottom-right)
  const totalComp = (bracketMap.get(1) ?? [])
    .reduce((acc, m) => acc + m.participants.filter((p) => p.competitor).length, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  pdf.setTextColor(185, 187, 198);
  pdf.text(`${totalComp} compétiteurs`, PW - M, PH - 2.5, { align: 'right' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — single category
// ─────────────────────────────────────────────────────────────────────────────
export async function exportBracketPDF(params) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  _drawPage(pdf, params);

  const { tournamentName = '', categoryName, date = '' } = params;
  const parts = [
    tournamentName ? slugify(tournamentName) : null,
    slugify(categoryName),
    date ? date.replace(/-/g, '') : null,
  ].filter(Boolean);
  pdf.save(`bracket-${parts.join('-')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — all categories (multi-page)
// categories: Array<{ bracketMap, totalRounds, categoryName }>
// ─────────────────────────────────────────────────────────────────────────────
export async function exportAllBracketsPDF({ categories, tournamentName = '', lieu = '', date = '', aire = '' }) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  categories.forEach((cat, i) => {
    if (i > 0) pdf.addPage('a4', 'landscape');
    _drawPage(pdf, { ...cat, tournamentName, lieu, date, aire });
  });

  const slug     = slugify(tournamentName || 'tournoi');
  const dateSlug = date ? `-${date.replace(/-/g, '')}` : '';
  pdf.save(`brackets-${slug}${dateSlug}.pdf`);
}
