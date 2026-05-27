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
**直接推送到 `main` 分支，不创建特性分支。**

### 推送步骤
```bash
# 1. 修改文件
# 2. 提交
git add <files>
git commit -m "描述性提交信息"

# 3. 直接推送到 main
git push origin main
```

### 认证方式
使用 GitHub Personal Access Token（PAT）环境变量。

**设置方式：**
`GITHUB_TOKEN` 环境变量已配置在 `~/.bashrc` 中，自动用于 git 推送。

确保已加载：
```bash
source ~/.bashrc
echo $GITHUB_TOKEN  # 验证是否设置成功
```

**git 推送会自动使用 GITHUB_TOKEN 环境变量进行认证。**

## 其他说明
- 仓库可能转换为 private，不影响 PAT 访问
- 确保 Claude Code GitHub App 有正确的仓库访问权限
