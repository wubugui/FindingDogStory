# 码头跳水分支 `a_4` · `axiu_faint` 原生运行取证

2026-09-25，本机正在运行的 GameDraft 5173 开发版。此目录截图均为 Playwright 捕获的**实际 1024×768 运行画面**，不是生成图；GameDraft 源码、场景及配置未修改，也未提交 Hub 图像或视频任务。

## 结论

`线外_寻狗_码头选择.json` 的 A 跳水分支先在 `a_1` 等待 `dock_crate_tutorial` 小游戏**结束**，再显示 `a_3` 的脚腕被拽旁白，接着 `a_4` 执行 `playSignalCue(axiu_faint)`。实测进入 `a_4` 时小游戏画框已经撤掉，底层是**`码头白天`主场俯斜机位**：岸上关二狗、码头建筑、栈桥、河面与原 HUD 均在；人物附近只叠一小片极轻的黄白微尘，没有阿秀人物形体。它**不是**叠在水下小游戏画框上。再往后 `a_5` 才出现抓痕矩形插画层。

`axiu_faint` 配置在 `E:/GameDev/GameDraft/public/assets/data/signal_cues.json`：`showOverlayImage(axiu_cue, x=50%, y=46%, width=26%)`，等待 1400 ms，再 `hideOverlayImage`；此 cue 没有音效动作。图片短 ID 映射在 `E:/GameDev/GameDraft/public/assets/data/overlay_images.json`，指向 `ui_vfx/axiu_signal_glow.png`。运行截图中该效果很淡，不应扩大成全屏光雾。

## 可复现步骤与运行态

1. 用 Chrome／Playwright 打开 `http://127.0.0.1:5173/?mode=dev&ndbg=0&visualCapture=1&devScene=码头白天`，等待 `window.__game` 与场景 `码头白天` 完成加载；关闭开发浮窗。
2. 经现有 `window.__game.graphDialogueManager.startDialogueGraph({graphId:'线外_寻狗_码头选择',npcName:'旁白'})` 从该图入口开局；推进 `n1` 至 `c1`，选第 0 项“跳水捞箱”。`a_1` 原生执行 `startWaterMinigame(dock_crate_tutorial)`；运行记录证实此时 `minigame.active=true`、`phase=search`、小游戏逻辑边界 720×480、`gameState=Minigame`。
3. 本次为了核对**小游戏结束后 cue 的承载画面**，通过游戏原有 `Esc`／底部“退出”控件结束该局。小游戏退出后对话自动走到 `a_3`，`minigame.active=false`，在主场显示旁白。第二次复核在此等待 5.5 秒，让角色簿通知自然消退。
4. 从 `a_3` 推进，300 ms 后截图：`dialogue.currentNodeId=a_4`、`scene=码头白天`、`minigame.active=false`、`gameState=ActionSequence`。约 1.4 秒后 cue 消失，图自动进入 `a_5` 的抓痕叠图并停在 `a_6` 旁白。运行状态细节见 [`码头跳水_axiu_faint_无通知复核记录.json`](码头跳水_axiu_faint_无通知复核记录.json)。

| 阶段 | 截图 | SHA256 | 证明范围 |
| --- | --- | --- | --- |
| `a_1` 小游戏仍在 | [`码头跳水_a1_小游戏仍在画面_复核_1024x768.png`](码头跳水_a1_小游戏仍在画面_复核_1024x768.png) | `89417ec1a30b1f192d58d097644f57664ff78d3c88310f2da3480400fe3c5096` | 原生水下小游戏画框及 `Minigame` 态。 |
| `a_3` 小游戏退出后 | [`码头跳水_a3_小游戏退出后旁白_复核_1024x768.png`](码头跳水_a3_小游戏退出后旁白_复核_1024x768.png) | `be997ab714ab0eacba3a10e76eb58f29a70ab9d356b951518d7661bc6d4a864b` | 小游戏画框已撤，主场码头及旁白重现。 |
| **`a_4` cue 播放中** | [`码头跳水_a4_axiu_faint_原生播放_无通知_1024x768.png`](码头跳水_a4_axiu_faint_原生播放_无通知_1024x768.png) | `0f99ba55e9997d7384f46af5fe0668af88f883ff050627ef982b32d9da704faf` | **首选证据**：无通知、主场俯斜画面上极淡 cue，非水下画框。 |
| `a_5` 抓痕叠层 | [`码头跳水_a5_抓痕叠层_复核_1024x768.png`](码头跳水_a5_抓痕叠层_复核_1024x768.png) | `7a8161ffb078b23117b9d41bec666f63ef9326854e81cf46ad55f058d7a8393c` | cue 结束后的另一独立矩形演出，不要和 `a_4` 混作同时出现。 |

## 取证边界

本次从现有图入口只读触发 A 分支，并以原生退出方式结束小游戏；**没有完成箱子的提拉成功**，也没有从整个 Demo 自然流程走到此处。因此截图严格证明“跳水分支中小游戏退出→`a_3`→`a_4`”的运行顺序及叠层落点，不能宣称已验收捞箱成功后的完整连续演出。当前图的 `a_1` 只等待小游戏结束；退出后继续 `a_2`、`a_3`、`a_4`，是实测到的现行行为。首轮一帧带角色簿通知的 cue 截图仍留同目录供比对，正式审图优先用无通知复核帧。首次 Esc 没退出的失败探针也留档，不能当作 cue 来源。
