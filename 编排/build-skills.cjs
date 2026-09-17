#!/usr/bin/env node
/*
 * 从 编排/skill/SKILL.src.md 生成两份 skill，避免两处手改漂移：
 *   .claude/skills/chaipai/SKILL.md   （Claude Code；保留 {{CLAUDE_ONLY}} 块里的自动注入）
 *   .agents/skills/chaipai/SKILL.md   （Codex / Cursor 等；去掉 {{CLAUDE_ONLY}} 块）
 * 改 skill 只改源文件，然后跑：node 编排/build-skills.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '..');
const src = fs.readFileSync(path.join(HERE, 'skill', 'SKILL.src.md'), 'utf8').replace(/\r\n/g, '\n');
const BLOCK = /\{\{CLAUDE_ONLY\}\}\n?([\s\S]*?)\{\{\/CLAUDE_ONLY\}\}\n?/g;
const HEADER = '<!-- 由 编排/build-skills.cjs 从 编排/skill/SKILL.src.md 生成，不要手改 -->\n';

function withHeader(text) {
  // 头注释放在 frontmatter 之后，frontmatter 必须在文件第一行
  const m = text.match(/^---\n[\s\S]*?\n---\n/);
  return m ? m[0] + HEADER + text.slice(m[0].length) : HEADER + text;
}
const outputs = [
  [path.join(REPO, '.claude', 'skills', 'chaipai', 'SKILL.md'), src.replace(BLOCK, '$1')],
  [path.join(REPO, '.agents', 'skills', 'chaipai', 'SKILL.md'), src.replace(BLOCK, '')]
];
for (const [file, text] of outputs) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, withHeader(text), 'utf8');
  console.log('写出 ' + path.relative(REPO, file));
}
