#!/bin/bash
# Batch image search via stdout capture
declare -A QUERIES=(
  ["iphone"]="iPhone 15 Pro Max natural titanium product photography on clean background"
  ["airpods"]="Apple AirPods Pro 2 white earbuds case product photo"
  ["macbook"]="MacBook Air space gray laptop product photo minimal"
  ["tv"]="Samsung 55 inch 4K smart TV on stand product photo"
  ["tshirt"]="plain white cotton t-shirt folded product photography"
  ["handbag"]="brown leather women handbag luxury product photo"
  ["sneakers"]="white running sneakers shoes product photography studio"
  ["abaya"]="elegant black abaya kaftan modest fashion photography"
  ["cookware"]="granite non-stick cooking pots set kitchen product photo"
  ["espresso"]="espresso coffee machine stainless steel product photo"
  ["lamp"]="modern wooden table lamp warm light home decor photo"
  ["blender"]="kitchen blender glass jar product photography"
  ["oud"]="luxury arabic oud perfume bottle gold dark product photo"
  ["serum"]="vitamin c facial serum dropper bottle skincare product photo"
  ["skincare"]="skincare cream jar set white cosmetics product photo"
  ["smartwatch"]="Apple Watch smartwatch product photo studio"
  ["watch"]="classic men wristwatch brown leather strap product photography"
  ["sunglasses"]="aviator sunglasses product photography studio"
  ["hero1"]="luxury shopping bags gift boxes flatlay beige elegant"
  ["hero2"]="premium cosmetics and perfume bottles flatlay warm tones"
)

mkdir -p /home/z/my-project/img_results
for key in "$@"; do
  q="${QUERIES[$key]}"
  out="/home/z/my-project/img_results/${key}.json"
  if [[ -f "$out" ]]; then echo "skip $key"; continue; fi
  (
    timeout 150 z-ai image-search -q "$q" --count 2 --gl us --no-rank > "/tmp/img_${key}.raw" 2>/dev/null
    python3 -c "
import json,sys
raw = open('/tmp/img_${key}.raw').read()
i = raw.index('{')
json.loads(raw[i:])
open('${out}','w').write(raw[i:])
" 2>/dev/null && echo "  saved: $key" || echo "  MISS: $key"
  ) &
done
wait
echo "BATCH DONE: $*"
