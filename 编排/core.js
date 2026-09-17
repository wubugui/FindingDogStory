/*
 * 拆拍台 core：数据模型、检查规则、标签、全文渲染。
 * 页面（拆拍台.html，<script src="core.js">）和 CLI（chaipai.cjs，require）共用这一份，
 * 检查规则只在这里维护，两边永远一致。纯函数，不碰 DOM、不碰文件。
 */
(function (root) {
  'use strict';

  /* ---------- 基础 ---------- */
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const filled = s => !!(s && String(s).trim());
  const short = (t, n = 16) => { t = (t || '').replace(/\s+/g, ' ').trim(); if (!t) return '（未写）'; return t.length > n ? t.slice(0, n) + '…' : t; };
  function hashKey(s) { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
  const mdEsc = t => (t || '').replace(/\|/g, '｜').replace(/\s*\n\s*/g, ' ').trim();

  /* ---------- 常量 ---------- */
  const DESIGN_KEYS = [['learn', '学会了', '规则或操作'], ['know', '知道了', '信息或伏笔'], ['feel', '感受到', '情绪'], ['gain', '得到或失去了', '物件、状态']];
  const ARC = [['qi', '起', '教：安全地学会'], ['cheng', '承', '用：正常使用'], ['zhuan', '转', '变：规则被扭一下'], ['he', '合', '极：用到头或崩掉']];
  const KINDS = [['看', '看 · 演出'], ['做', '做 · 玩家操作'], ['选', '选 · 玩家决定'], ['略', '略 · 跳过']];
  const KCLS = { '看': 'see', '做': 'do', '选': 'choose', '略': 'skip', '': 'none' };
  const MODE_NAMES = { normal: '普通', loop: '循环', parallel: '并行', branch: '分支' };
  const WORKS_NAMES = { yes: '灵', no: '不灵', maybe: '看情况' };
  const LANE_KIND_NAMES = { curve: '曲线（-3～+3）', trend: '升降', text: '文字' };
  const STEP_NAMES = { 1: '顶层', 2: '切子阶段', 3: '拆拍', 4: '标看／做／选／略', 5: '细化做／选', 6: '回填设计目的', 7: '泳道', 8: '起承转合', 9: '地图汇总', 10: '判决句' };
  const GUIDE_STEPS = [
    { n: 1, name: '顶层', text: '填：这段讲什么（一句话）／关二狗从什么变成什么／关二狗的目的／结束条件。设计目的先空着。' },
    { n: 2, name: '切子阶段', text: '切点是「局面变了」，换地图不算。每个写：关二狗的目的、开始局面、结束局面、结束条件。开始＝结束的删掉或并掉。循环写退出条件，不分先后的标并行；只有选了某个选项才走的标分支，写汇合到哪；要满足条件才发生的写前置条件。' },
    { n: 3, name: '拆拍', text: '一拍＝局面变一次。每拍：发生 → 反应 → 结果，标地图。这一步不想玩法。所有子阶段拆完才往下。' },
    { n: 4, name: '标看／做／选／略', text: '每拍标一个字。到这里，真正要设计的只剩标了「做」「选」的拍。' },
    { n: 5, name: '细化做／选', text: '公式：动词＋对象＋阻力，写不出阻力改回「看」。四格：看到什么／做什么／游戏怎么回应／做错会怎样。填不出写卡点。「选」的拍列出每个选项的结果、后果和去向；一个目标有几种做法的「做」拍，列出每种做法灵不灵。' },
    { n: 6, name: '回填设计目的', text: '先子阶段、后顶层：删除测试 → 四格（学会／知道／感受／得失）→ 倒推 → 归纳。跟设计目的无关的拍标可砍。' },
    { n: 7, name: '泳道', text: '空泳道：补上或判定不属于这段；情绪平了：加一个「转」；多条泳道同一拍一起变：联动点，重点设计、重点试玩。' },
    { n: 8, name: '起承转合', text: '每个玩法走一遍：教 → 用 → 变 → 极。缺哪格，去对应子阶段补拍。' },
    { n: 9, name: '地图汇总', text: '每张地图每次来时：时段／光／谁在场／能做什么。' },
    { n: 10, name: '判决句', text: '每个玩法一句：成立的时候玩家会＿＿；做错了游戏会＿＿。' }
  ];
  const GUIDE_RULES = [
    '一层拆完整段，才往下拆一层。想到下一层的点子丢「停车场」，当下不往下钻。',
    '卡住就退回上一层：拍拆不动＝那个子阶段的开始和结束没想清楚；四格填不出＝那一拍的「结果」没想清楚。'
  ];
  const FIELD_LABELS = {
    title: '标题', summary: '这段讲什么', changeFrom: '关二狗从', changeTo: '关二狗到', goal: '关二狗的目的', endCondition: '结束条件',
    start: '开始时局面', end: '结束时局面', loopExit: '退出条件', parallelGroup: '并行组',
    text: '发生了什么', reaction: '关二狗怎么反应', result: '结果', source: '原文摘句', map: '地图',
    'formula.verb': '公式·动词', 'formula.object': '公式·对象', 'formula.resistance': '公式·阻力',
    'cells.see': '四格·玩家看到什么', 'cells.act': '四格·玩家做什么', 'cells.respond': '四格·游戏怎么回应', 'cells.wrong': '四格·做错了会怎样',
    stuck: '卡点', name: '名字', ok: '判决句·成立的时候玩家会', wrong: '判决句·做错了游戏会', note: '备注', synopsis: '梗概原文',
    time: '时段', light: '光', who: '谁在场', can: '能做什么',
    deleteTest: '删除测试', learn: '学会了', know: '知道了', feel: '感受到', gain: '得到或失去了', backward: '倒推'
  };

  /* ---------- 数据模型 ---------- */
  const newDesign = () => ({ learn: '', know: '', feel: '', gain: '', deleteTest: '', backward: '', summary: '' });
  function newDoc() {
    return {
      app: '拆拍台', version: 1,
      meta: { title: '未命名任务', summary: '', changeFrom: '', changeTo: '', goal: '', endCondition: '', design: newDesign() },
      synopsis: '',
      lanes: [{ id: 'emotion', name: '情绪', kind: 'curve' }, { id: uid(), name: '三把火', kind: 'trend' }, { id: uid(), name: '玩家知道什么', kind: 'text' }],
      stages: [], mechanics: [], mapVisits: {}, parking: []
    };
  }
  const newStage = () => ({ id: uid(), title: '', goal: '', start: '', end: '', endCondition: '', mode: 'normal', loopExit: '', parallelGroup: '', mergeTo: '', requires: [], design: newDesign(), laneExclude: [], collapsed: false, beats: [] });
  const newBeat = () => ({ id: uid(), text: '', reaction: '', result: '', source: '', map: '', kind: '', formula: { verb: '', object: '', resistance: '' }, cells: { see: '', act: '', respond: '', wrong: '' }, stuck: '', cuttable: false, lanes: {}, options: [], requires: [] });
  /* 选项（「选」的拍）/ 做法（「做」的拍）。goto：next 继续下一拍 / stage 跳到某子阶段 / end 这条线结束 */
  const newOption = () => ({ id: uid(), choice: '', works: '', reaction: '', result: '', effect: '', goto: { type: 'next', stageId: '' } });
  /* 前置条件：kind = stage（子阶段走完）/ beat（某拍发生过）/ option（某拍选过某选项）/ free（只写文字） */
  const newRequire = () => ({ id: uid(), kind: 'free', id2: '', optionId: '', note: '' });
  const newMechanic = () => ({ id: uid(), name: '', ok: '', wrong: '', note: '', arc: { qi: [], cheng: [], zhuan: [], he: [] } });

  function normalize(d) {
    if (!d || typeof d !== 'object') throw new Error('不是拆拍台文件');
    const base = newDoc();
    const out = Object.assign(base, d);
    out.meta = Object.assign(newDoc().meta, d.meta || {});
    out.meta.design = Object.assign(newDesign(), (d.meta || {}).design || {});
    out.lanes = Array.isArray(d.lanes) && d.lanes.length ? d.lanes : base.lanes;
    if (!out.lanes.some(l => l.id === 'emotion')) out.lanes.unshift({ id: 'emotion', name: '情绪', kind: 'curve' });
    out.stages = (d.stages || []).map(s => {
      const ns = Object.assign(newStage(), s);
      ns.design = Object.assign(newDesign(), s.design || {});
      ns.laneExclude = s.laneExclude || [];
      ns.requires = (s.requires || []).map(r => Object.assign(newRequire(), r));
      ns.mergeTo = s.mergeTo || '';
      ns.beats = (s.beats || []).map(b => {
        const nb = Object.assign(newBeat(), b);
        nb.formula = Object.assign(newBeat().formula, b.formula || {});
        nb.cells = Object.assign(newBeat().cells, b.cells || {});
        nb.lanes = b.lanes || {};
        nb.options = (b.options || []).map(o => { const no = Object.assign(newOption(), o); no.goto = Object.assign({ type: 'next', stageId: '' }, o.goto || {}); return no; });
        nb.requires = (b.requires || []).map(r => Object.assign(newRequire(), r));
        return nb;
      });
      return ns;
    });
    out.mechanics = (d.mechanics || []).map(m => { const nm = Object.assign(newMechanic(), m); nm.arc = Object.assign(newMechanic().arc, m.arc || {}); return nm; });
    out.mapVisits = d.mapVisits || {};
    out.parking = d.parking || [];
    return out;
  }

  /* ---------- 查找 ---------- */
  function allBeats(d) { const out = []; d.stages.forEach((s, si) => s.beats.forEach((b, bi) => out.push({ b, s, si, bi }))); return out; }
  function findStage(d, id) { const si = d.stages.findIndex(s => s.id === id); return si < 0 ? null : { s: d.stages[si], si }; }
  function findBeat(d, id) { for (let si = 0; si < d.stages.length; si++) { const bi = d.stages[si].beats.findIndex(b => b.id === id); if (bi >= 0) return { b: d.stages[si].beats[bi], s: d.stages[si], si, bi }; } return null; }
  function mechOfBeat(d, id) { return d.mechanics.filter(m => ARC.some(([k]) => m.arc[k].includes(id))); }
  function laneFilled(b, l) { const v = b.lanes[l.id]; return v !== undefined && v !== null && v !== ''; }
  const isAct = b => b.kind === '做' || b.kind === '选';
  const visitKey = (m, sid) => m + '||' + sid;
  function mapGroups(d) {
    const m = new Map();
    d.stages.forEach((s, si) => s.beats.forEach((b, bi) => {
      const k = b.map.trim(); if (!k) return;
      if (!m.has(k)) m.set(k, new Map());
      const vs = m.get(k);
      if (!vs.has(s.id)) vs.set(s.id, { stage: s, si, beats: [] });
      vs.get(s.id).beats.push({ b, bi });
    }));
    return [...m].map(([map, vs]) => ({ map, visits: [...vs.values()] }));
  }

  /* ---------- 网状关系 ---------- */
  /* 哪些拍的哪些选项通向某个子阶段 */
  function optionSources(d, stageId) {
    const out = [];
    allBeats(d).forEach(x => x.b.options.forEach(o => { if (o.goto && o.goto.type === 'stage' && o.goto.stageId === stageId) out.push(Object.assign({ o }, x)); }));
    return out;
  }
  function optionLabel(o, b) { return oneLineText(o.choice) || '（未写选项）'; }
  function oneLineText(t) { return (t || '').replace(/\s+/g, ' ').trim(); }
  function stageRefText(d, stageId) { const f = findStage(d, stageId); return f ? `子阶段 ${f.si + 1}「${short(f.s.title, 14)}」` : '（已删除的子阶段）'; }
  function gotoText(d, o) {
    const g = o.goto || { type: 'next' };
    if (g.type === 'stage') return '跳到 ' + stageRefText(d, g.stageId);
    if (g.type === 'end') return '这条线结束';
    return '继续下一拍';
  }
  function mergeText(d, s) {
    if (!s.mergeTo) return '按顺序接下一个子阶段';
    if (s.mergeTo === 'end') return '这条线在这里结束';
    return '汇合到 ' + stageRefText(d, s.mergeTo);
  }
  /* 前置条件是否还指得到东西 */
  function requireTarget(d, r) {
    if (r.kind === 'stage') { const f = findStage(d, r.id2); return f ? { ok: true, text: `子阶段 ${f.si + 1}「${short(f.s.title, 14)}」走完` } : { ok: false, text: '（已删除的子阶段）' }; }
    if (r.kind === 'beat') { const f = findBeat(d, r.id2); return f ? { ok: true, text: `拍 ${f.si + 1}.${f.bi + 1}「${short(f.b.text, 14)}」发生过` } : { ok: false, text: '（已删除的拍）' }; }
    if (r.kind === 'option') {
      const f = findBeat(d, r.id2); const o = f && f.b.options.find(x => x.id === r.optionId);
      return o ? { ok: true, text: `拍 ${f.si + 1}.${f.bi + 1} 选了「${short(o.choice, 14)}」` } : { ok: false, text: '（已删除的选项）' };
    }
    return { ok: true, text: '' };
  }
  function requireText(d, r) {
    const t = requireTarget(d, r);
    return [t.text, oneLineText(r.note)].filter(Boolean).join('：') || '（空的前置条件）';
  }

  /* ---------- 泳道分析 ---------- */
  function flatEmotionIds(d) {
    const set = new Set(); let run = [];
    const flush = () => { if (run.length >= 3) run.forEach(x => set.add(x.b.id)); run = []; };
    allBeats(d).forEach(x => {
      const v = x.b.lanes.emotion;
      if (typeof v !== 'number') { flush(); return; }
      if (run.length && run[0].b.lanes.emotion !== v) flush();
      run.push(x);
    });
    flush();
    return set;
  }
  function laneChanges(d) {
    const res = new Map(); const prev = {};
    allBeats(d).forEach(x => {
      const names = [];
      d.lanes.forEach(l => {
        const v = x.b.lanes[l.id]; const has = laneFilled(x.b, l);
        if (l.kind === 'trend') { if (v === '升' || v === '降') names.push(l.name); }
        else if (has) {
          if (l.kind === 'curve') { if (prev[l.id] !== undefined && prev[l.id] !== v) names.push(l.name); }
          else if (prev[l.id] !== v) names.push(l.name);
        }
        if (has) prev[l.id] = v;
      });
      res.set(x.b.id, names);
    });
    return res;
  }

  /* ---------- 检查 ---------- */
  function computeIssues(d) {
    const list = [];
    const add = (level, step, target, text, tab = 'detail') => list.push({ level, step, target, text, tab });
    const m = d.meta, T = { type: 'top' };
    if (!filled(m.summary)) add('miss', 1, T, '顶层：没写「这段讲什么」');
    if (!filled(m.changeFrom) || !filled(m.changeTo)) add('miss', 1, T, '顶层：「关二狗怎么变了」没写全');
    if (!filled(m.goal)) add('miss', 1, T, '顶层：没写关二狗的目的');
    if (!filled(m.endCondition)) add('miss', 1, T, '顶层：没写结束条件');
    if (!d.stages.length) add('miss', 2, T, '还没有子阶段');
    d.stages.forEach((s, si) => {
      const S = { type: 'stage', id: s.id }; const nm = `子阶段 ${si + 1}「${short(s.title, 12)}」`;
      if (!filled(s.title)) add('miss', 2, S, `${nm}：没有标题`);
      if (!filled(s.goal)) add('miss', 2, S, `${nm}：没写关二狗的目的`);
      if (!filled(s.start) || !filled(s.end)) add('miss', 2, S, `${nm}：开始／结束局面没写全`);
      else if (s.start.trim() === s.end.trim()) add('warn', 2, S, `${nm}：开始和结束局面一样——删掉，或并到相邻子阶段`);
      if (!filled(s.endCondition)) add('miss', 2, S, `${nm}：没写结束条件`);
      if (s.mode === 'loop' && !filled(s.loopExit)) add('miss', 2, S, `${nm}：标了循环，没写退出条件`);
      if (s.mode === 'parallel' && !filled(s.parallelGroup)) add('warn', 2, S, `${nm}：标了并行，没填并行组`);
      if (!s.beats.length) add('miss', 3, S, `${nm}：还没拆拍`);
      s.beats.forEach((b, bi) => {
        const B = { type: 'beat', id: b.id }; const bn = `拍 ${si + 1}.${bi + 1}「${short(b.text, 12)}」`;
        if (!filled(b.text) || !filled(b.reaction) || !filled(b.result)) add('miss', 3, B, `${bn}：发生／反应／结果没写全`);
        if (!filled(b.map)) add('warn', 3, B, `${bn}：没标地图`);
        if (!b.kind) add('miss', 4, B, `${bn}：没标看／做／选／略`);
        if (isAct(b)) {
          if (!filled(b.formula.verb) || !filled(b.formula.object)) add('miss', 5, B, `${bn}：公式缺动词或对象`);
          if (!filled(b.formula.resistance)) add('warn', 5, B, `${bn}：写不出阻力——考虑改回「看」`);
          if (!Object.values(b.cells).every(filled)) add('miss', 5, B, `${bn}：四格没填满`);
          if (filled(b.stuck)) add('info', 5, B, `${bn}：卡点，留给判决切片验证——${short(b.stuck, 30)}`);
          if (!mechOfBeat(d, b.id).length) add('warn', 8, B, `${bn}：没归入任何玩法`);
        }
        if (b.kind === '选' && b.options.length < 2) add('warn', 5, B, `${bn}：「选」的拍只有 ${b.options.length} 个选项——至少列两个`);
        b.options.forEach((o, oi) => {
          const on = `${bn} ${b.kind === '做' ? '做法' : '选项'} ${oi + 1}「${short(o.choice, 10)}」`;
          if (!filled(o.choice)) add('miss', 5, B, `${on}：没写${b.kind === '做' ? '怎么做' : '玩家选什么'}`);
          if (!filled(o.result)) add('miss', 5, B, `${on}：没写结果`);
          if (!filled(o.effect)) add('warn', 5, B, `${on}：没写后果（影响什么）`);
          if (b.kind === '做' && !o.works) add('warn', 5, B, `${on}：没标灵不灵`);
          if (o.goto && o.goto.type === 'stage' && !findStage(d, o.goto.stageId)) add('miss', 2, B, `${on}：去向指向的子阶段不存在`);
        });
        b.requires.forEach(r => { if (!requireTarget(d, r).ok) add('miss', 2, B, `${bn}：前置条件指向的东西已经删了`); if (r.kind === 'free' && !filled(r.note)) add('warn', 2, B, `${bn}：有一条前置条件是空的`); });
        if (b.cuttable) add('info', 6, B, `${bn}：标了可砍`);
      });
      if (s.mode === 'branch') {
        if (!optionSources(d, s.id).length) add('miss', 2, S, `${nm}：标了分支，但没有任何选项通向它——玩家到不了`);
        if (!s.mergeTo) add('warn', 2, S, `${nm}：分支没写汇合到哪（或者标「这条线在这里结束」）`);
      }
      if (s.mergeTo && s.mergeTo !== 'end' && !findStage(d, s.mergeTo)) add('miss', 2, S, `${nm}：汇合到的子阶段不存在`);
      s.requires.forEach(r => { if (!requireTarget(d, r).ok) add('miss', 2, S, `${nm}：前置条件指向的东西已经删了`); if (r.kind === 'free' && !filled(r.note)) add('warn', 2, S, `${nm}：有一条前置条件是空的`); });
      if (!filled(s.design.summary)) add('miss', 6, S, `${nm}：设计目的还空着`);
      if (s.beats.length) d.lanes.forEach(l => {
        if ((s.laneExclude || []).includes(l.id)) return;
        if (!s.beats.some(b => laneFilled(b, l))) add('warn', 7, S, `${nm}：泳道「${l.name}」整段空着——补上，或判定它不属于这一段`, 'lanes');
      });
    });
    if (!filled(m.design.summary)) add('miss', 6, T, '顶层：设计目的还空着');
    const seq = allBeats(d); const ch = laneChanges(d);
    let run = [];
    const flushRun = () => {
      if (run.length >= 3) { const f = run[0], l = run[run.length - 1]; add('warn', 7, { type: 'beat', id: f.b.id }, `情绪曲线在 ${f.si + 1}.${f.bi + 1} ～ ${l.si + 1}.${l.bi + 1} 是平的——这里要一个「转」`, 'lanes'); }
      run = [];
    };
    seq.forEach(x => {
      const val = x.b.lanes.emotion;
      if (typeof val !== 'number') { flushRun(); return; }
      if (run.length && run[0].b.lanes.emotion !== val) flushRun();
      run.push(x);
    });
    flushRun();
    seq.forEach(x => { const n = ch.get(x.b.id) || []; if (n.length >= 2) add('info', 7, { type: 'beat', id: x.b.id }, `联动点：拍 ${x.si + 1}.${x.bi + 1}「${short(x.b.text, 12)}」（${n.join('、')}）——重点设计、重点试玩`, 'lanes'); });
    d.mechanics.forEach((mc, i) => {
      const M = { type: 'mech', id: mc.id }; const nm = `玩法「${short(mc.name, 12)}」`;
      if (!filled(mc.name)) add('miss', 8, M, `玩法 ${i + 1}：没有名字`, 'mech');
      ARC.forEach(([k, label]) => { if (!mc.arc[k].length) add('miss', 8, M, `${nm}：起承转合缺「${label}」——去对应子阶段补拍`, 'mech'); });
      if (!filled(mc.ok) || !filled(mc.wrong)) add('miss', 10, M, `${nm}：判决句没写全`, 'mech');
    });
    mapGroups(d).forEach(g => g.visits.forEach(v => {
      const mv = d.mapVisits[visitKey(g.map, v.stage.id)] || {};
      if (!['time', 'light', 'who', 'can'].every(k => filled(mv[k]))) add('miss', 9, { type: 'map', id: g.map }, `地图「${g.map}」在子阶段 ${v.si + 1}「${short(v.stage.title, 10)}」的状态没填全`, 'maps');
    }));
    return list;
  }
  function criteria(d) {
    const beats = allBeats(d); const acts = beats.filter(x => isAct(x.b));
    return [
      ['每个子阶段都有：关二狗的目的、设计目的、结束条件', d.stages.length > 0 && d.stages.every(s => filled(s.goal) && filled(s.design.summary) && filled(s.endCondition))],
      ['每个做／选都填满了四格，并且归入的玩法有判决句' + (acts.length ? '' : '（还没有做／选拍）'), acts.length > 0 && acts.every(x => Object.values(x.b.cells).every(filled) && mechOfBeat(d, x.b.id).length && mechOfBeat(d, x.b.id).every(m => filled(m.ok) && filled(m.wrong)))],
      ['泳道图没有无故空着的泳道', beats.length > 0 && d.stages.every(s => !s.beats.length || d.lanes.every(l => (s.laneExclude || []).includes(l.id) || s.beats.some(b => laneFilled(b, l))))],
      ['地图汇总表齐了', beats.length > 0 && beats.every(x => filled(x.b.map)) && mapGroups(d).every(g => g.visits.every(v => { const mv = d.mapVisits[visitKey(g.map, v.stage.id)] || {}; return ['time', 'light', 'who', 'can'].every(k => filled(mv[k])); }))]
    ];
  }
  /* 各步待处理数（缺＋警），以及「当前卡在第几步」＝ 最靠前的仍有待处理项的那一步 */
  function progress(d, issues) {
    issues = issues || computeIssues(d);
    const pending = {};
    for (let n = 1; n <= 10; n++) pending[n] = 0;
    issues.forEach(i => { if (i.level !== 'info') pending[i.step]++; });
    let current = null;
    for (let n = 1; n <= 10; n++) if (pending[n]) { current = n; break; }
    return { pending, current, currentName: current ? STEP_NAMES[current] : null };
  }

  /* ---------- 标签 ---------- */
  function objLabel(d, objId) {
    if (objId === 'top') return '顶层';
    if (objId === 'doc') return '梗概';
    if (objId.endsWith('.design')) return objLabel(d, objId.slice(0, -7)) + '·设计目的';
    const st = findStage(d, objId); if (st) return `子阶段 ${st.si + 1}「${short(st.s.title, 20)}」`;
    const bt = findBeat(d, objId); if (bt) return `拍 ${bt.si + 1}.${bt.bi + 1}「${short(bt.b.text, 20)}」`;
    const mc = d.mechanics.find(m => m.id === objId); if (mc) return `玩法「${short(mc.name, 20)}」`;
    if (objId.startsWith('lane')) { const l = d.lanes.find(x => 'lane' + x.id === objId); if (l) return `泳道「${l.name}」`; }
    if (objId.startsWith('park')) { const p = d.parking.find(x => 'park' + x.id === objId); if (p) return `停车场「${short(p.text, 20)}」`; }
    if (objId.startsWith('mv')) {
      const k = Object.keys(d.mapVisits).find(x => 'mv' + hashKey(x) === objId);
      if (k) { const [mm, sid] = k.split('||'); const s2 = findStage(d, sid); return `地图「${mm}」@${s2 ? '子阶段 ' + (s2.si + 1) : '已删的子阶段'}`; }
    }
    return '（已删除的条目）';
  }
  function keyLabel(d, key) {
    if (!key) return '结构调整（增删、移动、标看做选、勾选等）';
    const i = key.indexOf(':'); const objId = key.slice(0, i), path = key.slice(i + 1);
    let f = FIELD_LABELS[path];
    if (path.startsWith('lanes.')) { const l = d.lanes.find(x => x.id === path.slice(6)); f = `泳道「${l ? l.name : '?'}」`; }
    if (path === 'summary' && objId.endsWith('.design')) f = '设计目的（归纳）';
    return `${objLabel(d, objId)} · ${f || path}`;
  }

  /* ---------- 全文 Markdown ---------- */
  function buildMarkdown(d) {
    const L = []; const m = d.meta;
    const D = g => {
      const out = [];
      if (filled(g.summary)) out.push(`- **设计目的**：${mdEsc(g.summary)}`);
      if (filled(g.deleteTest)) out.push(`  - 删除测试：${mdEsc(g.deleteTest)}`);
      DESIGN_KEYS.forEach(([k, l]) => { if (filled(g[k])) out.push(`  - ${l}：${mdEsc(g[k])}`); });
      if (filled(g.backward)) out.push(`  - 倒推：${mdEsc(g.backward)}`);
      return out;
    };
    L.push(`# ${m.title || '未命名任务'}`, '', '## 顶层', '');
    L.push(`- **这段讲什么**：${mdEsc(m.summary)}`, `- **关二狗怎么变了**：从 ${mdEsc(m.changeFrom)} 到 ${mdEsc(m.changeTo)}`, `- **关二狗的目的**：${mdEsc(m.goal)}`, `- **结束条件**：${mdEsc(m.endCondition)}`, ...D(m.design), '');
    L.push('## 子阶段', '');
    d.stages.forEach((s, si) => {
      const mode = s.mode === 'loop' ? `（循环，退出条件：${mdEsc(s.loopExit)}）` : s.mode === 'parallel' ? `（并行组：${mdEsc(s.parallelGroup)}）` : '';
      L.push(`### ${si + 1}. ${s.title || '未命名'}${mode}`, '');
      L.push(`- **关二狗的目的**：${mdEsc(s.goal)}`, `- **开始**：${mdEsc(s.start)}`, `- **结束**：${mdEsc(s.end)}`, `- **结束条件**：${mdEsc(s.endCondition)}`, ...D(s.design));
      const excl = d.lanes.filter(l => (s.laneExclude || []).includes(l.id)).map(l => l.name);
      if (excl.length) L.push(`- **判定不属于这一段的泳道**：${excl.join('、')}`);
      if (s.mode === 'branch') { const src = optionSources(d, s.id); L.push(`- **从哪来**：${src.length ? src.map(x => `拍 ${x.si + 1}.${x.bi + 1} 选「${mdEsc(x.o.choice)}」`).join('；') : '（没有选项通向它）'}`); }
      if (s.mergeTo || s.mode === 'branch') L.push(`- **之后**：${mergeText(d, s)}`);
      if (s.requires.length) L.push(`- **前置条件**：${s.requires.map(r => mdEsc(requireText(d, r))).join('；')}`);
      L.push('');
      if (s.beats.length) {
        L.push('| # | 发生 | 反应 | 结果 | 类型 | 地图 | 可砍 | 原文摘句 |', '|---|---|---|---|---|---|---|---|');
        s.beats.forEach((b, bi) => L.push(`| ${si + 1}.${bi + 1} | ${mdEsc(b.text)} | ${mdEsc(b.reaction)} | ${mdEsc(b.result)} | ${b.kind} | ${mdEsc(b.map)} | ${b.cuttable ? '可砍' : ''} | ${mdEsc(b.source)} |`));
        L.push('');
        s.beats.forEach((b, bi) => {
          if (!isAct(b)) return;
          L.push(`#### ${si + 1}.${bi + 1}（${b.kind}）${mdEsc(b.text)}`, '');
          L.push(`- **公式**：${mdEsc(b.formula.verb) || '＿'} ＋ ${mdEsc(b.formula.object) || '＿'} ＋ ${mdEsc(b.formula.resistance) || '＿'}`);
          L.push(`- 玩家看到什么：${mdEsc(b.cells.see)}`, `- 玩家做什么：${mdEsc(b.cells.act)}`, `- 游戏怎么回应：${mdEsc(b.cells.respond)}`, `- 做错了会怎样：${mdEsc(b.cells.wrong)}`);
          if (filled(b.stuck)) L.push(`- **卡点**：${mdEsc(b.stuck)}`);
          if (b.requires.length) L.push(`- **前置条件**：${b.requires.map(r => mdEsc(requireText(d, r))).join('；')}`);
          if (b.options.length) {
            const isDo = b.kind === '做';
            L.push('', isDo ? '| 做法 | 灵不灵 | 反应 | 结果 | 后果 | 去向 |' : '| 选项 | 反应 | 结果 | 后果 | 去向 |', isDo ? '|---|---|---|---|---|---|' : '|---|---|---|---|---|');
            b.options.forEach(o => L.push(isDo
              ? `| ${mdEsc(o.choice)} | ${WORKS_NAMES[o.works] || ''} | ${mdEsc(o.reaction)} | ${mdEsc(o.result)} | ${mdEsc(o.effect)} | ${gotoText(d, o)} |`
              : `| ${mdEsc(o.choice)} | ${mdEsc(o.reaction)} | ${mdEsc(o.result)} | ${mdEsc(o.effect)} | ${gotoText(d, o)} |`));
          }
          L.push('');
        });
      }
    });
    if (d.mechanics.length) {
      L.push('## 玩法', '');
      d.mechanics.forEach(mc => {
        L.push(`### ${mc.name || '未命名玩法'}`, '', `- **成立的时候，玩家会**：${mdEsc(mc.ok)}`, `- **做错了，游戏会**：${mdEsc(mc.wrong)}`);
        ARC.forEach(([k, t, hint]) => L.push(`- ${t}（${hint}）：${mc.arc[k].map(id => { const f = findBeat(d, id); return f ? `${f.si + 1}.${f.bi + 1} ${mdEsc(f.b.text)}` : ''; }).filter(Boolean).join('；') || '（空）'}`));
        if (filled(mc.note)) L.push(`- 备注：${mdEsc(mc.note)}`);
        L.push('');
      });
    }
    const groups = mapGroups(d);
    if (groups.length) {
      L.push('## 地图汇总', '', '| 地图 | 子阶段 | 拍 | 时段 | 光 | 谁在场 | 能做什么 |', '|---|---|---|---|---|---|---|');
      groups.forEach(g => g.visits.forEach(vs => { const mv = d.mapVisits[visitKey(g.map, vs.stage.id)] || {}; L.push(`| ${mdEsc(g.map)} | ${vs.si + 1}. ${mdEsc(vs.stage.title)} | ${vs.beats.map(({ bi }) => `${vs.si + 1}.${bi + 1}`).join(' ')} | ${mdEsc(mv.time)} | ${mdEsc(mv.light)} | ${mdEsc(mv.who)} | ${mdEsc(mv.can)} |`); }));
      L.push('');
    }
    const seq = allBeats(d);
    if (seq.length) {
      L.push('## 泳道', '', `| 拍 | ${d.lanes.map(l => mdEsc(l.name)).join(' | ')} |`, `|---|${d.lanes.map(() => '---').join('|')}|`);
      seq.forEach(x => L.push(`| ${x.si + 1}.${x.bi + 1} ${mdEsc(short(x.b.text, 14))} | ${d.lanes.map(l => { const val = x.b.lanes[l.id]; return val === undefined ? '' : (typeof val === 'number' && val > 0 ? '+' + val : mdEsc(String(val))); }).join(' | ')} |`));
      L.push('');
    }
    if (d.parking.length) {
      L.push('## 停车场', '');
      d.parking.forEach(p => { const f = p.stageId ? findStage(d, p.stageId) : null; L.push(`- [${p.done ? 'x' : ' '}] ${mdEsc(p.text)}${f ? `（子阶段 ${f.si + 1}）` : ''}`); });
      L.push('');
    }
    if (filled(d.synopsis)) L.push('## 梗概原文', '', ...d.synopsis.split('\n').map(x => '> ' + x), '');
    return L.join('\n');
  }

  const api = {
    uid, filled, short, hashKey, mdEsc,
    DESIGN_KEYS, ARC, KINDS, KCLS, MODE_NAMES, WORKS_NAMES, LANE_KIND_NAMES, STEP_NAMES, GUIDE_STEPS, GUIDE_RULES, FIELD_LABELS,
    newDesign, newDoc, newStage, newBeat, newMechanic, normalize,
    allBeats, findStage, findBeat, mechOfBeat, laneFilled, isAct, visitKey, mapGroups,
    newOption, newRequire, optionSources, gotoText, mergeText, requireTarget, requireText, stageRefText,
    flatEmotionIds, laneChanges, computeIssues, criteria, progress,
    objLabel, keyLabel, buildMarkdown
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChaipaiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
