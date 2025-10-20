(() => {
  // quick helper: saves me typing document.getElementById everywhere
  function $(id) {
    return document.getElementById(id);
  }

  // ---------- tiny routing (show/hide pages) ----------
  // the code below probably flips pages. idk i was half asleep when I first wrote it
  const showPage = (id) => {
    const pages = document.querySelectorAll(".page");
    pages.forEach((p) => p.classList.remove("active"));
    const el = $(id);
    if (!el) {
      console.warn("showPage: missing", id); // shouldn't happen, but eh
      return;
    }
    el.classList.add("active");
  };

  // ---------- grab DOM nodes (one line chaos) ----------
  const enterBtn = $("enterBtn"),
    howBtn = $("howBtn"),
    pageInput = $("pageInput"),
    pageProcessing = $("pageProcessing"),
    pageResult = $("pageResult"),
    pageLanding = $("pageLanding"),
    btnIgnite = $("btnIgnite"),
    btnBackToLanding = $("btnBackToLanding"),
    btnBackToInput = $("btnBackToInput"),
    btnRetry = $("btnRetry"),
    nmA = $("nmA"),
    nmB = $("nmB"),
    procText = $("procText"),
    procSub = $("procSub"),
    spinnerHeart = $("spinnerHeart"),
    lettersRow = $("lettersRow"),
    finalTitle = $("finalTitle"),
    finalDesc = $("finalDesc"),
    // meterFill removed — till now i don't even know what i removed (God help me)
    fxLayer = $("fxLayer"),
    shareCanvas = $("shareCanvas"),
    btnMusicToggle = $("btnMusicToggle"),
    btnMuteSfx = $("btnMuteSfx"),
    btnShareGen = $("btnShareGen"),
    btnDownload = $("btnDownload");

  const lettersInitial = ["F", "L", "A", "M", "E", "S"];

  // ---------- state ----------
  let audioOn = true;
  let bgOn = true;
  const bgMusicPath = "/nyah-arigato.mp3"; // keep your file or set falsy to use synth fallback
  let audioCtx = null;
  let bgAudio = null;
  let bgOscs = [];
  let bgGain = null;
  let bgPlaying = false;
  let fadeHandle = null; // for fade interval handle

  // lazy init audio context — don't wake it before user interacts
  function getAudioCtx() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // tiny random pick helper
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- synth SFX ----------
  // bright echoed "gay" effect — synthy --- probably not necessary but eh
  function playGayEcho() {
    if (!audioOn) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const delay = ctx.createDelay();
    const fb = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(420, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    delay.delayTime.value = 0.2;
    fb.gain.value = 0.42;

    osc.connect(g);
    g.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(ctx.destination);
    g.connect(ctx.destination);

    osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.26);

    osc.start();
    // using setTimeout stop because exact time math is annoying sometimes
    setTimeout(() => {
      try {
        osc.stop();
      } catch (e) {}
    }, 1200);
  }

  // villain laugh -- still didn't use this for some reason
  function playEvilLaugh() {
    if (!audioOn) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "square";
    osc.frequency.value = 110;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
      } catch (e) {}
    }, 1250);
  }

  // sad trombone-ish -- also probably didn't use this
  function playWomp() {
    if (!audioOn) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.value = 220;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
      } catch (e) {}
    }, 1100);
  }

  // quick blip/pop -- i don't even know what this is but it works
  function playPop() {
    if (!audioOn) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 640;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
      } catch (e) {}
    }, 180);
  }

  // ---------- background music (file first, synth fallback) ----------
  // starts music if allowed; nothing fancy. leave bgMusicPath falsy to use synth.
  function startBackground() {
    if (bgPlaying || !audioOn || !bgOn) return;
    if (bgMusicPath) {
      // try file first
      bgAudio = new Audio(bgMusicPath);
      bgAudio.loop = true;
      bgAudio.volume = 0.9;
      bgAudio.play().catch((e) => console.warn("bg play failed", e));
      bgPlaying = true;
      return;
    }

    // synth fallback (gentle pads)
    const ctx = getAudioCtx();
    bgGain = ctx.createGain();
    bgGain.gain.value = 0.05;
    bgGain.connect(ctx.destination);
    const base = 110;
    const freqs = [base, base * 1.5, base * 2.0];
    bgOscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.value = 0.0001 + 0.02 * Math.random();
      o.connect(g);
      g.connect(bgGain);
      o.start();
      g.gain.linearRampToValueAtTime(
        0.03 + Math.random() * 0.05,
        ctx.currentTime + (0.4 + i * 0.5)
      );
      return o;
    });
    bgPlaying = true;
  }

  // stop background; fade param decides fade or hard stop
  function stopBackground(fade = true) {
    if (!bgPlaying) return;
    if (fadeHandle) {
      clearInterval(fadeHandle);
      fadeHandle = null;
    }

    if (bgAudio) {
      if (!fade) {
        try {
          bgAudio.pause();
          bgAudio.currentTime = 0;
        } catch (e) {}
        bgAudio = null;
        bgPlaying = false;
        return;
      }
      // fade out the file (small steps)
      fadeHandle = setInterval(() => {
        if (!bgAudio) {
          clearInterval(fadeHandle);
          fadeHandle = null;
          bgPlaying = false;
          return;
        }
        bgAudio.volume = Math.max(0, (bgAudio.volume || 0) - 0.08);
        if ((bgAudio.volume || 0) <= 0.05) {
          try {
            bgAudio.pause();
            bgAudio.currentTime = 0;
          } catch (e) {}
          bgAudio = null;
          clearInterval(fadeHandle);
          fadeHandle = null;
          bgPlaying = false;
        }
      }, 180); // not fancy, but works  - probably
      return;
    }

    // synth fade
    if (!fade) {
      try {
        bgOscs.forEach((o) => o.stop());
      } catch (e) {}
      bgOscs = [];
      bgPlaying = false;
      return;
    }

    if (bgGain) {
      const current = bgGain.gain.value || 0.05;
      const steps = 6;
      let step = 0;
      fadeHandle = setInterval(() => {
        step++;
        const val = current * (1 - step / steps);
        bgGain.gain.value = Math.max(0, val);
        if (step >= steps) {
          try {
            bgOscs.forEach((o) => o.stop());
          } catch (e) {}
          bgOscs = [];
          bgGain = null;
          clearInterval(fadeHandle);
          fadeHandle = null;
          bgPlaying = false;
        }
      }, 180);
    } else {
      try {
        bgOscs.forEach((o) => o.stop());
      } catch (e) {}
      bgOscs = [];
      bgPlaying = false;
    }
  }

  // ---------- small UI helpers ----------
  // reset the FLAMES letters row
  function resetLetters() {
    if (!lettersRow) return;
    lettersRow.innerHTML = "";
    lettersInitial.forEach((l) => {
      const sp = document.createElement("span");
      sp.textContent = l;
      lettersRow.appendChild(sp);
    });
  }

  // animate the elimination — same algorithm, different name
  function doFlamesAnimation(count, finalLetter) {
    return new Promise((resolve) => {
      if (!lettersRow) return resolve();
      const spans = Array.from(lettersRow.children);

      // Highlight the final letter directly
      for (const s of spans) {
        if (s.textContent === finalLetter) {
          s.style.transition = "transform .7s";
          s.style.transform = "scale(1.12) translateY(-6px)";
          setTimeout(() => {
            s.style.transform = "";
          }, 900);
          break;
        }
      }
      setTimeout(resolve, 700);
    });
  }

  // spawn floating emoji FX
  function spawnFloating(emojis, n = 16) {
    if (!fxLayer) return;
    for (let i = 0; i < n; i++) {
      const e = document.createElement("div");
      e.className = "float-emoji";
      e.style.left = 10 + Math.random() * 80 + "%";
      e.style.bottom = 10 + Math.random() * 10 + "px";
      e.style.setProperty("--dur", 2200 + Math.random() * 1300 + "ms");
      e.style.fontSize = 18 + Math.random() * 42 + "px";
      e.textContent = pick(emojis);
      fxLayer.appendChild(e);
      setTimeout(() => {
        try {
          e.remove();
        } catch (err) {}
      }, 2600 + Math.random() * 200);
    }
  }

  // ---------- FLAMES logic (mostly same) ----------
  // the code below probably does the letter-crunching. i tested it, it works.
  // Important: strip spaces (and other whitespace) from inputs so they
  // don't accidentally change the count and shift the result.
  function flamesLogic(aRaw, bRaw) {
    // Remove whitespace, keep emojis/punctuation; lowercase for matching
    const a = (aRaw || "").replace(/\s+/g, "").toLowerCase();
    const b = (bRaw || "").replace(/\s+/g, "").toLowerCase();

    const arrA = Array.from(a);
    const arrB = Array.from(b);
    const usedB = new Array(arrB.length).fill(false);
    const leftover = [];

    for (let i = 0; i < arrA.length; i++) {
      const c = arrA[i];
      let matched = false;
      for (let j = 0; j < arrB.length; j++) {
        if (!usedB[j] && arrB[j] === c) {
          usedB[j] = true;
          matched = true;
          break;
        }
      }
      if (!matched) leftover.push(c);
    }

    for (let j = 0; j < arrB.length; j++) {
      if (!usedB[j]) leftover.push(arrB[j]);
    }

    const count = leftover.length;

    // If nothing left, default to 'S' (sibling)
    if (count === 0) {
      return { letter: "S", letters: ["F", "L", "A", "M", "E", "S"], count };
    }

    // Modular method: pick letter directly based on count
    const letters = ["F", "L", "A", "M", "E", "S"];
    const letter = letters[(count - 1) % letters.length];

    return { letter: letter, letters: [letter], count };
  }

  // mapping
  const mapping = {
    F: {
      title: "Friends",
      desc: ["You vibin’ like besties — keep the hoodie."],
      emojis: ["🤝"],
    },
    L: {
      title: "Lovers",
      desc: ["Hot chemistry, loud texts, and shared fries."],
      emojis: ["💖"],
    },
    A: {
      title: "Affection",
      desc: ["Cute, swipe-right energy. Not mortgage level."],
      emojis: ["🌸"],
    },
    M: {
      title: "Marriage",
      desc: ["Wedding bells? Low-key maybe. Save for couples mugs."],
      emojis: ["💍"],
    },
    E: {
      title: "Enemies",
      desc: ["Beef detected. Avoid group chats."],
      emojis: ["💀"],
    },
    S: {
      title: "Siblings",
      desc: ["Bro got friendzoned to the DNA level."],
      emojis: ["🫂"],
    },
  };

  // ---------- share card (canvas) ----------
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else line = testLine;
    }
    if (line) ctx.fillText(line, x, y);
  }

  function generateShareCard(nameA, nameB, verdict, desc) {
    if (!shareCanvas) return;
    const cv = shareCanvas;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const g = ctx.createLinearGradient(0, 0, cv.width, cv.height);
    g.addColorStop(0, "#fff0f6");
    g.addColorStop(1, "#fff7ea");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.fillStyle = "#ff3d87";
    ctx.font = "700 18px Arial";
    ctx.fillText("FLAMEZ", 16, 28);

    ctx.fillStyle = "#333";
    ctx.font = "600 16px Arial";
    ctx.fillText((nameA || "") + "  ❤  " + (nameB || ""), 16, 60);

    ctx.font = "700 20px Arial";
    ctx.fillStyle = "#111";
    ctx.fillText(verdict || "", 16, 100);

    ctx.font = "14px Arial";
    ctx.fillStyle = "#333";
    wrapText(ctx, desc || "", 16, 126, cv.width - 32, 18);

    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText("Made with zero brain cells", 16, cv.height - 12);
  }

  // ---------- meme slots ----------
  const memeSlots = {
    gayEcho: "/gay.mp3",
    evilLaugh: "/bloody-fuck-you.mp3",
    womp: "/why-are-you-gay.mp3",
    wedding: "/flames-TunakTunakTun.mp3",
    friends: "/sea-server-cut.mp3",
    affection: "/Nu-hya.mp3",
  };

  // plays either file or synth fallback
  function playSoundMaybe(slotName) {
    const url = memeSlots[slotName];
    if (url) {
      const a = new Audio(url);
      a.volume = 0.95;
      a.play().catch((e) => console.warn("sound failed", e));
      return;
    }
    if (slotName === "gayEcho") playGayEcho();
    else if (slotName === "evilLaugh") playEvilLaugh();
    else if (slotName === "womp") playWomp();
  }

  // ---------- wiring events / main flow ----------
  if (enterBtn)
    enterBtn.addEventListener("click", () => {
      showPage("pageInput");
      playPop();
      //  start background music only after Start button click
      if (bgOn && !bgPlaying) startBackground();
    });
  if (btnBackToLanding)
    btnBackToLanding.addEventListener("click", () => {
      showPage("pageLanding");
      playPop();
    });
  if (btnBackToInput)
    btnBackToInput.addEventListener("click", () => {
      showPage("pageInput");
      playPop();
    });
  if (btnRetry)
    btnRetry.addEventListener("click", () => {
      showPage("pageInput");
      playPop();
    });

  if (btnMusicToggle)
    btnMusicToggle.addEventListener("click", () => {
      bgOn = !bgOn;
      btnMusicToggle.textContent = "Music: " + (bgOn ? "ON" : "OFF");
      if (bgOn) startBackground();
      else stopBackground(true);
    });

  if (btnMuteSfx)
    btnMuteSfx.addEventListener("click", () => {
      audioOn = !audioOn;
      btnMuteSfx.textContent = "SFX: " + (audioOn ? "ON" : "OFF");
      if (!audioOn) stopBackground(false);
      else if (bgOn) startBackground();
    });

  if (btnIgnite)
    btnIgnite.addEventListener("click", async () => {
      const a = nmA && nmA.value ? nmA.value.trim() : "";
      const b = nmB && nmB.value ? nmB.value.trim() : "";
      if (!a || !b) {
        alert("Enter two names or emojis, dawg.");
        return;
      }

      // go to processing
      showPage("pageProcessing");
      playPop();
      procText.textContent = "Cupid.exe is warming up the glitter cannons...";
      procSub.textContent = "This may be louder than your last breakup.";
      if (bgOn) startBackground();

      await wait(600);
      spinnerHeart.textContent = "💖";
      spawnFloating(["💖", "✨", "🌸", "💕"], 12);
      playPop();
      await wait(700);
      procText.textContent = "Analyzing texts, emojis, receipts, and vibes...";
      playPop();
      await wait(600);
      procText.textContent =
        "Removing common letters... calibrating destiny...";
      await wait(800);

      const res = flamesLogic(a, b);
      resetLetters();
      await doFlamesAnimation(res.count, res.letter);

      const map = mapping[res.letter] || {
        title: res.letter,
        desc: ["Mystery fate."],
      };
      finalTitle.textContent = map.title;
      finalDesc.textContent = pick(map.desc);

      // spawn sfx/FX based on verdict
      if (res.letter === "F") {
        spawnFloating(["🤝"], 16);
        playSoundMaybe("friends");
      } else if (res.letter === "L") {
        spawnFloating(["💖", "💘", "😍", "🥰"], 28);
        playSoundMaybe("gayEcho");
      } else if (res.letter === "A") {
        spawnFloating(["🌸", "🥰", "🍩"], 20);
        playSoundMaybe("affection");
      } else if (res.letter === "M") {
        spawnFloating(["💍", "🎊", "🥂"], 28);
        playSoundMaybe("wedding");
      } else if (res.letter === "E") {
        spawnFloating(["💀", "🔥", "😡"], 18);
        playSoundMaybe("evilLaugh");
      } else if (res.letter === "S") {
        spawnFloating(["🫂", "🧸", "👯"], 16);
        playSoundMaybe("womp");
      }

      procText.textContent = "Destiny served. Be proud or scandalized.";
      await wait(800);
      showPage("pageResult");

      // fade out background when landing on results — keeps result clean
      if (bgPlaying) stopBackground(true);

      generateShareCard(a, b, map.title, finalDesc.textContent);
    });

  if (btnShareGen)
    btnShareGen.addEventListener("click", () => {
      const a = (nmA && nmA.value.trim()) || "You";
      const b = (nmB && nmB.value.trim()) || "Them";
      generateShareCard(a, b, finalTitle.textContent, finalDesc.textContent);
    });

  window.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" &&
      pageInput &&
      pageInput.classList.contains("active")
    ) {
      if (btnIgnite) btnIgnite.click();
    }
  });

  // small util
  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // init — reset UI and start bg (if allowed)
  resetLetters();
  showPage("pageLanding");
  //   if (bgOn) startBackground();  this should auto start the background music on page load
})();
