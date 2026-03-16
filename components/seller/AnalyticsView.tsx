'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface DayPoint {
  date: string
  views: number
  likes: number
  clicks: number
  saves: number
}

interface TopItem {
  id: string
  title: string
  category: string
  imageUrl: string
  views: number
  likes: number
  clicks: number
  saves: number
  total: number
}

interface Props {
  businessName: string
  totals: { views: number; likes: number; clicks: number; saves: number }
  dailySeries: DayPoint[]
  topItems: TopItem[]
}

type MetricKey = 'views' | 'likes' | 'clicks' | 'saves'

const METRIC_CONFIG: Record<MetricKey, { label: string; icon: string; color: string }> = {
  views:  { label: 'Просмотры',  icon: '👁',  color: '#6366F1' },
  likes:  { label: 'Лайки',     icon: '❤️', color: '#FF4D4D' },
  clicks: { label: 'Клики',     icon: '🔗',  color: '#0F0F0F' },
  saves:  { label: 'Сохранения',icon: '🔖',  color: '#F59E0B' },
}

function MiniLineChart({ series, color }: { series: number[]; color: string }) {
  if (series.length < 2) return null
  const max = Math.max(...series, 1)
  const W = 120
  const H = 36
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W
    const y = H - (v / max) * H
    return `${x},${y}`
  })
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BarChart({ series, activeMetric }: { series: DayPoint[]; activeMetric: MetricKey }) {
  const values = series.map(d => d[activeMetric])
  const max = Math.max(...values, 1)
  const { color } = METRIC_CONFIG[activeMetric]

  return (
    <div className="flex items-end gap-[2px] h-20 w-full">
      {values.map((v, i) => (
        <motion.div
          key={i}
          title={`${series[i].date}: ${v}`}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.01, duration: 0.3 }}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            backgroundColor: color,
            opacity: v === 0 ? 0.15 : 0.85,
            transformOrigin: 'bottom',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}

const DAY_LABELS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

export default function AnalyticsView({ businessName, totals, dailySeries, topItems }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('views')

  const metrics: MetricKey[] = ['views', 'likes', 'clicks', 'saves']
  const ctr = totals.views > 0 ? ((totals.clicks / totals.views) * 100).toFixed(1) : '0.0'
  const saveRate = totals.views > 0 ? ((totals.saves / totals.views) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#0F0F0F]">Аналитика</h1>
        <p className="text-[#6B6B6B] text-sm mt-0.5">Последние 30 дней · {businessName}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(key => {
          const cfg = METRIC_CONFIG[key]
          const mini = dailySeries.map(d => d[key])
          const isActive = activeMetric === key
          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveMetric(key)}
              className={`bg-white rounded-2xl p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-2 transition-all ${
                isActive ? 'border-[#0F0F0F]' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{cfg.icon}</span>
                <MiniLineChart series={mini} color={cfg.color} />
              </div>
              <p className="font-['DM_Mono'] text-2xl font-medium text-[#0F0F0F]">
                {totals[key].toLocaleString('ru-RU')}
              </p>
              <p className="font-sans text-[11px] text-[#6B6B6B] font-medium mt-0.5">{cfg.label}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Daily bar chart */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <p className="font-sans text-[13px] font-bold text-[#0F0F0F]">
            {METRIC_CONFIG[activeMetric].label} по дням
          </p>
          <span className="text-[11px] text-[#6B6B6B]">30 дней</span>
        </div>
        <BarChart series={dailySeries} activeMetric={activeMetric} />
        {/* X-axis labels: show Mon/Thu/Sun only */}
        <div className="flex mt-1">
          {dailySeries.map((d, i) => {
            const dow = new Date(d.date).getDay()
            return (
              <div key={d.date} style={{ flex: 1 }} className="text-center">
                {(dow === 1 || i === 0 || i === dailySeries.length - 1) && (
                  <span className="text-[8px] text-[#C4C4C4]">
                    {i === dailySeries.length - 1 ? 'Сег' : DAY_LABELS[dow]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="font-sans text-[11px] text-[#6B6B6B] font-medium">CTR (просмотр→клик)</p>
          <p className="font-['DM_Mono'] text-2xl font-medium text-[#0F0F0F] mt-1">{ctr}%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="font-sans text-[11px] text-[#6B6B6B] font-medium">Save rate</p>
          <p className="font-['DM_Mono'] text-2xl font-medium text-[#0F0F0F] mt-1">{saveRate}%</p>
        </div>
      </div>

      {/* Top items */}
      {topItems.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <p className="font-sans text-[13px] font-bold text-[#0F0F0F] mb-4">Топ товаров</p>
          <div className="space-y-3">
            {topItems.map((item, idx) => {
              const maxTotal = topItems[0].total || 1
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="font-['DM_Mono'] text-[13px] text-[#C4C4C4] w-4 shrink-0">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-[#F7F7F5] overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img loading="lazy" src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">🛍</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[12px] font-semibold text-[#0F0F0F] truncate">{item.title}</p>
                    <div className="mt-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.total / maxTotal) * 100}%` }}
                        transition={{ delay: idx * 0.05 + 0.1, duration: 0.4 }}
                        className="h-full rounded-full bg-[#0F0F0F]"
                      />
                    </div>
                  </div>
                  <span className="font-['DM_Mono'] text-[12px] text-[#6B6B6B] shrink-0">{item.total}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {topItems.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <span className="text-4xl">📊</span>
          <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#0F0F0F] mt-4 mb-2">
            Пока нет данных
          </h3>
          <p className="font-sans text-sm text-[#6B6B6B] max-w-xs mx-auto">
            Данные появятся как только пользователи начнут взаимодействовать с вашими товарами в ленте.
          </p>
        </div>
      )}
    </div>
  )
}
