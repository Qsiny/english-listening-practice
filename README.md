# 英语听力拼写练习（English Listening Practice）

一个基于 **Vue** + **Node.js/Express** 的英语听力练习项目：  
支持音频上传 → 使用百炼（DashScope）ASR 转写 → 句子切分 → 逐词拼写练习（可按句子区间播放音频、快捷键操作、悬停显示文本）。

## 功能特性

- 音频上传（服务端接收）
- 上传至阿里云 OSS，生成公网可访问 URL（Bucket 公共读）
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
  - `services/ossService.js`：OSS 上传工具
  - `services/speechRecognitionService.js`：DashScope ASR 调用与结果解析
  - `services/sentenceSplitterService.js`：句子切分与 words 生成

## 环境要求

- Node.js（建议 18+）
- npm
- 阿里云 OSS Bucket（建议：公共读或支持签名 URL）
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
- `OSS_REGION`：OSS Region（例：`oss-cn-shenzhen`）
- `OSS_BUCKET`：Bucket 名称
- `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`：OSS 访问凭证（建议用 RAM 子账号 + 最小权限）
- 可选：`OSS_DELETE_AFTER_TRANSCRIBE=true`（转写完成后删除 OSS 对象）
