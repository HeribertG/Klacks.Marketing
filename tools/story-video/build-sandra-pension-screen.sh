#!/usr/bin/env bash
set -euo pipefail
cd /c/klacks-rec/sandra-screen
M=/c/SourceCode/Klacks.MediaArchive
T=/c/klacks-rec/sandra-takes/out
OR=$T/simple-order-review-de.mp4
PW=$T/simple-plans-week-de.mp4
A=$M/LinkedIn/Spitex/klacks-video4-spitex-a-de-sie-vorschau-v10.mp4
B=$M/LinkedIn/Spitex/klacks-video4-spitex-b-de-sie-vorschau-v12.mp4
# name|file|from|to|coverWidth|fontsize|inset(0|1)|caption
SEGS=(
"s1a|$OR|2|10|744|28|0|Ein Satz an Klacksy: die Bestellungen durchgehen."
"s1b|$OR|12|18|744|28|0|Klacksy öffnet die Bestellungen. Sandra sagt Ja."
"s2|$OR|46|52|744|28|0|Aus den Bestellungen werden Dienste."
"s2b|$OR|66|74|744|28|0|Die Dienste stehen im Einsatzplan."
"s3|$PW|4|10|566|24|1|Ein Satz startet die Wochenplanung."
"s4|$PW|24|34|566|24|1|Der Plan folgt den Regeln. Sandra prüft."
"s5|$A|50|60|744|28|0|Ein Satz baut zwei Wochentouren."
"s6|$B|40|48|744|28|0|Mittagspause rein, Routen neu berechnet."
"s7|$B|61|69|744|28|0|Die Container stehen im Einsatzplan."
)
FONT='C\:/Windows/Fonts/segoeuib.ttf'
list=concat2.txt; : > $list
for s in "${SEGS[@]}"; do
  IFS='|' read -r n f from to cw fs inset cap <<< "$s"
  printf '%s' "$cap" > "cap-$n.txt"
  d=$(awk -v a=$from -v b=$to 'BEGIN{print b-a}')
  box="drawbox=x=0:y=632:w=$cw:h=68:color=0x1c2a2e@1:t=fill,drawbox=x=0:y=632:w=8:h=68:color=0x0f766e@1:t=fill,drawtext=fontfile='$FONT':textfile=cap-$n.txt:fontcolor=white:fontsize=$fs:x=26:y=632+(68-text_h)/2"
  if [ "$inset" = 1 ]; then
    vf="[0:v]split[a][b];[a]scale=1280:720,boxblur=24:3,fps=30[bg];[b]fps=30,$box[fg];[bg][fg]overlay=140:0,format=yuv420p"
  else
    vf="[0:v]scale=1280:720,fps=30,format=yuv420p,$box"
  fi
  ffmpeg -y -loglevel error -ss $from -t $d -i "$f" -an -filter_complex "$vf" -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p seg2-$n.mp4
  echo "file 'seg2-$n.mp4'" >> $list
done
ffmpeg -y -loglevel error -f concat -safe 0 -i $list -c copy screen-part2.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 screen-part2.mp4
