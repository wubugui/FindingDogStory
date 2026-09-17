#!/usr/bin/env node
/*
 * 把 A 的拆分结果（A-结果.json）导出成评审材料。
 * 用法：node 编排/评审/导出.cjs <轮次目录>
 *   拆分结果.md  去掉「梗概原文」和每拍的「原文摘句」——B1、B2 只准看这一份，不能让原文漏进去
 *   检查.md      机器检查逐条
 *   度量.json    各步待处理数、完成标准、规模、字段预算
 */
'use strict';
const fs = require('fs'); const path = require('path');
const C = require('../core.js');
const dir = process.argv[2] && path.resolve(process.argv[2]);
if (!dir) { console.error('用法：node 导出.cjs <轮次目录>'); process.exit(2); }
const doc = C.normalize(JSON.parse(fs.readFileSync(path.join(dir, 'A-结果.json'), 'utf8')));

/* 盲测版：原文一个字都不带 */
const blind = JSON.parse(JSON.stringify(doc));
blind.synopsis = '';
blind.stages.forEach(s => s.beats.forEach(b => { b.source = ''; }));
const md = C.buildMarkdown(blind);
fs.writeFileSync(path.join(dir, '拆分结果.md'), md, 'utf8');

const issues = C.computeIssues(doc); const prog = C.progress(doc, issues);
const LVL = { miss: '缺', warn: '警', info: '提示' };
const L = ['# 机器检查', '', `当前卡在：${prog.current ? `第 ${prog.current} 步「${prog.currentName}」` : '九步都没有待处理项'}`, '', '## 完成标准', ...C.criteria(doc, issues).map(([t, ok]) => `- [${ok ? 'x' : ' '}] ${t}`), ''];
for (let n = 1; n <= 9; n++) {
  const list = issues.filter(i => i.step === n); if (!list.length) continue;
  L.push(`## 第 ${n} 步 · ${C.STEP_NAMES[n]}`, ...list.map(i => `- [${LVL[i.level]}] ${i.text}`), '');
}
fs.writeFileSync(path.join(dir, '检查.md'), L.join('\n'), 'utf8');

/* 细化范围：拍都标了类型、且至少有一个做／选拍细化完成的子阶段 */
const detailed = doc.stages.map((s, si) => ({ si, s })).filter(x => x.s.beats.length && x.s.beats.every(b => b.kind) && x.s.beats.some(b => C.isAct(b) && C.detailDone(b)));
const beats = C.allBeats(doc).map(x => x.b);
const keys = o => Object.keys(o).filter(k => !['id', 'collapsed'].includes(k)).length;
const metrics = {
  title: doc.meta.title,
  pending: prog.pending, current: prog.current,
  criteria: C.criteria(doc, issues).map(([text, ok]) => ({ text, ok })),
  scale: { stages: doc.stages.length, beats: beats.length, 看: beats.filter(b => b.kind === '看').length, 做: beats.filter(b => b.kind === '做').length, 选: beats.filter(b => b.kind === '选').length, 未标: beats.filter(b => !b.kind).length, options: beats.reduce((n, b) => n + b.options.length, 0), mechanics: doc.mechanics.length, facts: doc.facts.length, maps: C.mapGroups(doc).length, stuck: beats.filter(b => C.filled(b.stuck)).length, cuttable: beats.filter(b => b.cuttable).length },
  detailedStages: detailed.map(x => `${x.si + 1}. ${x.s.title}`),
  machineGate: {
    wiringMiss: issues.filter(i => i.step === 7 && i.level === 'miss').length,
    detailedMiss3to7: issues.filter(i => i.level === 'miss' && i.step >= 3 && i.step <= 7 && (i.target.type === 'stage' ? detailed.some(x => x.s.id === i.target.id) : i.target.type === 'beat' ? detailed.some(x => x.s.beats.some(b => b.id === i.target.id)) : false)).length
  },
  /* 字段预算：一个人要面对的格子种类数。修工具让它上涨，得在 修复.md 里写理由 */
  fieldBudget: { 顶层: keys(C.newDoc().meta), 子阶段: keys(C.newStage()) + keys(C.newDesign()) - 1, 拍: keys(C.newBeat()) + 3 + 4 - 2, 选项: keys(C.newOption()), 玩法: keys(C.newMechanic()) + 4 - 1 }
};
metrics.fieldBudget.合计 = Object.values(metrics.fieldBudget).reduce((a, b) => a + b, 0);
fs.writeFileSync(path.join(dir, '度量.json'), JSON.stringify(metrics, null, 2), 'utf8');
console.log(`导出完成：${doc.stages.length} 个子阶段、${beats.length} 拍；细化范围：${metrics.detailedStages.join('、') || '（无）'}；字段预算 ${metrics.fieldBudget.合计}`);
