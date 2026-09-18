/*
 * 拆拍台 core：数据模型、检查规则、标签、全文渲染。
 * 页面（拆拍台.html，<script src="core.js">）和 CLI（chaipai.cjs，require）共用这一份，
 * 检查规则只在这里维护，两边永远一致。纯函数，不碰 DOM、不碰文件。
 *
 * 方法（来源见 METHOD_SOURCES）：
 *   1 顶层 → 2 分段表（每段先写设计目的）→ 3 拆拍 → 4 横看（泳道、可砍）→ 5 标看/做/选
 *   → 6 细化 → 7 接线 → 8 玩法 → 9 交接
 * 每一步只依赖前面的步骤。
 *
 * 两条底线（制作人 2026-09-18 定）：
 *   - 拆到「别人能照着做」为止，不是拆到能直接转成状态机。这里不放逻辑：没有状态变量、没有成立/不成立、
 *     没有与或非。接线只有三样，全用人话：分支从哪来到哪去、循环怎么出去、哪件事要先发生过。
 *   - 每个格子都得能从方法里找到出处。没想好的东西必须说得出口（「没想好」是一等选项），不许逼人硬选。
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
  const DESIGN_KEYS = [['learn', '学会了', '规则或操作'], ['know', '知道了', '信息或伏笔'], ['feel', '感受到', '情绪拍'], ['gain', '得到或失去了', '物件、处境']];
  const ARC = [['qi', '起', '教：安全地学会'], ['cheng', '承', '用：正常使用'], ['zhuan', '转', '变：规则被扭一下'], ['he', '合', '极：用到头或崩掉']];
  const UNDECIDED = '未定';
  const KINDS = [['看', '看 · 演出'], ['做', '做 · 玩家想办法'], ['选', '选 · 玩家做取舍'], [UNDECIDED, '没想好']];
  const KCLS = { '看': 'see', '做': 'do', '选': 'choose', [UNDECIDED]: 'undecided', '': 'none' };
  const MODE_NAMES = { normal: '普通', loop: '循环', parallel: '并行', branch: '分支' };
  const TRACK_NAMES = { main: '主线', optional: '可选' };
  const WORKS_NAMES = { yes: '灵', no: '不灵', maybe: '看情况' };
  const TRY_NAMES = { first: '试到灵的为止', all: '全部试过才往下', one: '试一个就往下', any: '想试几个试几个，随时能往下', undecided: '没想好' };
  const LANE_KIND_NAMES = { curve: '曲线（-3～+3）', trend: '升降', text: '文字' };
  const STEP_NAMES = { 1: '顶层', 2: '分段表', 3: '拆拍', 4: '横看', 5: '标看／做／选', 6: '细化', 7: '接线', 8: '玩法', 9: '交接' };
  const GUIDE_STEPS = [
    { n: 1, name: '顶层', text: '定这次拆的切片：这段讲什么、关二狗从什么变成什么、他要什么、要玩家整体体验什么。', src: '体验目标在立项时就定（Lemarchand）；故事级的价值翻转（McKee）' },
    { n: 2, name: '分段表', text: '按「局面变了」切子阶段，每段一行：地点·时段·氛围 / 开始和结束局面 / 关二狗要什么 / 设计目的 / 登场角色与物件 / 伏线。设计目的在这里就写，不等拆完拍。这一段没想好的，写进这一段的卡点。', src: '顽皮狗 macro 表每行并排填 Player Goal / Design Goal / Emotional Beat；箱書き每箱先写目的；任天堂先定「教什么」' },
    { n: 3, name: '拆拍', text: '每段拆成拍：发生 → 反应 → 结果，一拍＝局面翻一次；标场所、在场者。不按顺序、整段随时能发生的事（随时能闻、随时能退），也拆成一拍，勾「整段随时可发生」。这一步不想玩法。', src: 'McKee：拍＝一次动作/反应，场＝一次价值翻转；箱書き小箱' },
    { n: 4, name: '横看', text: '拍拆完横着看：情绪曲线找平段，系统泳道找空档和扎堆；对照每段的设计目的，跟目的无关的拍标可砍。第 4、5 两步可以逐拍一起做。', src: 'Rogers beat chart 找 gaps & clumping；Valve 强度曲线；Schell 兴趣曲线' },
    { n: 5, name: '标看／做／选', text: '判据：这一拍的变化能不能由玩家的动作触发。不能＝看。能，且有一个目标、玩家想办法达成＝做（办法可以有好几种）。能，且是取舍——不同的边后果不同、两边都有理由想选（一边有代价、另一边有诱惑也算）＝选。阻力很弱的「做」照实写弱，别硬编。真没想好就标「没想好」，不要硬选。', src: 'inkle「玩家做的即主角做的」；CDPR 对 fetch quest 宣战' },
    { n: 6, name: '细化', text: '做：动词＋对象＋阻力，四格；一个目标有好几种办法就列做法表。选：两难＋选项表（选什么、当场结果、长远后果、去向）。只差后果→继续下一拍；改道→从选项新建分支子阶段。填不出就写卡点。', src: 'ink 的 gather（只差后果落回同一点）与 divert（真分叉）；Sasko：后果要预告、分支可不对等' },
    { n: 7, name: '接线', text: '只接三样，用人话说清就行，不写逻辑：分支从哪来、走完去哪；循环怎么出去（一句话）；哪件事要先发生过（指一下那件事，补一句话）。', src: '分支与合流（Ashwell 的 branch-and-bottleneck；ink 的 divert / gather）；内容单元＝{前置, 内容, 效果}（Emily Short）' },
    { n: 8, name: '玩法', text: '做/选拍归到玩法里（已经想好的玩法直接建；没头绪就看按动词的分组）。每个玩法走 起（安全处教）→ 承 → 转（反转）→ 合（用完即弃）；某一格在别的章节或没想好，在备注里写明。写判决句，拿成品切片给固定几个人试。', src: '任天堂起承転結关卡结构；Golden Idol 固定试玩人' },
    { n: 9, name: '交接', text: '拆到底的子阶段勾「这一段拆完了」——勾了的就是交出去的范围。地图汇总自动列出每张图在哪几段出现、谁在场、能做什么，只补一句光与场景备注。导出的全文最前面是交接范围和未定清单。', src: 'Rogers beat chart 的时段/色彩列；箱書き的場所·時間' }
  ];
  const GUIDE_RULES = [
    '一层拆完整段，才往下拆一层。想到下一层的点子丢「停车场」，当下不往下钻。',
    '卡住就退回上一层：拍拆不动＝那个子阶段的开始和结束没想清楚；四格填不出＝那一拍的「结果」没想清楚。',
    '没想好就说没想好：卡点、「没想好」选项都是正经答案。硬选一个，交出去的就是假的。'
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
    { name: 'ink 写作手册（choice / gather / divert）', url: 'https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md' }
  ];
  const FIELD_LABELS = {
    title: '标题', summary: '这段讲什么', changeFrom: '关二狗从', changeTo: '关二狗到', goal: '关二狗的目的', experience: '体验目标', redline: '红线',
    setting: '地点·时段·氛围', start: '开始时局面', end: '结束时局面', cast: '登场角色与物件', foreshadow: '伏线', parallelGroup: '并行组', loopExit: '循环怎么出去',
    text: '发生了什么', reaction: '关二狗怎么反应', result: '结果', source: '原文摘句', map: '地图', who: '在场者',
    'formula.verb': '公式·动词', 'formula.object': '公式·对象', 'formula.resistance': '公式·阻力',
    'cells.see': '四格·玩家看到什么', 'cells.act': '四格·玩家做什么', 'cells.respond': '四格·游戏怎么回应', 'cells.wrong': '四格·做错了会怎样',
    dilemma: '两难', stuck: '卡点', name: '名字', ok: '判决句·成立的时候玩家会', wrong: '判决句·做错了游戏会', note: '备注／补一句', synopsis: '梗概原文',
    light: '光与场景备注',
    deleteTest: '删除测试', learn: '学会了', know: '知道了', feel: '感受到', gain: '得到或失去了', backward: '倒推',
    choice: '选项／做法', effect: '长远后果'
  };

  /* ---------- 数据模型 ---------- */
  const newDesign = () => ({ learn: '', know: '', feel: '', gain: '', deleteTest: '', backward: '', summary: '' });
  function newDoc() {
    return {
      app: '拆拍台', version: 3,
      meta: { title: '未命名任务', summary: '', changeFrom: '', changeTo: '', goal: '', experience: '', redline: '' },
      synopsis: '',
      lanes: [{ id: 'emotion', name: '情绪', kind: 'curve' }, { id: uid(), name: '三把火', kind: 'trend' }, { id: uid(), name: '玩家知道什么', kind: 'text' }],
      stages: [], mechanics: [], mapVisits: {}, parking: []
    };
  }
  const newStage = () => ({ id: uid(), title: '', track: 'main', setting: '', goal: '', start: '', end: '', cast: '', foreshadow: '', redline: '', stuck: '', mode: 'normal', loopExit: '', parallelGroup: '', mergeTo: '', needs: [], design: newDesign(), laneExclude: [], laneUndecided: [], ready: false, collapsed: false, beats: [] });
  const newBeat = () => ({ id: uid(), text: '', reaction: '', result: '', source: '', map: '', who: '', kind: '', formula: { verb: '', object: '', resistance: '' }, cells: { see: '', act: '', respond: '', wrong: '' }, dilemma: '', stuck: '', cuttable: false, anytime: false, lanes: {}, options: [], tryMode: '', needs: [] });
  /* 选项（「选」的拍）/ 做法（「做」的拍）。goto：next 继续下一拍 / stage 跳到某子阶段 / end 这条线结束 / undecided 没想好 */
  const newOption = () => ({ id: uid(), choice: '', works: '', reaction: '', result: '', effect: '', goto: { type: 'next', stageId: '' } });
  /* 依赖：「这件事要先发生过」。ref 指一下那件事（子阶段 / 拍 / 选项 / 别的章节），note 用人话补一句。不是条件表达式。 */
  const newNeed = () => ({ id: uid(), ref: { type: '', id: '', optionId: '' }, note: '' });
  const newMechanic = () => ({ id: uid(), name: '', ok: '', wrong: '', note: '', arc: { qi: [], cheng: [], zhuan: [], he: [] } });

  /* 读任何版本的文件；旧字段就地迁移，内容不丢 */
  function normalize(d) {
    if (!d || typeof d !== 'object') throw new Error('不是拆拍台文件');
    const base = newDoc();
    const out = Object.assign(base, d);
    out.version = 3;

    /* v2 的「状态」（facts）：概念已删。名字和成立/不再成立并进文字；能指回唯一来源的依赖，指回那件事 */
    const facts = Array.isArray(d.facts) ? d.facts : [];
    const factName = id => { const f = facts.find(x => x.id === id); return f ? (f.name || '未命名状态') : '已删除的状态'; };
    const setters = {};   // factId -> [{type, beatId, optionId}]
    (d.stages || []).forEach(s => (s.beats || []).forEach(b => {
      (b.sets || []).forEach(x => { if (x && x.value !== false) (setters[x.factId] = setters[x.factId] || []).push({ type: 'beat', id: b.id, optionId: '' }); });
      (b.options || []).forEach(o => (o.sets || []).forEach(x => { if (x && x.value !== false) (setters[x.factId] = setters[x.factId] || []).push({ type: 'option', id: b.id, optionId: o.id }); }));
    }));
    const setsNote = list => (Array.isArray(list) ? list : []).filter(x => x && x.factId).map(x => `「${factName(x.factId)}」${x.value === false ? '不再成立' : '成立'}`).join('、');
    const fromOldReq = r => {
      const n = newNeed();
      if (!r) return n;
      if (r.kind === 'free') { n.note = r.note || ''; return n; }
      if (r.kind === 'fact') {
        const src = setters[r.id2] || [];
        if (!r.negate && src.length === 1) { n.ref = { type: src[0].type, id: src[0].id, optionId: src[0].optionId }; n.note = factName(r.id2); }
        else n.note = `${factName(r.id2)}${r.negate ? '——没发生过才行' : ''}`;
        return n;
      }
      if (r.kind === 'stage' || r.kind === 'beat') { n.ref = { type: r.kind, id: r.id2 || '', optionId: '' }; return n; }
      if (r.kind === 'option') { n.ref = { type: 'option', id: r.id2 || '', optionId: r.optionId || '' }; return n; }
      return n;
    };
    const normNeeds = (needs, oldReqs) => {
      const list = (Array.isArray(needs) ? needs : []).map(x => { const n = Object.assign(newNeed(), x); n.ref = Object.assign({ type: '', id: '', optionId: '' }, x.ref || {}); return n; });
      return list.concat((Array.isArray(oldReqs) ? oldReqs : []).map(fromOldReq));
    };

    const oldMeta = d.meta || {};
    out.meta = Object.assign(newDoc().meta, oldMeta);
    if (filled(oldMeta.endCondition) && !oneLineText(out.meta.summary).includes(oneLineText(oldMeta.endCondition))) out.meta.summary = [out.meta.summary, '结束于：' + oldMeta.endCondition].filter(filled).join('\n');
    if (oldMeta.design && !filled(out.meta.experience)) {
      const g = oldMeta.design; const parts = [];
      if (filled(g.summary)) parts.push(g.summary);
      [['deleteTest', '删除测试'], ...DESIGN_KEYS.map(([k, l]) => [k, l]), ['backward', '倒推']].forEach(([k, l]) => { if (filled(g[k])) parts.push(`${l}：${g[k]}`); });
      out.meta.experience = parts.join('\n');
    }
    delete out.meta.endCondition; delete out.meta.design;
    out.lanes = Array.isArray(d.lanes) && d.lanes.length ? d.lanes : base.lanes;
    if (!out.lanes.some(l => l.id === 'emotion')) out.lanes.unshift({ id: 'emotion', name: '情绪', kind: 'curve' });

    const pendingExit = [];
    out.stages = (d.stages || []).map(s => {
      const ns = Object.assign(newStage(), s);
      if (ns.track !== 'optional') ns.track = 'main';
      ns.ready = !!s.ready;
      ns.design = Object.assign(newDesign(), s.design || {});
      ns.laneExclude = s.laneExclude || [];
      ns.laneUndecided = s.laneUndecided || [];
      ns.needs = normNeeds(s.needs, s.requires);
      delete ns.requires;
      const oldExit = (s.loopExitWhen || []).map(fromOldReq);
      if (oldExit.length) pendingExit.push([ns, oldExit]);
      delete ns.loopExitWhen;
      if (typeof s.loopExit !== 'string') ns.loopExit = '';
      if (filled(s.endCondition) && !oneLineText(ns.end).includes(oneLineText(s.endCondition))) ns.end = [ns.end, '（结束条件：' + s.endCondition + '）'].filter(filled).join(' ');
      delete ns.endCondition;
      ns.mergeTo = s.mergeTo || '';
      ns.beats = (s.beats || []).map(b => {
        const nb = Object.assign(newBeat(), b);
        nb.formula = Object.assign(newBeat().formula, b.formula || {});
        nb.cells = Object.assign(newBeat().cells, b.cells || {});
        nb.lanes = b.lanes || {};
        nb.options = (b.options || []).map(o => {
          const no = Object.assign(newOption(), o);
          no.goto = Object.assign({ type: 'next', stageId: '' }, o.goto || {});
          const left = setsNote(o.sets);
          if (left && !oneLineText(no.effect).includes(left)) no.effect = [no.effect, `（留下：${left}）`].filter(filled).join(' ');
          delete no.sets;
          return no;
        });
        nb.needs = normNeeds(b.needs, b.requires);
        delete nb.requires;
        const left = setsNote(b.sets);
        if (left && !oneLineText(nb.result).includes(left)) nb.result = [nb.result, `（留下：${left}）`].filter(filled).join(' ');
        delete nb.sets;
        if (nb.kind === '略') { nb.kind = '看'; nb.cuttable = true; }
        nb.anytime = !!nb.anytime;
        if (!KCLS.hasOwnProperty(nb.kind)) nb.kind = '';
        if (!TRY_NAMES[nb.tryMode]) nb.tryMode = '';
        return nb;
      });
      return ns;
    });
    delete out.facts;
    pendingExit.forEach(([ns, list]) => { const t = list.map(n => needText(out, n)).filter(x => x && x !== '（空）').join('；或者 '); if (t && !oneLineText(ns.loopExit).includes(t)) ns.loopExit = [ns.loopExit, t].filter(filled).join('；'); });
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
  /* 交接用，全部从前面写过的东西自动得出，不让人再抄一遍 */
  function mapCanText(visit) {
    return visit.beats.filter(({ b }) => isAct(b)).map(({ b }) => {
      const f = [b.formula.verb, b.formula.object].filter(filled).map(oneLineText).join(' ');
      if (b.kind === '选') return '选：' + short(filled(b.dilemma) ? b.dilemma : b.text, 20);
      const opts = realOptions(b).filter(o => filled(o.choice)).map(o => short(o.choice, 10));
      return f || (opts.length ? '挑一个做法：' + opts.join('／') : '（做，还没细化）');
    }).join('；');
  }
  function mapWhoText(visit) {
    const seen = [];
    visit.beats.forEach(({ b }) => oneLineText(b.who).split(/[、,，;；]/).map(x => x.trim()).filter(Boolean).forEach(x => { if (!seen.includes(x)) seen.push(x); }));
    return seen.join('、');
  }
  /* 细化完成判定：做＝公式＋（四格 或 做法表）；选＝两难＋至少两个选项，每个选项写了选什么和当场结果 */
  const optionDone = o => filled(o.choice) && filled(o.result);
  const realOptions = b => b.options.filter(o => filled(o.choice) || filled(o.result) || filled(o.effect) || filled(o.reaction));
  function detailDone(b) {
    if (b.kind === '做') return filled(b.formula.verb) && filled(b.formula.object) && (realOptions(b).length ? realOptions(b).every(optionDone) : Object.values(b.cells).every(filled));
    if (b.kind === '选') return filled(b.dilemma) && b.options.length >= 2 && b.options.every(optionDone);
    return true;
  }
  /* 第 8 步的参考：做/选拍按公式动词（括号、空格前的那个词）分组 */
  function verbGroups(d) {
    const g = new Map();
    allBeats(d).forEach(x => {
      if (!isAct(x.b)) return;
      const verb = oneLineText(x.b.formula.verb).split(/[（(\s，,、]/)[0] || (x.b.kind === '选' ? '选' : '');
      const key = verb || '（没写动词）';
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(x);
    });
    return [...g].map(([verb, beats]) => ({ verb, beats })).sort((a, b) => b.beats.length - a.beats.length);
  }

  /* ---------- 接线：分支、汇合、依赖（只有指向和人话，没有逻辑） ---------- */
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
    if (g.type === 'undecided') return '没想好';
    return '继续下一拍';
  }
  function mergeText(d, s) {
    if (!s.mergeTo) return '按顺序接下一个子阶段';
    if (s.mergeTo === 'end') return '这条线在这里结束';
    return '汇合到 ' + stageRefText(d, s.mergeTo);
  }
  /* 依赖指到哪：ok=false 说明指的东西已经删了 */
  function needTarget(d, n) {
    const r = n.ref || {};
    if (!r.type) return { ok: true, text: '', si: null };
    if (r.type === 'outside') return { ok: true, text: '别的章节的事', si: null };
    if (r.type === 'stage') { const f = findStage(d, r.id); return f ? { ok: true, text: `子阶段 ${f.si + 1}「${short(f.s.title, 14)}」走完`, si: f.si } : { ok: false, text: '（已删除的子阶段）', si: null }; }
    if (r.type === 'beat') { const f = findBeat(d, r.id); return f ? { ok: true, text: `拍 ${f.si + 1}.${f.bi + 1}「${short(f.b.text, 14)}」发生过`, si: f.si } : { ok: false, text: '（已删除的拍）', si: null }; }
    if (r.type === 'option') {
      const f = findBeat(d, r.id); const o = f && f.b.options.find(x => x.id === r.optionId);
      return o ? { ok: true, text: `拍 ${f.si + 1}.${f.bi + 1} ${f.b.kind === '做' ? '用了' : '选了'}「${short(o.choice, 14)}」`, si: f.si } : { ok: false, text: '（已删除的选项）', si: null };
    }
    return { ok: false, text: '', si: null };
  }
  function needText(d, n) { return [needTarget(d, n).text, oneLineText(n.note)].filter(Boolean).join('：') || '（空）'; }
  const needEmpty = n => !(n.ref && n.ref.type) && !filled(n.note);

  /* ---------- 未定清单：所有「没想好」集中列出来，交接时放在最前面 ---------- */
  function openItems(d) {
    const out = [];
    d.stages.forEach((s, si) => {
      const S = { type: 'stage', id: s.id }; const nm = `子阶段 ${si + 1}「${short(s.title, 12)}」`;
      if (filled(s.stuck)) out.push({ target: S, text: `${nm} 卡点：${oneLineText(s.stuck)}` });
      (s.laneUndecided || []).forEach(id => { const l = d.lanes.find(x => x.id === id); if (l) out.push({ target: S, text: `${nm}：「${l.name}」在这一段怎么样，没想好` }); });
      s.beats.forEach((b, bi) => {
        const B = { type: 'beat', id: b.id }; const bn = `拍 ${si + 1}.${bi + 1}「${short(b.text, 12)}」`;
        if (b.kind === UNDECIDED) out.push({ target: B, text: `${bn}：玩家在这里是看、做还是选，没想好` });
        if (filled(b.stuck)) out.push({ target: B, text: `${bn} 卡点：${oneLineText(b.stuck)}` });
        if (b.tryMode === 'undecided') out.push({ target: B, text: `${bn}：几种做法怎么算过（试到灵的为止／全部试过／试一个），没想好` });
        b.options.forEach(o => { if (o.goto && o.goto.type === 'undecided') out.push({ target: B, text: `${bn} ${b.kind === '做' ? '做法' : '选项'}「${short(o.choice, 10)}」之后去哪，没想好` }); });
      });
    });
    return out;
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
  /* 联动点只看曲线和升降：文字泳道每拍都可能写字，算进来就每拍都是「重点」，等于没有重点 */
  function laneChanges(d) {
    const res = new Map(); const prev = {};
    allBeats(d).forEach(x => {
      const names = [];
      d.lanes.forEach(l => {
        const v = x.b.lanes[l.id]; const has = laneFilled(x.b, l);
        if (l.kind === 'trend') { if (v === '升' || v === '降') names.push(l.name); }
        else if (l.kind === 'curve' && has) { if (prev[l.id] !== undefined && prev[l.id] !== v) names.push(l.name); }
        if (has) prev[l.id] = v;
      });
      res.set(x.b.id, names);
    });
    return res;
  }

  /* ---------- 检查（按方法的九步分组） ---------- */
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
      if (filled(s.stuck)) add('info', 2, S, `${nm}：卡点——${short(s.stuck, 30)}`);
      /* 3 拆拍 */
      if (!s.beats.length) add('miss', 3, S, `${nm}：还没拆拍`);
      s.beats.forEach((b, bi) => {
        const B = { type: 'beat', id: b.id }; const bn = `拍 ${si + 1}.${bi + 1}「${short(b.text, 12)}」`;
        if (!filled(b.text) || !filled(b.reaction) || !filled(b.result)) add('miss', 3, B, `${bn}：发生／反应／结果没写全`);
        if (!filled(b.map)) add('warn', 3, B, `${bn}：没标地图`);
        /* 4 横看 */
        if (b.cuttable) add('info', 4, B, `${bn}：标了可砍`);
        if (b.anytime) add('info', 3, B, `${bn}：整段随时可发生（不占顺序位置）`);
        /* 5 标 */
        if (!b.kind) add('miss', 5, B, `${bn}：没标看／做／选`);
        if (b.kind === UNDECIDED) add('info', 5, B, `${bn}：看／做／选没想好（已进未定清单）`);
        /* 6 细化 */
        const opts = realOptions(b);
        if (b.kind === '做') {
          const untouched = !Object.values(b.formula).some(filled) && !Object.values(b.cells).some(filled) && !opts.length;
          if (untouched) add('miss', 6, B, `${bn}：还没细化（公式、四格都空着）`);
          else {
            if (!filled(b.formula.verb) || !filled(b.formula.object)) add('miss', 6, B, `${bn}：公式缺动词或对象`);
            if (!filled(b.formula.resistance)) add('warn', 6, B, `${bn}：写不出阻力——考虑改回「看」`);
            if (!opts.length && !Object.values(b.cells).every(filled)) add('miss', 6, B, `${bn}：四格没填满`);
          }
          if (opts.length >= 2 && !b.tryMode) add('warn', 6, B, `${bn}：列了几种做法，没说怎么算过（试到灵的为止／全部试过／试一个／想试几个试几个）`);
        }
        if (b.kind === '选') {
          if (!filled(b.dilemma)) add('miss', 6, B, `${bn}：没写两难（选每一边各失去什么）`);
          if (b.options.length < 2) add('warn', 6, B, `${bn}：「选」的拍只有 ${b.options.length} 个选项——至少列两个`);
        }
        if (filled(b.stuck)) add('info', 6, B, `${bn}：卡点——${short(b.stuck, 30)}`);
        (b.kind === '选' ? b.options : opts).forEach((o, oi) => {
          const on = `${bn} ${b.kind === '做' ? '做法' : '选项'} ${oi + 1}「${short(o.choice, 10)}」`;
          if (!filled(o.choice)) add('miss', 6, B, `${on}：没写${b.kind === '做' ? '怎么做' : '玩家选什么'}`);
          if (!filled(o.result)) add('miss', 6, B, `${on}：没写当场结果`);
          if (!filled(o.effect)) add('warn', 6, B, `${on}：没写长远后果（没有就写「无」）`);
          if (b.kind === '做' && !o.works) add('warn', 6, B, `${on}：没标灵不灵`);
        });
        /* 7 接线 */
        b.options.forEach((o, oi) => {
          const on = `${bn} ${b.kind === '做' ? '做法' : '选项'} ${oi + 1}「${short(o.choice, 10)}」`;
          if (o.goto && o.goto.type === 'stage' && !findStage(d, o.goto.stageId)) add('miss', 7, B, `${on}：去向指向的子阶段不存在`);
          if (o.goto && o.goto.type === 'undecided') add('info', 7, B, `${on}：去向没想好（已进未定清单）`);
        });
        b.needs.forEach(n => {
          if (!needTarget(d, n).ok) add('miss', 7, B, `${bn}：有一条「要先发生过」指向的东西已经删了`);
          else if (needEmpty(n)) add('warn', 7, B, `${bn}：有一条「要先发生过」是空的`);
        });
        /* 8 玩法 */
        if (isAct(b) && !mechOfBeat(d, b.id).length) add('warn', 8, B, `${bn}：没归入任何玩法`);
      });
      /* 4 横看：泳道整段空 */
      if (s.beats.length) d.lanes.forEach(l => {
        if ((s.laneExclude || []).includes(l.id)) return;
        if ((s.laneUndecided || []).includes(l.id)) { add('info', 4, S, `${nm}：泳道「${l.name}」没想好（已进未定清单）`, 'lanes'); return; }
        if (!s.beats.some(b => laneFilled(b, l))) add('warn', 4, S, `${nm}：泳道「${l.name}」整段空着——补上，或在这一段的「泳道判定」里标「不属于」或「没想好」`, 'lanes');
      });
      /* 7 接线：子阶段 */
      if (s.mode === 'loop' && !filled(s.loopExit)) add('miss', 7, S, `${nm}：标了循环，没写怎么出去——玩家会困在里面`);
      if (s.mode === 'branch') {
        if (!optionSources(d, s.id).length) add('miss', 7, S, `${nm}：标了分支，但没有任何选项通向它——玩家到不了`);
        if (!s.mergeTo) add('warn', 7, S, `${nm}：分支没写走完去哪（汇合到哪，或者这条线在这里结束）`);
      }
      if (s.mergeTo && s.mergeTo !== 'end' && !findStage(d, s.mergeTo)) add('miss', 7, S, `${nm}：汇合到的子阶段不存在`);
      s.needs.forEach(n => {
        if (!needTarget(d, n).ok) add('miss', 7, S, `${nm}：有一条「要先发生过」指向的东西已经删了`);
        else if (needEmpty(n)) add('warn', 7, S, `${nm}：有一条「要先发生过」是空的`);
      });
      /* 9 交接 */
      if (s.ready) {
        const beatIds = new Set(s.beats.map(b => b.id));
        const left = list.filter(i => i.level === 'miss' && ((i.target.type === 'stage' && i.target.id === s.id) || (i.target.type === 'beat' && beatIds.has(i.target.id)))).length;
        if (left) add('warn', 9, S, `${nm}：勾了「拆完了」，但还有 ${left} 项「缺」`);
      }
    });
    if (d.stages.length && !d.stages.some(s => s.ready)) add('info', 9, T, '还没有子阶段勾「这一段拆完了」——勾了的才算交出去的范围');
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
    /* 8 玩法 */
    d.mechanics.forEach((mc, i) => {
      const M = { type: 'mech', id: mc.id }; const nm = `玩法「${short(mc.name, 12)}」`;
      if (!filled(mc.name)) add('miss', 8, M, `玩法 ${i + 1}：没有名字`, 'mech');
      const emptySlots = ARC.filter(([k]) => !mc.arc[k].length).map(([, label]) => label);
      if (emptySlots.length) add(filled(mc.note) ? 'info' : 'warn', 8, M, filled(mc.note) ? `${nm}：起承转合空着「${emptySlots.join('、')}」（备注里已说明）` : `${nm}：起承转合空着「${emptySlots.join('、')}」——补拍，或在备注里写明它在别的章节／还没想好`, 'mech');
      if (!filled(mc.ok) || !filled(mc.wrong)) add('miss', 8, M, `${nm}：判决句没写全`, 'mech');
    });
    return list;
  }
  /* 完成标准。有子阶段勾了「拆完了」，第二条就只看勾了的那些 */
  function criteria(d, issues) {
    issues = issues || computeIssues(d);
    const ready = d.stages.filter(s => s.ready); const scope = ready.length ? ready : d.stages;
    const scopeBeats = scope.flatMap(s => s.beats); const acts = scopeBeats.filter(isAct);
    const readyIds = new Set(ready.flatMap(s => [s.id, ...s.beats.map(b => b.id)]));
    return [
      ['每个子阶段都有：关二狗的目的、设计目的', d.stages.length > 0 && d.stages.every(s => filled(s.goal) && filled(s.design.summary))],
      [(ready.length ? '拆完的子阶段里，' : '') + '每个做／选拍都细化完了，并归入了有判决句的玩法' + (acts.length ? '' : '（还没有做／选拍）'), acts.length > 0 && acts.every(b => detailDone(b) && mechOfBeat(d, b.id).length && mechOfBeat(d, b.id).every(mm => filled(mm.ok) && filled(mm.wrong)))],
      ['泳道没有无故空着的（不属于、没想好的都标了）', allBeats(d).length > 0 && !issues.some(i => i.step === 4 && i.level === 'warn' && i.target.type === 'stage')],
      ['接线干净：没有到不了的分支、出不去的循环、断掉的指向', allBeats(d).length > 0 && !issues.some(i => i.step === 7 && i.level === 'miss')],
      ['交接：至少一个子阶段勾了「拆完了」，且勾了的没有「缺」', ready.length > 0 && !issues.some(i => i.level === 'miss' && i.target.id && readyIds.has(i.target.id))]
    ];
  }
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
    const mc = d.mechanics.find(mm => mm.id === objId); if (mc) return `玩法「${short(mc.name, 20)}」`;
    if (objId.startsWith('opt')) { const x = allBeats(d).find(y => y.b.options.some(o => 'opt' + o.id === objId)); if (x) return `拍 ${x.si + 1}.${x.bi + 1} 的${x.b.kind === '做' ? '做法' : '选项'}`; }
    if (objId.startsWith('need')) return '「要先发生过」';
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
    if (path === 'result' && objId.startsWith('opt')) f = '当场结果';
    return `${objLabel(d, objId)} · ${f || path}`;
  }

  /* ---------- 全文 Markdown ---------- */
  function buildMarkdown(d) {
    const L = []; const m = d.meta;
    const D = g => {
      const out = [];
      if (filled(g.summary)) out.push(`- **设计目的**：${mdEsc(g.summary)}`);
      DESIGN_KEYS.forEach(([k, l]) => { if (filled(g[k])) out.push(`  - ${l}：${mdEsc(g[k])}`); });
      if (filled(g.deleteTest)) out.push(`  - 删除测试：${mdEsc(g.deleteTest)}`);
      if (filled(g.backward)) out.push(`  - 倒推：${mdEsc(g.backward)}`);
      return out;
    };
    L.push(`# ${m.title || '未命名任务'}`, '');
    const ready = d.stages.map((s, si) => ({ s, si })).filter(x => x.s.ready);
    L.push('## 交接范围', '', ready.length ? `拆到底、可以照着做的子阶段：${ready.map(x => `${x.si + 1}. ${x.s.title || '未命名'}`).join('；')}。其余子阶段只到分段或拆拍，还不能照着做。` : '（还没有子阶段勾「这一段拆完了」——整份都还在拆。）', '');
    const open = openItems(d);
    L.push(`## 未定清单（${open.length}）`, '', '作者自己标了没想好的地方。照着做的人读到这些，要回来问，不要自己猜。', '', ...(open.length ? open.map(x => `- ${mdEsc(x.text)}`) : ['（没有）']), '');
    L.push('## 顶层', '');
    L.push(`- **这段讲什么**：${mdEsc(m.summary)}`, `- **关二狗怎么变了**：从 ${mdEsc(m.changeFrom)} 到 ${mdEsc(m.changeTo)}`, `- **关二狗的目的**：${mdEsc(m.goal)}`, `- **体验目标**：${mdEsc(m.experience)}`, ...(filled(m.redline) ? [`- **红线（不许做什么）**：${mdEsc(m.redline)}`] : []), '');
    L.push('## 分段表', '');
    d.stages.forEach((s, si) => {
      const mode = s.mode === 'loop' ? `（循环，怎么出去：${mdEsc(s.loopExit) || '没写'}）` : s.mode === 'parallel' ? `（并行组：${mdEsc(s.parallelGroup)}）` : s.mode === 'branch' ? '（分支）' : '';
      L.push(`### ${si + 1}. ${s.title || '未命名'}${mode}${s.track === 'optional' ? '〔可选〕' : ''}${s.ready ? '〔拆完了〕' : ''}`, '');
      L.push(`- **地点·时段·氛围**：${mdEsc(s.setting)}`, `- **关二狗的目的**：${mdEsc(s.goal)}`, `- **开始**：${mdEsc(s.start)}`, `- **结束**：${mdEsc(s.end)}`, ...D(s.design));
      if (filled(s.cast)) L.push(`- **登场角色与物件**：${mdEsc(s.cast)}`);
      if (filled(s.foreshadow)) L.push(`- **伏线**：${mdEsc(s.foreshadow)}`);
      if (filled(s.redline)) L.push(`- **红线（不许做什么）**：${mdEsc(s.redline)}`);
      if (filled(s.stuck)) L.push(`- **卡点**：${mdEsc(s.stuck)}`);
      const excl = d.lanes.filter(l => (s.laneExclude || []).includes(l.id)).map(l => l.name);
      if (excl.length) L.push(`- **不属于这一段的泳道**：${excl.join('、')}`);
      const und = d.lanes.filter(l => (s.laneUndecided || []).includes(l.id)).map(l => l.name);
      if (und.length) L.push(`- **属于这一段但没想好的泳道**：${und.join('、')}`);
      if (s.mode === 'branch') { const src = optionSources(d, s.id); L.push(`- **从哪来**：${src.length ? src.map(x => `拍 ${x.si + 1}.${x.bi + 1} 选「${mdEsc(x.o.choice)}」`).join('；') : '（没有选项通向它）'}`); }
      if (s.mergeTo || s.mode === 'branch') L.push(`- **走完去哪**：${mergeText(d, s)}`);
      if (s.needs.length) L.push(`- **要先发生过**：${s.needs.map(n => mdEsc(needText(d, n))).join('；')}`);
      L.push('');
      if (s.beats.length) {
        L.push('| # | 发生 | 反应 | 结果 | 类型 | 地图 | 在场者 | 可砍 | 原文摘句 |', '|---|---|---|---|---|---|---|---|---|');
        s.beats.forEach((b, bi) => L.push(`| ${si + 1}.${bi + 1}${b.anytime ? '〔随时〕' : ''} | ${mdEsc(b.text)} | ${mdEsc(b.reaction)} | ${mdEsc(b.result)} | ${b.kind === UNDECIDED ? '没想好' : b.kind} | ${mdEsc(b.map)} | ${mdEsc(b.who)} | ${b.cuttable ? '可砍' : ''} | ${mdEsc(b.source)} |`));
        L.push('');
        /* 依赖每一拍都印——不管它是看、做还是选 */
        const withNeeds = s.beats.map((b, bi) => ({ b, bi })).filter(x => x.b.needs.length);
        if (withNeeds.length) { L.push(...withNeeds.map(x => `- 拍 ${si + 1}.${x.bi + 1} 要先发生过：${x.b.needs.map(n => mdEsc(needText(d, n))).join('；')}`), ''); }
        s.beats.forEach((b, bi) => {
          if (!isAct(b) && !filled(b.stuck)) return;
          L.push(`#### ${si + 1}.${bi + 1}（${b.kind === UNDECIDED ? '没想好' : b.kind || '未标'}${b.anytime ? '，整段随时可发生' : ''}）${mdEsc(b.text)}`, '');
          const opts = realOptions(b);
          if (b.kind === '做') {
            L.push(`- **公式**：${mdEsc(b.formula.verb) || '＿'} ＋ ${mdEsc(b.formula.object) || '＿'} ＋ ${mdEsc(b.formula.resistance) || '＿'}`);
            if (!opts.length || Object.values(b.cells).some(filled)) L.push(`- 玩家看到什么：${mdEsc(b.cells.see)}`, `- 玩家做什么：${mdEsc(b.cells.act)}`, `- 游戏怎么回应：${mdEsc(b.cells.respond)}`, `- 做错了会怎样：${mdEsc(b.cells.wrong)}`);
            if (opts.length >= 2 || b.tryMode) L.push(`- **几种做法怎么算过**：${TRY_NAMES[b.tryMode] || '没写'}`);
          } else if (b.kind === '选') L.push(`- **两难**：${mdEsc(b.dilemma)}`);
          if (filled(b.stuck)) L.push(`- **卡点**：${mdEsc(b.stuck)}`);
          const rows = b.kind === '选' ? b.options : opts;
          if (rows.length) {
            const isDo = b.kind === '做';
            L.push('', isDo ? '| 做法 | 灵不灵 | 反应 | 当场结果 | 长远后果 | 去向 |' : '| 选项 | 反应 | 当场结果 | 长远后果 | 去向 |', isDo ? '|---|---|---|---|---|---|' : '|---|---|---|---|---|');
            rows.forEach(o => L.push(isDo
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
      L.push('## 地图汇总（交接）', '', '| 地图 | 子阶段 | 地点·时段·氛围 | 拍 | 谁在场 | 能做什么 | 光与场景备注 |', '|---|---|---|---|---|---|---|');
      groups.forEach(g => g.visits.forEach(vs => { const mv = d.mapVisits[visitKey(g.map, vs.stage.id)] || {}; L.push(`| ${mdEsc(g.map)} | ${vs.si + 1}. ${mdEsc(vs.stage.title)} | ${mdEsc(vs.stage.setting)} | ${vs.beats.map(({ bi }) => `${vs.si + 1}.${bi + 1}`).join(' ')} | ${mdEsc(mapWhoText(vs))} | ${mdEsc(mapCanText(vs))} | ${mdEsc(mv.light)} |`); }));
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
    DESIGN_KEYS, ARC, KINDS, KCLS, UNDECIDED, MODE_NAMES, TRACK_NAMES, WORKS_NAMES, TRY_NAMES, LANE_KIND_NAMES, STEP_NAMES, GUIDE_STEPS, GUIDE_RULES, METHOD_SOURCES, FIELD_LABELS,
    newDesign, newDoc, newStage, newBeat, newOption, newNeed, newMechanic, normalize,
    allBeats, findStage, findBeat, mechOfBeat, laneFilled, isAct, visitKey, mapGroups, mapCanText, mapWhoText, realOptions, detailDone, verbGroups,
    optionSources, gotoText, mergeText, needTarget, needText, stageRefText, openItems,
    flatEmotionIds, laneChanges, computeIssues, criteria, progress,
    objLabel, keyLabel, buildMarkdown
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChaipaiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
