(function () {
  document.addEventListener("DOMContentLoaded", function () {
    initResults();
    initBibtexCopy();
  });

  async function initResults() {
    const root = document.getElementById("results-root");
    if (!root) {
      return;
    }

    const source = root.dataset.resultsSrc;
    if (!source) {
      root.innerHTML = '<p class="error">Missing results data source.</p>';
      return;
    }

    try {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error("Failed to load results data: " + response.status);
      }
      const payload = await response.json();
      renderCategories(root, payload);
    } catch (error) {
      console.error(error);
      root.innerHTML = '<p class="error">Unable to load visual comparisons. Please refresh.</p>';
    }
  }

  function renderCategories(root, payload) {
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    if (categories.length === 0) {
      root.innerHTML = '<p class="error">No result categories available.</p>';
      return;
    }

    root.innerHTML = "";

    categories.forEach(function (category) {
      const samples = Array.isArray(category.samples) ? category.samples : [];
      if (samples.length === 0) {
        return;
      }

      let currentIndex = 0;

      const section = document.createElement("article");
      section.className = "result-category";

      const header = document.createElement("div");
      header.className = "category-head";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = category.title || "Untitled Category";
      titleWrap.appendChild(title);

      const controls = document.createElement("div");
      controls.className = "category-controls";

      const prevButton = document.createElement("button");
      prevButton.type = "button";
      prevButton.className = "nav-btn";
      prevButton.setAttribute("aria-label", "Previous sample");
      prevButton.textContent = "←";

      const counter = document.createElement("span");
      counter.className = "sample-counter";

      const nextButton = document.createElement("button");
      nextButton.type = "button";
      nextButton.className = "nav-btn";
      nextButton.setAttribute("aria-label", "Next sample");
      nextButton.textContent = "→";

      controls.appendChild(prevButton);
      controls.appendChild(counter);
      controls.appendChild(nextButton);

      header.appendChild(titleWrap);
      header.appendChild(controls);

      const grid = document.createElement("div");
      grid.className = "samples-grid";

      const card = createCompareCard(category.id || "category", samples[0]);
      grid.appendChild(card);

      section.appendChild(header);
      section.appendChild(grid);
      root.appendChild(section);

      const titleEl = card.querySelector(".sample-title");
      const tagEl = card.querySelector(".sample-tag");
      const compare = card.querySelector(".compare");
      const range = card.querySelector(".split-range");
      const beforeImg = card.querySelector(".before-image");
      const afterImg = card.querySelector(".after-image");

      initCompare(compare);

      function renderCurrentSample() {
        const sample = samples[currentIndex];
        titleEl.textContent = sample.label || "Comparison";
        tagEl.textContent = sample.taskTag || "Task";

        beforeImg.src = sample.inputSrc;
        beforeImg.alt = (sample.label || "Comparison") + " input";

        afterImg.src = sample.outputSrc;
        afterImg.alt = (sample.label || "Comparison") + " output";

        counter.textContent = String(currentIndex + 1) + " / " + String(samples.length);

        if (range) {
          range.value = "50";
          compare.style.setProperty("--split", "50%");
        }
      }

      function gotoOffset(offset) {
        currentIndex = (currentIndex + offset + samples.length) % samples.length;
        renderCurrentSample();
      }

      prevButton.addEventListener("click", function () {
        gotoOffset(-1);
      });

      nextButton.addEventListener("click", function () {
        gotoOffset(1);
      });

      renderCurrentSample();

      window.setInterval(function () {
        gotoOffset(1);
      }, 5000);
    });
  }

  function createCompareCard(categoryId, sample) {
    const safeCategory = sanitizeId(categoryId || "category");
    const safeSample = sanitizeId(sample.id || "sample");
    const cardId = "cmp-" + safeCategory + "-" + safeSample;

    const card = document.createElement("article");
    card.className = "compare-card";
    card.id = cardId;

    const title = document.createElement("h4");
    title.className = "sample-title";
    title.textContent = sample.label || "Comparison";

    const compare = document.createElement("div");
    compare.className = "compare";
    compare.style.setProperty("--split", "50%");

    const afterImg = document.createElement("img");
    afterImg.className = "after-image";
    afterImg.loading = "lazy";
    afterImg.src = sample.outputSrc;
    afterImg.alt = (sample.label || "Comparison") + " output";

    const beforeLayer = document.createElement("div");
    beforeLayer.className = "before-layer";

    const beforeImg = document.createElement("img");
    beforeImg.className = "before-image";
    beforeImg.loading = "lazy";
    beforeImg.src = sample.inputSrc;
    beforeImg.alt = (sample.label || "Comparison") + " input";
    beforeLayer.appendChild(beforeImg);

    const handle = document.createElement("div");
    handle.className = "handle";
    handle.setAttribute("aria-hidden", "true");

    const range = document.createElement("input");
    range.className = "split-range";
    range.type = "range";
    range.min = "0";
    range.max = "100";
    range.value = "50";
    range.setAttribute("aria-label", (sample.label || "comparison") + " before and after slider");

    compare.appendChild(afterImg);
    compare.appendChild(beforeLayer);
    compare.appendChild(handle);
    compare.appendChild(range);

    const tag = document.createElement("p");
    tag.className = "sample-tag";
    tag.textContent = sample.taskTag || "Task";

    card.appendChild(title);
    card.appendChild(compare);
    card.appendChild(tag);

    return card;
  }

  function initCompare(compare) {
    const range = compare.querySelector(".split-range");
    if (!range) {
      return;
    }

    let dragging = false;

    function setSplit(value) {
      const numeric = Math.min(100, Math.max(0, Number(value)));
      compare.style.setProperty("--split", numeric + "%");
      range.value = String(numeric);
    }

    function updateFromPointer(event) {
      const rect = compare.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSplit(percent);
    }

    range.addEventListener("input", function () {
      setSplit(range.value);
    });

    compare.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      dragging = true;
      compare.setPointerCapture(event.pointerId);
      updateFromPointer(event);
    });

    compare.addEventListener("pointermove", function (event) {
      if (!dragging) {
        return;
      }
      updateFromPointer(event);
    });

    compare.addEventListener("pointerup", function (event) {
      dragging = false;
      if (compare.hasPointerCapture(event.pointerId)) {
        compare.releasePointerCapture(event.pointerId);
      }
    });

    compare.addEventListener("pointercancel", function (event) {
      dragging = false;
      if (compare.hasPointerCapture(event.pointerId)) {
        compare.releasePointerCapture(event.pointerId);
      }
    });

    setSplit(range.value);
  }

  function initBibtexCopy() {
    const button = document.getElementById("copy-bibtex");
    const code = document.getElementById("bibtex-code");
    if (!button || !code) {
      return;
    }

    const original = button.textContent;

    button.addEventListener("click", async function () {
      const text = code.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        window.setTimeout(function () {
          button.textContent = original;
        }, 1400);
      } catch (error) {
        console.error(error);
        button.textContent = "Copy failed";
        window.setTimeout(function () {
          button.textContent = original;
        }, 1400);
      }
    });
  }

  function sanitizeId(input) {
    return String(input)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  }
})();
