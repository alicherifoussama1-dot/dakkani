// Test script for infographic generation
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const sharp = require('sharp');

async function fetchAndResize(url, w, h) {
  try {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return await sharp(buf)
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  } catch (err) {
    console.error(`Fetch/Resize error for ${url}:`, err);
    // Return a solid colored placeholder
    return await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 1 } },
    }).png().toBuffer();
  }
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  };
}

function svgText(str) {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 120);
}

function wrapSvgText(text, x, y, maxChars, dy, style) {
  if (!text) return '';
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? current + ' ' + w : w;
    }
  }
  if (current) lines.push(current);
  return lines
    .slice(0, 4)
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : dy}" style="${style}">${svgText(line)}</tspan>`)
    .join('');
}

async function test() {
  const images = [
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500',
  ];
  
  const panels = [
    { headline: 'كرهتي تطلبي من الانترنت وما يوصلك ما توقعتيه؟', subtext: 'هذا هو الحل الأنسب' },
    { headline: 'حذاء رياضي أنيق ومريح', subtext: 'جودة استثنائية وتصميم عصري' },
    { headline: 'مميزات لا مثيل لها', subtext: 'ضمان سنة كاملة وتوصيل سريع' },
    { headline: 'متوفر بجميع المقاسات', subtext: 'من 38 إلى 45' },
    { headline: 'التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام', subtext: 'اطلب الآن ولا تتردد' }
  ];

  const brandColor = '#7C3AED';
  const accentColor = '#F59E0B';
  const price = 4500;
  const storeName = 'متجري التجريبي';
  const CANVAS_W = 600;

  const { r: br, g: bg, b: bb } = hexToRgb(brandColor);
  const { r: ar, g: ag, b: ab } = hexToRgb(accentColor);

  const composites = [];
  let totalH = 0;

  const panelDefs = panels.map((panel, i) => ({
    panel,
    imageUrl: images[i] ?? images[0] ?? null,
    h: (i === 0 || i === 4) ? 320 : 260,
    isFullWidth: i === 0 || i === 4,
    isTextRight: i % 2 === 1,
  }));

  console.log('Building base canvas...');
  const base = sharp({
    create: {
      width: CANVAS_W,
      height: panelDefs.reduce((s, p) => s + p.h, 0) + 56 + (storeName ? 44 : 0),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  // Build each panel
  for (const { panel, imageUrl, h, isFullWidth, isTextRight } of panelDefs) {
    console.log(`Processing panel...`);
    if (isFullWidth) {
      const imgBuf = imageUrl ? await fetchAndResize(imageUrl, CANVAS_W, h) : null;

      const overlaySvg = `<svg width="${CANVAS_W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stop-color="#000" stop-opacity="0"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
          </linearGradient>
        </defs>
        <rect width="${CANVAS_W}" height="${h}" fill="url(#g)"/>
        <text x="${CANVAS_W - 24}" y="${h - 72}" text-anchor="end"
          style="fill:#fff;font-size:26px;font-weight:900;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.headline, CANVAS_W - 24, h - 72, 22, 34, 'fill:#fff;font-size:26px;font-weight:900;font-family:Arial,sans-serif;')}
        </text>
        ${panel.subtext ? `<text x="${CANVAS_W - 24}" y="${h - 24}" text-anchor="end"
          style="fill:rgba(255,255,255,0.88);font-size:16px;font-family:Arial,sans-serif;direction:rtl;">
          ${svgText(panel.subtext.slice(0, 80))}
        </text>` : ''}
      </svg>`;

      if (imgBuf) {
        composites.push({ input: imgBuf, top: totalH, left: 0 });
      } else {
        const solidBg = await sharp({
          create: { width: CANVAS_W, height: h, channels: 4, background: { r: br, g: bg, b: bb, alpha: 1 } },
        }).png().toBuffer();
        composites.push({ input: solidBg, top: totalH, left: 0 });
      }
      composites.push({ input: Buffer.from(overlaySvg), top: totalH, left: 0 });
    } else {
      const imgW = 300;
      const imgBuf = imageUrl ? await fetchAndResize(imageUrl, imgW, h) : null;

      const textSvg = `<svg width="${imgW}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${imgW}" height="${h}" fill="rgb(${br},${bg},${bb})"/>
        <text x="${imgW - 16}" y="60" text-anchor="end"
          style="fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.headline, imgW - 16, 60, 18, 28, 'fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;')}
        </text>
        ${panel.subtext ? `<text x="${imgW - 16}" y="150" text-anchor="end"
          style="fill:rgba(255,255,255,0.88);font-size:13px;font-family:Arial,sans-serif;direction:rtl;">
          ${wrapSvgText(panel.subtext.slice(0, 100), imgW - 16, 150, 18, 18, 'fill:rgba(255,255,255,0.88);font-size:13px;font-family:Arial,sans-serif;')}
        </text>` : ''}
        ${panel.badge ? `<rect x="8" y="${h - 40}" width="140" height="28" rx="14" fill="rgb(${ar},${ag},${ab})"/>
        <text x="78" y="${h - 21}" text-anchor="middle"
          style="fill:#fff;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${svgText(panel.badge)}</text>` : ''}
      </svg>`;

      const textBuf = Buffer.from(textSvg);
      const [imgLeft, textLeft] = isTextRight ? [imgW, 0] : [0, imgW];

      if (imgBuf) composites.push({ input: imgBuf, top: totalH, left: imgLeft });
      composites.push({ input: textBuf, top: totalH, left: textLeft });
    }

    totalH += h;
  }

  // CTA bar
  const ctaSvg = `<svg width="${CANVAS_W}" height="56" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CANVAS_W}" height="56" fill="rgb(${ar},${ag},${ab})"/>
    <text x="${CANVAS_W / 2}" y="36" text-anchor="middle"
      style="fill:#fff;font-size:20px;font-weight:900;font-family:Arial,sans-serif;">
      اطلب الان - ${price.toLocaleString('fr-DZ')} دج - الدفع عند الاستلام
    </text>
  </svg>`;
  composites.push({ input: Buffer.from(ctaSvg), top: totalH, left: 0 });
  totalH += 56;

  if (storeName) {
    const footerSvg = `<svg width="${CANVAS_W}" height="44" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CANVAS_W}" height="44" fill="rgb(${br},${bg},${bb})"/>
      <text x="${CANVAS_W / 2}" y="28" text-anchor="middle"
        style="fill:#fff;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${svgText(storeName)}</text>
    </svg>`;
    composites.push({ input: Buffer.from(footerSvg), top: totalH, left: 0 });
  }

  console.log('Compositing image...');
  try {
    const result = await base.composite(composites).png({ compressionLevel: 8 }).toBuffer();
    fs.writeFileSync('test-output.png', result);
    console.log('Success! Output written to test-output.png');
  } catch (err) {
    console.error('Composite failed:', err);
  }
}

test();
