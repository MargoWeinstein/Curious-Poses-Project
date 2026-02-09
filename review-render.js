(function () {
  const root = document.getElementById("review-root");
  const key = document.body && document.body.dataset ? document.body.dataset.review : "";
  const data = window.REVIEW_DATA && window.REVIEW_DATA[key];

  if (!root || !data) {
    if (root) {
      root.innerHTML = "<p class='p'>Unable to load this review page.</p>";
    }
    return;
  }

  document.title = data.title + " | TourReviews";

  const formatNum = (n) => new Intl.NumberFormat("en-US").format(n);

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const initials = (name) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");

  const parseDate = (label) => {
    const direct = Date.parse(label);
    if (!Number.isNaN(direct)) {
      return direct;
    }

    const withDay = Date.parse("1 " + label);
    if (!Number.isNaN(withDay)) {
      return withDay;
    }

    return 0;
  };

  const bubbles = (score, large) => {
    const sizeClass = large ? " bubble--lg" : "";
    let html = "";

    for (let i = 1; i <= 5; i += 1) {
      let cls = "bubble--off";
      if (score >= i) {
        cls = "bubble--on";
      } else if (score >= i - 0.5) {
        cls = "bubble--half";
      }
      html += `<span class="bubble ${cls}${sizeClass}"></span>`;
    }

    return html;
  };

  const quickIcon = (kind) => {
    if (kind === "duration") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="13" r="7"></circle>
          <path d="M12 13V9"></path>
          <path d="M12 13L15 15"></path>
          <path d="M9 3h6"></path>
          <path d="M12 3v3"></path>
        </svg>
      `;
    }

    if (kind === "cancellation") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8"></circle>
          <path d="M8.5 8.5l7 7"></path>
          <path d="M15.5 8.5l-7 7"></path>
        </svg>
      `;
    }

    if (kind === "ticket") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h16v6h-2a2 2 0 0 0 0 4h-12a2 2 0 0 0 0-4h-2z"></path>
          <path d="M12 9v10"></path>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8"></circle>
        <path d="M4 12h16"></path>
        <path d="M12 4a12 12 0 0 0 0 16"></path>
        <path d="M12 4a12 12 0 0 1 0 16"></path>
      </svg>
    `;
  };

  const imageStyleAttr = (position, fit) => {
    const parts = [];
    if (position) {
      parts.push(`object-position:${position}`);
    }
    if (fit) {
      parts.push(`object-fit:${fit}`);
    }
    return parts.length ? ` style="${parts.join(";")}"` : "";
  };

  const parseVerbatimDoc = (rawText) => {
    if (!rawText) {
      return null;
    }

    const lines = rawText
      .replaceAll("\r", "")
      .replaceAll("\f", "")
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""));

    const findIndex = (regex, start = 0) => {
      for (let i = start; i < lines.length; i += 1) {
        if (regex.test(lines[i].trim())) {
          return i;
        }
      }
      return -1;
    };

    const headingLine = (regex) => {
      const idx = findIndex(regex);
      return idx >= 0 ? lines[idx].trim() : "";
    };

    const valueAfterHeading = (regex) => {
      const idx = findIndex(regex);
      if (idx < 0) {
        return "";
      }

      const current = lines[idx].trim();
      const inline = current.match(/^[^:]+:\s*(.+)$/);
      if (inline && inline[1].trim()) {
        return inline[1].trim();
      }

      for (let i = idx + 1; i < lines.length; i += 1) {
        const next = lines[i].trim();
        if (next) {
          return next;
        }
      }
      return "";
    };

    const sectionAfterHeading = (startRegex, endRegexes) => {
      const startIdx = findIndex(startRegex);
      if (startIdx < 0) {
        return [];
      }

      let endIdx = lines.length;
      for (let i = startIdx + 1; i < lines.length; i += 1) {
        const probe = lines[i].trim();
        if (endRegexes.some((rx) => rx.test(probe))) {
          endIdx = i;
          break;
        }
      }

      return lines.slice(startIdx + 1, endIdx);
    };

    const paragraphsFromLines = (block) => {
      const out = [];
      let current = [];

      for (const line of block) {
        const t = line.trim();
        if (!t) {
          if (current.length) {
            out.push(current.join(" ").trim());
            current = [];
          }
          continue;
        }
        current.push(t);
      }

      if (current.length) {
        out.push(current.join(" ").trim());
      }

      return out;
    };

    const listFromBullets = (block) => {
      const out = [];
      let current = "";

      for (const line of block) {
        const t = line.trim();
        if (!t) {
          continue;
        }

        const bullet = t.match(/^[\u2022\-*]\s*(.*)$/);
        if (bullet) {
          if (current) {
            out.push(current.trim());
          }
          current = (bullet[1] || "").trim();
          continue;
        }

        if (current) {
          current += ` ${t}`;
        } else {
          out.push(t);
        }
      }

      if (current) {
        out.push(current.trim());
      }

      return out;
    };

    const parseDetails = (block) => {
      const out = [];
      const keyRegex = /^(Meeting point|Meeting Point|End point|End Point|Ending Point|Accessibility|What to Bring|What to bring)\s*:?[\s\t]*(.*)$/i;

      for (let i = 0; i < block.length; i += 1) {
        const t = block[i].trim();
        if (!t) {
          continue;
        }

        const match = t.match(keyRegex);
        if (match) {
          let value = (match[2] || "").trim();
          if (!value) {
            let j = i + 1;
            while (j < block.length && !block[j].trim()) {
              j += 1;
            }
            if (j < block.length && !keyRegex.test(block[j].trim())) {
              value = block[j].trim();
              i = j;
            }
          }

          out.push({
            k: match[1].replace(/\s+/g, " ").trim(),
            v: value
          });
          continue;
        }

        if (out.length) {
          out[out.length - 1].v = `${out[out.length - 1].v} ${t}`.trim();
        }
      }

      return out;
    };

    const headingOverview = /^overview$/i;
    const headingWhy = /^why travelers/i;
    const headingGood = /^good to know/i;
    const headingIncluded = /^(what[\u2019']?s included|included)$/i;
    const headingNotIncluded = /^not included:?$/i;
    const headingDetails = /^details$/i;
    const headingReviews = /^reviews\b/i;
    const headingRatings = /^ratings?\b/i;

    const overview = paragraphsFromLines(
      sectionAfterHeading(headingOverview, [headingWhy, headingGood, headingIncluded, headingDetails, headingReviews])
    );

    const whyList = listFromBullets(
      sectionAfterHeading(headingWhy, [headingGood, headingIncluded, headingDetails, headingReviews, headingRatings])
    );

    const goodList = listFromBullets(
      sectionAfterHeading(headingGood, [headingIncluded, headingNotIncluded, headingDetails, headingReviews, headingRatings])
    );

    const included = listFromBullets(
      sectionAfterHeading(headingIncluded, [headingNotIncluded, headingDetails, headingReviews, headingRatings])
    );

    const notIncluded = listFromBullets(
      sectionAfterHeading(headingNotIncluded, [headingDetails, headingReviews, headingRatings])
    );

    const details = parseDetails(sectionAfterHeading(headingDetails, [headingReviews, headingRatings]));

    return {
      quick: {
        duration: valueAfterHeading(/^duration\b/i),
        cancellation: valueAfterHeading(/^cancellation\b/i),
        mobileTicket: valueAfterHeading(/^mobile ticket\b/i),
        language: valueAfterHeading(/^language\b/i)
      },
      overview,
      whyTitle: headingLine(headingWhy),
      whyList,
      goodTitle: headingLine(headingGood),
      goodList,
      includedTitle: headingLine(headingIncluded),
      included,
      notIncludedTitle: headingLine(headingNotIncluded),
      notIncluded,
      details
    };
  };

  const applyVerbatimOverrides = (base) => {
    const parsed = parseVerbatimDoc(base.verbatimText);
    if (!parsed) {
      return base;
    }

    return {
      ...base,
      quick: {
        ...base.quick,
        ...(parsed.quick.duration ? { duration: parsed.quick.duration } : {}),
        ...(parsed.quick.cancellation ? { cancellation: parsed.quick.cancellation } : {}),
        ...(parsed.quick.mobileTicket ? { mobileTicket: parsed.quick.mobileTicket } : {}),
        ...(parsed.quick.language ? { language: parsed.quick.language } : {})
      },
      overview: parsed.overview.length ? parsed.overview : base.overview,
      whyTitle: parsed.whyTitle || base.whyTitle,
      whyList: parsed.whyList.length ? parsed.whyList : base.whyList,
      goodTitle: parsed.goodTitle || base.goodTitle,
      goodList: parsed.goodList.length ? parsed.goodList : base.goodList,
      includedTitle: parsed.includedTitle || base.includedTitle || "Included",
      included: parsed.included.length ? parsed.included : base.included,
      notIncludedTitle: parsed.notIncludedTitle || base.notIncludedTitle || "Not included",
      notIncluded: parsed.notIncluded.length ? parsed.notIncluded : base.notIncluded,
      details: parsed.details.length ? parsed.details : base.details
    };
  };

  const view = applyVerbatimOverrides(data);

  const paragraphHtml = view.overview
    .map((item) => `<p class="p">${escapeHtml(item)}</p>`)
    .join("");

  const makeList = (items) =>
    `<ul class="list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

  const detailsHtml = view.details
    .map(
      (row) => `
        <div class="details__row">
          <div class="details__k">${escapeHtml(row.k)}</div>
          <div class="details__v">${escapeHtml(row.v)}</div>
        </div>
      `
    )
    .join("");

  const ratingsTotal = view.ratingBars.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const reviewTotal = Number(view.reviewCount || 0);
  const normalizedReviewTotal = ratingsTotal > 0 ? ratingsTotal : reviewTotal;

  const barsHtml = view.ratingBars
    .map((row) => {
      const width = normalizedReviewTotal > 0 ? (Number(row.count || 0) / normalizedReviewTotal) * 100 : 0;
      return `
        <div class="rating-summary__row">
          <span class="rating-summary__labeltext">${escapeHtml(row.name)}</span>
          <div class="rating-summary__bar" aria-hidden="true">
            <span class="rating-summary__fill" style="width: ${width.toFixed(2)}%;"></span>
          </div>
          <span class="rating-summary__counttext">${formatNum(row.count)}</span>
        </div>
      `;
    })
    .join("");

  const reviewItems = view.reviews.map((review, idx) => ({
    ...review,
    _index: idx,
    _epoch: parseDate(review.date),
    _search: [review.name, review.date, review.title, review.text].join(" ").toLowerCase()
  }));

  const reviewHtml = (review) => `
    <article class="review">
      <div class="review__top">
        <div class="avatar" aria-hidden="true">${escapeHtml(initials(review.name))}</div>
        <div class="review__who">
          <div class="review__name">${escapeHtml(review.name)}</div>
          <div class="muted small">${escapeHtml(review.date)}</div>
        </div>
        <div class="bubbles" aria-label="${review.stars} out of 5">
          ${bubbles(review.stars, false)}
        </div>
      </div>
      <h3 class="review__title">${escapeHtml(review.title)}</h3>
      <p class="p">${escapeHtml(review.text)}</p>
    </article>
  `;

  const crumbsHtml = view.crumbs.map((crumb) => `<a href="#">${escapeHtml(crumb)}</a><span>></span>`).join("");
  const galleryLayoutClassMap = {
    portrait: "gallery--portrait",
    wide: "gallery--wide",
    neptune: "gallery--neptune",
    puberty: "gallery--puberty",
    kudumbashree: "gallery--kudumbashree",
    "neptune-day": "gallery--neptune-day",
    "puberty-rites": "gallery--puberty-rites",
    stellenbosch: "gallery--stellenbosch",
    "camel-trek": "gallery--camel-trek"
  };
  const galleryClass = `gallery ${galleryLayoutClassMap[view.gallery.layout] || "gallery--wide"}`;

  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb">
      ${crumbsHtml}
      <span class="crumbs__current">${escapeHtml(view.title)}</span>
    </nav>

    <section class="headline">
      <div class="headline__left">
        <h1 class="h1">${escapeHtml(view.title)}</h1>

        <div class="subrow">
          <div class="ratingrow" aria-label="Rated ${view.score.toFixed(1)} out of 5">
            <span class="bubbles" aria-hidden="true">
              ${bubbles(view.score, false)}
            </span>
            <strong class="ratingrow__score">${view.score.toFixed(1)}</strong>
            <a class="mutedlink" href="#reviews">(${formatNum(normalizedReviewTotal)} reviews)</a>
          </div>

          <span class="dot">|</span>
          <span class="tag tag--good">${escapeHtml(view.cancellationTag)}</span>
          <span class="dot">|</span>
          <span class="muted">${escapeHtml(view.priceLine)}</span>
        </div>
      </div>

      <div class="headline__right">
        <button class="ghostbtn" type="button">Save</button>
        <button class="ghostbtn" type="button">Share</button>
      </div>
    </section>

    <section class="grid">
      <section class="${galleryClass}" aria-label="Photo gallery">
        <figure class="gallery__big">
          <img src="${escapeHtml(view.gallery.main)}" alt="${escapeHtml(view.gallery.mainAlt)}"${imageStyleAttr(
            view.gallery.mainPosition,
            view.gallery.mainFit
          )} />
          <span class="gallery__count">Photos: ${formatNum(view.gallery.count)}</span>
        </figure>
        <div class="gallery__stack">
          <figure class="gallery__side">
            <img src="${escapeHtml(view.gallery.top)}" alt="${escapeHtml(view.gallery.topAlt)}"${imageStyleAttr(
              view.gallery.topPosition,
              view.gallery.topFit
            )} />
          </figure>
          <figure class="gallery__side">
            <img src="${escapeHtml(view.gallery.bottom)}" alt="${escapeHtml(view.gallery.bottomAlt)}"${imageStyleAttr(
              view.gallery.bottomPosition,
              view.gallery.bottomFit
            )} />
          </figure>
        </div>
      </section>

      <section class="quick">
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">${quickIcon("duration")}</div>
          <div class="quick__label">Duration</div>
          <div class="quick__value">${escapeHtml(view.quick.duration)}</div>
        </div>
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">${quickIcon("cancellation")}</div>
          <div class="quick__label">Cancellation</div>
          <div class="quick__value">${escapeHtml(view.quick.cancellation)}</div>
        </div>
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">${quickIcon("ticket")}</div>
          <div class="quick__label">Mobile ticket</div>
          <div class="quick__value">${escapeHtml(view.quick.mobileTicket)}</div>
        </div>
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">${quickIcon("language")}</div>
          <div class="quick__label">Language</div>
          <div class="quick__value">${escapeHtml(view.quick.language)}</div>
        </div>
      </section>

      <section class="tabs" aria-label="Sections">
        <a class="tab tab--active" href="#overview">Overview</a>
        <a class="tab" href="#whatsincluded">What's Included</a>
        <a class="tab" href="#details">Details</a>
        <a class="tab" href="#reviews">Reviews</a>
      </section>

      <section id="overview" class="card">
        <h2 class="h2">Overview</h2>
        ${paragraphHtml}

        <div class="callouts">
          <div class="callout">
            <div class="callout__title">${escapeHtml(view.whyTitle)}</div>
            ${makeList(view.whyList)}
          </div>

          <div class="callout">
            <div class="callout__title">${escapeHtml(view.goodTitle)}</div>
            ${makeList(view.goodList)}
          </div>
        </div>
      </section>

      <section id="whatsincluded" class="card">
        <h2 class="h2">What's included</h2>
        <div class="two">
          <div>
            <h3 class="h3">${escapeHtml(view.includedTitle || "Included")}</h3>
            ${makeList(view.included)}
          </div>
          <div>
            <h3 class="h3">${escapeHtml(view.notIncludedTitle || "Not included")}</h3>
            ${makeList(view.notIncluded)}
          </div>
        </div>
      </section>

      <section id="details" class="card">
        <h2 class="h2">Details</h2>
        <div class="details">
          ${detailsHtml}
        </div>
      </section>

      <section id="reviews" class="card">
        <div class="rating-summary" aria-label="Rating summary">
          <div class="rating-summary__score">
            <div class="rating-summary__value">${view.score.toFixed(1)}</div>
            <div class="rating-summary__label">${escapeHtml(view.ratingLabel)}</div>
            <div class="rating-summary__bubbles" aria-hidden="true">
              ${bubbles(view.score, true)}
            </div>
            <div class="rating-summary__count"><span aria-hidden="true">(${formatNum(
              normalizedReviewTotal
            )})</span><span class="sr-only">${formatNum(normalizedReviewTotal)} total reviews</span></div>
          </div>

          <div class="rating-summary__bars">
            ${barsHtml}
          </div>
        </div>

        <div class="card__head">
          <h2 class="h2">Reviews</h2>
          <div class="reviewtools">
            <select aria-label="Sort reviews">
              <option>Most recent</option>
              <option>Highest rated</option>
              <option>Lowest rated</option>
            </select>
            <input type="search" placeholder="Search reviews" aria-label="Search reviews" />
          </div>
        </div>

        <div id="reviews-state" class="reviews-state muted small"></div>
        <div id="review-list"></div>
        <p id="reviews-empty" class="review-empty muted small" hidden>No reviews match that search.</p>
      </section>
    </section>

    <footer class="footer muted small">
      Built from your eight source review documents.
    </footer>
  `;

  const reviewListEl = root.querySelector("#review-list");
  const reviewStateEl = root.querySelector("#reviews-state");
  const reviewEmptyEl = root.querySelector("#reviews-empty");
  const reviewSearchInput = root.querySelector('.reviewtools input[type="search"]');
  const reviewSortSelect = root.querySelector('.reviewtools select');

  const topSearchInput = document.querySelector('.searchbar input[type="search"]');
  const topSearchButton = document.querySelector('.searchbar .iconbtn');

  if (topSearchInput) {
    topSearchInput.placeholder = "Search reviews on this page";
    topSearchInput.setAttribute("aria-label", "Search reviews on this page");
  }

  let searchQuery = "";
  let sortOrder = "Most recent";

  const setSearchValues = (value, source) => {
    if (source !== "top" && topSearchInput && topSearchInput.value !== value) {
      topSearchInput.value = value;
    }
    if (source !== "local" && reviewSearchInput && reviewSearchInput.value !== value) {
      reviewSearchInput.value = value;
    }
  };

  const sortReviews = (items) => {
    const sorted = [...items];

    if (sortOrder === "Highest rated") {
      sorted.sort((a, b) => b.stars - a.stars || b._epoch - a._epoch || a._index - b._index);
      return sorted;
    }

    if (sortOrder === "Lowest rated") {
      sorted.sort((a, b) => a.stars - b.stars || b._epoch - a._epoch || a._index - b._index);
      return sorted;
    }

    sorted.sort((a, b) => b._epoch - a._epoch || a._index - b._index);
    return sorted;
  };

  const applyReviewFilters = () => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = reviewItems.filter((review) => !query || review._search.includes(query));
    const sorted = sortReviews(filtered);

    reviewListEl.innerHTML = sorted.map(reviewHtml).join("");
    reviewEmptyEl.hidden = sorted.length !== 0;

    const total = reviewItems.length;
    const shown = sorted.length;
    const label = total === 1 ? "review" : "reviews";
    reviewStateEl.textContent = `${shown} of ${total} ${label} shown`;
  };

  if (reviewSearchInput) {
    reviewSearchInput.addEventListener("input", (event) => {
      searchQuery = event.target.value;
      setSearchValues(searchQuery, "local");
      applyReviewFilters();
    });

    reviewSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchQuery = event.target.value;
        setSearchValues(searchQuery, "local");
        applyReviewFilters();
      }
    });
  }

  if (topSearchInput) {
    topSearchInput.addEventListener("input", (event) => {
      searchQuery = event.target.value;
      setSearchValues(searchQuery, "top");
      applyReviewFilters();
    });

    topSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchQuery = event.target.value;
        setSearchValues(searchQuery, "top");
        applyReviewFilters();
      }
    });
  }

  if (topSearchButton) {
    topSearchButton.addEventListener("click", () => {
      searchQuery = topSearchInput ? topSearchInput.value : searchQuery;
      setSearchValues(searchQuery, "top");
      applyReviewFilters();
    });
  }

  if (reviewSortSelect) {
    reviewSortSelect.addEventListener("change", (event) => {
      sortOrder = event.target.value;
      applyReviewFilters();
    });
  }

  applyReviewFilters();
})();
