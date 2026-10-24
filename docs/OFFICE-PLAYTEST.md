# 辦公室試玩入口

入口：`office.html`。對應 R02（回合流程）、R03（場景）、R05（人物）、R11（團隊）與既有手機介面需求。原本 `index.html` 仍是正式入口。

這個入口共用原本的 `day-engine.js`、`day-art.js` 與素材；不複製或修改規則、票數、TUNING、既有正式介面、legacy 版本。試玩存檔使用獨立的 `campaign-office-playtest-v2`。

## 體驗

- 新的一局先選人物與政黨；取消會保留原來的進度，確認才開始新種子。
- 小葉以三段短對話說明目標、助手可同時研究與第一步。可略過。主行程頁與小葉簡報都有「派助手研究」入口並顯示可派人數；簡報依上回合結果、剩餘回合、未研究熱門議題與名次挑一句。
- 行程分為跑地方、宣傳、準備、團隊、情報。助手、招募與地方小隊集中在團隊入口，但仍保有原本的人力與地方組織規則。
- 行程頁的主要按鈕直接執行；原版街區地圖顯示移動路徑，可略過。現場沿用各地原有背景與居民。
- 回答或完成行動後，自動進入下一回合；上一回合的結果與總票變化留在辦公室。開票只執行一次。
- 當回合來客自動進場，一次一段對話；正在操作面板時不打斷。收起後仍可回看未處理的邀約。
- 回合與競選經費合在左上角狀態區；右上角齒輪開設定（音效、新的一局）。名字在辦公室招牌。
- 兩扇窗的雨滴與光線跟隨原引擎當回合天氣。音效共用 `day-sound.js`（Web Audio 合成、無音檔）：按鈕、出發、腳步、居民提問、結算正負、小馬攻擊、危機、開票揭曉與下雨背景，單一「音效」開關存在 `wenshan-sound`。首次點擊後才會出聲；切到背景即靜音。
- 民調依原引擎更新；頭兩回合的選前估計額外加寬，之後回到原估計區間。舊民調仍會隨時間變得不確定，不承諾每回合單調變準。

## 驗證範圍

`npm run test:office` 執行真實控制器、共用引擎與最小 DOM：重選/取消、分類可達、連續研究與容量限制、直接出發、重入與重載、原街口素材、來客、雨聲單一來源、靜音與儲存失敗。另以三種身分、三個固定種子跑完九回合，逐局比對裸引擎結局與行動紀錄。

`npm run test:pages` 驗證 Pages 套件同時包含正式入口與試玩依賴，維持歷史版本與來源美術排除。

瀏覽器驗證與本次命令結果記錄於 PR。手機尺寸模擬不等於實機 iPhone Safari 或真實音量/音色驗收。平衡門檻沿用 main 的既有失敗，不為本介面放寬。

## 美術來源

`assets/office/office-windows.png` 使用內建 imagegen，以原辦公室素材編輯新增右側窗戶。角色、地圖與現場沿用原版圖集。背景以 1536×1024 鎖定桌椅、白板、地板與遮擋位置。

生成提示：Edit the empty campaign office game background. Keep the exact camera/composition, matte clay toy materials, warm wood palette, desk and chair positions, whiteboard, existing left window, door and floor geometry. Replace only the top of the right bookshelf with a matching wooden two-pane window showing softly blurred green trees and pale sky. Keep lower shelving and foreground desk aligned for existing sprites and occlusion masks. No people, text, UI or rain.
