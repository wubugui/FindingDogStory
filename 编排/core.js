/*
 * 拆拍台 core：数据模型、检查规则、标签、全文渲染。
 * 页面（拆拍台.html，<script src="core.js">）和 CLI（chaipai.cjs，require）共用这一份，
 * 检查规则只在这里维护，两边永远一致。纯函数，不碰 DOM、不碰文件。
 *
 * 方法（2026-09-18 定，来源见 METHOD_SOURCES）：
 *   1 顶层 → 2 分段表（每段先写设计目的）→ 3 拆拍 → 4 横看（泳道、可砍）→ 5 标看/做/选
 *   → 6 细化 → 7 接线（条件、状态、分支）→ 8 玩法（归纳、起承转合、判决句）→ 9 交接（地图）
 * 每一步只依赖前面的步骤，没有环。
 */
(function (root) {
  'use strict';

  /* ---------- 基础 ---------- */
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const filled = s => !!(s && String(s).trim());
  const short = (t, n = 16) => { t = (t || '').replace(/\s+/g, ' ').trim(); if (!t) return '（未写）'; return t.length > n ? t.slice(0, n) + '…' : t; };
  function hashKey(s) { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
  const mdEsc = t => (t || '').replace(/\|/g, '｜').replace(/\s*\n\s*/g, ' ').trim();
  const oneLineText = t => (t || '').replace(/\s+/g, ' ').trim();

  /* ---------- 常量 ---------- */
  const DESIGN_KEYS = [['learn', '学会了', '规则或操作'], ['know', '知道了', '信息或伏笔'], ['feel', '感受到', '情绪拍'], ['gain', '得到或失去了', '物件、状态']];
  const ARC = [['qi', '起', '教：安全地学会'], ['cheng', '承', '用：正常使用'], ['zhuan', '转', '变：规则被扭一下'], ['he', '合', '极：用到头或崩掉']];
  const KINDS = [['看', '看 · 演出'], ['做', '做 · 玩家操作'], ['选', '选 · 玩家决定']];
  const KCLS = { '看': 'see', '做': 'do', '选': 'choose', '': 'none' };
  const MODE_NAMES = { normal: '普通', loop: '循环', parallel: '并行', branch: '分支' };
  const TRACK_NAMES = { main: '主线', optional: '可选' };
  const WORKS_NAMES = { yes: '灵', no: '不灵', maybe: '看情况' };
  const LANE_KIND_NAMES = { curve: '曲线（-3～+3）', trend: '升降', text: '文字' };
  const STEP_NAMES = { 1: '顶层', 2: '分段表', 3: '拆拍', 4: '横看', 5: '标看／做／选', 6: '细化', 7: '接线', 8: '玩法', 9: '交接' };
  const GUIDE_STEPS = [
    { n: 1, name: '顶层', text: '定这次拆的切片：这段讲什么、关二狗从什么变成什么、他要什么、要玩家整体体验什么。', src: '体验目标在立项时就定（Lemarchand）；故事级的价值翻转（McKee）' },
    { n: 2, name: '分段表', text: '按「局面变了」切子阶段，每段一行：地点·时段·氛围 / 开始和结束局面 / 关二狗要什么 / 设计目的（学到·知道·感受·得失）/ 登场角色与物件 / 伏线。设计目的在这里就写，不等拆完拍。', src: '顽皮狗 macro 表每行并排填 Player Goal / Design Goal / Emotional Beat；箱書き每箱先写目的；任天堂先定「教什么」' },
    { n: 3, name: '拆拍', text: '每段拆成拍：发生 → 反应 → 结果，一拍＝局面翻一次；标场所、在场者。这一步不想玩法。', src: 'McKee：拍＝一次动作/反应，场＝一次价值翻转；箱書き小箱' },
    { n: 4, name: '横看', text: '拍拆完横着看：情绪曲线找平段，系统泳道找空档和扎堆；对照每段的设计目的，跟目的无关的拍标可砍。', src: 'Rogers beat chart 找 gaps & clumping；Valve 强度曲线；Schell 兴趣曲线' },
    { n: 5, name: '标看／做／选', text: '每拍标一个字。判据只有一条：这一拍的变化能不能由玩家的动作触发——能就做/选，不能才演。没意义的玩法段和过长的纯对话都砍。', src: 'inkle「玩家做的即主角做的」；CDPR 对 fetch quest 宣战' },
    { n: 6, name: '细化', text: '做：动词＋对象＋阻力，四格；多种做法用做法表。选：两难＋选项表（选什么、结果、后果、状态变化、去向）。只差后果→继续下一拍；改道→从选项新建分支子阶段。填不出就写卡点。', src: 'ink 的 gather（只差后果落回同一点）与 divert（真分叉）；Sasko：后果要预告、分支可不对等' },
    { n: 7, name: '接线', text: '前置条件、循环退出、分支汇合都读状态。检查：到不了的分支、永远满足不了的条件、走过分支没记状态、没人用的状态。', src: 'storylet ＝ {前置条件, 内容, 效果}（Short、Failbetter、articy、ink）；分支与状态是两套正交机制（Ashwell）' },
    { n: 8, name: '玩法', text: '做/选拍按动词分组，每组一个玩法；每个玩法走 起（安全处教）→ 承 → 转（反转）→ 合（用完即弃）；写判决句，拿成品切片给固定几个人试。', src: '任天堂起承転結关卡结构；Golden Idol 固定试玩人' },
    { n: 9, name: '交接', text: '按地图汇总每次来时的时段、光、谁在场；能做什么从做/选拍自动得出。给做场景用。', src: 'Rogers beat chart 的时段/色彩列；箱書き的場所·時間' }
  ];
  const GUIDE_RULES = [
    '一层拆完整段，才往下拆一层。想到下一层的点子丢「停车场」，当下不往下钻。',
    '卡住就退回上一层：拍拆不动＝那个子阶段的开始和结束没想清楚；四格填不出＝那一拍的「结果」没想清楚。'
  ];
  const METHOD_SOURCES = [
    { name: 'Lemarchand《A Playful Production Process》macro 表模板（Player Goal / Design Goal / Emotional Beat）', url: 'https://www.playfulproductionprocess.com/templates/' },
    { name: 'Scott Rogers《Level Up!》Beat Chart', url: 'https://books.google.com/books/about/Level_Up.html?id=8w_ETFmHrewC' },
    { name: '日式箱書き：大箱・中箱・小箱', url: 'https://www.small-trickster.com/how_to_write_a_hakogaki/' },
    { name: 'McKee《Story》：beat / scene / sequence / act', url: 'https://www.shortform.com/blog/robert-mckee-story-structure/' },
    { name: '任天堂 Hayashida：起承転結关卡结构', url: 'https://www.engadget.com/2015-03-17-super-mario-3d-world-design.html' },
    { name: 'Valve HL2 设计流程（节奏与强度曲线）', url: 'https://cdn.akamai.steamstatic.com/apps/valve/2006/GDC2006_HL2DesignProcess.pdf' },
    { name: 'CDPR 任务设计问答（对 fetch quest 宣战）', url: 'https://forums.cdprojektred.com/forum/en/the-witcher-series/the-witcher-3-wild-hunt/72882-the-questing-beast-a-q-a-with-red-quest-designers-pawel-sasko-and-mateusz-tomaszkiewicz' },
    { name: 'inkle Jon Ingold 访谈（玩家做的即主角做的）', url: 'https://somanygames.co.uk/articles/jon-ingold/' },
    { name: 'Ashwell：Standard Patterns in Choice-Based Games', url: 'https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/' },
    { name: 'Emily Short：Storylets: You Want Them', url: 'https://emshort.blog/2019/11/29/storylets-you-want-them/' },
    { name: 'Failbetter：Echo Bazaar Narrative Structures', url: 'https://www.failbettergames.com/news/echo-bazaar-narrative-structures-part-two' },
    { name: 'ink 写作手册（choice / gather / divert / 变量）', url: 'https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md' }
  ];
  const FIELD_LABELS = {
    title: '标题', summary: '这段讲什么', changeFrom: '关二狗从', changeTo: '关二狗到', goal: '关二狗的目的', experience: '体验目标',
    setting: '地点·时段·氛围', start: '开始时局面', end: '结束时局面', cast: '登场角色与物件', foreshadow: '伏线', parallelGroup: '并行组',
    text: '发生了什么', reaction: '关二狗怎么反应', result: '结果', source: '原文摘句', map: '地图', who: '在场者',
    'formula.verb': '公式·动词', 'formula.object': '公式·对象', 'formula.resistance': '公式·阻力',
    'cells.see': '四格·玩家看到什么', 'cells.act': '四格·玩家做什么', 'cells.respond': '四格·游戏怎么回应', 'cells.wrong': '四格·做错了会怎样',
    dilemma: '两难', stuck: '卡点', name: '名字', ok: '判决句·成立的时候玩家会', wrong: '判决句·做错了游戏会', note: '备注', synopsis: '梗概原文',
    time: '时段', light: '光', who_map: '谁在场',
    deleteTest: '删除测试', learn: '学会了', know: '知道了', feel: '感受到', gain: '得到或失去了', backward: '倒推',
    choice: '选项／做法', effect: '后果'
  };

  /* ---------- 数据模型 ---------- */
  const newDesign = () => ({ learn: '', know: '', feel: '', gain: '', deleteTest: '', backward: '', summary: '' });
  function newDoc() {
    return {
      app: '拆拍台', version: 2,
      meta: { title: '未命名任务', summary: '', changeFrom: '', changeTo: '', goal: '', experience: '' },
      synopsis: '',
      lanes: [{ id: 'emotion', name: '情绪', kind: 'curve' }, { id: uid(), name: '三把火', kind: 'trend' }, { id: uid(), name: '玩家知道什么', kind: 'text' }],
      stages: [], mechanics: [], mapVisits: {}, parking: [],
      facts: []   // 状态：一件已经成立的事（撂过尸、拿了帕子包）。选项／拍让它成立，前置条件读它
    };
  }
  const newStage = () => ({ id: uid(), title: '', track: 'main', setting: '', goal: '', start: '', end: '', cast: '', foreshadow: '', mode: 'normal', loopExitWhen: [], parallelGroup: '', mergeTo: '', requires: [], design: newDesign(), laneExclude: [], collapsed: false, beats: [] });
  const newBeat = () => ({ id: uid(), text: '', reaction: '', result: '', source: '', map: '', who: '', kind: '', formula: { verb: '', object: '', resistance: '' }, cells: { see: '', act: '', respond: '', wrong: '' }, dilemma: '', stuck: '', cuttable: false, lanes: {}, options: [], requires: [], sets: [] });
  /* 选项（「选」的拍）/ 做法（「做」的拍）。goto：next 继续下一拍 / stage 跳到某子阶段 / end 这条线结束 */
  const newOption = () => ({ id: uid(), choice: '', works: '', reaction: '', result: '', effect: '', goto: { type: 'next', stageId: '' }, sets: [] });
  /* 让某状态成立（value:true）或不再成立（value:false） */
  const newSet = factId => ({ factId, value: true });
  const newFact = name => ({ id: uid(), name: name || '' });
  /* 条件（前置条件、循环退出条件共用）：kind = fact（某状态成立；negate 为 true 时＝不成立）/ stage（子阶段走完）/ beat（某拍发生过）/ option（某拍选过某选项）。
   * 没有纯文字条件：指不到具体东西的，就新建一个状态。 */
  const newRequire = () => ({ id: uid(), kind: 'fact', id2: '', optionId: '', negate: false });
  const newMechanic = () => ({ id: uid(), name: '', ok: '', wrong: '', note: '', arc: { qi: [], cheng: [], zhuan: [], he: [] } });

  /* 读任何版本的文件；旧字段就地迁移，不丢内容 */
  function normalize(d) {
    if (!d || typeof d !== 'object') throw new Error('不是拆拍台文件');
    const base = newDoc();
    const out = Object.assign(base, d);
    out.version = 2;
    out.facts = (Array.isArray(d.facts) ? d.facts : []).map(f => Object.assign(newFact(), f));
    const factByName = name => { const n = (name || '').trim() || '未命名状态'; let f = out.facts.find(x => x.name.trim() === n); if (!f) { f = newFact(n); out.facts.push(f); } return f; };
    const normReq = r => {
      const nr = Object.assign(newRequire(), r); nr.negate = !!nr.negate;
      if (r && r.kind === 'free') { nr.kind = 'fact'; nr.id2 = factByName(r.note).id; nr.optionId = ''; }
      delete nr.note;
      return nr;
    };
    const normSets = list => (Array.isArray(list) ? list : []).filter(x => x && x.factId).map(x => ({ factId: x.factId, value: x.value !== false }));
    const oldMeta = d.meta || {};
    out.meta = Object.assign(newDoc().meta, oldMeta);
    // v1：顶层的「结束条件」并进「这段讲什么」；顶层的设计目的块并成「体验目标」
    if (filled(oldMeta.endCondition) && !filled(out.meta.experience) && !oneLineText(out.meta.summary).includes(oneLineText(oldMeta.endCondition))) out.meta.summary = [out.meta.summary, '结束于：' + oldMeta.endCondition].filter(filled).join('\n');
    if (oldMeta.design && !filled(out.meta.experience)) {
      const g = oldMeta.design;
      const parts = [];
      if (filled(g.summary)) parts.push(g.summary);
      [['deleteTest', '删除测试'], ...DESIGN_KEYS.map(([k, l]) => [k, l]), ['backward', '倒推']].forEach(([k, l]) => { if (filled(g[k])) parts.push(`${l}：${g[k]}`); });
      out.meta.experience = parts.join('\n');
    }
    delete out.meta.endCondition; delete out.meta.design;
    out.lanes = Array.isArray(d.lanes) && d.lanes.length ? d.lanes : base.lanes;
    if (!out.lanes.some(l => l.id === 'emotion')) out.lanes.unshift({ id: 'emotion', name: '情绪', kind: 'curve' });
    out.stages = (d.stages || []).map(s => {
      const ns = Object.assign(newStage(), s);
      if (ns.track !== 'optional') ns.track = 'main';
      ns.design = Object.assign(newDesign(), s.design || {});
      ns.laneExclude = s.laneExclude || [];
      ns.requires = (s.requires || []).map(normReq);
      ns.loopExitWhen = (s.loopExitWhen || []).map(normReq);
      if (typeof s.loopExit === 'string' && s.loopExit.trim()) ns.loopExitWhen.push(Object.assign(newRequire(), { id2: factByName(s.loopExit).id }));
      delete ns.loopExit;
      // v1：子阶段的「结束条件」并进「结束时局面」
      if (filled(s.endCondition) && !oneLineText(ns.end).includes(oneLineText(s.endCondition))) ns.end = [ns.end, '（结束条件：' + s.endCondition + '）'].filter(filled).join(' ');
      delete ns.endCondition;
      ns.mergeTo = s.mergeTo || '';
      ns.beats = (s.beats || []).map(b => {
        const nb = Object.assign(newBeat(), b);
        nb.formula = Object.assign(newBeat().formula, b.formula || {});
        nb.cells = Object.assign(newBeat().cells, b.cells || {});
        nb.lanes = b.lanes || {};
        nb.options = (b.options || []).map(o => { const no = Object.assign(newOption(), o); no.goto = Object.assign({ type: 'next', stageId: '' }, o.goto || {}); no.sets = normSets(o.sets); return no; });
        nb.requires = (b.requires || []).map(normReq);
        nb.sets = normSets(b.sets);
        // v1：「略」不再是一种拍——一笔带过的就是可砍的「看」
        if (nb.kind === '略') { nb.kind = '看'; nb.cuttable = true; }
        if (!KCLS.hasOwnProperty(nb.kind)) nb.kind = '';
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
  /* 交接用：这次来这张图能做什么，从做/选拍自动得出 */
  function mapCanText(visit) {
    return visit.beats.filter(({ b }) => isAct(b)).map(({ b }) => {
      const f = [b.formula.verb, b.formula.object].filter(filled).join(' ');
      return (b.kind === '选' ? '选：' : '') + (f || oneLineText(b.text) || '（未写）');
    }).join('；');
  }
  /* 细化完成判定：做＝公式＋（四格 或 做法表）；选＝两难＋至少两个选项，每个选项写了选什么和结果 */
  const optionDone = o => filled(o.choice) && filled(o.result);
  function detailDone(b) {
    if (b.kind === '做') return filled(b.formula.verb) && filled(b.formula.object) && (b.options.length ? b.options.every(optionDone) : Object.values(b.cells).every(filled));
    if (b.kind === '选') return filled(b.dilemma) && b.options.length >= 2 && b.options.every(optionDone);
    return true;
  }
  /* 第 8 步：做/选拍按公式动词分组，同一个动词反复出现就是一个玩法 */
  function verbGroups(d) {
    const g = new Map();
    allBeats(d).forEach(x => {
      if (!isAct(x.b)) return;
      const verb = oneLineText(x.b.formula.verb) || (x.b.kind === '选' ? '选' : '');
      const key = verb || '（没写动词）';
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(x);
    });
    return [...g].map(([verb, beats]) => ({ verb, beats })).sort((a, b) => b.beats.length - a.beats.length);
  }

  /* ---------- 网状关系 ---------- */
  /* 哪些拍的哪些选项通向某个子阶段 */
  function optionSources(d, stageId) {
    const out = [];
    allBeats(d).forEach(x => x.b.options.forEach(o => { if (o.goto && o.goto.type === 'stage' && o.goto.stageId === stageId) out.push(Object.assign({ o }, x)); }));
    return out;
  }
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
  const findFact = (d, id) => (d.facts || []).find(f => f.id === id) || null;
  function setsText(d, sets) {
    return (sets || []).map(x => { const f = findFact(d, x.factId); return `「${f ? f.name || '未命名状态' : '已删除的状态'}」${x.value ? '成立' : '不再成立'}`; }).join('、');
  }
  /* 状态在哪被设、在哪被用 */
  function factUsage(d, factId) {
    const setBy = [], usedBy = [];
    allBeats(d).forEach(x => {
      x.b.sets.forEach(st => { if (st.factId === factId) setBy.push({ where: 'beat', value: st.value, si: x.si, bi: x.bi, b: x.b, s: x.s }); });
      x.b.options.forEach(o => o.sets.forEach(st => { if (st.factId === factId) setBy.push({ where: 'option', value: st.value, si: x.si, bi: x.bi, b: x.b, s: x.s, o }); }));
      x.b.requires.forEach(r => { if (r.kind === 'fact' && r.id2 === factId) usedBy.push({ where: 'beat', negate: r.negate, si: x.si, bi: x.bi, b: x.b, s: x.s }); });
    });
    d.stages.forEach((st, si) => {
      st.requires.forEach(r => { if (r.kind === 'fact' && r.id2 === factId) usedBy.push({ where: 'stage', negate: r.negate, si, s: st }); });
      st.loopExitWhen.forEach(r => { if (r.kind === 'fact' && r.id2 === factId) usedBy.push({ where: 'loopExit', negate: r.negate, si, s: st }); });
    });
    return { setBy, usedBy };
  }
  function usageText(u) {
    if (u.where === 'stage') return `子阶段 ${u.si + 1} 的前置条件`;
    if (u.where === 'loopExit') return `子阶段 ${u.si + 1} 的循环退出条件`;
    if (u.where === 'option') return `拍 ${u.si + 1}.${u.bi + 1} 选「${short(u.o.choice, 10)}」`;
    return `拍 ${u.si + 1}.${u.bi + 1}`;
  }
  function requireTarget(d, r) {
    if (r.kind === 'fact') { const f = findFact(d, r.id2); return f ? { ok: true, text: `状态「${f.name || '未命名状态'}」${r.negate ? '不成立' : '成立'}` } : { ok: false, text: '（已删除的状态）' }; }
    if (r.kind === 'stage') { const f = findStage(d, r.id2); return f ? { ok: true, text: `子阶段 ${f.si + 1}「${short(f.s.title, 14)}」走完` } : { ok: false, text: '（已删除的子阶段）' }; }
    if (r.kind === 'beat') { const f = findBeat(d, r.id2); return f ? { ok: true, text: `拍 ${f.si + 1}.${f.bi + 1}「${short(f.b.text, 14)}」发生过` } : { ok: false, text: '（已删除的拍）' }; }
    if (r.kind === 'option') {
      const f = findBeat(d, r.id2); const o = f && f.b.options.find(x => x.id === r.optionId);
      return o ? { ok: true, text: `拍 ${f.si + 1}.${f.bi + 1} 选了「${short(o.choice, 14)}」` } : { ok: false, text: '（已删除的选项）' };
    }
    return { ok: false, text: '' };
  }
  function requireText(d, r) { return requireTarget(d, r).text || '（没选条件）'; }

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

  /* ---------- 检查（按方法的九步分组；每一步只依赖前面的步骤） ---------- */
  function computeIssues(d) {
    const list = [];
    const add = (level, step, target, text, tab = 'detail') => list.push({ level, step, target, text, tab });
    const m = d.meta, T = { type: 'top' };
    /* 1 顶层 */
    if (!filled(m.summary)) add('miss', 1, T, '顶层：没写「这段讲什么」');
    if (!filled(m.changeFrom) || !filled(m.changeTo)) add('miss', 1, T, '顶层：「关二狗怎么变了」没写全');
    if (!filled(m.goal)) add('miss', 1, T, '顶层：没写关二狗的目的');
    if (!filled(m.experience)) add('miss', 1, T, '顶层：没写体验目标（要玩家整体体验什么）');
    /* 2 分段表 */
    if (!d.stages.length) add('miss', 2, T, '还没有子阶段');
    d.stages.forEach((s, si) => {
      const S = { type: 'stage', id: s.id }; const nm = `子阶段 ${si + 1}「${short(s.title, 12)}」`;
      if (!filled(s.title)) add('miss', 2, S, `${nm}：没有标题`);
      if (!filled(s.setting)) add('warn', 2, S, `${nm}：没写地点·时段·氛围`);
      if (!filled(s.goal)) add('miss', 2, S, `${nm}：没写关二狗的目的`);
      if (!filled(s.start) || !filled(s.end)) add('miss', 2, S, `${nm}：开始／结束局面没写全`);
      else if (s.start.trim() === s.end.trim()) add('warn', 2, S, `${nm}：开始和结束局面一样——删掉，或并到相邻子阶段`);
      if (!filled(s.design.summary)) add('miss', 2, S, `${nm}：设计目的还空着——先写这段要玩家学到、感到什么，再往下拆`);
      if (s.mode === 'parallel' && !filled(s.parallelGroup)) add('warn', 2, S, `${nm}：标了并行，没填并行组`);
      /* 3 拆拍 */
      if (!s.beats.length) add('miss', 3, S, `${nm}：还没拆拍`);
      s.beats.forEach((b, bi) => {
        const B = { type: 'beat', id: b.id }; const bn = `拍 ${si + 1}.${bi + 1}「${short(b.text, 12)}」`;
        if (!filled(b.text) || !filled(b.reaction) || !filled(b.result)) add('miss', 3, B, `${bn}：发生／反应／结果没写全`);
        if (!filled(b.map)) add('warn', 3, B, `${bn}：没标地图`);
        /* 4 横看 */
        if (b.cuttable) add('info', 4, B, `${bn}：标了可砍`);
        /* 5 标 */
        if (!b.kind) add('miss', 5, B, `${bn}：没标看／做／选`);
        /* 6 细化 */
        if (b.kind === '做') {
          if (!filled(b.formula.verb) || !filled(b.formula.object)) add('miss', 6, B, `${bn}：公式缺动词或对象`);
          if (!filled(b.formula.resistance)) add('warn', 6, B, `${bn}：写不出阻力——考虑改回「看」`);
          if (!b.options.length && !Object.values(b.cells).every(filled)) add('miss', 6, B, `${bn}：四格没填满`);
        }
        if (b.kind === '选') {
          if (!filled(b.dilemma)) add('miss', 6, B, `${bn}：没写两难（选每一边各失去什么）`);
          if (b.options.length < 2) add('warn', 6, B, `${bn}：「选」的拍只有 ${b.options.length} 个选项——至少列两个`);
        }
        if (isAct(b) && filled(b.stuck)) add('info', 6, B, `${bn}：卡点，留给判决切片验证——${short(b.stuck, 30)}`);
        b.options.forEach((o, oi) => {
          const on = `${bn} ${b.kind === '做' ? '做法' : '选项'} ${oi + 1}「${short(o.choice, 10)}」`;
          if (!filled(o.choice)) add('miss', 6, B, `${on}：没写${b.kind === '做' ? '怎么做' : '玩家选什么'}`);
          if (!filled(o.result)) add('miss', 6, B, `${on}：没写结果`);
          if (!filled(o.effect)) add('warn', 6, B, `${on}：没写后果（影响什么）`);
          if (b.kind === '做' && !o.works) add('warn', 6, B, `${on}：没标灵不灵`);
          /* 7 接线 */
          if (o.goto && o.goto.type === 'stage' && !findStage(d, o.goto.stageId)) add('miss', 7, B, `${on}：去向指向的子阶段不存在`);
        });
        b.requires.forEach(r => { if (!requireTarget(d, r).ok) add('miss', 7, B, `${bn}：有一条前置条件没选好，或指向的东西已经删了`); });
        [...b.sets, ...b.options.flatMap(o => o.sets)].forEach(st => { if (!findFact(d, st.factId)) add('miss', 7, B, `${bn}：让成立的状态已经删了`); });
        /* 8 玩法 */
        if (isAct(b) && !mechOfBeat(d, b.id).length) add('warn', 8, B, `${bn}：没归入任何玩法`);
      });
      /* 4 横看：泳道整段空 */
      if (s.beats.length) d.lanes.forEach(l => {
        if ((s.laneExclude || []).includes(l.id)) return;
        if (!s.beats.some(b => laneFilled(b, l))) add('warn', 4, S, `${nm}：泳道「${l.name}」整段空着——补上，或判定它不属于这一段`, 'lanes');
      });
      /* 7 接线：子阶段 */
      if (s.mode === 'loop' && !s.loopExitWhen.length) add('miss', 7, S, `${nm}：标了循环，没设退出条件——玩家会困在里面`);
      s.loopExitWhen.forEach(r => { if (!requireTarget(d, r).ok) add('miss', 7, S, `${nm}：循环退出条件没选好，或指向的东西已经删了`); });
      if (s.mode === 'branch') {
        if (!optionSources(d, s.id).length) add('miss', 7, S, `${nm}：标了分支，但没有任何选项通向它——玩家到不了`);
        if (!s.mergeTo) add('warn', 7, S, `${nm}：分支没写汇合到哪（或者标「这条线在这里结束」）`);
      }
      if (s.mergeTo && s.mergeTo !== 'end' && !findStage(d, s.mergeTo)) add('miss', 7, S, `${nm}：汇合到的子阶段不存在`);
      s.requires.forEach(r => { if (!requireTarget(d, r).ok) add('miss', 7, S, `${nm}：有一条前置条件没选好，或指向的东西已经删了`); });
    });
    /* 4 横看：情绪平段、联动点 */
    const seq = allBeats(d); const ch = laneChanges(d);
    let run = [];
    const flushRun = () => {
      if (run.length >= 3) { const f = run[0], l = run[run.length - 1]; add('warn', 4, { type: 'beat', id: f.b.id }, `情绪曲线在 ${f.si + 1}.${f.bi + 1} ～ ${l.si + 1}.${l.bi + 1} 是平的——这里要一个「转」`, 'lanes'); }
      run = [];
    };
    seq.forEach(x => {
      const val = x.b.lanes.emotion;
      if (typeof val !== 'number') { flushRun(); return; }
      if (run.length && run[0].b.lanes.emotion !== val) flushRun();
      run.push(x);
    });
    flushRun();
    seq.forEach(x => { const n = ch.get(x.b.id) || []; if (n.length >= 2) add('info', 4, { type: 'beat', id: x.b.id }, `联动点：拍 ${x.si + 1}.${x.bi + 1}「${short(x.b.text, 12)}」（${n.join('、')}）——重点设计、重点试玩`, 'lanes'); });
    /* 7 接线：状态 */
    (d.facts || []).forEach(f => {
      const nmf = `状态「${short(f.name, 12)}」`; const u = factUsage(d, f.id); const F = { type: 'fact', id: f.id };
      if (!filled(f.name)) add('miss', 7, F, '有一个状态没起名字', 'flow');
      if (u.usedBy.some(x => !x.negate) && !u.setBy.some(x => x.value)) add('miss', 7, F, `${nmf}：有条件要求它成立，但没有任何拍或选项让它成立——这个条件永远满足不了`, 'flow');
      if (u.setBy.length && !u.usedBy.length) add('info', 7, F, `${nmf}：设了但还没有任何条件用到它`, 'flow');
      if (!u.setBy.length && !u.usedBy.length) add('info', 7, F, `${nmf}：没有地方设它，也没有地方用它，可以删掉`, 'flow');
    });
    /* 7 接线：走过分支要记状态 */
    d.stages.forEach((s, si) => {
      if (s.mode !== 'branch' || !s.mergeTo || s.mergeTo === 'end') return;
      const src = optionSources(d, s.id);
      const recorded = src.some(x => x.o.sets.length) || s.beats.some(b => b.sets.length || b.options.some(o => o.sets.length));
      if (src.length && !recorded) add('warn', 7, { type: 'stage', id: s.id }, `子阶段 ${si + 1}「${short(s.title, 12)}」：这条分支汇合回主线，但走过它没记任何状态——合流后就分不出玩家走没走过`, 'flow');
    });
    /* 8 玩法 */
    d.mechanics.forEach((mc, i) => {
      const M = { type: 'mech', id: mc.id }; const nm = `玩法「${short(mc.name, 12)}」`;
      if (!filled(mc.name)) add('miss', 8, M, `玩法 ${i + 1}：没有名字`, 'mech');
      ARC.forEach(([k, label]) => { if (!mc.arc[k].length) add('miss', 8, M, `${nm}：起承转合缺「${label}」——去对应子阶段补拍`, 'mech'); });
      if (!filled(mc.ok) || !filled(mc.wrong)) add('miss', 8, M, `${nm}：判决句没写全`, 'mech');
    });
    /* 9 交接 */
    mapGroups(d).forEach(g => g.visits.forEach(v => {
      const mv = d.mapVisits[visitKey(g.map, v.stage.id)] || {};
      if (!['time', 'light', 'who'].every(k => filled(mv[k]))) add('miss', 9, { type: 'map', id: g.map }, `地图「${g.map}」在子阶段 ${v.si + 1}「${short(v.stage.title, 10)}」的时段／光／谁在场没填全`, 'maps');
    }));
    return list;
  }
  function criteria(d, issues) {
    issues = issues || computeIssues(d);
    const beats = allBeats(d); const acts = beats.filter(x => isAct(x.b));
    const wiringClean = !issues.some(i => i.step === 7 && i.level === 'miss');
    return [
      ['每个子阶段都有：关二狗的目的、设计目的', d.stages.length > 0 && d.stages.every(s => filled(s.goal) && filled(s.design.summary))],
      ['每个做／选拍都细化完了（做：公式＋四格或做法表；选：两难＋选项表），并归入了有判决句的玩法' + (acts.length ? '' : '（还没有做／选拍）'), acts.length > 0 && acts.every(x => detailDone(x.b) && mechOfBeat(d, x.b.id).length && mechOfBeat(d, x.b.id).every(m => filled(m.ok) && filled(m.wrong)))],
      ['泳道图没有无故空着的泳道', beats.length > 0 && d.stages.every(s => !s.beats.length || d.lanes.every(l => (s.laneExclude || []).includes(l.id) || s.beats.some(b => laneFilled(b, l))))],
      ['接线干净：没有到不了的分支、满足不了的条件、断掉的引用', beats.length > 0 && wiringClean],
      ['地图汇总齐了（时段／光／谁在场）', beats.length > 0 && beats.every(x => filled(x.b.map)) && mapGroups(d).every(g => g.visits.every(v => { const mv = d.mapVisits[visitKey(g.map, v.stage.id)] || {}; return ['time', 'light', 'who'].every(k => filled(mv[k])); }))]
    ];
  }
  /* 各步待处理数（缺＋警），以及「当前卡在第几步」＝ 最靠前的仍有待处理项的那一步 */
  function progress(d, issues) {
    issues = issues || computeIssues(d);
    const pending = {};
    for (let n = 1; n <= 9; n++) pending[n] = 0;
    issues.forEach(i => { if (i.level !== 'info') pending[i.step]++; });
    let current = null;
    for (let n = 1; n <= 9; n++) if (pending[n]) { current = n; break; }
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
    if (objId.startsWith('opt')) { const x = allBeats(d).find(y => y.b.options.some(o => 'opt' + o.id === objId)); if (x) return `拍 ${x.si + 1}.${x.bi + 1} 的选项`; }
    if (objId.startsWith('fact')) { const f = d.facts.find(x => 'fact' + x.id === objId); if (f) return `状态「${short(f.name, 20)}」`; }
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
    if (path === 'who' && objId.startsWith('mv')) f = '谁在场';
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
    L.push(`- **这段讲什么**：${mdEsc(m.summary)}`, `- **关二狗怎么变了**：从 ${mdEsc(m.changeFrom)} 到 ${mdEsc(m.changeTo)}`, `- **关二狗的目的**：${mdEsc(m.goal)}`, `- **体验目标**：${mdEsc(m.experience)}`, '');
    L.push('## 分段表', '');
    d.stages.forEach((s, si) => {
      const mode = s.mode === 'loop' ? `（循环，退出条件：${s.loopExitWhen.map(r => mdEsc(requireText(d, r))).join('；') || '（没设）'}）` : s.mode === 'parallel' ? `（并行组：${mdEsc(s.parallelGroup)}）` : s.mode === 'branch' ? '（分支）' : '';
      L.push(`### ${si + 1}. ${s.title || '未命名'}${mode}${s.track === 'optional' ? '〔可选〕' : ''}`, '');
      L.push(`- **地点·时段·氛围**：${mdEsc(s.setting)}`, `- **关二狗的目的**：${mdEsc(s.goal)}`, `- **开始**：${mdEsc(s.start)}`, `- **结束**：${mdEsc(s.end)}`, ...D(s.design));
      if (filled(s.cast)) L.push(`- **登场角色与物件**：${mdEsc(s.cast)}`);
      if (filled(s.foreshadow)) L.push(`- **伏线**：${mdEsc(s.foreshadow)}`);
      const excl = d.lanes.filter(l => (s.laneExclude || []).includes(l.id)).map(l => l.name);
      if (excl.length) L.push(`- **判定不属于这一段的泳道**：${excl.join('、')}`);
      if (s.mode === 'branch') { const src = optionSources(d, s.id); L.push(`- **从哪来**：${src.length ? src.map(x => `拍 ${x.si + 1}.${x.bi + 1} 选「${mdEsc(x.o.choice)}」`).join('；') : '（没有选项通向它）'}`); }
      if (s.mergeTo || s.mode === 'branch') L.push(`- **之后**：${mergeText(d, s)}`);
      if (s.requires.length) L.push(`- **前置条件**：${s.requires.map(r => mdEsc(requireText(d, r))).join('；')}`);
      L.push('');
      if (s.beats.length) {
        L.push('| # | 发生 | 反应 | 结果 | 类型 | 地图 | 在场者 | 可砍 | 原文摘句 |', '|---|---|---|---|---|---|---|---|---|');
        s.beats.forEach((b, bi) => L.push(`| ${si + 1}.${bi + 1} | ${mdEsc(b.text)} | ${mdEsc(b.reaction)} | ${mdEsc(b.result)} | ${b.kind} | ${mdEsc(b.map)} | ${mdEsc(b.who)} | ${b.cuttable ? '可砍' : ''} | ${mdEsc(b.source)} |`));
        L.push('');
        s.beats.forEach((b, bi) => {
          if (!isAct(b)) return;
          L.push(`#### ${si + 1}.${bi + 1}（${b.kind}）${mdEsc(b.text)}`, '');
          if (b.kind === '做') {
            L.push(`- **公式**：${mdEsc(b.formula.verb) || '＿'} ＋ ${mdEsc(b.formula.object) || '＿'} ＋ ${mdEsc(b.formula.resistance) || '＿'}`);
            if (!b.options.length) L.push(`- 玩家看到什么：${mdEsc(b.cells.see)}`, `- 玩家做什么：${mdEsc(b.cells.act)}`, `- 游戏怎么回应：${mdEsc(b.cells.respond)}`, `- 做错了会怎样：${mdEsc(b.cells.wrong)}`);
          } else L.push(`- **两难**：${mdEsc(b.dilemma)}`);
          if (filled(b.stuck)) L.push(`- **卡点**：${mdEsc(b.stuck)}`);
          if (b.requires.length) L.push(`- **前置条件**：${b.requires.map(r => mdEsc(requireText(d, r))).join('；')}`);
          if (b.sets.length) L.push(`- **发生后**：${setsText(d, b.sets)}`);
          if (b.options.length) {
            const isDo = b.kind === '做';
            L.push('', isDo ? '| 做法 | 灵不灵 | 反应 | 结果 | 后果 | 状态变化 | 去向 |' : '| 选项 | 反应 | 结果 | 后果 | 状态变化 | 去向 |', isDo ? '|---|---|---|---|---|---|---|' : '|---|---|---|---|---|---|');
            b.options.forEach(o => L.push(isDo
              ? `| ${mdEsc(o.choice)} | ${WORKS_NAMES[o.works] || ''} | ${mdEsc(o.reaction)} | ${mdEsc(o.result)} | ${mdEsc(o.effect)} | ${setsText(d, o.sets)} | ${gotoText(d, o)} |`
              : `| ${mdEsc(o.choice)} | ${mdEsc(o.reaction)} | ${mdEsc(o.result)} | ${mdEsc(o.effect)} | ${setsText(d, o.sets)} | ${gotoText(d, o)} |`));
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
      L.push('## 地图汇总（交接）', '', '| 地图 | 子阶段 | 拍 | 时段 | 光 | 谁在场 | 能做什么（自动） |', '|---|---|---|---|---|---|---|');
      groups.forEach(g => g.visits.forEach(vs => { const mv = d.mapVisits[visitKey(g.map, vs.stage.id)] || {}; L.push(`| ${mdEsc(g.map)} | ${vs.si + 1}. ${mdEsc(vs.stage.title)} | ${vs.beats.map(({ bi }) => `${vs.si + 1}.${bi + 1}`).join(' ')} | ${mdEsc(mv.time)} | ${mdEsc(mv.light)} | ${mdEsc(mv.who)} | ${mdEsc(mapCanText(vs))} |`); }));
      L.push('');
    }
    const seq = allBeats(d);
    if (seq.length) {
      L.push('## 泳道', '', `| 拍 | ${d.lanes.map(l => mdEsc(l.name)).join(' | ')} |`, `|---|${d.lanes.map(() => '---').join('|')}|`);
      seq.forEach(x => L.push(`| ${x.si + 1}.${x.bi + 1} ${mdEsc(short(x.b.text, 14))} | ${d.lanes.map(l => { const val = x.b.lanes[l.id]; return val === undefined ? '' : (typeof val === 'number' && val > 0 ? '+' + val : mdEsc(String(val))); }).join(' | ')} |`));
      L.push('');
    }
    if ((d.facts || []).length) {
      L.push('## 状态', '', '| 状态 | 在哪设 | 在哪用 |', '|---|---|---|');
      d.facts.forEach(f => { const u = factUsage(d, f.id); L.push(`| ${mdEsc(f.name)} | ${u.setBy.map(x => usageText(x) + (x.value ? '（成立）' : '（不再成立）')).join('；')} | ${u.usedBy.map(x => usageText(x) + (x.negate ? '（要求不成立）' : '')).join('；')} |`); });
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
    DESIGN_KEYS, ARC, KINDS, KCLS, MODE_NAMES, TRACK_NAMES, WORKS_NAMES, LANE_KIND_NAMES, STEP_NAMES, GUIDE_STEPS, GUIDE_RULES, METHOD_SOURCES, FIELD_LABELS,
    newDesign, newDoc, newStage, newBeat, newMechanic, normalize,
    allBeats, findStage, findBeat, mechOfBeat, laneFilled, isAct, visitKey, mapGroups, mapCanText, detailDone, verbGroups,
    newOption, newRequire, newSet, newFact, findFact, setsText, factUsage, usageText, optionSources, gotoText, mergeText, requireTarget, requireText, stageRefText,
    flatEmotionIds, laneChanges, computeIssues, criteria, progress,
    objLabel, keyLabel, buildMarkdown
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChaipaiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
