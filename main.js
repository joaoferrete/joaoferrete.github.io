/* ============================================================
   João Ferrete — portfolio interactions
   1. Bilingual PT/EN toggle (localStorage + navigator default)
   2. Mobile nav drawer
   3. Active-section nav highlighting
   4. Count-up stats in the About section
   5. Hero graph signature (pathfinding-style traversal)
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. LANGUAGE ---------- */
  var STORAGE_KEY = "jf-lang";
  var i18nEls = Array.prototype.slice.call(
    document.querySelectorAll("[data-en][data-pt]"),
  );
  var cvLinks = Array.prototype.slice.call(
    document.querySelectorAll(".cv-link"),
  );
  var langToggle = document.getElementById("langToggle");

  function detectLang() {
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (saved === "pt" || saved === "en") return saved;
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("pt") === 0 ? "pt" : "en";
  }

  function setLang(lang) {
    document.documentElement.lang = lang === "pt" ? "pt-br" : "en";

    i18nEls.forEach(function (el) {
      var val = el.getAttribute("data-" + lang);
      if (val === null) return;
      if (el.tagName === "META") {
        el.setAttribute("content", val);
      } else {
        el.innerHTML = val;
      }
    });

    // CV download points to the matching language PDF
    cvLinks.forEach(function (a) {
      a.setAttribute("href", "assets/cv-joao-ferrete-" + lang + ".pdf");
    });

    // toggle visual state
    if (langToggle) {
      Array.prototype.forEach.call(
        langToggle.querySelectorAll(".lang-toggle__opt"),
        function (opt) {
          opt.classList.toggle(
            "is-active",
            opt.getAttribute("data-lang") === lang,
          );
        },
      );
      // announce the action it will perform, in the current language
      langToggle.setAttribute(
        "aria-label",
        lang === "pt" ? "Mudar para inglês" : "Switch to Portuguese",
      );
    }

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  var currentLang = detectLang();
  setLang(currentLang);

  if (langToggle) {
    langToggle.addEventListener("click", function () {
      currentLang = currentLang === "en" ? "pt" : "en";
      setLang(currentLang);
    });
  }

  /* ---------- 2. MOBILE NAV ---------- */
  var burger = document.getElementById("navBurger");
  var mobileNav = document.getElementById("mobileNav");

  function closeMobile() {
    if (!burger || !mobileNav) return;
    burger.classList.remove("is-open");
    mobileNav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  }

  if (burger && mobileNav) {
    burger.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeMobile();
    });
  }

  /* ---------- 3. ACTIVE-SECTION NAV ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav a"),
  );
  var sections = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle(
              "is-active",
              a.getAttribute("href") === "#" + id,
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach(function (s) {
      observer.observe(s);
    });
  }

  /* ---------- 4. COUNT-UP STATS ---------- */
  (function () {
    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var statEls = Array.prototype.slice.call(
      document.querySelectorAll(".about__facts .num"),
    );
    if (!statEls.length) return;

    // Parse each stat into prefix / number / suffix so we can preserve
    // things like the "+" in "3+" while animating only the digits.
    var stats = statEls
      .map(function (el) {
        var m = el.textContent.trim().match(/^(\D*)(\d+)(\D*)$/);
        return m
          ? {
              el: el,
              prefix: m[1],
              target: parseInt(m[2], 10),
              suffix: m[3],
            }
          : null;
      })
      .filter(Boolean);

    function render(s, value) {
      s.el.textContent = s.prefix + value + s.suffix;
    }

    function runCount() {
      var DURATION = 1300;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / DURATION, 1);
        var e = 1 - Math.pow(1 - p, 3); // easeOutCubic
        stats.forEach(function (s) {
          render(s, Math.round(s.target * e));
        });
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // Reduced motion or no observer support: keep the real numbers, no run.
    if (reduced || !("IntersectionObserver" in window)) return;

    // Start at zero, then count up once the stats scroll into view.
    stats.forEach(function (s) {
      render(s, 0);
    });
    var target = statEls[0].closest(".about__facts") || statEls[0];
    var statObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCount();
          statObserver.disconnect();
        });
      },
      { threshold: 0.4 },
    );
    statObserver.observe(target);
  })();

  /* ---------- 5. HERO GRAPH SIGNATURE ---------- */
  var svg = document.getElementById("graph");
  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (svg) {
    var SVG_NS = "http://www.w3.org/2000/svg";
    var SIZE = 600;
    var NODE_COUNT = 11;

    // Deterministic-ish node layout on a jittered grid so it looks
    // like a route graph, not random noise.
    var nodes = [];
    var cols = 4,
      rows = 3,
      i = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (i >= NODE_COUNT) break;
        var jx = (Math.random() - 0.5) * 90;
        var jy = (Math.random() - 0.5) * 90;
        nodes.push({
          x: 90 + c * ((SIZE - 180) / (cols - 1)) + jx,
          y: 110 + r * ((SIZE - 220) / (rows - 1)) + jy,
        });
        i++;
      }
    }

    // Connect each node to its 2 nearest neighbours -> sparse graph.
    var edges = [];
    var edgeSet = {};
    nodes.forEach(function (n, idx) {
      var dists = nodes
        .map(function (m, j) {
          var dx = n.x - m.x,
            dy = n.y - m.y;
          return { j: j, d: Math.sqrt(dx * dx + dy * dy) };
        })
        .filter(function (o) {
          return o.j !== idx;
        })
        .sort(function (a, b) {
          return a.d - b.d;
        });
      for (var k = 0; k < 2; k++) {
        var j = dists[k].j;
        var key = Math.min(idx, j) + "-" + Math.max(idx, j);
        if (!edgeSet[key]) {
          edgeSet[key] = true;
          edges.push([idx, j]);
        }
      }
    });

    // Draw edges
    var edgeEls = edges.map(function (e) {
      var line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", nodes[e[0]].x);
      line.setAttribute("y1", nodes[e[0]].y);
      line.setAttribute("x2", nodes[e[1]].x);
      line.setAttribute("y2", nodes[e[1]].y);
      line.setAttribute("class", "graph-edge");
      svg.appendChild(line);
      return { el: line, a: e[0], b: e[1] };
    });

    // Layer for the traced (lit) path — kept under the nodes so node
    // rings stay crisp on top of the line.
    var traceLayer = document.createElementNS(SVG_NS, "g");
    svg.appendChild(traceLayer);

    // Draw nodes
    var nodeEls = nodes.map(function (n) {
      var circ = document.createElementNS(SVG_NS, "circle");
      circ.setAttribute("cx", n.x);
      circ.setAttribute("cy", n.y);
      circ.setAttribute("r", 5);
      circ.setAttribute("class", "graph-node");
      svg.appendChild(circ);
      return circ;
    });

    // Travelling pulse — rides along the route like a vehicle.
    var pulse = document.createElementNS(SVG_NS, "circle");
    pulse.setAttribute("r", 4.5);
    pulse.setAttribute("class", "graph-pulse");
    pulse.setAttribute("opacity", "0");
    svg.appendChild(pulse);

    // Start the route from a node inside the bright (unmasked) area so
    // the motion is visible right away — the mask centers near 75%/40%.
    var startNode = 0,
      bestD = Infinity;
    nodes.forEach(function (n, idx) {
      var dx = n.x - SIZE * 0.72,
        dy = n.y - SIZE * 0.42;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        startNode = idx;
      }
    });

    // Build a walk through the graph following existing edges (BFS-ish).
    function buildWalk() {
      var visited = {},
        walk = [startNode],
        cur = startNode;
      visited[startNode] = true;
      for (var step = 0; step < NODE_COUNT * 2; step++) {
        var opts = edges
          .filter(function (e) {
            return e[0] === cur || e[1] === cur;
          })
          .map(function (e) {
            return e[0] === cur ? e[1] : e[0];
          })
          .filter(function (n) {
            return !visited[n];
          });
        if (!opts.length) {
          var unseen = nodes
            .map(function (_, idx) {
              return idx;
            })
            .filter(function (idx) {
              return !visited[idx];
            });
          if (!unseen.length) break;
          cur = unseen[0];
          visited[cur] = true;
          walk.push(cur);
          continue;
        }
        cur = opts[Math.floor(Math.random() * opts.length)];
        visited[cur] = true;
        walk.push(cur);
      }
      return walk;
    }

    if (prefersReduced) {
      // Static: light up the start node and one neighbour, no animation.
      nodeEls[startNode].classList.add("is-active");
      var nb = edges.filter(function (e) {
        return e[0] === startNode || e[1] === startNode;
      })[0];
      if (nb)
        nodeEls[nb[0] === startNode ? nb[1] : nb[0]].classList.add("is-active");
      return;
    }

    // ---- fluid rAF-driven traversal ----
    var easeInOut = function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    var dist = function (a, b) {
      var dx = nodes[a].x - nodes[b].x,
        dy = nodes[a].y - nodes[b].y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    var SPEED = 0.16; // px per ms — constant travel speed
    var END_HOLD = 1100; // ms to admire the full route
    var FADE_MS = 700; // ms to fade the route out before rebuilding

    var walk, segIndex, segStart, segLen, segEl, lastTs;
    var phase; // "travel" | "hold" | "fade"
    var phaseStart;

    function beginRun(ts) {
      walk = buildWalk();
      segIndex = 0;
      phase = "travel";
      startSegment(ts);
      nodeEls[walk[0]].classList.add("is-active");
      pulse.setAttribute("opacity", "1");
      placePulse(walk[0]);
    }

    function placePulse(nodeIdx) {
      pulse.setAttribute("cx", nodes[nodeIdx].x);
      pulse.setAttribute("cy", nodes[nodeIdx].y);
    }

    function startSegment(ts) {
      var a = walk[segIndex],
        b = walk[segIndex + 1];
      segStart = ts;
      segLen = dist(a, b);
      // overlay line that we "draw" via dashoffset
      segEl = document.createElementNS(SVG_NS, "line");
      segEl.setAttribute("x1", nodes[a].x);
      segEl.setAttribute("y1", nodes[a].y);
      segEl.setAttribute("x2", nodes[b].x);
      segEl.setAttribute("y2", nodes[b].y);
      segEl.setAttribute("class", "graph-trace");
      segEl.style.strokeDasharray = segLen;
      segEl.style.strokeDashoffset = segLen;
      traceLayer.appendChild(segEl);
    }

    function frame(ts) {
      if (!walk) {
        beginRun(ts);
      }
      lastTs = ts;

      if (phase === "travel") {
        var a = walk[segIndex],
          b = walk[segIndex + 1];
        var dur = Math.max(segLen / SPEED, 260);
        var p = Math.min((ts - segStart) / dur, 1);
        var e = easeInOut(p);
        // draw the line + move the pulse together
        segEl.style.strokeDashoffset = segLen * (1 - e);
        pulse.setAttribute("cx", nodes[a].x + (nodes[b].x - nodes[a].x) * e);
        pulse.setAttribute("cy", nodes[a].y + (nodes[b].y - nodes[a].y) * e);

        if (p >= 1) {
          nodeEls[b].classList.add("is-active");
          segIndex++;
          if (segIndex >= walk.length - 1) {
            phase = "hold";
            phaseStart = ts;
          } else {
            startSegment(ts);
          }
        }
      } else if (phase === "hold") {
        if (ts - phaseStart >= END_HOLD) {
          phase = "fade";
          phaseStart = ts;
        }
      } else if (phase === "fade") {
        var fp = Math.min((ts - phaseStart) / FADE_MS, 1);
        var o = 1 - fp;
        traceLayer.style.opacity = o;
        pulse.setAttribute("opacity", o);
        nodeEls.forEach(function (n) {
          n.style.opacity = o < 1 ? 0.35 + o * 0.65 : "";
        });
        if (fp >= 1) {
          // reset for a fresh route
          while (traceLayer.firstChild)
            traceLayer.removeChild(traceLayer.firstChild);
          traceLayer.style.opacity = "";
          nodeEls.forEach(function (n) {
            n.classList.remove("is-active");
            n.style.opacity = "";
          });
          walk = null; // beginRun on next frame
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
