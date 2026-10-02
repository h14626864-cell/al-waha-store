#!/bin/bash
# Search real product photos for the store seed data
# Results saved to /home/z/my-project/img_results/<key>.json
mkdir -p /home/z/my-project/img_results

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

run_search() {
  local key="$1"; local q="$2"
  z-ai image-search -q "$q" --count 2 --gl us --no-rank -o "/home/z/my-project/img_results/${key}.json" >/dev/null 2>&1
  echo "done: $key"
}

# Run with concurrency of 7
pids=0
for key in "${!QUERIES[@]}"; do
  run_search "$key" "${QUERIES[$key]}" &
  pids=$((pids+1))
  if (( pids % 7 == 0 )); then wait; fi
done
wait
echo "ALL SEARCHES COMPLETE"
