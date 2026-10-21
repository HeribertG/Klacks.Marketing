# Source clips of the simple-page story videos

Raw Veo/Gemini clips the story videos are cut from (not served; excluded from the Docker build context).

| File | Used for |
|---|---|
| `gemini_generated_video_b4401dfc.mp4` | Story video 1 "Krank / Ausfall decken" (`build-story-video.mjs --raw`), all cultures except ar/id/ms |
| `gemini_generated_video_0ffa5cd6.mp4` | Headscarf Sandra, opening of story video 1 for ar/id/ms |
| `klacksy-sandra-kopftuch-komplett-{ar,id,ms}.mp4` | Owner-approved complete cuts of story video 1 for ar/id/ms (copied 1:1 to `wwwroot/videos/simple-story-comic-<c>.*`) |
| `gemini_generated_video_d838e9c0.mp4` | Story video 2 "Wochenplanung", variant `standard` (`build-weekplan-video.mjs --raw`) |
| `gemini_generated_video_16a58156.mp4` | Story video 2 "Wochenplanung", variant `headscarf` for ar/id/ms |
| `takes/simple-plans-week-<culture>.mp4` | App take "Wochenplanung" (25 cultures, captions burned in) inset into story video 2 (`build-weekplan-video.mjs --take`) |
| `gemini_generated_video_39a4f0ad.mp4` | Klacksy intro clip, scenes 1 and 3 (`build-intro-video.mjs`) |
| `gemini_generated_video_eefd6d08.mp4` | Klacksy intro clip, scenes 2, 4 and 5 (`build-intro-video.mjs`) |
