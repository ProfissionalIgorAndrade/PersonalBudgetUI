import React from 'react';
import { motion } from 'framer-motion';
import { R$ } from '../../../core/utils/format';

const cardVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.96 },
  visible: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.08, duration: 0.38, ease: [0.4,0,0.2,1] } }),
};

const CARDS = (balance, savPct) => [
  {
    label:       'Receitas',
    icon:        '📈',
    valColor:    '#4ade80',
    bg:          'rgba(22, 163, 74, 0.13)',
    border:      'rgba(34, 197, 94, 0.30)',
    topBar:      '#22c55e',
    glow:        'rgba(34, 197, 94, 0.16)',
    iconBorder:  'rgba(34, 197, 94, 0.28)',
    labelColor:  'rgba(134, 239, 172, 0.7)',
  },
  {
    label:       'Despesas',
    icon:        '📉',
    valColor:    '#f87171',
    bg:          'rgba(120, 10, 45, 0.28)',
    border:      'rgba(159, 18, 57, 0.50)',
    topBar:      '#9f1239',
    glow:        'rgba(159, 18, 57, 0.22)',
    iconBorder:  'rgba(159, 18, 57, 0.40)',
    labelColor:  'rgba(253, 164, 175, 0.7)',
  },
  {
    label:       'Saldo',
    icon:        '💰',
    valColor:    balance >= 0 ? '#60a5fa' : '#f87171',
    bg:          'rgba(30, 64, 175, 0.18)',
    border:      'rgba(59, 130, 246, 0.32)',
    topBar:      '#3b82f6',
    glow:        'rgba(59, 130, 246, 0.18)',
    iconBorder:  'rgba(59, 130, 246, 0.32)',
    labelColor:  'rgba(147, 197, 253, 0.7)',
  },
  {
    label:       'Poupança',
    icon:        '🏦',
    valColor:    '#c084fc',
    bg:          'rgba(88, 28, 135, 0.22)',
    border:      'rgba(139, 92, 246, 0.35)',
    topBar:      '#8b5cf6',
    glow:        'rgba(139, 92, 246, 0.18)',
    iconBorder:  'rgba(139, 92, 246, 0.32)',
    labelColor:  'rgba(196, 181, 253, 0.7)',
  },
];

export default function SummaryCards({ totalIn, totalOut, balance, savPct }) {
  const vals  = [totalIn, totalOut, balance, null];
  const extra = [null, null, null, savPct + '%'];

  return (
    <div className="grid-4" style={{ marginBottom: 20 }}>
      {CARDS(balance, savPct).map((s, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          style={{
            position: 'relative', overflow: 'hidden',
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderTop: `2px solid ${s.topBar}`,
            borderRadius: 14,
            padding: '20px 22px 22px',
          }}
        >
          {/* corner glow */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

          {/* icon */}
          <div style={{ width: 40, height: 40, borderRadius: 11, background: s.glow, border: `1px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, marginBottom: 16 }}>{s.icon}</div>

          {/* label */}
          <div style={{ fontSize: 10.5, color: s.labelColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 6 }}>{s.label}</div>

          {/* value */}
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Inter', 'Outfit', sans-serif", color: s.valColor, letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' }}>
            {extra[i] || R$(vals[i])}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
