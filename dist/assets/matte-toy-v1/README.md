# 霧面玩具美術包

此目錄可以整包替換；「原版方塊／霧面玩具」切換保存在獨立外觀偏好，不改競選狀態。

## 遊戲實際載入的檔案：`game/`

遊戲只載入 `game/*.webp`。每張都是下表來源 PNG 的 WebP 版本，像素尺寸與來源相同，所以 `day-art.js` 的裁切座標對來源和 WebP 都成立。來源 PNG 留在原位不動。

- 不透明場景用 WebP 品質 84，透明角色、道具與地圖組件用品質 88–90（alpha 品質 100）。單檔都在 1.5 MB 以下，`tests/art-pack-contract.cjs` 會檢查大小與像素尺寸。
- 唯一的像素修改：`support.png` 第 3 列第 2 格的助手，帽子和背心從黃／藍改成同一個橘色，讓幕僚有共同制服，不會和全新素人的芥末黃背心混淆，也不穿政黨藍。
- 換來源圖之後，用相同設定重新輸出到 `game/`，再跑 `node tests/art-pack-contract.cjs`、更新 `tests/provenance.json` 的 SHA-256，然後跑 export-integrity 與各版本回歸。

| 來源 | 用途 |
|---|---|
| `incoming/map-kit/*` | 主地圖：地面、雨天地面、後山、河、橋、道路、十字路口、樹和 13 棟建築，由 `day-art.js` 的 `KIT` 拼成 |
| `district.png` | 舊的整張主地圖；任一組件圖載入失敗時退回它，網址加 `?map=district` 也能看 |
| `candidates.png` | 三個身分 × 正面、側面、背面；`TOY_FRAMES` |
| `walk.png` | 3 身分 × 6 走路影格，1024 × 1536；`WALK_FRAMES` |
| `support.png`、`incoming/support-v2.png`、`incoming/support-v3.png` | 群眾、小馬、助手、主持人；`SHEETS` 與 `LOOKS` |
| `incoming/pets-v1.png` | 街訪場景裡的貓狗 |
| `incoming/*-soft-v2.png`、`street-residential-v2.png`、`debate.png`、`office.png` | 地點近景（簡化版） |
| `incoming/*-rain.png` | 下雨回合的戶外近景；載入失敗時退回晴天版 |
| `incoming/tv.png`、`online.png`、`fundraise.png`、`count-soft-v2.png` | 電視台、直播、募款、開票夜 |
| `incoming/rally-stage.png`、`billboard.png` | 造勢舞台和看板；布條、看板面由程式寫名字並塗政黨色 |

未使用：`incoming/temple.png`、`incoming/plaza.png`、`incoming/count.png`（由對應的簡化版取代）、`market-square.png`、`street.png`、`river.png`、`scenes.png`（舊版近景，留作來源紀錄）。

## 年齡一眼可辨

群眾分三組，每組只從自己的造型挑（`GROUP_LOOKS`）：長輩都是灰白髮、略矮；中年是黑髮、成人服裝，不戴眼鏡、不禿頭；青年體型瘦、穿帽 T、背包或牽腳踏車。每位具名居民固定一個造型（`SPEAKER_LOOKS`），性別和年齡與名字相符。

## 圖片載入失敗

地圖組件失敗會退回 `district.png`；雨天近景失敗會退回晴天版；其他圖片失敗會整包退回原版方塊外觀。三種情況都保留遊戲進度。

`*.prompt.txt` 和 `provenance.json` 記錄生成提示與來源。事件結果、開票數字、台名與名字都由介面排字，沒有烘進圖片。
