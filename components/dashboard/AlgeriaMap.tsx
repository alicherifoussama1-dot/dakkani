'use client'

import { useMemo, useState } from 'react'

export const WILAYA_NAMES: Record<number, { ar: string; fr: string; code: string }> = {
  1: { ar: 'أدرار', fr: 'Adrar', code: '01' },
  2: { ar: 'الشلف', fr: 'Chlef', code: '02' },
  3: { ar: 'الأغواط', fr: 'Laghouat', code: '03' },
  4: { ar: 'أم البواقي', fr: 'Oum El Bouaghi', code: '04' },
  5: { ar: 'باتنة', fr: 'Batna', code: '05' },
  6: { ar: 'بجاية', fr: 'Béjaïa', code: '06' },
  7: { ar: 'بسكرة', fr: 'Biskra', code: '07' },
  8: { ar: 'بشار', fr: 'Béchar', code: '08' },
  9: { ar: 'البليدة', fr: 'Blida', code: '09' },
  10: { ar: 'البويرة', fr: 'Bouira', code: '10' },
  11: { ar: 'تمنراست', fr: 'Tamanrasset', code: '11' },
  12: { ar: 'تبسة', fr: 'Tébessa', code: '12' },
  13: { ar: 'تلمسان', fr: 'Tlemcen', code: '13' },
  14: { ar: 'تيارت', fr: 'Tiaret', code: '14' },
  15: { ar: 'تيزي وزو', fr: 'Tizi Ouzou', code: '15' },
  16: { ar: 'الجزائر', fr: 'Alger', code: '16' },
  17: { ar: 'الجلفة', fr: 'Djelfa', code: '17' },
  18: { ar: 'جيجل', fr: 'Jijel', code: '18' },
  19: { ar: 'سطيف', fr: 'Sétif', code: '19' },
  20: { ar: 'سعيدة', fr: 'Saïda', code: '20' },
  21: { ar: 'سكيكدة', fr: 'Skikda', code: '21' },
  22: { ar: 'سيدي بلعباس', fr: 'Sidi Bel Abbès', code: '22' },
  23: { ar: 'عنابة', fr: 'Annaba', code: '23' },
  24: { ar: 'قالمة', fr: 'Guelma', code: '24' },
  25: { ar: 'قسنطينة', fr: 'Constantine', code: '25' },
  26: { ar: 'المدية', fr: 'Médéa', code: '26' },
  27: { ar: 'مستغانم', fr: 'Mostaganem', code: '27' },
  28: { ar: 'المسيلة', fr: "M'Sila", code: '28' },
  29: { ar: 'معسكر', fr: 'Mascara', code: '29' },
  30: { ar: 'ورقلة', fr: 'Ouargla', code: '30' },
  31: { ar: 'وهران', fr: 'Oran', code: '31' },
  32: { ar: 'البيض', fr: 'El Bayadh', code: '32' },
  33: { ar: 'إليزي', fr: 'Illizi', code: '33' },
  34: { ar: 'برج بوعريريج', fr: 'Bordj Bou Arréridj', code: '34' },
  35: { ar: 'بومرداس', fr: 'Boumerdès', code: '35' },
  36: { ar: 'الطارف', fr: 'El Tarf', code: '36' },
  37: { ar: 'تندوف', fr: 'Tindouf', code: '37' },
  38: { ar: 'تيسمسيلت', fr: 'Tissemsilt', code: '38' },
  39: { ar: 'الوادي', fr: 'El Oued', code: '39' },
  40: { ar: 'خنشلة', fr: 'Khenchela', code: '40' },
  41: { ar: 'سوق أهراس', fr: 'Souk Ahras', code: '41' },
  42: { ar: 'تيبازة', fr: 'Tipaza', code: '42' },
  43: { ar: 'ميلة', fr: 'Mila', code: '43' },
  44: { ar: 'عين الدفلى', fr: 'Aïn Defla', code: '44' },
  45: { ar: 'النعامة', fr: 'Naâma', code: '45' },
  46: { ar: 'عين تموشنت', fr: 'Aïn Témouchent', code: '46' },
  47: { ar: 'غرداية', fr: 'Ghardaïa', code: '47' },
  48: { ar: 'غليزان', fr: 'Relizane', code: '48' },
  49: { ar: 'تيميمون', fr: 'Timimoun', code: '49' },
  50: { ar: 'برج باجي مختار', fr: 'Bordj Badji Mokhtar', code: '50' },
  51: { ar: 'أولاد جلال', fr: 'Ouled Djellal', code: '51' },
  52: { ar: 'بني عباس', fr: 'Béni Abbès', code: '52' },
  53: { ar: 'عين صالح', fr: 'In Salah', code: '53' },
  54: { ar: 'عين قزام', fr: 'In Guezzam', code: '54' },
  55: { ar: 'تقرت', fr: 'Touggourt', code: '55' },
  56: { ar: 'جانت', fr: 'Djanet', code: '56' },
  57: { ar: 'المغير', fr: "El M'Ghair", code: '57' },
  58: { ar: 'المنيعة', fr: 'El Meniaa', code: '58' },
}

// Map layout coordinates for Algeria Wilayas in SVG space (400x480)
// Designed for authentic regional shape representation (North coastline, tell atlas, desert wilayas)
const WILAYA_SVG_PATHS: Record<number, { path: string; name: string }> = {
  // Northern Coastal & Tell Atlas Wilayas
  16: { path: "M 200,45 L 212,45 L 210,55 L 198,55 Z", name: "الجزائر" }, // Alger
  42: { path: "M 182,45 L 200,45 L 198,55 L 180,55 Z", name: "تيبازة" }, // Tipaza
  35: { path: "M 212,45 L 228,45 L 225,55 L 210,55 Z", name: "بومرداس" }, // Boumerdès
  15: { path: "M 228,45 L 246,45 L 242,57 L 225,55 Z", name: "تيزي وزو" }, // Tizi Ouzou
  6:  { path: "M 246,45 L 264,45 L 260,57 L 242,57 Z", name: "بجاية" }, // Béjaïa
  18: { path: "M 264,45 L 282,45 L 278,57 L 260,57 Z", name: "جيجل" }, // Jijel
  21: { path: "M 282,45 L 300,45 L 296,57 L 278,57 Z", name: "سكيكدة" }, // Skikda
  23: { path: "M 300,45 L 314,45 L 310,57 L 296,57 Z", name: "عنابة" }, // Annaba
  36: { path: "M 314,45 L 330,45 L 326,57 L 310,57 Z", name: "الطارف" }, // El Tarf

  // Northwest Coastal Wilayas
  46: { path: "M 108,55 L 126,50 L 124,62 L 106,65 Z", name: "عين تموشنت" }, // Aïn Témouchent
  31: { path: "M 126,50 L 146,47 L 143,60 L 124,62 Z", name: "وهران" }, // Oran
  27: { path: "M 146,47 L 164,46 L 162,58 L 143,60 Z", name: "مستغانم" }, // Mostaganem
  2:  { path: "M 164,46 L 182,45 L 180,55 L 162,58 Z", name: "الشلف" }, // Chlef

  // Inland North
  13: { path: "M 88,62 L 108,55 L 106,65 L 85,75 Z", name: "تلمسان" }, // Tlemcen
  22: { path: "M 106,65 L 124,62 L 122,78 L 102,80 Z", name: "سيدي بلعباس" }, // Sidi Bel Abbès
  29: { path: "M 124,62 L 143,60 L 140,75 L 122,78 Z", name: "معسكر" }, // Mascara
  48: { path: "M 143,60 L 162,58 L 158,72 L 140,75 Z", name: "غليزان" }, // Relizane
  44: { path: "M 162,58 L 180,55 L 176,70 L 158,72 Z", name: "عين الدفلى" }, // Aïn Defla
  9:  { path: "M 180,55 L 198,55 L 194,68 L 176,70 Z", name: "البليدة" }, // Blida
  26: { path: "M 176,70 L 194,68 L 190,85 L 172,88 Z", name: "المدية" }, // Médéa
  10: { path: "M 198,55 L 225,55 L 220,70 L 194,68 Z", name: "البويرة" }, // Bouira
  34: { path: "M 225,55 L 250,55 L 245,70 L 220,70 Z", name: "برج بوعريريج" }, // Bordj Bou Arréridj
  19: { path: "M 250,55 L 278,57 L 272,75 L 245,70 Z", name: "سطيف" }, // Sétif
  43: { path: "M 278,57 L 296,57 L 290,75 L 272,75 Z", name: "ميلة" }, // Mila
  25: { path: "M 296,57 L 310,57 L 305,73 L 290,75 Z", name: "قسنطينة" }, // Constantine
  24: { path: "M 310,57 L 326,57 L 320,73 L 305,73 Z", name: "قالمة" }, // Guelma
  41: { path: "M 326,57 L 340,57 L 334,75 L 320,73 Z", name: "سوق أهراس" }, // Souk Ahras

  // Middle Steppe & Atlas
  20: { path: "M 102,80 L 122,78 L 118,98 L 98,100 Z", name: "سعيدة" }, // Saïda
  14: { path: "M 122,78 L 158,72 L 152,95 L 118,98 Z", name: "تيارت" }, // Tiaret
  38: { path: "M 158,72 L 176,70 L 172,88 L 152,95 Z", name: "تيسمسيلت" }, // Tissemsilt
  17: { path: "M 172,88 L 210,82 L 202,115 L 162,120 Z", name: "الجلفة" }, // Djelfa
  28: { path: "M 210,82 L 250,78 L 242,108 L 202,115 Z", name: "المسيلة" }, // M'Sila
  5:  { path: "M 250,78 L 285,75 L 278,105 L 242,108 Z", name: "باتنة" }, // Batna
  4:  { path: "M 285,75 L 315,73 L 308,98 L 278,105 Z", name: "أم البواقي" }, // Oum El Bouaghi
  12: { path: "M 315,73 L 345,70 L 338,105 L 308,98 Z", name: "تبسة" }, // Tébessa
  40: { path: "M 278,105 L 308,98 L 302,122 L 272,125 Z", name: "خنشلة" }, // Khenchela

  // Southern Steppe & Oasis
  45: { path: "M 75,95 L 98,100 L 90,135 L 65,130 Z", name: "النعامة" }, // Naâma
  32: { path: "M 98,100 L 140,110 L 128,165 L 85,155 Z", name: "البيض" }, // El Bayadh
  3:  { path: "M 140,110 L 180,120 L 170,165 L 128,165 Z", name: "الأغواط" }, // Laghouat
  51: { path: "M 202,115 L 242,108 L 235,135 L 195,140 Z", name: "أولاد جلال" }, // Ouled Djellal
  7:  { path: "M 242,108 L 280,102 L 270,145 L 235,135 Z", name: "بسكرة" }, // Biskra
  57: { path: "M 270,145 L 300,138 L 292,165 L 262,170 Z", name: "المغير" }, // El M'Ghair
  39: { path: "M 300,138 L 345,130 L 335,175 L 292,165 Z", name: "الوادي" }, // El Oued
  55: { path: "M 262,170 L 292,165 L 284,200 L 254,205 Z", name: "تقرت" }, // Touggourt

  // Saharan Northern Regions
  8:  { path: "M 45,140 L 85,155 L 75,230 L 30,210 Z", name: "بشار" }, // Béchar
  52: { path: "M 30,210 L 75,230 L 60,300 L 15,280 Z", name: "بني عباس" }, // Béni Abbès
  47: { path: "M 150,165 L 205,175 L 190,240 L 135,230 Z", name: "غرداية" }, // Ghardaïa
  58: { path: "M 135,230 L 190,240 L 175,300 L 120,290 Z", name: "المنيعة" }, // El Meniaa
  30: { path: "M 205,175 L 275,190 L 255,275 L 185,260 Z", name: "ورقلة" }, // Ouargla

  // Deep South Desert
  37: { path: "M 5,220 L 40,230 L 25,320 L 0,310 Z", name: "تندوف" }, // Tindouf
  49: { path: "M 75,230 L 135,230 L 115,330 L 55,320 Z", name: "تيميمون" }, // Timimoun
  1:  { path: "M 55,320 L 120,290 L 100,390 L 35,380 Z", name: "أدرار" }, // Adrar
  50: { path: "M 35,380 L 100,390 L 85,460 L 20,450 Z", name: "برج باجي مختار" }, // Bordj Badji Mokhtar
  53: { path: "M 120,290 L 190,300 L 170,400 L 100,390 Z", name: "عين صالح" }, // In Salah
  11: { path: "M 170,400 L 250,400 L 230,475 L 150,475 Z", name: "تمنراست" }, // Tamanrasset
  54: { path: "M 150,475 L 230,475 L 210,500 L 130,500 Z", name: "عين قزام" }, // In Guezzam
  33: { path: "M 255,275 L 375,275 L 350,380 L 230,380 Z", name: "إليزي" }, // Illizi
  56: { path: "M 230,380 L 350,380 L 330,475 L 210,475 Z", name: "جانت" }, // Djanet
}

interface AlgeriaMapProps {
  counts: Record<number, number>
}

export default function AlgeriaMap({ counts }: AlgeriaMapProps) {
  const [hoveredWilaya, setHoveredWilaya] = useState<{ id: number; name: string; count: number; pct: number } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const { maxOrders, totalOrders } = useMemo(() => {
    const values = Object.values(counts)
    const maxOrders = Math.max(1, ...values)
    const totalOrders = values.reduce((sum, val) => sum + val, 0)
    return { maxOrders, totalOrders }
  }, [counts])

  // Continuous Dynamic Emerald Heatmap Color Scale
  const getWilayaColor = (id: number) => {
    const count = counts[id] ?? 0
    if (count === 0) return '#F8FAFC' // 0 orders: soft off-white/light gray

    const ratio = count / maxOrders // 0.0 to 1.0

    // Dynamic emerald gradient: light mint -> vibrant emerald -> deep dark emerald
    if (ratio >= 0.85) return '#047857' // Peak Wilaya (#1 Highest Orders): Deep Dark Emerald Green
    if (ratio >= 0.65) return '#059669' // Strong Emerald Green
    if (ratio >= 0.45) return '#10B981' // Vibrant Medium Emerald
    if (ratio >= 0.25) return '#34D399' // Medium Light Mint Green
    if (ratio >= 0.10) return '#6EE7B7' // Light Mint Green
    return '#A7F3D0'                   // Very Light Mint Green
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none">
      {/* Interactive Algeria Density SVG Map */}
      <svg
        viewBox="0 0 380 510"
        className="w-full h-auto drop-shadow-md overflow-visible cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredWilaya(null)}
      >
        <defs>
          {/* Subtle drop shadow for 3D depth */}
          <filter id="wilayaShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.08" />
          </filter>
        </defs>

        <g filter="url(#wilayaShadow)">
          {Object.entries(WILAYA_SVG_PATHS).map(([wIdStr, data]) => {
            const wId = Number(wIdStr)
            const count = counts[wId] ?? 0
            const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100 * 10) / 10 : 0
            const isHovered = hoveredWilaya?.id === wId
            const color = getWilayaColor(wId)
            const meta = WILAYA_NAMES[wId]
            const displayName = meta ? `${meta.code} - ${meta.ar}` : data.name

            return (
              <path
                key={wId}
                d={data.path}
                fill={color}
                stroke={isHovered ? '#0D6EFD' : '#E2E8F0'}
                strokeWidth={isHovered ? 2.5 : 1.2}
                strokeLinejoin="round"
                className="transition-all duration-200 ease-out"
                style={{
                  transformOrigin: 'center',
                  transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredWilaya({ id: wId, name: displayName, count, pct })}
              />
            )
          })}
        </g>
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredWilaya && (
        <div
          className="absolute z-30 bg-gray-900/95 text-white px-3 py-2 rounded-xl shadow-xl border border-gray-800 text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 animate-fade-in backdrop-blur-xs min-w-[140px]"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
          dir="rtl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-1 mb-1 font-bold text-emerald-400">
            <span>{hoveredWilaya.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-gray-300">عدد الطلبات:</span>
            <span className="font-mono font-bold text-white text-xs">{hoveredWilaya.count} طلب</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] mt-0.5">
            <span className="text-gray-400">النسبة من الإجمالي:</span>
            <span className="font-mono font-bold text-emerald-400">{hoveredWilaya.pct}%</span>
          </div>
        </div>
      )}

      {/* Color Scale Legend */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-semibold">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#F8FAFC] border border-gray-300" />
          <span>بدون طلبات</span>
        </span>
        <div className="flex items-center gap-1">
          <span>أقل</span>
          <div className="flex items-center h-2 rounded-full overflow-hidden w-20 bg-gray-100">
            <span className="h-full w-1/5 bg-[#A7F3D0]" />
            <span className="h-full w-1/5 bg-[#6EE7B7]" />
            <span className="h-full w-1/5 bg-[#34D399]" />
            <span className="h-full w-1/5 bg-[#10B981]" />
            <span className="h-full w-1/5 bg-[#047857]" />
          </div>
          <span className="font-bold text-emerald-800">الأعلى كثافة</span>
        </div>
      </div>
    </div>
  )
}
