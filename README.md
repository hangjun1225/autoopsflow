# OpsFlow 前端原型（演示用）

本目录为 **Vite + React + TypeScript** 单页应用，用于部署流程相关界面的**可交互原型**。数据与流水线执行为前端模拟，无后端服务。

---

## 环境要求

| 项目 | 说明 |
|------|------|
| Node.js | 建议使用 **20.x LTS** 或更高 |
| 包管理器 | **npm**（随 Node 安装） |

在终端执行 `node -v`、`npm -v` 能正常输出版本即可。

---

## 拷贝到其他电脑时的注意

- 请拷贝**整个 `opsflow` 文件夹**（需包含 `package.json`、`vite.config.ts`、`src` 等）。
- **不要**拷贝 `node_modules`（体积大，且换机器后应重新安装）。若没有 `node_modules`，按下面步骤执行 `npm install` 即可。
- 若使用 Git：在另一台机器上 `git clone` 后同样只需在 `opsflow` 目录下安装依赖并启动。

---

## 安装依赖

在 **`opsflow` 目录**下打开终端，执行：

```bash
npm install
```

---

## 启动开发服务器（演示）

```bash
npm run dev
```

启动成功后，在浏览器访问终端里提示的地址（一般为 **http://localhost:3000**）。

- 开发脚本已绑定 **3000** 端口，并监听 `0.0.0.0`，便于同一局域网内其他设备用「本机 IP:3000」访问演示。

---

## 其他常用命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 本地预览构建结果 |
| `npm run lint` | TypeScript 类型检查（`tsc --noEmit`） |

---

## IntelliJ IDEA 中运行

1. **File → Open**，选择 **`opsflow` 文件夹**（包含 `package.json` 的根目录）。
2. 打开内置终端，执行 `npm install` 与 `npm run dev`。
3. 或在 `package.json` 的 `scripts` 中点击 **`dev`** 旁的运行按钮（需已配置 Node/npm）。

---

## 说明

- 变更单、场景、模板等数据主要来自 `src/constants.ts` 等处的**演示数据**；刷新页面后，仅内存中的部分操作会丢失，属原型预期行为。
- 本 README 面向**拷贝目录或克隆仓库后在其他电脑演示**的场景编写。