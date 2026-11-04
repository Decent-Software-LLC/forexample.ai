/* Story pages: reader state, the header map, and the interactive toys.
   Content (rounds, quiz, personas, temperature words) comes from _data/act1.yml
   via the #story-data JSON block in _layouts/story.html. */
(function () {
  "use strict";

  var DATA = {};
  try { DATA = JSON.parse(document.getElementById("story-data").textContent); } catch (e) {}
  var HERE = document.body.getAttribute("data-story-id") || "start";
  var KEY = "fxai-act1";
  var TOKENIZER_URL = "https://cdn.jsdelivr.net/npm/gpt-tokenizer@3.4.0/dist/o200k_base.js";

  function fresh() { return { persona: null, visited: [], gRound: 0, gPicks: [], quiz: {} }; }
  var S = fresh();
  try { var raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  if (S.visited.indexOf(HERE) === -1) S.visited.push(HERE);
  save();

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function node(id) { return (DATA.nodes || []).filter(function (n) { return n.id === id; })[0]; }
  function persona() { return (DATA.personas || []).filter(function (p) { return p.id === S.persona; })[0]; }
  function seen(id) { return S.visited.indexOf(id) !== -1; }

  /* ---------- analytics ----------
     Google Analytics events for what happens inside a page. Page views already
     come from the gtag snippet in the layout. Never send what readers type. */
  var once = {};
  function track(name, params, onceKey) {
    if (onceKey) { if (once[onceKey]) return; once[onceKey] = 1; }
    try {
      if (typeof window.gtag !== "function") return;
      var p = { story_page: HERE, reader_type: S.persona || "none" };
      for (var k in params) p[k] = params[k];
      window.gtag("event", name, p);
    } catch (e) {}
  }

  /* ---------- page chrome ---------- */
  function chrome() {
    // persona line ("open" on page 1, "close" at the end)
    var line = document.querySelector("[data-persona-line]");
    var p = persona();
    if (line && p && line.getAttribute("data-persona-line") && p[line.getAttribute("data-persona-line")]) {
      line.textContent = p[line.getAttribute("data-persona-line")];
      line.hidden = false;
    }
    // choices: mark pages already read; drop optional detours already taken
    document.querySelectorAll(".choice[data-to]").forEach(function (a) {
      var to = a.getAttribute("data-to");
      if (a.hasAttribute("data-persona")) {
        a.addEventListener("click", function () {
          S.persona = a.getAttribute("data-persona"); save();
          track("story_reader_type", {});
        });
        return;
      }
      a.addEventListener("click", function () { track("story_choice", { choice_to: to, choice_text: a.querySelector("b").textContent }); });
      if (a.hasAttribute("data-hide-if-read") && seen(to)) { a.hidden = true; return; }
      if (seen(to) && to !== "end" && to !== HERE) a.classList.add("seen");
    });
    // map
    document.querySelectorAll("#map a[data-node]").forEach(function (a) {
      var id = a.getAttribute("data-node");
      if (seen(id)) a.classList.add("visited");
      else { a.setAttribute("tabindex", "-1"); a.setAttribute("aria-hidden", "true"); }
    });
    document.querySelectorAll("#map line").forEach(function (l) {
      if (seen(l.getAttribute("data-a")) && seen(l.getAttribute("data-b"))) l.classList.add("lit");
    });
    var reset = $("reset");
    if (reset) reset.addEventListener("click", function () {
      S = fresh(); save();
      location.href = (node("start") || { url: "/" }).url;
    });
  }

  /* ---------- shared: probability bars ---------- */
  function bars(entries, mine, rest) {
    var h = '<div class="bars">';
    entries.forEach(function (e) {
      var w = e[0], p = e[1], m = w === mine ? " mine" : "";
      h += '<div class="w' + m + '">' + esc(w) + (m ? "<small>your guess</small>" : "") + "</div>" +
        '<div class="track' + m + '"><div class="fill" style="width:' + (p * 100).toFixed(1) + '%"></div></div>' +
        '<div class="v">' + (p * 100).toFixed(p < 0.01 ? 1 : 0) + "%</div>";
    });
    if (rest != null) {
      h += '<div class="w rest">everything else</div><div class="track rest"><div class="fill" style="width:' + rest * 100 + '%"></div></div><div class="v rest">' + Math.round(rest * 100) + "%</div>";
    }
    return h + "</div>";
  }

  /* ---------- toy: be the model ---------- */
  function mountGuess() {
    var box = $("guess"), R = DATA.rounds || [];
    if (!box || !R.length) return;
    function draw() {
      var i = Math.min(S.gRound || 0, R.length - 1), r = R[i], pick = S.gPicks[i];
      var h = '<span class="label">Be the model · sentence ' + (i + 1) + " of " + R.length + "</span>" +
        '<p class="prompt">' + esc(r.before) + ' <span class="blank">' + (pick ? esc(pick) : "&emsp;&emsp;") + "</span>" + esc(r.after || "") + "</p>";
      if (!pick) {
        h += '<p class="hint">Pick the word you think comes next.</p><div class="opts">' +
          r.show.map(function (w) { return '<button class="opt" type="button" data-w="' + esc(w) + '">' + esc(w) + "</button>"; }).join("") + "</div>";
      } else {
        var entries = Object.keys(r.p).map(function (k) { return [k, r.p[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
        h += '<p class="hint">Here\'s how I\'d split my bets:</p>' + bars(entries, pick, r.rest) + '<p class="note">' + r.note + "</p>";
        h += i < R.length - 1
          ? '<button class="btn" type="button" id="gNext">Next sentence</button>'
          : '<div class="row"><span class="note" style="margin:0"><b>That\'s the whole trick.</b> Now pick where to go next.</span><button class="btn ghost" type="button" id="gAgain">Play again</button></div>';
      }
      box.innerHTML = h;
      box.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          var w = b.getAttribute("data-w"), top = Object.keys(r.p).sort(function (x, y) { return r.p[y] - r.p[x]; })[0];
          S.gPicks[i] = w; save();
          track("guess_word", { round: i + 1, sentence: r.before, guess: w, matched_model: w === top ? "yes" : "no" });
          if (i === R.length - 1) {
            var matches = R.filter(function (rr, k) { return S.gPicks[k] === Object.keys(rr.p).sort(function (x, y) { return rr.p[y] - rr.p[x]; })[0]; }).length;
            track("guess_game_complete", { matches: matches, rounds: R.length });
          }
          draw();
        };
      });
      if ($("gNext")) $("gNext").onclick = function () { S.gRound = i + 1; save(); draw(); };
      if ($("gAgain")) $("gAgain").onclick = function () { S.gRound = 0; S.gPicks = []; save(); track("guess_game_replay", {}); draw(); };
    }
    draw();
  }

  /* ---------- toy: tokenizer ---------- */
  // Real tokenizer (GPT-4o's o200k_base), loaded only on this page. If it can't load,
  // fall back to a rough splitter and say so.
  var COMMON = {};
  "the a an and or but my your our their his her its is are was were be to of in on at for with from by as it this that i you we they he she me us them what how why who not no yes do can will just so all one have has had about out up over very more love like name hello good day time people world work home best".split(" ").forEach(function (w) { COMMON[w] = 1; });
  function roughSplit(text) {
    var out = [], re = /'(?:s|t|re|ll|ve|d|m)\b| ?[A-Za-zÀ-ɏ]+| ?\d{1,3}| ?[^\sA-Za-z\d]|\s+/g, m;
    while ((m = re.exec(text))) {
      var t = m[0], lead = t[0] === " " ? " " : "", body = lead ? t.slice(1) : t;
      if (/^\s+$/.test(t)) { if (t.length > 1) out.push(t); continue; }
      if (/^[A-Za-zÀ-ɏ]+$/.test(body) && body.length > 5 && !COMMON[body.toLowerCase()]) {
        var parts = [], i = 0;
        while (body.length - i > 5) { parts.push(body.slice(i, i + 3)); i += 3; }
        parts.push(body.slice(i)); parts[0] = lead + parts[0]; out.push.apply(out, parts);
      } else out.push(t);
    }
    return out.map(function (t) { var h = 2166136261; for (var k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619); } return [t, (h >>> 0) % 100000]; });
  }
  function mountTokens() {
    var inp = $("tokIn"); if (!inp) return;
    var note = $("tokNote"), real = null;
    if (S.tokText != null) inp.value = S.tokText;
    function split(v) {
      if (real) return real.encode(v).map(function (id) { return [real.decode([id]), id]; });
      return roughSplit(v);
    }
    function run() {
      var v = inp.value; S.tokText = v; save();
      var toks = split(v);
      $("tokOut").innerHTML = toks.map(function (t, i) {
        return '<span class="tok c' + (i % 5) + '">' + esc(t[0].replace(/ /g, "·").replace(/\n/g, "↵")) + "<i>" + t[1] + "</i></span>";
      }).join("");
      $("cWords").textContent = (v.trim().match(/\S+/g) || []).length;
      $("cToks").textContent = toks.length;
      $("cChars").textContent = (v.match(/[A-Za-zÀ-ɏ]/g) || []).length;
    }
    var typed = null;
    inp.addEventListener("input", function () {
      run();
      // one event per page view, after the reader pauses typing; counts only, never the text
      clearTimeout(typed);
      typed = setTimeout(function () {
        track("tokenizer_used", { token_count: $("tokOut").children.length, tokenizer: real ? "o200k_base" : "fallback" }, "tok");
      }, 1500);
    });
    var done = false;
    function fallback() {
      if (done) return; done = true;
      note.textContent = "Couldn't load the real tokenizer, so this is a rough stand-in. Real ones learn their splits from huge amounts of text.";
      track("tokenizer_fallback", {}, "tokfail");
      run();
    }
    var s = document.createElement("script");
    s.src = TOKENIZER_URL; s.async = true;
    s.onload = function () {
      if (done) return;
      real = window.GPTTokenizer_o200k_base;
      if (!real || !real.encode) return fallback();
      done = true;
      note.textContent = "This is a real tokenizer, the one OpenAI's GPT-4o models use. Every AI family has its own, so splits vary, but the idea is the same. The numbers are IDs, which is what the model actually receives.";
      run();
    };
    s.onerror = fallback;
    setTimeout(fallback, 8000);
    document.head.appendChild(s);
    $("tokOut").innerHTML = "";
  }

  /* ---------- toy: temperature ---------- */
  function mountTemp() {
    var r = $("temp"), T = DATA.temperature; if (!r || !T) return;
    $("tPrompt").textContent = T.prompt;
    if (S.temp) r.value = S.temp;
    function dist(t) {
      var ex = T.words.map(function (w) { return Math.exp(w.logit / t); });
      var z = ex.reduce(function (a, b) { return a + b; }, 0);
      return T.words.map(function (w, i) { return [w.w, ex[i] / z]; });
    }
    function draw() {
      var t = parseFloat(r.value); S.temp = t; save();
      $("tempOut").textContent = "Temperature " + t.toFixed(2);
      $("tBars").innerHTML = bars(dist(t), null, null);
      $("tNote").innerHTML = t < 0.45 ? "<b>Low.</b> I pick the top choice almost every time. Predictable, a little boring, good for facts and forms."
        : t < 1.2 ? "<b>Middle.</b> Mostly sensible, with an occasional surprise. This is roughly where chat assistants sit."
        : "<b>High.</b> I start taking long shots. More creative, and more nonsense.";
    }
    r.addEventListener("input", draw); draw();
    r.addEventListener("change", function () { track("temperature_changed", { temperature: parseFloat(r.value) }, "temp"); });
    $("tGen").onclick = function () {
      track("temperature_endings", { temperature: parseFloat(r.value) });
      var d = dist(parseFloat(r.value)), items = [];
      for (var k = 0; k < 5; k++) {
        var x = Math.random(), pick = d[d.length - 1][0];
        for (var j = 0; j < d.length; j++) { if ((x -= d[j][1]) <= 0) { pick = d[j][0]; break; } }
        items.push(pick);
      }
      $("tEnd").innerHTML = items.map(function (w) { return "<li>" + esc(T.prompt) + " <b>" + esc(w) + "</b>.</li>"; }).join("");
    };
  }

  /* ---------- toy: quick check ---------- */
  function mountQuiz() {
    var box = $("quiz"), Q = DATA.quiz || []; if (!box) return;
    function draw() {
      box.innerHTML = Q.map(function (q, i) {
        var ans = S.quiz[i], done = ans !== undefined, ok = ans === q.a;
        return '<div class="q' + (done ? (ok ? " right" : " wrong") : "") + '"><p>' + esc(q.s) + "</p>" + (done
          ? '<p class="why"><span class="verdict">' + (ok ? "Right." : "Not quite.") + "</span> It's " + (q.a ? "true" : "false") + ". " + esc(q.why) + "</p>"
          : '<div class="row"><button type="button" data-i="' + i + '" data-v="1">True</button><button type="button" data-i="' + i + '" data-v="0">False</button></div>') + "</div>";
      }).join("");
      box.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          var qi = +b.getAttribute("data-i"), v = b.getAttribute("data-v") === "1";
          S.quiz[qi] = v; save();
          track("quiz_answer", { question: qi + 1, correct: v === Q[qi].a ? "yes" : "no" });
          if (Object.keys(S.quiz).length === Q.length) {
            track("quiz_complete", { score: Q.filter(function (q, k) { return S.quiz[k] === q.a; }).length, questions: Q.length }, "quiz");
          }
          draw();
        };
      });
    }
    draw();
  }

  /* ---------- end page ---------- */
  function mountEnd() {
    var pathEl = $("path"); if (!pathEl) return;
    var Q = DATA.quiz || [];
    var titles = S.visited.filter(function (v) { return v !== "start" && v !== "end"; })
      .map(function (v) { return (node(v) || {}).title; }).filter(Boolean);
    var answered = Object.keys(S.quiz).length;
    var score = Q.filter(function (q, i) { return S.quiz[i] === q.a; }).length;
    pathEl.textContent = "Your path: " + ["Cover"].concat(titles, ["End"]).join(" → ") + (answered ? " · Quick check " + score + "/" + Q.length : "");
    var pathIds = S.visited.filter(function (v) { return v !== "start" && v !== "end"; });
    // first finish in this browser only, so reloads and rereads don't inflate it
    if (!S.completed) { S.completed = true; save(); track("act_complete", {
      act: "act-1",
      pages_read: pathIds.length,
      read_path: pathIds.join(">"),
      quiz_score: answered ? score : -1
    }); }
    $("copy").onclick = function () {
      track("card_copied", {});
      var card = $("card"), t = $("toast");
      var text = "What I now know about AI (forexample.ai, Act I)\n" +
        Array.prototype.map.call(card.querySelectorAll("li"), function (li) { return "• " + li.textContent; }).join("\n") +
        "\n" + pathEl.textContent + "\n" + location.origin + "/";
      function selectIt() {
        var rg = document.createRange(); rg.selectNodeContents(card);
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg);
        t.textContent = "Selected. Copy it from here.";
      }
      try { navigator.clipboard.writeText(text).then(function () { t.textContent = "Copied."; }, selectIt); } catch (e) { selectIt(); }
    };
  }

  chrome();
  mountGuess(); mountTokens(); mountTemp(); mountQuiz(); mountEnd();
})();
