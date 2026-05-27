# FindingDogStory 项目指南

## 项目概述
这是一个中文故事/游戏创意项目，围绕犬类角色（二狗、李天狗等）的民间奇幻叙事创意，包含故事设定、支线情节、游戏设计等内容。

### 主要文件夹
- `支线设计/` - 各种支线剧情设计
- `草稿/` - 故事草稿和设计稿
- `docs/` - 文档（知识系统、高级叙事迭代）
- `GameDesign/` - 游戏设计相关
- `GameDraft/` - 游戏草稿
- `html_demos/` - HTML 演示文件

## Git 工作流程

### ⚠️ 重要规则
**每次提交完成后，必须合并到 `main` 分支，并删除开发分支。**

### 推送步骤
```bash
# 1. 修改文件并提交
git add <files>
git commit -m "描述性提交信息"

# 2. 合并到 main
git checkout main
git merge <开发分支>
git push origin main

# 3. 删除开发分支
git branch -d <开发分支>
git push origin --delete <开发分支>
```

### 认证方式
GitHub App 已自动处理认证，无需手动配置 Token。

## 其他说明
- 仓库可能转换为 private，不影响访问
- 确保 Claude Code GitHub App 有正确的仓库访问权限
