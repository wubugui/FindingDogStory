# Demo H3 首帧审查矩阵

依据：`Demo制作资料/游戏总纲_设定剧情玩法.md` 第九节。此表只锁定**现有 GameDraft 可核对的画面**，不代表片段已生成。制作人要求全部正式版与阿秀图片先完成，之后才用 Hub `h3` 生成 Demo 视频；目前没有 H3 任务。

Hub 2026-09-25 `/guide.md`：本机 H3 为 `MiniMax-H3-Base`，`fl2v` 可用一张首帧、可选末帧，24 fps；帧数按 `17k+5` 对齐，最多 362 帧。多图参考应按 `<Picture 1>` 等标注；不支持 `negative_prompt`，也没有本机 2K 再生成模块。视频实际输出仍须逐段看首尾帧、人物身份、场景结构、比例及 UI 漂移。

以下 `tour_`、`play_` 截图根目录均为 `E:/GameDev/GameDraft/artifact/Screenshots_2026-09-15/`；所有截图是 1024×768。部分截图带真实游戏 HUD 或内嵌玩法面板，不能随意抹掉后又称“严格实机”。

2026-09-25 还在本机正在运行的 GameDraft 开发版（5173）用已实现的 `devScene` 入口只读查看了 `雾津街头` 与 `梦_里屋`：前者有固定俯斜街道机位、关二狗及街头 NPC，后者有门板、灯和室内人物。之后找到了 `artifact/storm-config-20260920/visual/default/雾津街头/00-before.png` 原始街头运行截图（1024×768，SHA256 `a19f0b95316de26df6952640c250e99c5e1db76f1acfdc16368abe515354eb3f`）。该帧有三个人物和游戏 HUD，也有开发用“调试”按钮。通过 Hub Qwen 2.1 只清理此按钮的 [街头首帧候选](demo_h3_firstframes/accepted/雾津街头_接活首帧候选.png) 已复审：人物尺寸、站位、镜头、街道结构连续，SHA256 `bce5983a13e80ff507fdb18b89d16faf057f6e240f9eebf7f6f58dc5239805a9`。它仍是**生成的模拟实机图**，不能称为原始运行截图，也尚未表现“递定金”的动作。请求、Hub 任务 ID 和判退 B 图见 [街头首帧质检](demo_h3_firstframes/街头首帧质检.md)。

同日新增五张真正运行时截图：通过 `?mode=dev&ndbg=0&visualCapture=1&devScene=<场景名>` 加载现有场景，用 1024×768 浏览器窗口及 1920×1080 桌面屏幕判据，关闭调试浮窗后截取。这保留了原运行时机位、人物比例和 HUD，未把背景资产当作实机图，也未使用生成模型。文件位于 [`demo_h3_firstframes/runtime_capture/`](demo_h3_firstframes/runtime_capture/)；其 SHA256 见下表。另从现有对白图 `线外_梦_段D_里屋` 的 `n_cover` 入口只读触发原生盖脸纸演出，捕获黑底、脸纸近景的运行帧；该调试入口跳过了此前对白，不等于整段演出已经验收。

| Demo 流程 | 已有首帧依据 | 仍需锁定的画面或边界 |
| --- | --- | --- |
| ① 茶馆听书 | `tour_teahouse.png`；说书过场 `play_说书过场_1.png`；新增 `runtime_capture/teahouse_desktop_1024x768.png` | 新帧有茶馆、玩家、张叨叨、李瞎子、掌柜、小二及场内茶客，可锁当前固定机位和人物比例；仍只是场景基准，没有捕到说书动作。说书中的神仙顶是故事画面，不当可游玩正式版地图。 |
| ② 接活、赌坊 | `雾津街头`原运行截图及已复审的 Hub 清理版场景首帧；新增 `runtime_capture/V03_街头接活_定钱对白_1024x768.png`；正式过场 `赌坊输钱` 的原生运行帧 `runtime_capture/赌坊输钱_01开局赢钱_原生过场_1024x768.png`、`赌坊输钱_05转冷_原生过场_1024x768.png`、`赌坊输钱_07拖出门_原生过场_1024x768.png` | V03 帧经 `npc_庄家来人` 原生对白/选项抵达 `c_xianqi`：雇主与关二狗街头同框，台词写从袖里摸出十文定钱；**没有实体铜钱递手动画**，截图时还没执行下一节点 `beishi_hired`，不能称交钱动作已拍到。赌坊是九张插画组成的正式 cutscene，由 `序章_街巷_赌坊门卫` 调用；三帧锁赢钱、转冷、被拖出门的原生电影画幅。没有独立可游玩的赌坊室内场景 JSON，不能另造可游玩室内地图。 |
| ② 夜背尸 | `play_背尸_发力3.png`；`跑马梁/01_夜_火把_全景.png` | 以夜景和原发力动作校准尸体、火把、人物比例；白天 `tour_跑马梁.png` 不能当夜行首帧。 |
| ② 坠潭濒死 | `tour_牛头凼.png`、`tour_深潭水下.png` | 没有跌落连续动作首帧；深潭画面只用于此段，不冒充码头水下。 |
| ②.5 待死之礼 | `tour_梦_饭屋.png`、`play_待死之礼_倒头饭.png`、`play_待死之礼_只能吃.png`；新增 `runtime_capture/梦_夜路_desktop_1024x768.png`、`梦_农家院_desktop_1024x768.png`、`梦_里屋_desktop_1024x768.png`、`梦_醒来土路_desktop_1024x768.png` 及 `梦_里屋_盖脸纸_原生演出_1024x768.png`；另有[Hub Qwen 当前版式候选](axiu_bio/candidate/AX03_sim_runtime_layout.png) | 夜路为夜间土路和关二狗；农家院为院内老人及旁白框，关二狗在当前机位外；里屋为门板、脚边灯、关二狗及老夫妻；醒来土路为白昼岔路与关二狗。盖脸纸原生演出是黑底中央 82% 宽近景，仍有铜钱 HUD 和下方空白旁白框；Hub 候选已逐张对照，尚未定为 H3 首帧。不能拿里屋俯视底图或 AX03 全屏提案冒充这一瞬间。 |
| ③ 回城吹牛 | `tour_teahouse.png`；场景基准 `runtime_capture/teahouse_desktop_1024x768.png`；新增 `runtime_capture/V12_茶馆吹牛_原生对白_1024x768.png` | V12 在 `hs_茶客吹牛` 触发的 `线外_寻狗_茶馆吹牛` 原生 n2 帧，关二狗位于茶客间并讲自己背尸的事；镜头保留茶馆人物与当前雾/热气效果。图中没有单独的吹牛肢体表演，不能把①的说书画面直接当作③。 |
| ④ 婆子家 | `tour_婆子家院.png`；场景基准 `runtime_capture/婆子家院_desktop_1024x768.png`；原生宣布对白 `runtime_capture/V13_婆子家宣布_原生对白_1024x768.png` | V13 对白帧经现有图 `线外_寻狗_婆子家宣布` 的 `n2` 节点复现：关二狗在院中、婆子与儿子同场，人物和对白真实；为对齐院中站位使用游戏现有 `teleportEntityTo` 调试动作定位玩家，不代表从接单到宣布的完整自然流程。当前有板脸宣告、风向与阿秀极轻提示编排，尚无独立的施法、帕子包吸走或撤退视觉动画；不要把幕后机理视觉化。 |
| ⑤ 河边递纸 | `tour_河边.png`；场景基准 `runtime_capture/河边_desktop_1024x768.png`；原生伸手画面 `runtime_capture/V14_河边递纸_原生伸手演出_1024x768.png` | V14 从 `线外_寻狗_河边递纸` 的 `n3` 发出 `hebian_handed`，`scenario_河边.handed` 原生显示 `river_ghost_hand`：画面中央是宽 58% 的**矩形插画层**，手和纸钱在内、河岸在后；这层矩形确属当前游戏实现，不是生成图误套贴。仅有伸来的手，不补完整递纸者；接纸后隐藏该层、回头无人仍需按后续状态/对白核对。 |
| ⑥ 码头捞箱 | `tour_码头白天.png`、`play_水下捞箱.png`；新增 `runtime_capture/码头白天_desktop_1024x768.png` 和 `码头水下_dock_crate_tutorial_原生小游戏_1024x768.png`；[跳水分支 `a_4` 香粉微尘原生帧](axiu_bio/runtime_capture/码头跳水_a4_axiu_faint_原生播放_无通知_1024x768.png)；复审候选 `formal_late/accepted/F02_sim.png` | 岸上新帧只锁码头地点、关二狗和普通 NPC；水下新帧是 `dock_crate_tutorial` 原生小游戏 `search` 状态，画框、岸边前景和 HUD 均为真实运行时组成，尚未进入提拉。`a_4` 帧经跳水分支对话续播，**小游戏此时已关闭，26% 宽微尘在码头主场，不在水下画框**；本次通过 Esc 退出小游戏，未证明成功捞箱自然流程，详见[取证](axiu_bio/runtime_capture/码头跳水_axiu_faint_取证.md)。上岸开箱另用岸上画面。码头洋人女性是 generic NPC，不是克拉拉；埃德加也不是该帧中的实体。 |
| ⑦ 开放段与行头 | 街头原运行截图与 Hub 清理版可作地点依据；`tour_teahouse.png` 可作茶馆地点依据 | 暂无置办行头当场截图，不新造店铺。 |
| ⑧ 林中喊名、山口 | `play_林中喊名_不应声.png`、`tour_阎王岭山口.png`；林道基准 `runtime_capture/野道_desktop_1024x768.png`；山口李天狗对白 `runtime_capture/V20_山口李天狗_原生对白_1024x768.png` | 野道基准仅锁夜间竹林岔路、关二狗尺度，未表现喊名或背尸。V20 对白帧用现有图 `线外_寻狗_李天狗` 的 `n_ltg_scold` 复现：山口背景前出现李天狗**对白肖像**。山口场景 JSON 只有两个脚夫 NPC，无李天狗场内实体；`scenario_送货.litiangou_peril/rescue` 只有旁白、加血和启动该对白图，没有可截的同场救人身体动作。不能把肖像对白帧称为李天狗伸手救人的实机首帧。 |
| ⑨ 克拉拉招募 | `雾津街头`场景 JSON 中有 `characterId: clara`；新增无调试按钮的原生对白同框 `runtime_capture/V21_克拉拉招募_原生对白同框_1024x768.png`；早前[调试态同框截图](demo_h3_firstframes/v21_clara/raw_clara_recruitment_correct_camera.png)及[Hub 笔记本小道具候选](demo_h3_firstframes/candidate/V21_clara_recruitment_sim.png) | 原生帧在 `scenario_送货=returned` 后把关二狗置 `(3210,1900)`，从街头 `npc_克拉拉` 自身触发 `线外_寻狗_克拉拉招募` 并推进至 n2；克拉拉仍为原坐标 `(3344,1888)`，角色与肖像同框、比例和机位可核。对白写她翻本子，但当前世界角色手上**无可见笔记本**；十块定钱只在后续选项台词和 `giveCurrency` 状态动作中出现，当前没有实体交钱表演。此前 Hub 候选加了本子，不能称原生实机。见[V21 质检](demo_h3_firstframes/v21_clara/V21_克拉拉招募质检.md)；不得用码头 generic 洋人女性代替她。 |
| ⑩ 城门终幕 | `tour_城门口.png`，场景有 `clara`、`edgar`；新增[关二狗假道士服原生运行帧](demo_h3_firstframes/runtime_capture/城门V22_假道士_原生换装_配对_1024x768.png)及[同实例换装前基准](demo_h3_firstframes/runtime_capture/城门V22_换装前_原生基准_1024x768.png)；另有[Hub 模拟候选](demo_h3_firstframes/candidate/citygate_v22/take7.png) | 原生帧通过城门对白图 `apply_taoist_avatar` 节点执行 `setPlayerAvatar`，运行时装扮资源由 `player_carry_corpse_anim` 变为 `player_taoist_anim_v1`；撤下首句对白遮挡后取三人同框。其角色位置、人物/门洞比例、帽袍和 HUD 优先于 Hub 模拟图。该调用跳过先前剧情，尚不能证明整条终幕自然走通；具体过程和风险见[城门 V22 质检](demo_h3_firstframes/candidate/citygate_v22/城门V22质检.md)。Demo 只推向雾路黑屏，不进入山内。 |

## 已核对的原截图 SHA256

| 文件名（相对上述截图根目录） | SHA256 |
| --- | --- |
| `tour_teahouse.png` | `8d0b0c9772d45e883a0b873fe34611d27b66d60a4f53c1e982c1448c71cf6688` |
| `play_说书过场_1.png` | `8fe2bdc87e12951f5cc2ccb37344ef33716a8043a754bf13b1145c8c8f439a37` |
| `play_背尸_发力3.png` | `0f426e3287da7961f8cc6d5cd7cec2938520c38d07179a965db34224eca21824` |
| `跑马梁/01_夜_火把_全景.png` | `60ef6c7582ab0f5063256f701ae27314e2829502ab9373001c40cdb32f09b106` |
| `tour_牛头凼.png` | `2107b37e3911286be4c0ad6581f107e36c5e4f98f9a0693a8f4d2a35f23df4fa` |
| `tour_深潭水下.png` | `18b22cb3f0ef011f478ea01cec70717696522b2c4ba77f5c3c9779f88ea4770a` |
| `tour_梦_饭屋.png` | `0ffc0a58dabf52a3769951557534028e967cf896158b614ed51e27d8a896bdab` |
| `play_待死之礼_倒头饭.png` | `f23ce126093072c103036aefd3e2300232692629088cbd1303a894ddeb165b9a` |
| `play_待死之礼_只能吃.png` | `39188200839ab74fe1520573f3461ce595ea8d27c09d0575cbed553bfb1ca33d` |
| `tour_婆子家院.png` | `67300732d0659685517f27ff18100ca2ead4a768b61798936f7b8961c2c3227c` |
| `tour_河边.png` | `a89b2658fdacb314b42881a4560b78b1dca34badba89c80cf7a3a10915f55418` |
| `tour_码头白天.png` | `35f3ce2e27f839b0e990c1f18b9d2b617dd428008c9c8642e5da9b5376e4610a` |
| `play_水下捞箱.png` | `020338df913053f8077e84433e72a1f0e747a429bfef54e34641ec2eee9f3158` |
| `tour_阎王岭山口.png` | `be9e202e5707de8545ad2415af4875c542353e04421e06139a9b27a477c5f3d0` |
| `play_林中喊名_不应声.png` | `eca9426956933e133242e980285c659ac91e6e86c22a8cff135415136dd3c5fc` |
| `tour_城门口.png` | `4fa4eeba8d79114d2dd5341187f53f079d64d428c41ca745191b7ecfa59ad13f` |

李天狗独立角色 ref：`E:/GameDev/GameDraft/public/resources/runtime/character_setup_refs/npc_li_tiangou_anim__li_tiangou_ref.png`，SHA256 `cb2f6808d175e760d9956e36b6ae71149287c6bd23ed915363cef8ce87f2b48b`；ref 仅证明角色造型，不能证明其已在山口截图中出场。

## 本次新增运行时截图 SHA256

以下路径均相对于 `demo_h3_firstframes/runtime_capture/`；全为 1024×768 PNG。这里的“运行时”指本机 GameDraft 5173 开发版的真实画面，仍须按各行的演出缺口使用，不能把单张场景基准当作完整剧情动作。

| 文件名 | SHA256 |
| --- | --- |
| `梦_夜路_desktop_1024x768.png` | `892121b5797fc77dfbdebf4c1c8a8f6fecc60c91665f07f110a4d0ae19d0064a` |
| `梦_农家院_desktop_1024x768.png` | `a6e5657e805e7eadb67f1c32591d9959cab45dfd6a35e8fdc0d8deeda80e8c9a` |
| `梦_里屋_desktop_1024x768.png` | `cf8862b8f8cad05d9491277de9d0ba4e630100e780309aa46942fb8802fbb929` |
| `梦_里屋_盖脸纸_原生演出_1024x768.png` | `5137ea6a52343502672f2cee0ec1d8a716c93e2526ffd55ea9673c449127bcb0` |
| `梦_醒来土路_desktop_1024x768.png` | `85d73eaae3310869a0635868fe222037e62545e8d3a7e2e298e80f947ba527b6` |
| `野道_desktop_1024x768.png` | `be26d35cd7ca05b3199e809f16ff817d90863ec29481df6e46cecd55d468c2a3` |
| `城门V22_换装前_原生基准_1024x768.png` | `8e2aa143210e19c7e8322f0cd5f4dbc203434aa62be1ef16cd3cc3003cc61797` |
| `城门V22_假道士_原生换装_配对_1024x768.png` | `6411619a3ff06538667a614afe069c83eed4f2bd7120050d728b86ce9180eec7` |
| `teahouse_desktop_1024x768.png` | `f9ead34bea8dcdf89751a5dd6496ba7dc9219a75ea29e25fde24a7ea68236c50` |
| `婆子家院_desktop_1024x768.png` | `171608678a4c3fe2aa35269fd2bc91fa1632cacadb9027a3f37ca25d8bc93ef1` |
| `河边_desktop_1024x768.png` | `3793fdae7a1f47f62ee028f8b9d95d0f6008e214b44720a2c14dde6e5ec1b99c` |
| `码头白天_desktop_1024x768.png` | `a75a144720641ceb4e53ef09fa0f6b94689298e519891e07c8aef78bec270711` |
| `码头水下_dock_crate_tutorial_原生小游戏_1024x768.png` | `188b0ed15d8d68bd987e568694e1a7ac1e0b978bf06cf5ae3c1ace2a0b8dd4c1` |
| `城隍庙夜_desktop_1024x768.png` | `ab2b9af9506dcf745207ce29199807b59bef602588f0a22c569cee20300553da` |
| `义庄_desktop_1024x768.png` | `a246d33abcc962f701fd8affc15a5b64750d3b829ac17c61d30087934e5944c6` |
| `赌坊输钱_01开局赢钱_原生过场_1024x768.png` | `244e5fb17f9e3168a970bd861717940f735b20c4c1c42862b23105ff279b3a09` |
| `赌坊输钱_05转冷_原生过场_1024x768.png` | `f6b37846e2f10e8d79b68a1cfddd194c31f96e49345ad1facb66b8dd25c39feb` |
| `赌坊输钱_07拖出门_原生过场_1024x768.png` | `914c125e78a2b5abedd8566fed3159fbe7b571d0e3dbb9c75a8f03f5ee01311b` |
| `V13_婆子家宣布_原生对白_1024x768.png` | `e64de5431ff024d8b9f3758dc802e4a3326c6c66db0e4800098049c93cd2c6f0` |
| `V14_河边递纸_原生伸手演出_1024x768.png` | `a4da62d1a62c7dd9ecc19b0618b087e41ddcc3ab3e2716f79727619acb122865` |
| `V20_山口李天狗_原生对白_1024x768.png` | `70e64b7c5081f6a9931a39f2434e71e1c2e27a3663747274d4b072ce4cf9fbb5` |
| `V03_街头接活_定钱对白_1024x768.png` | `5cabc4a28f9a29abd7dc6cdcb6dc7500d4304d6a908ee283cb5b0aa89d8b1594` |
| `V12_茶馆吹牛_原生对白_1024x768.png` | `26f7e113bb4ef9ab01ffb5114594ea7bd6d174e8eb186f4a49aec84e0b120a67` |
| `V21_克拉拉招募_原生对白同框_1024x768.png` | `03a049ed020e840b5f374cf49d2d97b30da50ba601310c61b73e5953683a8538` |
| `../../axiu_bio/runtime_capture/码头跳水_a4_axiu_faint_原生播放_无通知_1024x768.png` | `0f99ba55e9997d7384f46af5fe0668af88f883ff050627ef982b32d9da704faf` |

后七张使用同一 `devScene` 桌面运行截图方法。茶馆、婆子家院、河边、码头白天、城隍庙夜、义庄均通过场景 JSON 的现有 `id` 进入；码头水下是在 `码头白天` 运行时只读调用现有 `window.__game.waterMinigameManager.start('dock_crate_tutorial')`，`getDebugVisualState()` 确认 `active: true`、`phase: search`、小游戏逻辑边界 720×480。独立水域画框和岸边前景属于小游戏原生 UI，不代表把一张图贴到另一张图。水下这帧只锁搜索阶段空间和箱子位置，尚无提拉成功动作。`城隍庙夜` 与 `义庄` 仅补充项目已实现地点的机位、灯光与人物/尸体尺度；不能据此推定它们必须加入 Demo 主线视频。

赌坊三帧使用游戏已有的 `play_cutscene=赌坊输钱` 与 `play_cutscene_from=26/49/63` 开发直达路由，从同一正式 cutscene 的顶层步骤恢复播放，分别等到运行时 `getPlaybackHudSnapshot()` 的 `path: 30/52/65`、`isPlaying: true` 后取帧。截图前仅临时隐藏开发版自动显示的 `#cutscene-step-hud`，没有修改 GameDraft 源码/资产或过场图片；未隐藏的探针仍留在 `runtime_capture/赌坊输钱_01开局赢钱_原生过场_probe.png`。过场配置位于 `E:/GameDev/GameDraft/public/assets/data/cutscenes/index.json`，`targetScene: 雾津街头`；九张插画按 `01_first_win_rake_in`、`02_kiss_coin`、`03_peak_winning`、`04_toss_coins`、`05_table_turn_cold`、`06_dice_cold_close`、`07_dragged_out`、`08_door_shut_alley`、`09_picking_up_coins` 顺序呈现。这些是过场插画画面及字幕的真实运行截图，不等于玩家可在赌坊室内自由走动。
