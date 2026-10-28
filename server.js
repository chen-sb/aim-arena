/**
 * 练枪模拟器 · 服务端
 * ------------------------------------------------------------
 * 零依赖（只用 Node 内置模块），可直接部署到 Render / Railway /
 * Zeabur / Fly.io / 阿里云 等任何支持 Node 的平台。
 *
 * 启动：node server.js
 * 端口：优先读环境变量 PORT（云平台会自动注入）
 * 数据：默认存在 ./data/db.json，可用 DATA_DIR 指定目录
 * ------------------------------------------------------------
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INDEX_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>练枪模拟器 · 在线榜</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  html, body { height: 100%; background: #14161A; overflow: hidden;\n    font-family: \"Microsoft YaHei\", \"PingFang SC\", sans-serif;\n    -webkit-user-select: none; user-select: none; }\n  #cv { display: block; cursor: none; }\n\n  .overlay {\n    position: absolute; inset: 0; display: flex; flex-direction: column;\n    align-items: center; justify-content: center;\n    background: rgba(20, 22, 26, 0.94); color: #E8E8E8; text-align: center; padding: 26px;\n  }\n  .overlay.hide { display: none; }\n  h1 { font-size: 40px; font-weight: 400; letter-spacing: 8px; margin-bottom: 8px; }\n  .sub { color: #8A8F98; font-size: 13px; letter-spacing: 2px; margin-bottom: 26px; }\n\n  .modes { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }\n  .mode {\n    width: 180px; padding: 18px 14px; border: 1px solid #2A2F36; border-radius: 10px;\n    background: #191C21; cursor: pointer; transition: all .18s;\n  }\n  .mode:hover { border-color: #E04B3A; background: #1E2228; transform: translateY(-2px); }\n  .mode h3 { font-size: 17px; font-weight: 400; margin-bottom: 7px; color: #FFF; }\n  .mode p { font-size: 12px; color: #8A8F98; line-height: 1.7; }\n\n  .stats { display: flex; gap: 38px; margin-bottom: 24px; }\n  .stat .v { font-size: 38px; color: #FFF; }\n  .stat .k { font-size: 12px; color: #8A8F98; letter-spacing: 1px; margin-top: 4px; }\n\n  button {\n    padding: 12px 36px; font-size: 15px; color: #14161A; background: #E04B3A;\n    border: none; border-radius: 999px; cursor: pointer; letter-spacing: 3px;\n    font-family: inherit; transition: all .15s;\n  }\n  button:hover { background: #F0604E; }\n  button.ghost { background: #2A2F36; color: #DDD; }\n  button.ghost:hover { background: #363C45; }\n\n  /* 登录 */\n  .authbox { display: flex; flex-direction: column; gap: 12px; width: 268px; margin-top: 4px; }\n  .authbox input {\n    width: 100%; padding: 12px 18px; font-size: 14px; font-family: inherit;\n    background: #191C21; border: 1px solid #2A2F36; border-radius: 10px;\n    color: #FFF; outline: none; text-align: center;\n  }\n  .authbox input:focus { border-color: #E04B3A; }\n  .authmsg { min-height: 18px; font-size: 12px; color: #E04B3A; }\n  .authnote { margin-top: 20px; font-size: 11px; color: #5E636B; }\n\n  .tabs { margin-bottom: 14px; }\n  .tabs span {\n    display: inline-block; padding: 7px 20px; margin: 0 5px;\n    border: 1px solid #2A2F36; border-radius: 999px;\n    font-size: 13px; color: #8A8F98; cursor: pointer;\n  }\n  .tabs span.on { border-color: #E04B3A; color: #FFF; }\n\n  /* 排行 */\n  .ranklist { width: min(560px, 86vw); margin: 16px 0 24px; text-align: left; max-height: 52vh; overflow: auto; }\n  .rankrow {\n    display: flex; align-items: center; gap: 12px; padding: 11px 14px;\n    border-bottom: 1px solid #23272D; font-size: 14px; color: #D8D8D8;\n  }\n  .rankrow .no { width: 26px; color: #6A6F78; }\n  .rankrow.top1 .no, .rankrow.top1 .nm { color: #E04B3A; }\n  .rankrow .nm { flex: 1; }\n  .rankrow .ac { width: 70px; text-align: right; color: #8A8F98; font-size: 12px; }\n  .rankrow .sc { width: 68px; text-align: right; color: #FFF; }\n  .rankempty { color: #5E636B; font-size: 13px; padding: 26px 0; text-align: center; }\n\n  .rankbtn {\n    margin-top: 22px; padding: 9px 26px; font-size: 13px; letter-spacing: 2px;\n    color: #8A8F98; background: none; border: 1px solid #2A2F36;\n    border-radius: 999px; cursor: pointer; font-family: inherit;\n  }\n  .rankbtn:hover { color: #FFF; border-color: #E04B3A; }\n\n  .userbar { margin-top: 16px; font-size: 12px; color: #6A6F78; }\n  .userbar b { color: #E04B3A; font-weight: 400; }\n  .userbar a { color: #8A8F98; cursor: pointer; text-decoration: underline; }\n  .userbar a:hover { color: #FFF; }\n\n  #muteTip { position: fixed; right: 20px; bottom: 14px; font-size: 12px; color: #6A6F78; pointer-events: none; }\n  .submitmsg { font-size: 12px; color: #8A8F98; min-height: 18px; margin-bottom: 16px; }\n</style>\n</head>\n<body>\n<canvas id=\"cv\"></canvas>\n\n<!-- 登录 -->\n<div class=\"overlay\" id=\"auth\">\n  <h1 style=\"font-size:30px;\">练 枪 模 拟 器</h1>\n  <div class=\"sub\">登录后成绩会进在线排行榜</div>\n  <div class=\"tabs\" id=\"authTabs\">\n    <span data-t=\"login\" class=\"on\">登 录</span>\n    <span data-t=\"reg\">注 册</span>\n  </div>\n  <div class=\"authbox\">\n    <input id=\"uName\" maxlength=\"10\" placeholder=\"用户名（2～10 字）\" autocomplete=\"off\">\n    <input id=\"uPass\" type=\"password\" maxlength=\"24\" placeholder=\"密码（至少 4 位）\">\n    <input id=\"uPass2\" type=\"password\" maxlength=\"24\" placeholder=\"再输一次密码\" style=\"display:none\">\n    <div class=\"authmsg\" id=\"authMsg\"></div>\n    <button id=\"authBtn\">登 录</button>\n  </div>\n  <div class=\"authnote\">密码会加密存在服务器上，但请不要用你在别处用过的密码</div>\n</div>\n\n<!-- 主菜单 -->\n<div class=\"overlay hide\" id=\"menu\">\n  <h1>练 枪 模 拟 器</h1>\n  <div class=\"sub\">60 秒 · 只练准度</div>\n  <div class=\"modes\">\n    <div class=\"mode\" data-mode=\"grid\">\n      <h3>网格速点</h3>\n      <p>同时 3 个靶<br>点掉立刻刷新<br>练手速与准度</p>\n    </div>\n    <div class=\"mode\" data-mode=\"reaction\">\n      <h3>反应挑战</h3>\n      <p>每次只出一个靶<br>1.2 秒内必须打中<br>练反应</p>\n    </div>\n    <div class=\"mode\" data-mode=\"precision\">\n      <h3>精准模式</h3>\n      <p>靶只有一半大小<br>逼你稳住手<br>练精准</p>\n    </div>\n  </div>\n  <button class=\"rankbtn\" id=\"openRank\">查看排行榜</button>\n  <div class=\"userbar\">当前：<b id=\"curUser\">—</b>　<a id=\"logout\">退出登录</a></div>\n</div>\n\n<!-- 结算 -->\n<div class=\"overlay hide\" id=\"result\">\n  <h1 style=\"font-size:32px;\">结 算</h1>\n  <div class=\"sub\" id=\"result-mode\"></div>\n  <div class=\"stats\">\n    <div class=\"stat\"><div class=\"v\" id=\"r-score\">0</div><div class=\"k\">得分</div></div>\n    <div class=\"stat\"><div class=\"v\" id=\"r-acc\">0%</div><div class=\"k\">命中率</div></div>\n    <div class=\"stat\"><div class=\"v\" id=\"r-rt\">0</div><div class=\"k\">平均反应 ms</div></div>\n    <div class=\"stat\"><div class=\"v\" id=\"r-hits\">0</div><div class=\"k\">命中</div></div>\n  </div>\n  <div class=\"submitmsg\" id=\"submitMsg\"></div>\n  <div style=\"display:flex; gap:14px;\">\n    <button id=\"again\">再 来 一 次</button>\n    <button id=\"back\" class=\"ghost\">换 模 式</button>\n  </div>\n</div>\n\n<!-- 排行榜 -->\n<div class=\"overlay hide\" id=\"rank\">\n  <h1 style=\"font-size:28px;\">排 行 榜</h1>\n  <div class=\"sub\" style=\"margin-bottom:12px;\">全服 Top 20 · 每人只记最高分</div>\n  <div class=\"tabs\" id=\"rankTabs\">\n    <span data-m=\"grid\" class=\"on\">网格速点</span>\n    <span data-m=\"reaction\">反应挑战</span>\n    <span data-m=\"precision\">精准模式</span>\n  </div>\n  <div class=\"ranklist\" id=\"rankList\"></div>\n  <button id=\"rankClose\" class=\"ghost\">关 闭</button>\n</div>\n\n<div id=\"muteTip\">🔊 音效开（按 M 静音）</div>\n\n<script>\n/* ================== 参数 ================== */\nconst CONFIG = {\n  duration: 60,\n  gridTargets: 3,\n  gridRadius: 30,\n  precisionRadius: 15,\n  reactionRadius: 34,\n  reactionLimit: 1200,\n  scoreHit: 100,\n  scoreMiss: -25,\n};\n\nconst MODES = {\n  grid: { name: '网格速点', radius: CONFIG.gridRadius },\n  reaction: { name: '反应挑战', radius: CONFIG.reactionRadius },\n  precision: { name: '精准模式', radius: CONFIG.precisionRadius },\n};\n\n/* ================== 音效 ================== */\nconst Sound = {\n  ctx: null, muted: false,\n  init() {\n    if (!this.ctx) {\n      const AC = window.AudioContext || window.webkitAudioContext;\n      if (!AC) return;\n      this.ctx = new AC();\n    }\n    if (this.ctx.state === 'suspended') this.ctx.resume();\n  },\n  tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {\n    if (this.muted || !this.ctx) return;\n    const t = this.ctx.currentTime;\n    const osc = this.ctx.createOscillator();\n    const gain = this.ctx.createGain();\n    osc.type = type;\n    osc.frequency.setValueAtTime(freq, t);\n    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);\n    gain.gain.setValueAtTime(0.0001, t);\n    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);\n    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);\n    osc.connect(gain).connect(this.ctx.destination);\n    osc.start(t); osc.stop(t + dur + 0.02);\n  },\n  hit() { this.tone(880, 0.09, 'triangle', 0.16, 1500); },\n  miss() { this.tone(180, 0.16, 'sawtooth', 0.10, 90); },\n  timeout() { this.tone(300, 0.12, 'square', 0.07, 200); },\n  tick() { this.tone(1046, 0.06, 'sine', 0.10); },\n  start() { this.tone(523, 0.1, 'sine', 0.12, 784); },\n  end() {\n    this.tone(784, 0.16, 'sine', 0.12, 523);\n    setTimeout(() => this.tone(523, 0.3, 'sine', 0.10, 392), 150);\n  }\n};\n\n/* ================== 基础 ================== */\nconst cv = document.getElementById('cv');\nconst ctx = cv.getContext('2d');\nconst menu = document.getElementById('menu');\nconst result = document.getElementById('result');\nconst authEl = document.getElementById('auth');\nconst rankEl = document.getElementById('rank');\n\nlet W, H, DPR = Math.min(devicePixelRatio || 1, 2);\nlet mouse = { x: -100, y: -100 };\nlet currentUser = null;\n\nconst S = {\n  running: false, mode: 'grid', timeLeft: CONFIG.duration,\n  targets: [], hits: 0, misses: 0, score: 0,\n  reactionTimes: [], hitFlash: [], lastSec: 99\n};\n\nfunction resize() {\n  W = window.innerWidth; H = window.innerHeight;\n  cv.width = W * DPR; cv.height = H * DPR;\n  cv.style.width = W + 'px'; cv.style.height = H + 'px';\n  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);\n}\nwindow.addEventListener('resize', resize);\n\n/* ================== API ================== */\nasync function api(path, body) {\n  const opt = body\n    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }\n    : {};\n  const r = await fetch(path, opt);\n  let d = {};\n  try { d = await r.json(); } catch (e) {}\n  if (!r.ok) throw new Error(d.error || ('请求失败 ' + r.status));\n  return d;\n}\n\n/* ================== 输入 ================== */\nwindow.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });\nwindow.addEventListener('mousedown', e => {\n  mouse.x = e.clientX; mouse.y = e.clientY;\n  if (S.running) clickAt(e.clientX, e.clientY);\n});\n\n/* ================== 靶 ================== */\nfunction randTarget(radius, avoid = []) {\n  const pad = radius + 40;\n  let best = null, bestDist = -1;\n  for (let i = 0; i < 24; i++) {\n    const t = { x: pad + Math.random() * (W - pad * 2), y: pad + Math.random() * (H - pad * 2),\n                r: radius, born: performance.now() };\n    let d = Infinity;\n    for (const a of avoid) d = Math.min(d, Math.hypot(a.x - t.x, a.y - t.y));\n    if (d > bestDist) { bestDist = d; best = t; }\n    if (bestDist > radius * 4) break;\n  }\n  return best;\n}\n\n/* ================== 流程 ================== */\nfunction start(mode) {\n  S.mode = mode; S.running = true;\n  S.timeLeft = CONFIG.duration;\n  S.hits = 0; S.misses = 0; S.score = 0;\n  S.reactionTimes = []; S.targets = []; S.hitFlash = [];\n  S.lastSec = 99;\n  Sound.init(); Sound.start();\n\n  menu.classList.add('hide');\n  result.classList.add('hide');\n  rankEl.classList.add('hide');\n\n  const r = MODES[mode].radius;\n  if (mode === 'grid') {\n    for (let i = 0; i < CONFIG.gridTargets; i++) S.targets.push(randTarget(r, S.targets));\n  } else {\n    S.targets.push(randTarget(r, []));\n  }\n}\n\nfunction clickAt(x, y) {\n  for (let i = S.targets.length - 1; i >= 0; i--) {\n    const t = S.targets[i];\n    if (Math.hypot(t.x - x, t.y - y) <= t.r) {\n      S.hits++;\n      S.score += CONFIG.scoreHit;\n      S.reactionTimes.push(performance.now() - t.born);\n      Sound.hit();\n      S.hitFlash.push({ x: t.x, y: t.y, r: t.r, born: performance.now() });\n\n      const r = MODES[S.mode].radius;\n      if (S.mode === 'grid') {\n        S.targets[i] = randTarget(r, S.targets.filter((_, k) => k !== i));\n      } else {\n        S.targets = [randTarget(r, [])];\n      }\n      return;\n    }\n  }\n  S.misses++;\n  S.score += CONFIG.scoreMiss;\n  Sound.miss();\n}\n\n/* ================== 绘制 ================== */\nfunction drawTarget(t, now) {\n  const grow = Math.min(1, (now - t.born) / 130);\n  const r = t.r * (0.6 + 0.4 * grow);\n  ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2);\n  ctx.fillStyle = '#E04B3A'; ctx.fill();\n  ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.62, 0, Math.PI * 2);\n  ctx.fillStyle = '#F7F2E7'; ctx.fill();\n  ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.26, 0, Math.PI * 2);\n  ctx.fillStyle = '#E04B3A'; ctx.fill();\n}\n\nfunction drawCrosshair() {\n  const { x, y } = mouse;\n  ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.4;\n  const gap = 5, len = 9;\n  ctx.beginPath();\n  ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y);\n  ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y);\n  ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap);\n  ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len);\n  ctx.stroke();\n  ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2);\n  ctx.fillStyle = '#E04B3A'; ctx.fill();\n}\n\n/* ================== 主循环 ================== */\nlet last = 0;\nfunction loop(now) {\n  const dt = Math.min(now - last, 60);\n  last = now;\n\n  ctx.fillStyle = '#14161A';\n  ctx.fillRect(0, 0, W, H);\n\n  ctx.strokeStyle = 'rgba(255,255,255,0.03)';\n  ctx.lineWidth = 1;\n  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }\n  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }\n\n  if (S.running) {\n    S.timeLeft -= dt / 1000;\n\n    const sec = Math.ceil(S.timeLeft);\n    if (sec <= 5 && sec > 0 && sec !== S.lastSec) { S.lastSec = sec; Sound.tick(); }\n\n    if (S.mode === 'reaction' && S.targets.length) {\n      const t = S.targets[0];\n      if (now - t.born > CONFIG.reactionLimit) {\n        S.misses++; S.score += CONFIG.scoreMiss;\n        Sound.timeout();\n        S.targets = [randTarget(MODES.reaction.radius, [])];\n      }\n    }\n\n    if (S.timeLeft <= 0) end();\n\n    ctx.font = '15px \"Microsoft YaHei\", sans-serif';\n    ctx.textAlign = 'left'; ctx.fillStyle = '#8A8F98';\n    ctx.fillText('得分 ' + S.score, 28, 38);\n    ctx.textAlign = 'center';\n    ctx.fillStyle = S.timeLeft < 10 ? '#E04B3A' : '#8A8F98';\n    ctx.fillText(Math.ceil(S.timeLeft) + 's', W / 2, 38);\n    const acc = S.hits + S.misses > 0 ? (S.hits / (S.hits + S.misses) * 100).toFixed(1) : '100.0';\n    ctx.textAlign = 'right'; ctx.fillStyle = '#8A8F98';\n    ctx.fillText('命中率 ' + acc + '%', W - 28, 38);\n  }\n\n  for (const t of S.targets) drawTarget(t, now);\n\n  for (let i = S.hitFlash.length - 1; i >= 0; i--) {\n    const f = S.hitFlash[i];\n    const k = (now - f.born) / 260;\n    if (k >= 1) { S.hitFlash.splice(i, 1); continue; }\n    ctx.beginPath();\n    ctx.arc(f.x, f.y, f.r * (1 + k * 1.6), 0, Math.PI * 2);\n    ctx.strokeStyle = 'rgba(224,75,58,' + (1 - k) + ')';\n    ctx.lineWidth = 2.5; ctx.stroke();\n  }\n\n  drawCrosshair();\n  requestAnimationFrame(loop);\n}\n\n/* ================== 结算 ================== */\nasync function end() {\n  S.running = false;\n  Sound.end();\n\n  const total = S.hits + S.misses;\n  const acc = total ? S.hits / total * 100 : 0;\n  const rt = S.reactionTimes.length\n    ? Math.round(S.reactionTimes.reduce((a, b) => a + b, 0) / S.reactionTimes.length) : 0;\n\n  document.getElementById('r-score').textContent = S.score;\n  document.getElementById('r-acc').textContent = acc.toFixed(1) + '%';\n  document.getElementById('r-rt').textContent = rt;\n  document.getElementById('r-hits').textContent = S.hits;\n  document.getElementById('result-mode').textContent = MODES[S.mode].name;\n\n  const msgEl = document.getElementById('submitMsg');\n  msgEl.textContent = '正在提交成绩…';\n  result.classList.remove('hide');\n\n  try {\n    const d = await api('/api/score', {\n      mode: S.mode, score: S.score, acc: acc.toFixed(1), rt\n    });\n    msgEl.textContent = d.best ? '✓ 刷新了个人最高分' : ('个人最高：' + d.bestScore + ' 分');\n  } catch (e) {\n    msgEl.textContent = '提交失败：' + e.message;\n  }\n}\n\n/* ================== 排行榜 ================== */\nlet rankMode = 'grid';\n\nasync function renderRank(mode) {\n  const list = document.getElementById('rankList');\n  list.innerHTML = '<div class=\"rankempty\">加载中…</div>';\n  try {\n    const d = await api('/api/leaderboard?mode=' + encodeURIComponent(mode));\n    if (!d.list.length) {\n      list.innerHTML = '<div class=\"rankempty\">还没有人上榜，去抢第一名</div>';\n      return;\n    }\n    list.innerHTML = d.list.map((e, i) => `\n      <div class=\"rankrow ${i === 0 ? 'top1' : ''}\">\n        <span class=\"no\">${i + 1}</span>\n        <span class=\"nm\">${escapeHtml(e.name)}</span>\n        <span class=\"ac\">${e.acc}%</span>\n        <span class=\"sc\">${e.score}</span>\n      </div>`).join('');\n  } catch (e) {\n    list.innerHTML = '<div class=\"rankempty\">加载失败：' + e.message + '</div>';\n  }\n}\n\nfunction escapeHtml(s) {\n  return String(s).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n}\n\n/* ================== 登录 ================== */\nlet authMode = 'login';\nconst uName = document.getElementById('uName');\nconst uPass = document.getElementById('uPass');\nconst uPass2 = document.getElementById('uPass2');\nconst authMsg = document.getElementById('authMsg');\n\nfunction msg(t) { authMsg.textContent = t || ''; }\n\nfunction setAuthMode(m) {\n  authMode = m;\n  document.querySelectorAll('#authTabs span').forEach(s => s.classList.toggle('on', s.dataset.t === m));\n  uPass2.style.display = m === 'reg' ? 'block' : 'none';\n  document.getElementById('authBtn').textContent = m === 'reg' ? '注 册' : '登 录';\n  msg('');\n}\n\nfunction enterApp(name) {\n  currentUser = name;\n  document.getElementById('curUser').textContent = name;\n  authEl.classList.add('hide');\n  menu.classList.remove('hide');\n}\n\nfunction showAuth() {\n  authEl.classList.remove('hide');\n  menu.classList.add('hide');\n  result.classList.add('hide');\n  rankEl.classList.add('hide');\n  msg('');\n}\n\nasync function doAuth() {\n  const name = uName.value.trim();\n  const p1 = uPass.value;\n  const p2 = uPass2.value;\n\n  if (name.length < 2 || name.length > 10) return msg('用户名 2～10 个字');\n  if (p1.length < 4) return msg('密码至少 4 位');\n  if (authMode === 'reg' && p1 !== p2) return msg('两次密码不一样');\n\n  const btn = document.getElementById('authBtn');\n  btn.disabled = true;\n  msg('处理中…');\n  try {\n    if (authMode === 'reg') {\n      await api('/api/register', { username: name, password: p1 });\n    }\n    await api('/api/login', { username: name, password: p1 });\n    enterApp(name);\n  } catch (e) {\n    msg(e.message);\n  } finally {\n    btn.disabled = false;\n  }\n}\n\ndocument.querySelectorAll('#authTabs span').forEach(s => { s.onclick = () => setAuthMode(s.dataset.t); });\ndocument.getElementById('authBtn').onclick = doAuth;\n[uName, uPass, uPass2].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') doAuth(); }));\n\ndocument.getElementById('logout').onclick = async () => {\n  try { await api('/api/logout', {}); } catch (e) {}\n  currentUser = null;\n  uName.value = ''; uPass.value = ''; uPass2.value = '';\n  showAuth();\n};\n\n/* ================== 绑定 ================== */\ndocument.querySelectorAll('.mode').forEach(el => {\n  el.addEventListener('click', () => start(el.dataset.mode));\n});\ndocument.getElementById('again').onclick = () => start(S.mode);\ndocument.getElementById('back').onclick = () => {\n  result.classList.add('hide');\n  menu.classList.remove('hide');\n};\n\ndocument.getElementById('openRank').onclick = () => {\n  rankEl.classList.remove('hide');\n  rankMode = 'grid';\n  document.querySelectorAll('#rankTabs span').forEach(s => s.classList.toggle('on', s.dataset.m === 'grid'));\n  renderRank(rankMode);\n};\ndocument.querySelectorAll('#rankTabs span').forEach(sp => {\n  sp.onclick = () => {\n    rankMode = sp.dataset.m;\n    document.querySelectorAll('#rankTabs span').forEach(s => s.classList.toggle('on', s === sp));\n    renderRank(rankMode);\n  };\n});\ndocument.getElementById('rankClose').onclick = () => rankEl.classList.add('hide');\n\nwindow.addEventListener('keydown', e => {\n  if (e.key === 'm' || e.key === 'M') {\n    Sound.muted = !Sound.muted;\n    document.getElementById('muteTip').textContent =\n      Sound.muted ? '🔇 已静音（按 M 打开）' : '🔊 音效开（按 M 静音）';\n  }\n});\n\n/* ================== 启动 ================== */\n(function boot() {\n  resize();\n  requestAnimationFrame(t => { last = t; loop(t); });\n  api('/api/me').then(d => {\n    if (d.user) enterApp(d.user);\n    else showAuth();\n  }).catch(() => showAuth());\n})();\n</script>\n</body>\n</html>\n";

const SESSION_DAYS = 7;
const MAX_SCORE = 100000;      // 防作弊：分数上限
const MIN_INTERVAL_MS = 30000; // 两次交成绩最少间隔 30 秒

/* ---------------- 数据 ---------------- */
let DB = { users: {}, sessions: {}, scores: {} };

function initData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    DB = { users: {}, sessions: {}, scores: {} };
  }
  DB.users = DB.users || {};
  DB.sessions = DB.sessions || {};
  DB.scores = DB.scores || {};
}

let writeTimer = null;
function saveDB() {
  // 内存里已经是新的了，这里只负责异步落盘
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(DB, null, 2));
      fs.renameSync(DB_FILE + '.tmp', DB_FILE);
    } catch (e) {
      console.error('写入数据失败:', e.message);
    }
  }, 100);
}

/* ---------------- 工具 ---------------- */
function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseCookie(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) req.destroy(); // 1MB 上限
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { resolve({}); }
    });
  });
}

function currentUser(req, db) {
  const token = parseCookie(req).sid;
  if (!token) return null;
  const s = db.sessions[token];
  if (!s) return null;
  if (s.exp < Date.now()) { delete db.sessions[token]; saveDB(); return null; }
  return s.user;
}

const MODES = ['grid', 'reaction', 'precision'];

/* ---------------- 路由 ---------------- */
async function handleApi(req, res, urlPath) {
  const db = DB;
  const method = req.method;

  /* 注册 */
  if (urlPath === '/api/register' && method === 'POST') {
    const { username, password } = await readBody(req);
    const name = String(username || '').trim();
    const pass = String(password || '');

    if (name.length < 2 || name.length > 10) return json(res, 400, { error: '用户名 2～10 个字' });
    if (pass.length < 4) return json(res, 400, { error: '密码至少 4 位' });
    if (db.users[name]) return json(res, 400, { error: '这个用户名已经被注册了' });

    const salt = crypto.randomBytes(8).toString('hex');
    db.users[name] = {
      salt,
      hash: await scrypt(pass, salt),
      created: Date.now()
    };
    saveDB();
    return json(res, 200, { ok: true });
  }

  /* 登录 */
  if (urlPath === '/api/login' && method === 'POST') {
    const { username, password } = await readBody(req);
    const name = String(username || '').trim();
    const pass = String(password || '');
    const u = db.users[name];
    if (!u) return json(res, 400, { error: '没有这个用户，先去注册' });

    const hash = await scrypt(pass, u.salt);
    if (hash !== u.hash) return json(res, 400, { error: '密码不对' });

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { user: name, exp: Date.now() + SESSION_DAYS * 864e5 };
    saveDB();

    res.setHeader('Set-Cookie',
      `sid=${token}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; SameSite=Lax`);
    return json(res, 200, { ok: true, user: name });
  }

  /* 退出 */
  if (urlPath === '/api/logout' && method === 'POST') {
    const token = parseCookie(req).sid;
    if (token) { delete db.sessions[token]; saveDB(); }
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  /* 当前用户 */
  if (urlPath === '/api/me' && method === 'GET') {
    const user = currentUser(req, db);
    return json(res, 200, { user });
  }

  /* 提交成绩 */
  if (urlPath === '/api/score' && method === 'POST') {
    const user = currentUser(req, db);
    if (!user) return json(res, 401, { error: '请先登录' });

    const { mode, score, acc, rt } = await readBody(req);
    if (!MODES.includes(mode)) return json(res, 400, { error: '模式不对' });

    const sc = Number(score);
    if (!Number.isFinite(sc) || sc < -10000 || sc > MAX_SCORE) {
      return json(res, 400, { error: '分数不合法' });
    }

    db.scores[mode] = db.scores[mode] || {};
    const old = db.scores[mode][user];
    const now = Date.now();

    // 防刷：30 秒内只能提交一次
    if (old && now - old.time < MIN_INTERVAL_MS) {
      return json(res, 429, { error: '别急，30 秒后再交' });
    }
    // 只保留个人最高分
    if (old && old.score >= sc) {
      return json(res, 200, { ok: true, best: false, bestScore: old.score });
    }

    db.scores[mode][user] = {
      score: sc,
      acc: Number(acc) || 0,
      rt: Number(rt) || 0,
      time: now
    };
    saveDB();
    return json(res, 200, { ok: true, best: true, bestScore: sc });
  }

  /* 排行榜 */
  if (urlPath === '/api/leaderboard' && method === 'GET') {
    const mode = (new URL('http://x' + req.url)).searchParams.get('mode') || 'grid';
    if (!MODES.includes(mode)) return json(res, 400, { error: '模式不对' });

    const m = db.scores[mode] || {};
    const list = Object.entries(m)
      .map(([name, v]) => ({ name, score: v.score, acc: v.acc, rt: v.rt, time: v.time }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return json(res, 200, { mode, list });
  }

  return json(res, 404, { error: 'not found' });
}

/* ---------------- 启动 ---------------- */
initData();

const server = http.createServer(async (req, res) => {
  const url = new URL('http://x' + req.url);
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    try {
      await handleApi(req, res, p);
    } catch (e) {
      console.error('API 出错:', e);
      json(res, 500, { error: '服务器内部错误' });
    }
    return;
  }
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(INDEX_HTML);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, HOST, () => {
  console.log('----------------------------------------');
  console.log('  练枪模拟器 已启动');
  console.log('  本机：  http://localhost:' + PORT);
  const nets = os.networkInterfaces();
  Object.values(nets).forEach(list => {
    (list || []).forEach(n => {
      if (n.family === 'IPv4' && !n.internal) {
        console.log('  局域网：http://' + n.address + ':' + PORT);
      }
    });
  });
  console.log('  数据：  ' + DB_FILE);
  console.log('----------------------------------------');
});
