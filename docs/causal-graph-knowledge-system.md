# 叙事因果图与知识作用系统需求设计文档

## 1. 目的

本文定义两个互相配合的上层设计：

1. **知识作用系统**：知识获得后如何影响世界呈现、系统提示和玩家行动。
2. **叙事因果图编辑系统**：如何把逻辑上有关联的知识、场景变化、交互变化、提示变化、剧情阶段和结果显式组织为一个可视化、可校验、可编译的上层状态机。

底层运行时可以继续使用现有的 `scenario / phase / flag / condition / action / hotspot / dialogue` 等系统；但编辑层不应继续让作者人肉维护大量局部变量，而应让作者直接编辑因果关系，再由编译层生成底层数据。

核心原则：

> 编辑因果，编译变量。

---

## 2. 为什么需要更高层抽象

原有方式类似：

1. 场景 A 打听到一条传闻。
2. 设置一个局部变量为 true。
3. 场景 B 的某个道具条件读取该变量。
4. 条件满足后，道具交互变化。

短期可用，但随着内容增长会出现问题：

- 因果关系散落在不同场景、对话、道具和 Action 中。
- 很难追踪“某条传闻影响了哪些内容”。
- 变量命名和维护成本持续增长。
- 很难检查死链、孤立节点、永远无法触发的分支。
- 跨场景因果关系越来越隐蔽。
- 作者实际维护的是机器变量，而不是叙事逻辑。

因此需要把隐含在变量和条件里的关系显式化。

---

## 3. 知识作用系统

知识不应被理解为背包道具或技能按钮，而应被理解为一种认知能力。

玩家获得知识后，主要发生三类变化：

1. **入眼：世界呈现变化**
2. **入心：系统或角色提示变化**
3. **入手：玩家主动行动增加**

### 3.1 入眼：世界呈现变化

这是最常用、成本最低的一层。

玩家获得知识后，相关场景、物件、痕迹或路径自动变得可读。

表现包括：

- 新调查点出现。
- 原调查文本变深。
- 隐藏痕迹显形。
- 原本只是背景的物件变成线索。
- 某些危险细节被强调。

示例：获得“香灰不能扫尽，灰里藏事”后，城隍庙里的香灰断痕、供桌下灰线、地面灰痕变成线索。玩家不需要主动选择“使用香灰知识”。

### 3.2 入心：系统或角色提示变化

用于降低玩家记忆负担。

当玩家遇到相关情境时，角色自然想起传闻。

不推荐：

```text
提示：你可以使用【吊死鬼禁忌】。
```

推荐：

```text
关二狗刚想抬头，忽然想起茶馆里那句闲话：吊死的人，夜里莫看脸。
```

提示强度应分级：

- 弱提示：音效、镜头停顿、轻微高亮。
- 中提示：关二狗短句，如“这灰不对”“不能应”。
- 强提示：完整回忆，只用于关键剧情点。

### 3.3 入手：玩家主动行动增加

主动层必须少而重，只用于高压、关键、能改变后果的情境。

不推荐：

```text
使用【喊魂禁忌】
```

推荐：

```text
咬住牙，不应声
胡诌一个名字，把话岔开
侧过身，只看她的脚
用泥抹掉纸人的眼
```

玩家选择的是具体动作，而不是知识条目。

### 3.4 知识分级

| 等级 | 作用 | 示例 |
|---|---|---|
| C 级 | 只改变描述 | 阴婚红纸不同于普通喜纸 |
| B 级 | 显形线索 | 香灰不能扫尽，灰里藏事 |
| A 级 | 自动规避或强提示 | 吊死的人夜里别看脸 |
| S 级 | 主动改变局面 | 铁盒七日不能开、真名不可乱说、纸人不能点眼 |

建议比例：

```text
70% 知识：只改变世界呈现
20% 知识：世界呈现 + 角色/系统提示
10% 知识：世界呈现 + 提示 + 主动使用
```

---

## 4. 叙事因果图编辑系统

叙事因果图不是新的运行时系统，而是新的上层编辑模型。

目标：

> 把逻辑上相关的知识、场景响应、道具交互、对话解锁、剧情阶段和结果组织成一个整体状态机，并编译成现有底层系统。

### 4.1 推荐节点类型

最小版本先支持以下节点：

#### Knowledge

表示玩家获得一条知识、传闻、禁忌或经验。

示例：

```text
Knowledge: 香灰藏事
Knowledge: 吊死的人夜里别看脸
```

#### SceneState

表示某个场景的表现层或状态发生变化。

示例：

```text
SceneState: 城隍庙_香灰痕迹显形
SceneState: 山坳_纸钱方向显形
```

#### Interaction

表示某个交互点启用、变化或完成。

示例：

```text
Interaction: 供桌下灰痕可调查
Interaction: 女尸脚尖方向可调查
```

#### Dialogue

表示某段对话解锁、变化或完成。

示例：

```text
Dialogue: 茶馆听到香灰传闻
Dialogue: 用神仙顶传闻骗两个汉子
```

#### Phase

表示剧情阶段推进。

示例：

```text
Phase: 铁盒第一夜_发现灰痕
Phase: 铁盒第一夜_确认女尸异常
```

#### Outcome

表示一个阶段性结果或后果。

示例：

```text
Outcome: 铁盒被抢走
Outcome: 城隍庙异常确认
```

### 4.2 推荐边类型

最小版本只需要两类边：

#### requires

表示前置依赖。

```text
Interaction: 供桌下灰痕可调查
requires
SceneState: 城隍庙_香灰痕迹显形
```

#### triggers

表示完成前一节点会触发后一节点。

```text
Knowledge: 香灰藏事
triggers
SceneState: 城隍庙_香灰痕迹显形
```

---

## 5. 示例因果图

以“茶馆传闻影响城隍庙”为例：

```text
Dialogue: 茶馆听到香灰传闻
    triggers
Knowledge: 香灰藏事
    triggers
SceneState: 城隍庙_香灰痕迹显形
    triggers
Interaction: 供桌下灰痕可调查
    triggers
Phase: 铁盒第一夜_发现灰痕
```

作者看到的是这条显式因果链。

底层编译结果可以是：

```text
flag: know_ash_trace = true
flag: temple_ash_layer_visible = true
hotspot condition: temple_ash_layer_visible == true
action: setScenarioPhase(iron_box_night, ash_trace_found, done)
```

但这些底层变量不应由作者手动维护。

---

## 6. 编译到现有系统

### 6.1 编译目标

叙事因果图应编译为当前已有底层系统可识别的数据：

- scenario catalog
- scenario phase
- flag registry
- generated flags
- condition expressions
- action batches
- hotspot conditions
- dialogue conditions
- scene state patches

### 6.2 编译规则示例

#### Knowledge 节点

上层：

```text
Knowledge: 香灰藏事
```

编译后：

```text
flag: causal.iron_box_night.knowledge.ash_trace.acquired = true
```

#### SceneState 节点

上层：

```text
SceneState: 城隍庙_香灰痕迹显形
```

编译后：

```text
flag: causal.iron_box_night.scene.temple.layer.ash_trace.visible = true
```

#### Interaction 节点

上层：

```text
Interaction: 供桌下灰痕可调查
```

编译后：

```text
hotspot condition: temple.layer.ash_trace.visible == true
onInspect action: setScenarioPhase(iron_box_night, ash_trace_found, done)
```

#### Phase 节点

上层：

```text
Phase: 铁盒第一夜_发现灰痕
```

编译后：

```text
setScenarioPhase(iron_box_night, ash_trace_found, done)
```

### 6.3 编译原则

1. 上层节点表达作者意图。
2. 底层 flag、condition、action 由编译器生成。
3. 人不直接维护自动生成变量名。
4. 生成变量要有稳定命名规则，便于 debug。
5. 生成数据应能回溯到上层节点。
6. 编译前应校验死链、孤立节点、循环依赖等问题。

---

## 7. 编辑器需求

### 7.1 因果图编辑视图

基础能力：

- 创建节点。
- 节点分类。
- 连接 requires/triggers 边。
- 查看节点依赖。
- 查看节点触发结果。
- 折叠/展开子图。
- 按场景、章节、知识过滤。

作者应该能一眼看到：

- 某条知识由哪里获得。
- 它影响哪些场景。
- 哪些交互依赖它。
- 完成哪些交互会推进剧情。
- 哪些阶段会暴露到外部系统。

### 7.2 编译预览

选中任意节点时，应能看到它将生成的底层内容：

- 生成哪些 flag。
- 写入哪些 scenario phase。
- 修改哪些 hotspot condition。
- 生成哪些 action。
- 影响哪些 dialogue condition。

### 7.3 依赖追踪

编辑器应支持从任意节点追踪：

#### 上游依赖

“这个节点为什么会发生？”

```text
供桌下灰痕可调查
↑ 城隍庙香灰痕迹显形
↑ 获得香灰藏事知识
↑ 茶馆听到香灰传闻
```

#### 下游影响

“这个节点会影响什么？”

```text
获得香灰藏事知识
↓ 城隍庙香灰痕迹显形
↓ 供桌下灰痕可调查
↓ 铁盒第一夜_发现灰痕
```

### 7.4 校验需求

编译前必须校验：

1. 是否存在孤立节点。
2. 是否存在永远无法触发的节点。
3. 是否存在循环依赖。
4. requires 是否指向有效节点。
5. triggers 是否形成不合理闭环。
6. 节点 ID 是否重复。
7. 编译生成的 flag 是否符合命名规则。
8. 一个 Interaction 是否被多个互斥状态同时控制。
9. 一个 Phase 是否被多个不兼容路径写入。
10. 暴露到外部的状态是否过多。

校验结果应指向图中的节点，而不是只报底层变量错误。

---

## 8. 最小可行版本

不要一开始做完整宏大工具。

MVP 只支持：

### 四种节点

1. Knowledge
2. SceneState
3. Interaction
4. Phase

### 两种边

1. requires
2. triggers

### 一条测试链

```text
Dialogue: 茶馆听到香灰传闻
    triggers
Knowledge: 香灰藏事
    triggers
SceneState: 城隍庙_香灰痕迹显形
    triggers
Interaction: 供桌下灰痕可调查
    triggers
Phase: 铁盒第一夜_发现灰痕
```

验收标准：

1. 可以在图编辑器中创建上述节点和连线。
2. 可以编译成现有 flag、condition、action、scenario phase。
3. 运行时玩家听到传闻后，城隍庙灰痕交互正确启用。
4. 完成灰痕调查后，对应剧情 phase 正确推进。
5. 编辑器可以反向显示该交互的上游因果来源。

---

## 9. 复杂度控制原则

### 9.1 不做全局大状态机

不要把整个游戏放进一个超级图。

应采用局部图：

- 一个章节一个图。
- 一个主线段一个图。
- 一个复杂支线一个图。
- 一个重要场景群一个图。

### 9.2 对外只暴露少量事实

局部图内部可以有很多节点，但对外暴露必须克制。

例如“铁盒第一夜”对外只暴露：

- 已获得铁盒。
- 已发现城隍庙女尸异常。
- 铁盒已丢失。
- 关二狗被脚帮救下。

### 9.3 80% 模板化，20% 手工特制

普通因果关系走图和模板。

主线高潮、铁盒关键节点、重要人物命运选择允许手工设计。

---

## 10. 与现有系统关系

现有系统作为底层实现基础。

| 现有系统 | 在新设计中的作用 |
|---|---|
| ScenarioStateManager | Phase 节点编译目标 |
| FlagStore | Knowledge / SceneState / Interaction 的底层事实仓库 |
| ActionExecutor | triggers 边的执行目标 |
| Condition 系统 | requires 边的运行时判断目标 |
| Hotspot / Dialogue | Interaction / Dialogue 节点的落地对象 |

---

## 11. 最终定义

本系统的最终目标：

> 作者编辑的是叙事因果，而不是变量。系统负责把因果编译成变量、条件和动作。

更短地说：

> 编辑因果，编译变量。
