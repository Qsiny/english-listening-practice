# 英语听力拼写练习（English Listening Practice）

一个基于 **Vue** + **Node.js/Express** 的英语听力练习项目：  
支持音频上传 → 使用百炼（DashScope）ASR 转写 → 句子切分 → 逐词拼写练习（可按句子区间播放音频、快捷键操作、悬停显示文本）。

## 功能特性

- 音频上传（服务端接收）
- 上传至 AList/NAS，生成公网可访问下载 URL
- 调用 DashScope 异步 ASR（`qwen3-asr-flash-filetrans`）获取转写
- 句子/单词切分（保留 `'`、`,` 等标点作为拼写的一部分）
- 拼写练习界面
  - 默认隐藏文本，鼠标悬停才显示句子与当前词
  - 正确后自动跳到下一词/下一句
  - **仅在自动切句时**自动播放下一句音频区间
- 快捷键
  - `↑` 上一句
  - `↓` 下一句
  - `Space` 校验并跳到下一词（输入框内）
  - `Control + R`（mac）重播本句（输入中也可触发）
  - `Enter` 播放/暂停本句（输入中也可触发）

## 项目结构

- `client/`：前端（Vue）
- `server/`：后端（Express）
  - `routes/transcribe.js`：音频上传与转写接口
  - `services/alistService.js`：AList/NAS 上传工具
  - `services/speechRecognitionService.js`：DashScope ASR 调用与结果解析
  - `services/sentenceSplitterService.js`：句子切分与 words 生成

## 环境要求

- Node.js（建议 18+）
- npm
- AList 服务，且音频下载地址需要能被 DashScope 公网访问
- DashScope API Key（百炼）

## 安装与运行

### 一条命令同时启动前后端（推荐）

```bash
# 首次需要分别安装依赖
cd server && npm i
cd ../client && npm i
cd ..

npm run dev
```

后端默认监听：`http://localhost:5001`  
前端默认监听：`http://localhost:5173`

### 1）后端

```bash
cd server
npm i
cp .env.example .env
# 编辑 .env 填入配置（不要提交到 GitHub）
node app.js
```

后端默认监听：`http://localhost:5001`

### 2）前端

```bash
cd client
npm i
npm run dev
```


## 配置说明

后端读取 `server/.env`（仅本地使用，禁止提交）：

- `DASHSCOPE_API_KEY`：DashScope API Key
- `ALIST_BASE_URL`：AList 服务地址（例：`http://nat269.yyboxdns.com:48100`）
- `ALIST_USERNAME` / `ALIST_PASSWORD`：AList 上传账号
- `ALIST_UPLOAD_DIR`：AList 目标目录（例：`/audios/`）
- 可选：`ALIST_PUBLIC_BASE_URL`：DashScope 拉取音频时使用的公网地址；未配置时使用 `ALIST_BASE_URL`
- 可选：`ALIST_AUTH_PREFIX`：AList API 鉴权前缀，默认不加前缀；仅当你的 AList 实例要求时再配置
