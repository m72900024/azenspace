# azenspace v2 — 部落格/作品集大改版

## 目標
將目前的空白部落格升級為完整的多分類作品集網站，支援 6 個主題分類頁、深淺模式切換、全站搜尋、訪客留言、關於頁，以及手機優化。

## 架構

### 前端：GitHub Pages
### 後端：Firebase Firestore
### 無 build 工具，純 HTML/CSS/JS + ESM CDN

---

## 頁面結構

```
azenspace/
├── index.html              # 首頁（6 大分類卡片入口）
├── category.html           # 分類列表頁（?cat=3d-print）
├── post.html               # 文章詳情頁（?slug=xxx）
├── about.html              # 關於頁
├── search.html             # 搜尋結果頁
├── admin.html              # 後台管理
├── admin-login.html        # 管理員登入
├── css/
│   └── main.css            # 全站樣式（含 dark/light CSS 變數）
│   └── admin.css           # 後台樣式
├── js/
│   ├── firebase-config.js  # Firebase 設定
│   ├── db.js               # Firestore CRUD（擴充 category 查詢）
│   ├── auth.js             # Google Auth
│   ├── theme.js            # Dark/Light 切換 + localStorage
│   ├── home.js             # 首頁邏輯
│   ├── category.js         # 分類頁邏輯
│   ├── post.js             # 詳情頁邏輯（含留言）
│   ├── search.js           # 搜尋邏輯
│   ├── about.js            # 關於頁邏輯
│   ├── admin.js            # 後台邏輯（擴充分類管理）
│   └── comments.js         # 留言系統
```

---

## 1. 首頁改版

### 現狀
卡片列表直接顯示所有文章。

### 改為
6 個主題大卡片入口，每個卡片帶 icon、標題、文章數量。點擊進入該分類頁。

### 6 個分類

| 名稱 | slug | 說明 |
|------|------|------|
| 3D 列印 | 3d-print | 3D 列印作品與教學 |
| 正向行為支持 | pbs | PBS 相關內容 |
| AI 繪圖 | ai-art | AI 生成藝術作品 |
| 教學筆記 | teaching | 課堂教材與筆記 |
| AI 運用 | ai-tools | AI 工具應用分享 |
| 空拍機 | drone | 空拍攝影與操作 |

### Hero 區塊
保留個人介紹 + 社群連結，下方接 6 大分類 Grid。

---

## 2. 分類頁 category.html

- URL: `category.html?cat=3d-print`
- 顯示該分類下的所有文章卡片
- 分頁載入（每次 9 筆）
- 卡片樣式同現有設計

---

## 3. Firestore 資料結構變更

### posts collection 新增欄位
```
/posts/{id}
  + category: string    # "3d-print" | "pbs" | "ai-art" | "teaching" | "ai-tools" | "drone"
  （保留現有 type: "blog" | "work"）
```

### 新增 comments collection
```
/comments/{id}
  postId: string        # 對應 post ID
  postSlug: string      # 對應 post slug
  nickname: string      # 暱稱
  content: string       # 留言內容
  createdAt: Timestamp
```

### 新增 categories collection（選填，用於動態管理）
```
/categories/{slug}
  name: string          # 顯示名稱
  icon: string          # emoji 或 icon class
  order: number         # 排序
```

### Firestore Rules 更新
```
match /comments/{commentId} {
  allow read: if true;
  allow create: if request.resource.data.nickname is string
    && request.resource.data.content is string;
  allow delete: if request.auth != null
    && request.auth.token.email == "m72900024@gmail.com";
}
match /categories/{catId} {
  allow read: if true;
  allow write: if request.auth != null
    && request.auth.token.email == "m72900024@gmail.com";
}
```

---

## 4. Dark/Light Mode

- CSS 變數分兩組：`:root`（dark）和 `[data-theme="light"]`
- Nav 右上角 toggle 按鈕（太陽/月亮 icon）
- `localStorage.setItem('theme', 'light'|'dark')` 記住偏好
- 預設跟隨系統 `prefers-color-scheme`
- `js/theme.js` 獨立模組，所有頁面引入

---

## 5. 搜尋

- Nav 搜尋按鈕 → 展開搜尋欄或跳轉 search.html
- Firestore 不支援全文搜尋，方案：
  - 載入所有 published posts 的 title + summary + tags（資料量小，可接受）
  - 前端 JS 即時過濾
- search.html 顯示結果卡片

---

## 6. 留言系統

- 文章詳情頁底部
- 訪客填寫暱稱 + 留言內容
- 不需登入
- 管理員可在後台或文章頁刪除留言
- 防濫用：簡易 rate limit（同 IP 每分鐘最多 3 則，前端控制）

---

## 7. 關於頁

- 自我介紹
- 經歷/技能
- 聯絡方式 + 社群連結
- 內容從 Firestore `site-config/main` 讀取，或直接寫在 HTML（靜態即可）

---

## 8. 手機優化

- Nav：漢堡選單（小螢幕隱藏連結）
- 卡片 Grid：手機單欄
- 字體大小響應式
- 觸控友善（按鈕至少 44px）
- post 內容區域 padding 調整

---

## 9. 後台擴充

admin.html 新增：
- 文章表單加 `category` 下拉選單
- 留言管理區塊（列表 + 刪除）
- 站點設定編輯（about 內容）

---

## 10. UI 設計方向

使用 `frontend-design` skill 設計：
- 首頁 6 分類卡片的視覺效果
- Dark/Light 兩套配色
- 動效（頁面載入、卡片 hover、模式切換）
- 獨特字體選擇（非 generic AI 風格）
- 背景紋理/氛圍效果
