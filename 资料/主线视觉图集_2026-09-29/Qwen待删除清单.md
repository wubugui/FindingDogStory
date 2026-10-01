# Qwen PNG 删除审计（2026-09-29）

完整逐文件清单见 [Qwen待删除清单.txt](Qwen待删除清单.txt)。TXT 每行是一个**已被 Git 跟踪**的仓库相对路径，共 **225 行**；2026-10-01 发布清理按此清单执行；保留历史审计说明。

| 批次与目录 | Qwen PNG 数 | 判定 |
| --- | ---: | --- |
| 09-24 `images/` | 20 | 最早一批 Hub/Qwen 草图 |
| 09-24 `hub_qwen21/accepted/` | 40 | GPT 成品经 Qwen 再编辑的输出，仍属 Qwen 图 |
| 09-24 `hub_qwen21/qa/` | 51 | Hub 下载的候选、返工图及入选前副本；下方有交叉核验 |
| 09-25 `axiu_bio/` | 36 | `accepted/` 6、`ax03_isometric_retry/` 2、`ax03_runtime_overlay_retry/` 2、`ax04_candidate/` 7、`candidate/` 2、`qa/` 17；含 Qwen 输出的裁切副本 |
| 09-25 `demo_h3_firstframes/` | 22 | `street_clean_A/B` 2、`accepted/` 1、`candidate/V21...` 1、城门 `take1–10` 10、薄雾 `mist_A/B` 2、克拉拉 `correct/round2/small_circle` 6 |
| 09-25 `formal_early/` | 20 | `accepted/` 2、`candidate/` 18 |
| 09-25 `formal_late/` | 23 | `accepted/` 2、`candidate/` 21 |
| 09-25 `qwen21_校准_2026-09-25/` | 9 | Qwen 校准结果，排除人工红圈输入图 |
| 09-25 `rejected_after_reaudit/` | 4 | 已判退的 Qwen 输出副本 |
| **合计** | **225** | 09-24 为 111，09-25 为 114 |

## 明确保留的 PNG

两批目录共 **354 张**已跟踪 PNG；225 张列入删除清单，余下 **129 张不在清单内**：

- **40 张 GPT Image 原图**：`资料/主线视觉图集_2026-09-24/gpt_image/accepted/`。`hub_qwen21/accepted/` 那 40 张是 Qwen 再编辑结果，不能和这里混淆。
- **89 张原生截图、GameDraft 来源裁切或人工圈选输入**：包括 `axiu_bio/qa/source_*.png`、`yizhuang_original_scale_crop.png`、`axiu_bio/guan_source_crop.png`、`axiu_bio/runtime_capture/`、`axiu_forest/`、`demo_h3_firstframes/runtime_capture/`（含其 `rejected/`）、城门 `input_marked_*.png`、克拉拉 `*_input_only.png` 和 `raw_clara_*.png`、`formal_late/source_crops/`、`F02_source_circle_guide.png`。这些不是 Qwen 成图。

特别核查：09-24 `hub_qwen21/qa/` 下 **51 张均为 Qwen 候选/返工 PNG**；逐一计算 SHA-256 后，与 `gpt_image/accepted/` 的 40 张 GPT PNG 比较，**逐字节相同为 0 张**。该目录没有 GPT 原图；`hub_qwen21/accepted/` 的 40 张也与 GPT 原图逐字节相同为 0 张。来源记录见 09-24 `hub_qwen21/质检记录.md`、09-25 `Qwen21用法复盘与校准.md`。

## 发布页对应关系

清理前的 `资料/主线视觉图集_2026-09-25/审查浏览.html` 内嵌 JSON 有 **354 条互不重复的图片记录**，与两批已跟踪 PNG 一一对应；TXT 的 **225 个 Qwen 路径全部被该 HTML 引用**。2026-10-01 已将页面改为仅展示入选 GPT 概念图，并更新两批图集入口索引。历史质检文档保留过程记录；其中已删除 Qwen 图的链接失效，不作为现行图库入口。

此清单是**文件来源审计**，不是画面质量验收；不把旧 HTML 的 `current/candidate/legacy/reference` 标签当成模型来源证据。
