# 霧面玩具美術包

此目錄可以整包替換；「原版方塊／霧面玩具」切換保存在獨立外觀偏好，不改競選狀態。圖片載入失敗會回退原版。

| 檔案 | 語義 / 配置 |
|---|---|
| district.png | 完整街區主地圖，1536 × 1024 |
| candidates.png | 三個身分 × 正面、側面、背面；裁切看 day-art.js 的 TOY_FRAMES |
| support.png | 3 × 3 角色表：老年男女、中年男女、青年男女、小馬、助手、主持人；SUPPORT_FRAMES / SUPPORT_ROLES |
| walk.png | 3 身分 × 6 走路影格，1024 × 1536；WALK_FRAMES |
| scenes.png | 2 × 2 場景，1536 × 1024；左上電視、右上直播、左下募款、右下開票 |
| market-square.png / street.png / river.png | 地點近景 |
| *.prompt.txt / provenance.json | 生成提示、來源及版本紀錄 |

執行時的單一登錄處是 dist/day-art.js。尺寸、裁切、腳底基點變動時，同步修改對應 FRAMES；地圖換構圖時，修改 TOY_SPOTS 和 TOY_PATHS。這些只控制美術座標，遊戲原本的位置與存檔維持不變。每張人像裁切後都把腳底對到 SVG y=130，影子另外繪製。

替換後跑 `node tests/art-pack-contract.cjs`，更新 `tests/provenance.json` 的 SHA-256，再跑 export-integrity 與各版本回歸。請勿把已生成圖片的雜湊沿用到不同檔案。

廟口、社區廣場與辯論的近景目前保留可編輯 SVG 場景，人物已統一成霧面角色。事件結果與開票數字由介面排字，沒有烘進圖片。茶山、纜車、寺廟、街屋目前在 district.png 內，尚未拆成可自由拼裝的獨立建築；要製作其他選區可先替換整張地圖與錨點，不能宣稱目前已能自動拼裝每區。
