/*  /api/cron.js  */
import puppeteer from 'puppeteer-core';
import chrome from 'chrome-aws-lambda';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { CHANNEL_URL, FILTERS, NTFY_TOPIC } = process.env;
  if (!CHANNEL_URL || !FILTERS || !NTFY_TOPIC) {
    return res.status(500).json({ error: 'ENV yok' });
  }

  const regex = new RegExp(FILTERS, 'i');

  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  });
  const page = await browser.newPage();
  await page.goto(CHANNEL_URL, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(4000);

  const msgs = await page.$$eval('[data-testid="msg-container"]', (nodes) =>
    nodes.slice(-25).map((n) => n.innerText.trim())
  );
  await browser.close();

  const matched = msgs.filter((m) => regex.test(m));
  if (matched.length) {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body: matched.join('\n---\n').slice(0, 400),
      headers: {
        Title: 'WhatsApp Kanal Uyarısı',
        Priority: 'high',
        Tags: 'warning',
      },
    });
  }
  res.status(200).json({ ok: true, hits: matched.length });
}
