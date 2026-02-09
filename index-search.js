(function () {
  const cards = Array.from(document.querySelectorAll(".dest-card"));
  if (!cards.length) {
    return;
  }

  const heroInput = document.querySelector('.where-search input[type="search"]');
  const heroButton = document.querySelector('.where-search button');
  const topInput = document.querySelector('.searchbar input[type="search"]');
  const topButton = document.querySelector('.searchbar .iconbtn');
  const grid = document.querySelector(".dest-grid");

  const empty = document.createElement("p");
  empty.className = "search-empty muted";
  empty.textContent = "No review pages match that search.";
  empty.hidden = true;
  if (grid && grid.parentNode) {
    grid.parentNode.insertBefore(empty, grid.nextSibling);
  }

  const cardSearchText = new Map();
  cards.forEach((card) => {
    const title = card.querySelector(".dest-card__title");
    const meta = card.querySelector(".dest-card__meta");
    cardSearchText.set(card, `${title ? title.textContent : ""} ${meta ? meta.textContent : ""}`.toLowerCase());
  });

  const syncInputs = (value, source) => {
    if (source !== "hero" && heroInput && heroInput.value !== value) {
      heroInput.value = value;
    }
    if (source !== "top" && topInput && topInput.value !== value) {
      topInput.value = value;
    }
  };

  const applyFilter = (value) => {
    const query = value.trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const text = cardSearchText.get(card) || "";
      const match = !query || text.includes(query);
      card.hidden = !match;
      if (match) {
        visible += 1;
      }
    });

    empty.hidden = visible !== 0;
  };

  if (topInput) {
    topInput.placeholder = "Search these review pages";
  }

  if (heroInput) {
    heroInput.addEventListener("input", (event) => {
      const value = event.target.value;
      syncInputs(value, "hero");
      applyFilter(value);
    });

    heroInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const value = event.target.value;
        syncInputs(value, "hero");
        applyFilter(value);
      }
    });
  }

  if (topInput) {
    topInput.addEventListener("input", (event) => {
      const value = event.target.value;
      syncInputs(value, "top");
      applyFilter(value);
    });

    topInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const value = event.target.value;
        syncInputs(value, "top");
        applyFilter(value);
      }
    });
  }

  if (heroButton) {
    heroButton.addEventListener("click", () => {
      const value = heroInput ? heroInput.value : "";
      syncInputs(value, "hero");
      applyFilter(value);
    });
  }

  if (topButton) {
    topButton.addEventListener("click", () => {
      const value = topInput ? topInput.value : "";
      syncInputs(value, "top");
      applyFilter(value);
    });
  }

  applyFilter("");
})();
