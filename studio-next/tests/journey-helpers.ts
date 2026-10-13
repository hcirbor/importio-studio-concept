import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Page } from '@playwright/test';

const journeyDirectory = path.join(process.cwd(), 'test-results', 'journeys');

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character);
}

async function composeContactSheet(
  name: string,
  captures: Array<{ label: string; path: string }>,
) {
  const width = 360;
  const labelHeight = 40;
  const rendered = await Promise.all(captures.map(async (capture) => {
    const image = sharp(capture.path).resize({ width });
    const metadata = await image.metadata();
    const height = metadata.height ?? 240;
    const label = Buffer.from(
      `<svg width="${width}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#17131f" />
        <text x="14" y="25" fill="#ffffff" font-family="Arial, sans-serif" font-size="14">${escapeXml(capture.label)}</text>
      </svg>`,
    );
    return {
      buffer: await image.png().toBuffer(),
      height,
      label,
    };
  }));
  const height = Math.max(...rendered.map((item) => item.height + labelHeight));
  const canvas = sharp({
    create: {
      width: width * rendered.length,
      height,
      channels: 4,
      background: '#f5f6fb',
    },
  });
  await canvas.composite(rendered.flatMap((item, index) => [
    {
      input: item.label,
      left: index * width,
      top: 0,
    },
    {
      input: item.buffer,
      left: index * width,
      top: labelHeight,
    },
  ])).png().toFile(path.join(journeyDirectory, `${safeName(name)}.png`));
}

export async function runJourney(
  page: Page,
  name: string,
  journey: (capture: (label: string) => Promise<void>) => Promise<void>,
) {
  const captures: Array<{ label: string; path: string }> = [];
  await mkdir(journeyDirectory, { recursive: true });
  const capture = async (label: string) => {
    const capturePath = path.join(
      journeyDirectory,
      `${safeName(name)}-${String(captures.length + 1).padStart(2, '0')}-${safeName(label)}.png`,
    );
    await page.screenshot({ path: capturePath, fullPage: true });
    captures.push({ label, path: capturePath });
  };
  await journey(capture);
  await composeContactSheet(name, captures);
}
