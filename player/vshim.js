// 成片视频集（HyperFrames 渲染的系列）的画面接口：和画布集一样提供 boot / renderFrame / grab，
// 播放器、首页轮播和悬停预览都不用改。画面来自同目录的 video.mp4（无声），声音仍由播放器的 audio.mp3 驱动。
(() => {
  const c = document.getElementById('c'), g = c.getContext('2d');
  const v = document.createElement('video');
  Object.assign(v, { muted: true, playsInline: true, preload: 'auto', src: 'video.mp4' });
  v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
  let meta = null, last = { t: -1, w: 0 }, rate = 1, idle = 0;
  window.FPS = 30;
  const draw = () => { if (v.readyState >= 2) g.drawImage(v, 0, 0, c.width, c.height); };
  const seek = t => new Promise(r => {
    if (Math.abs(v.currentTime - t) < 1e-3 && v.readyState >= 2) return r();
    const done = () => { clearTimeout(to); r(); }, to = setTimeout(done, 4000);
    v.addEventListener('seeked', done, { once: true }); v.currentTime = t;
  });
  window.boot = async () => {
    if (meta) return meta;
    meta = await (await fetch('meta.json')).json(); window.FPS = meta.fps;
    if (v.readyState < 2) await new Promise(r => v.addEventListener('loadeddata', r, { once: true }));
    await seek(0); draw();
    return meta;
  };
  window.renderFrame = async f => {
    const t = Math.min(f / meta.fps, meta.total - 0.04), now = performance.now();
    const dt = t - last.t, dw = (now - last.w) / 1000;
    const cont = last.t >= 0 && dt > 0 && dt < 0.5 && dw > 0 && dw < 0.3;
    last = { t, w: now };
    clearTimeout(idle); idle = setTimeout(() => v.pause(), 250);
    if (cont) {                                   // 连续往前播：让视频自己走，只在偏差大时校正
      rate = rate * 0.8 + Math.min(4, Math.max(0.25, dt / dw)) * 0.2;
      if (v.paused) { v.currentTime = t; v.play().catch(() => {}); }
      else if (Math.abs(v.currentTime - t) > 0.35) v.currentTime = t;
      v.playbackRate = Math.min(4, Math.max(0.25, rate + (t - v.currentTime) * 0.5));
      draw(); return;
    }
    if (!v.paused) v.pause();                     // 跳转：精确定位到那一帧
    await seek(t); draw();
  };
  window.grab = async f => { v.pause(); await seek(f / meta.fps); draw(); return c.toDataURL('image/jpeg', 0.9); };
})();
