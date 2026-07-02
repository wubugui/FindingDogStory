# 层次叙事系统最终设计文档

## 1. 文档目的

本文总结当前项目关于“层次叙事系统”的最终设计结论，覆盖三个层面：

1. 概念设计：整个游戏叙事如何抽象。
2. 编辑器设计：作者应该如何编辑和管理叙事。
3. 运行时设计：游戏运行时如何真正执行状态图、实体状态和 Action。

本设计的目标不是推翻现有系统，而是在现有 `Hotspot / NPC / Zone / DialogueGraph / Quest / Scenario / Flag / Action` 之上增加一套统一的上层叙事状态图与运行时管理层。

核心结论：

> 整个游戏叙事是一张多层状态图。Flow、NPC、Hotspot、Zone、Quest、Scenario、Dialogue 等都可以看作这张图里的子图。实体仍然独立存在于场景中，但在实体之上增加“叙事状态覆盖层”。状态图负责表达因果与状态迁移，实体逻辑负责触发事件，Action 负责实际操作，运行时叙事状态管理器负责执行状态变化与实体补丁。

---

## 2. 现有系统定位

当前 `GameDraft` 已经有一套可用的底层叙事执行系统。

现有结构大致为：

```text
Scene 中部署世界实体
Hotspot / NPC / Zone / MapNode / DialogueEntry
        ↓
玩家触发实体逻辑
        ↓
实体执行 Action / DialogueGraph / Cutscene / Minigame
        ↓
Action 操作底层状态系统
Flag / Scenario / Quest / Archive / Rule / Entity Override
        ↓
这些状态反过来影响场景、对话、地图、交互和任务
```

现有系统的问题不是底层能力不足，而是：

> 完整叙事流程没有作为一等对象存在，而是被拆散在 scene、dialogue、quest、scenario、flag、condition、action 等配置中。

现在的编辑方式本质是：

```text
先在脑中设计完整流程
然后手动拆成 quest
再手动拆成 scenario
再手动拆成 flag
再手动拆成 condition
再手动拆成 action
最后分散塞进 scene、hotspot、npc、dialogue、zone 中
```

这会导致内容越多，因果关系越难维护。

新系统要解决的是：

> 作者直接编辑叙事状态与因果关系，而不是人肉管理散落的变量和 Action。

---

## 3. 总体抽象：整个游戏是一张多层状态图

最终抽象如下：

```text
Game Narrative Graph
= 多层叙事状态图

其中包含多个子图：
- Flow 子图
- NPC 子图
- Hotspot 子图
- Zone 子图
- Quest 子图
- Scenario 子图
- Dialogue 子图
- Minigame 子图
- Cutscene 子图
```

这些子图不是完全孤立的系统，而是同一张大图在不同粒度上的局部展开。

例如：

```text
Flow：码头水鬼到铁环支线
  ├── 码头水鬼看板状态
  ├── 水边事件状态
  ├── 捞箱子小游戏状态
  ├── 滚铁环小孩状态变化
  └── 归还铁环任务状态

NPC：滚铁环小孩
  ├── 事件前状态
  ├── 事件后可要铁环状态
  └── 铁环已拿走状态

Quest：归还铁环
  ├── 未激活
  ├── 已激活
  └── 已完成
```

它们共同构成游戏叙事大图。

---

## 4. 核心概念定义

## 4.1 State Node：状态节点

图中的 Node 代表状态。

状态可以属于不同 owner：

```text
Flow State
NPC State
Hotspot State
Zone State
Quest State
Scenario State
Dialogue State
Minigame State
Cutscene State
```

状态节点只表达：

> 某个对象、流程、任务、场景实体或叙事片段当前在叙事上处于什么状态。

例如：

```text
Flow.外国人捞箱子已完成
NPC.滚铁环小孩.事件后可要铁环
Quest.归还铁环.已激活
Scenario.码头水鬼.看板初读完成
Zone.水边区域.已触发
Hotspot.码头告示板.已读
```

## 4.2 Transition：状态迁移

Transition 表示同一对象内部的状态迁移，或者某个状态变化如何推动另一个状态变化。

例如 NPC 内部：

```text
NPC.初始状态 -- 玩家交互完成 --> NPC.已交互一次
NPC.事件前/已交互一次 -- 水猴子事件完成 --> NPC.事件后状态
```

例如 Quest 内部：

```text
Quest.未激活 -- 获得铁环 --> Quest.已激活
Quest.已激活 -- 归还铁环 --> Quest.已完成
```

Transition 本身不承载 Action。它只表达状态之间的可达关系和迁移触发来源。

## 4.3 Event：事件

Event 是实体逻辑或叙事系统发出的触发点。

事件来源包括：

```text
玩家点击 Hotspot
玩家与 NPC 交互
玩家进入 Zone
DialogueGraph 到达某个节点
小游戏完成
Cutscene 完成
Quest 完成
Scenario phase 完成
某个 StateNode 进入
```

事件不是 Action。

事件负责触发状态迁移或触发某个状态下的响应。

## 4.4 Action：实际操作

Action 是实际执行层。

Action 负责：

```text
播放对白
启动 DialogueGraph
启动 Cutscene
启动 Minigame
设置 Flag
更新 Quest
设置 ScenarioPhase
切换场景
修改实体动画
禁用 Zone
修改 Hotspot 图片
给物品
添加档案
```

Action 不是逻辑，不是状态，也不是边。

Action 可以绑定在状态节点的生命周期事件或响应事件上，例如：

```text
onEnter
onExit
onInteract
onInspect
onComplete
onFail
```

## 4.5 Entity Patch：实体补丁

由于现有地图实体没有原生状态机，因此不能直接假设实体本身拥有 `currentState`。

解决方式是：

> 在实体之上增加“叙事状态覆盖层”。每个实体状态本质是一组命名的实体参数补丁。

例如：

```text
NPC.滚铁环小孩.事件后可要铁环
patch:
  animState = boy_stand_ring
  patrolEnabled = false
  interactResponse = after_evt_choice
```

底层仍然可以编译或运行成：

```text
persistNpcAnimState(...)
persistNpcDisablePatrol(...)
DialogueGraph entry = after_evt_choice
```

---

## 5. 状态、逻辑、Action 的边界

必须严格区分三件事：

```text
状态 ≠ 实体逻辑
Action ≠ 实体逻辑
状态图 ≠ 脚本流程图
```

## 5.1 实体逻辑属于实体

例如 NPC 的逻辑是：

```text
玩家靠近
按交互键
NPC.interact()
读取当前叙事状态
选择对应响应
执行响应中的 Action
```

“玩家按一下 NPC 才说话”是 NPC 实体逻辑，不属于叙事状态。

## 5.2 状态只提供叙事上下文

例如：

```text
NPC 当前处于：事件前
NPC 当前处于：事件后
NPC 当前处于：铁环已拿走
```

状态只回答：

> 这个对象在叙事上处于什么状态？

## 5.3 Action 是实际操作

例如：

```text
播放大事件后对话
更新归还铁环任务
给玩家铁环
让 NPC 停止巡逻
切换 NPC 动画
```

Action 可以绑定在状态的进入、退出、交互响应等事件上，但 Action 不等于状态，也不等于逻辑。

---

## 6. 实体叙事状态覆盖层

当前所有地图实体本身没有状态概念。它们是：

```text
静态实体配置
+ conditions
+ actions 修改实体参数
+ persist override 保存结果
```

因此新系统不应要求马上把所有实体改成原生状态机。

正确做法是：

> 在实体之上抽象一层 Entity Narrative Layer，由该层定义状态节点、状态迁移、生命周期 Action 和实体补丁。

结构为：

```text
Scene Entity 原始实体
  - 位置
  - 碰撞
  - 默认图像
  - 默认交互方式
  - 默认配置

Entity Narrative Layer 实体叙事状态层
  - State Node
  - Transition
  - onEnter / onExit / onInteract / onComplete
  - Entity Patch
  - Action
```

实体本体仍然由 Scene 编辑器管理。

叙事状态覆盖层负责：

```text
这个实体在某段叙事中有哪些状态
这些状态由哪些图节点触发
每个状态下实体有哪些参数补丁
每个状态下实体如何响应玩家交互
进入/退出状态时执行哪些 Action
```

---

## 7. 顶层叙事图与实体状态层的关系

顶层 Flow 不直接控制实体本体。

它只通过状态因果影响实体的叙事状态。

例如：

```text
Flow.外国人捞箱子已完成
    → NPC.滚铁环小孩.事件后可要铁环
```

这表示：

> 当“外国人捞箱子已完成”这个状态成立时，滚铁环小孩的“事件后可要铁环”状态可以成立或迁移到该状态。

这不是直接改 NPC 本体。

真正对 NPC 的动画、巡逻、对话入口等修改，由 `NPC.滚铁环小孩.事件后可要铁环` 状态自己的 patch 和 onEnter Action 决定。

---

## 8. 运行时必须新增 NarrativeStateManager

只做编辑器和静态编译不够。

因为现有运行时没有以下能力：

```text
状态节点成立
状态节点退出
状态迁移
onEnter / onExit 执行
状态补丁应用
跨子图状态传播
状态图序列化 / 反序列化
```

因此必须新增运行时层：

```text
NarrativeStateManager / NarrativeGraphRuntime
```

它不替代现有系统，而是放在现有系统之上。

## 8.1 NarrativeStateManager 职责

### 1. 注册叙事图

加载 Flow、NPC、Hotspot、Zone、Quest、Scenario 等子图。

### 2. 保存当前状态

例如：

```text
flow_dock_water_monkey.activeState = crate_event_done
npc_ringboy.activeState = after_crate_event
quest_return_ring.activeState = active
```

### 3. 接收事件

事件可以来自：

```text
Hotspot inspect
NPC interact
Zone enter
Minigame complete
Cutscene finish
DialogueGraph runActions
State entered
```

### 4. 执行状态迁移

例如：

```text
npc_ringboy.before_event -- crate_event_done --> npc_ringboy.after_crate_event
```

### 5. 执行生命周期 Action

状态进入时：

```text
oldState.onExit
newState.onEnter
newState.patch
newState.projection
```

### 6. 应用实体补丁

通过 EntityAdapter 把 patch 转为运行时实体修改或现有 Action。

### 7. 对旧系统暴露兼容状态

例如自动镜像只读 flag：

```text
narrative.npc_ringboy.after_crate_event.active = true
narrative.flow_dock_water_monkey.crate_event_done.active = true
```

这些 flag 只能由 NarrativeStateManager 维护，不能人工写。

---

## 9. EntityAdapter：实体补丁适配器

由于不同实体支持的参数不同，需要给每类实体实现适配器。

第一阶段只支持三类实体：

```text
NPC
Hotspot
Zone
```

## 9.1 NPC Adapter

支持 patch：

```text
enabled
visible
animState
patrolEnabled
position
dialogueGraph
dialogueEntry
interactionEnabled
```

可能映射到现有 Action：

```text
persistNpcEntityEnabled
persistNpcAnimState
persistNpcDisablePatrol
moveEntityTo
startDialogueGraph
```

## 9.2 Hotspot Adapter

支持 patch：

```text
enabled
visible
displayImage
label
text
graphId
inspectResponse
pickupState
```

可能映射到现有 Action：

```text
persistHotspotEnabled
setHotspotDisplayImage
startDialogueGraph
setFlag
```

## 9.3 Zone Adapter

支持 patch：

```text
enabled
triggered
onEnterResponse
disabledAfterTrigger
```

可能映射到现有 Action：

```text
persistZoneEnabled
startCutscene
startWaterMinigame
playScriptedDialogue
```

---

## 10. DialogueGraph 的定位

DialogueGraph 不能承担所有状态变化。

它只能负责：

> 玩家主动交互后的响应。

例如：

```text
玩家走到 NPC 面前
按交互键
NPC 读取当前叙事状态
选择 DialogueGraph 分支
执行对白 / choice / runActions
```

DialogueGraph 不能负责：

```text
状态一成立，NPC 立刻换动画
状态一成立，Zone 立刻禁用
状态一成立，Hotspot 立刻换图
状态一成立，地图节点立刻解锁
```

这些必须由 NarrativeStateManager 的状态进入/退出逻辑和 EntityAdapter 实现。

因此：

```text
DialogueGraph = 实体交互响应后端
NarrativeStateManager = 状态变化运行时
EntityAdapter = 状态补丁落地层
```

---

## 11. 编辑器设计

编辑器不需要推翻现有编辑流程，而是在最上层新增一层统一视图。

## 11.1 多层状态图视图

作者看到的是：

```text
Flow 子图
NPC 子图
Quest 子图
Scenario 子图
Hotspot 子图
Zone 子图
```

可以折叠、展开、下钻。

不应该把全游戏所有节点平铺在一张图里。

## 11.2 实体状态覆盖编辑器

选中一个实体，可以编辑它的叙事状态层：

```text
Entity: npc_ringboy

States:
- 事件前
- 事件后可要铁环
- 铁环已拿走

每个 State:
- patch
- onEnterActions
- onExitActions
- interactionResponse
- outgoing transitions
```

## 11.3 Flow 编排视图

例如“水猴子到铁环”流程：

```text
码头看板已读
→ 码头水鬼已激活
→ 水边事件可触发
→ 洋人出场
→ 捞箱子小游戏完成
→ 滚铁环小孩进入事件后状态
→ 玩家获得铁环
→ 归还铁环任务激活
```

这个视图负责连接多个子图的状态。

## 11.4 编译/运行预览

编辑器应能显示：

```text
这个状态会执行哪些 Action
这个状态会给哪个实体打哪些 patch
这个状态会影响哪些旧系统 flag / scenario / quest
这个实体当前可能处于哪些状态
这个事件会触发哪些状态迁移
```

---

## 12. 示例：NPC 三状态

需求：

> 一个 NPC 有三个状态：A 初始，B 已交互一次，C 世界大事后。玩家在不同状态下与它交互，执行完全不同的 Action。世界大事发生后，该 NPC 使用 C 状态表现。

设计如下：

```text
Entity: npc_x

State A: 初始
  patch:
    animState = idle
  interactResponse:
    playDialogue(first_talk)
    sendNarrativeEvent(npc_x.first_interact_done)
  transition:
    first_interact_done -> State B

State B: 已交互一次
  patch:
    animState = idle
  interactResponse:
    playDialogue(repeat_talk)

State C: 世界大事后
  patch:
    animState = shocked
    patrolEnabled = false
  onEnterActions:
    persistNpcAnimState(shocked)
    persistNpcDisablePatrol(true)
  interactResponse:
    playDialogue(after_big_event)
    updateQuest(...)
```

外部 Flow：

```text
Flow.WorldBigEventDone
    → npc_x.StateC
```

运行时：

```text
1. 世界大事状态成立
2. NarrativeStateManager 迁移 npc_x 到 State C
3. 执行 State C.onEnterActions
4. 应用 State C.patch
5. 玩家之后交互 NPC
6. NPC 实体逻辑读取当前状态 C
7. 执行 C.interactResponse
```

---

## 13. 示例：水猴子到铁环流程

现有流程可作为第一条完整验证链。

涉及功能：

```text
Hotspot 入口：码头告示板
DialogueGraph：码头看板、滚铁环小孩
Scenario：码头水鬼、外国人捞箱子
Zone：水边区域
Cutscene：洋人第一次出场
Minigame：捞箱子小游戏
Flag：foreigner_crate_event_done、铁环小孩_已经获得铁环
Quest：抓水猴子、归还铁环
EntityState：小孩事件前/事件后/铁环已拿走
```

顶层 Flow 可以表达为：

```text
码头告示板已读
→ 码头水鬼看板初读完成
→ 水边事件可触发
→ 洋人出场
→ 捞箱子小游戏完成
→ foreigner_crate_event_done 状态成立
→ 滚铁环小孩进入事件后状态
→ 玩家获得铁环
→ 铁环小孩进入铁环已拿走状态
→ 归还铁环任务激活
```

这条链几乎覆盖当前系统的大部分功能，因此适合作为第一阶段验证目标。

---

## 14. 最小可行版本

第一阶段不要做完整大系统，只做能跑通“水猴子到铁环”的最小版本。

## 14.1 新增运行时

```text
NarrativeStateManager
```

支持：

```text
registerGraph
g getActiveState / setActiveState
sendEvent
transition
onEnter / onExit
serialize / deserialize
```

## 14.2 新增数据结构

```ts
NarrativeGraph
NarrativeStateNode
NarrativeTransition
EntityPatch
EntityAdapter
ResponseMapping
```

## 14.3 新增 Action 类型

```text
sendNarrativeEvent
setNarrativeState
```

用于旧系统触发新状态图。

## 14.4 第一批 Adapter

```text
NPCAdapter
HotspotAdapter
ZoneAdapter
```

## 14.5 状态镜像

自动生成只读状态 flag：

```text
narrative.<graphId>.<stateId>.active
```

旧系统可以读取，但不能写。

---

## 15. 与现有系统关系

| 现有系统 | 新系统中的定位 |
|---|---|
| FlagStore | 兼容状态镜像与全局事实存储 |
| ScenarioStateManager | Scenario 子图的旧实现 / 投影目标 |
| QuestManager | Quest 子图的旧实现 / 玩家引导投影 |
| ActionExecutor | 状态生命周期与响应 Action 的执行器 |
| SceneManager | 实体查找与实体补丁应用目标 |
| DialogueGraphManager | 交互响应后端 |
| ZoneSystem | Zone 状态补丁和事件来源 |
| MinigameManager | 事件来源与 Action 目标 |
| CutsceneManager | 事件来源与 Action 目标 |

---

## 16. 设计原则总结

1. 整个游戏叙事是一张多层状态图。
2. Flow、NPC、Hotspot、Zone、Quest、Scenario 都是子图。
3. Node 表示状态。
4. Transition 表示状态迁移或状态因果。
5. Action 是实际操作，可以绑定到状态进入、退出、交互响应等事件。
6. 实体逻辑仍然属于实体，例如 NPC 需要玩家交互才说话。
7. 现有地图实体本身没有状态，因此先在实体之上加“叙事状态覆盖层”。
8. 状态覆盖层本质是一组命名的实体参数补丁。
9. DialogueGraph 只负责玩家交互后的响应，不能承担即时世界变化。
10. 必须新增 NarrativeStateManager，不能只靠编辑器静态编译。
11. 旧系统不推翻，作为状态图运行时的投影目标和兼容层。
12. 第一阶段以“水猴子到铁环”流程作为验证链。

---

## 17. 最终定义

本项目的层次叙事系统定义为：

> 在现有场景实体和底层 Action 系统之上，增加一个统一的多层叙事状态图运行时。所有 Flow、NPC、Hotspot、Zone、Quest、Scenario 都可以拥有自己的状态子图。地图实体本体仍然由场景编辑器独立编辑，但在其上增加实体叙事状态覆盖层。状态节点定义叙事状态、实体补丁和生命周期/响应 Action；Transition 定义状态迁移与因果关系；NarrativeStateManager 在运行时管理状态成立、退出、迁移和补丁应用；现有 Flag、Quest、Scenario、DialogueGraph、ActionExecutor 继续作为底层投影和执行目标。

更短地说：

> 场景实体负责存在，实体逻辑负责触发，叙事状态图负责因果，状态节点负责补丁和 Action，NarrativeStateManager 负责运行，旧系统负责落地。
