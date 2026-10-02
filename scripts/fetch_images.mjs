/**
 * Image search via z-ai-web-dev-sdk with concurrency + manual file save
 */
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, existsSync } from "fs";

const QUERIES = {
  iphone: "iPhone 15 Pro Max natural titanium product photography on clean background",
  airpods: "Apple AirPods Pro 2 white earbuds case product photo",
  macbook: "MacBook Air space gray laptop product photo minimal",
  tv: "Samsung 55 inch 4K smart TV on stand product photo",
  tshirt: "plain white cotton t-shirt folded product photography",
  handbag: "brown leather women handbag luxury product photo",
  sneakers: "white running sneakers shoes product photography studio",
  abaya: "elegant black abaya kaftan modest fashion photography",
  cookware: "granite non-stick cooking pots set kitchen product photo",
  espresso: "espresso coffee machine stainless steel product photo",
  lamp: "modern wooden table lamp warm light home decor photo",
  blender: "kitchen blender glass jar product photography",
  oud: "luxury arabic oud perfume bottle gold dark product photo",
  serum: "vitamin c facial serum dropper bottle skincare product photo",
  skincare: "skincare cream jar set white cosmetics product photo",
  smartwatch: "Apple Watch smartwatch product photo studio",
  watch: "classic men wristwatch brown leather strap product photography",
  sunglasses: "aviator sunglasses product photography studio",
  hero1: "luxury shopping bags gift boxes flatlay beige elegant",
  hero2: "premium cosmetics and perfume bottles flatlay warm tones",
};

const OUT_DIR = "/home/z/my-project/img_results";

async function searchOne(zai, key, query, attempt = 1) {
  const outPath = `${OUT_DIR}/${key}.json`;
  if (existsSync(outPath)) {
    console.log(`skip: ${key} (exists)`);
    return;
  }
  try {
    const result = await zai.images.search.create({ query, count: 2, gl: "us", rank: false });
    writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`done: ${key}`);
  } catch (e) {
    console.error(`fail: ${key} (attempt ${attempt}) — ${e.message}`);
    if (attempt < 4) {
      const waitMs = attempt * 25000 + Math.random() * 5000;
      console.log(`retry ${key} in ${Math.round(waitMs / 1000)}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      await searchOne(zai, key, query, attempt + 1);
    }
  }
}

async function main() {
  const zai = await ZAI.create();
  const entries = Object.entries(QUERIES);
  const CONCURRENCY = 3;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(([k, q]) => searchOne(zai, k, q)));
    console.log(`batch ${Math.floor(i / CONCURRENCY) + 1} finished`);
    if (i + CONCURRENCY < entries.length) {
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  console.log("ALL DONE");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
