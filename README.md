# 點餐平台 (Order Platform)

一個獨立的多店家點餐網站,使用 Next.js + Supabase 建構,支援即時訂單同步。

## 功能特色

- 🏪 **多店家管理** — 管理員可建立多個不同店家及其菜單
- 📱 **同學點餐** — 任何人透過分享連結即可下單,免註冊
- ⚡ **即時同步** — 訂單透過 Supabase Realtime 即時推送到後台
- 💰 **訂單管理** — 標記已收款 / 已取餐、計算總金額
- 📊 **匯出功能** — 訂單明細 CSV、訂單彙總 CSV
- 🔐 **管理員認證** — 只有你能建立和編輯店家

## 技術架構

- **前端**: Next.js 14 (App Router) + React + Tailwind CSS
- **後端**: Next.js API Routes + Supabase
- **資料庫**: Supabase Postgres (含 Realtime)
- **認證**: Supabase Auth (Email + Password)
- **部署**: Vercel (推薦,免費)

---

## 第一次設定 (約 10 分鐘)

### 步驟 1: 建立 Supabase 專案

1. 前往 https://supabase.com 註冊免費帳號
2. 點擊 "New Project",填入專案名稱、資料庫密碼、選擇地區 (建議選 Singapore 或 Tokyo)
3. 等待約 2 分鐘讓專案建立完成

### 步驟 2: 建立資料表

進入 Supabase 專案 → 左側選單 "SQL Editor" → "New query" → 貼上 `supabase/schema.sql` 的內容 → 點 Run

### 步驟 3: 開啟 Realtime

進入 Supabase 專案 → 左側選單 "Database" → "Replication" → 找到 `orders` 資料表 → 開啟 Realtime

### 步驟 4: 建立管理員帳號

進入 Supabase 專案 → 左側選單 "Authentication" → "Users" → "Add user" → "Create new user"
- 輸入你的 Email 和密碼
- 勾選 "Auto Confirm User"
- 點 "Create user"

接著到 SQL Editor 執行 (把 `your-email@example.com` 換成你剛剛建立的 email):

```sql
INSERT INTO admins (user_id)
SELECT id FROM auth.users WHERE email = 'your-email@example.com';
```

### 步驟 5: 取得 API 金鑰

進入 Supabase 專案 → 左側選單 "Settings" → "API"
複製這兩個值:
- **Project URL** (例如 `https://xxxxx.supabase.co`)
- **anon public key** (一長串文字)

### 步驟 6: 設定環境變數

在專案根目錄複製 `.env.local.example` 為 `.env.local`,填入剛剛複製的值:

```
NEXT_PUBLIC_SUPABASE_URL=你的 Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
```

### 步驟 7: 本地測試

```bash
npm install
npm run dev
```

開啟 http://localhost:3000 → 點右上角 "管理員登入" → 用步驟 4 的帳號登入 → 開始建立店家!

---

## 部署到 Vercel (免費,約 5 分鐘)

1. 把整個專案推到 GitHub (建立新 repo,git push)
2. 前往 https://vercel.com 用 GitHub 帳號登入
3. 點 "Add New Project" → 選你的 repo
4. 在 "Environment Variables" 加入:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 點 Deploy → 等 1-2 分鐘 → 你會得到一個網址 (例 `https://your-app.vercel.app`)

完成!把這個網址分享給同學就能點餐了。

---

## 使用流程

### 管理員 (你)
1. 用管理員帳號登入 → 進入管理後台
2. 點 "新增店家" → 輸入店家名稱
3. 進入店家 → 新增菜單項目 (名稱、價格)
4. 複製 "同學點餐連結" → 分享給同學
5. 在後台即時看到訂單,可標記已收款 / 已取餐

### 同學
1. 打開你分享的連結 (不需登入)
2. 輸入名字 → 選餐點 → 送出
3. 可看到自己送出過的訂單和狀態

---

## 檔案結構

```
order-platform/
├── app/
│   ├── page.tsx              # 首頁 (轉到登入或後台)
│   ├── login/page.tsx        # 管理員登入
│   ├── admin/page.tsx        # 管理員後台 (店家列表)
│   ├── admin/[storeId]/      # 個別店家管理 (菜單+訂單)
│   ├── store/[storeId]/      # 同學點餐頁 (公開)
│   └── api/                  # API 路由
├── lib/
│   ├── supabase-client.ts    # 瀏覽器端 Supabase
│   └── supabase-server.ts    # 伺服器端 Supabase
├── supabase/
│   └── schema.sql            # 資料庫 schema
└── .env.local                # 你的環境變數 (不要 commit)
```
