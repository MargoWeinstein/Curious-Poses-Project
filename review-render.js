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

  const paragraphHtml = data.overview
    .map((item) => `<p class="p">${escapeHtml(item)}</p>`)
    .join("");

  const makeList = (items) =>
    `<ul class="list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

  const detailsHtml = data.details
    .map(
      (row) => `
        <div class="details__row">
          <div class="details__k">${escapeHtml(row.k)}</div>
          <div class="details__v">${escapeHtml(row.v)}</div>
        </div>
      `
    )
    .join("");

  const ratingsTotal = data.ratingBars.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const reviewTotal = Number(data.reviewCount || 0);
  const normalizedReviewTotal = ratingsTotal > 0 ? ratingsTotal : reviewTotal;

  const barsHtml = data.ratingBars
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

  const reviewItems = data.reviews.map((review, idx) => ({
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

  const crumbsHtml = data.crumbs.map((crumb) => `<a href="#">${escapeHtml(crumb)}</a><span>></span>`).join("");
  const galleryClass = data.gallery.layout === "portrait" ? "gallery gallery--portrait" : "gallery gallery--wide";

  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb">
      ${crumbsHtml}
      <span class="crumbs__current">${escapeHtml(data.title)}</span>
    </nav>

    <section class="headline">
      <div class="headline__left">
        <h1 class="h1">${escapeHtml(data.title)}</h1>

        <div class="subrow">
          <div class="ratingrow" aria-label="Rated ${data.score.toFixed(1)} out of 5">
            <span class="bubbles" aria-hidden="true">
              ${bubbles(data.score, false)}
            </span>
            <strong class="ratingrow__score">${data.score.toFixed(1)}</strong>
            <a class="mutedlink" href="#reviews">(${formatNum(normalizedReviewTotal)} reviews)</a>
          </div>

          <span class="dot">|</span>
          <span class="tag tag--good">${escapeHtml(data.cancellationTag)}</span>
          <span class="dot">|</span>
          <span class="muted">${escapeHtml(data.priceLine)}</span>
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
          <img src="${escapeHtml(data.gallery.main)}" alt="${escapeHtml(data.gallery.mainAlt)}"${imageStyleAttr(
            data.gallery.mainPosition,
            data.gallery.mainFit
          )} />
          <span class="gallery__count">Photos: ${formatNum(data.gallery.count)}</span>
        </figure>
        <div class="gallery__stack">
          <figure class="gallery__side">
            <img src="${escapeHtml(data.gallery.top)}" alt="${escapeHtml(data.gallery.topAlt)}"${imageStyleAttr(
              data.gallery.topPosition,
              data.gallery.topFit
            )} />
          </figure>
          <figure class="gallery__side">
            <img src="${escapeHtml(data.gallery.bottom)}" alt="${escapeHtml(data.gallery.bottomAlt)}"${imageStyleAttr(
              data.gallery.bottomPosition,
              data.gallery.bottomFit
            )} />
          </figure>
        </div>
      </section>

      <section class="quick">
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">Dur</div>
          <div class="quick__label">Duration</div>
          <div class="quick__value">${escapeHtml(data.quick.duration)}</div>
        </div>
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">Can</div>
          <div class="quick__label">Cancellation</div>
          <div class="quick__value">${escapeHtml(data.quick.cancellation)}</div>
        </div>
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">Tkt</div>
          <div class="quick__label">Mobile ticket</div>
          <div class="quick__value">${escapeHtml(data.quick.mobileTicket)}</div>
        </div>
        <div class="quick__item">
          <div class="quick__icon" aria-hidden="true">Lng</div>
          <div class="quick__label">Language</div>
          <div class="quick__value">${escapeHtml(data.quick.language)}</div>
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
            <div class="callout__title">${escapeHtml(data.whyTitle)}</div>
            ${makeList(data.whyList)}
          </div>

          <div class="callout">
            <div class="callout__title">${escapeHtml(data.goodTitle)}</div>
            ${makeList(data.goodList)}
          </div>
        </div>
      </section>

      <section id="whatsincluded" class="card">
        <h2 class="h2">What's included</h2>
        <div class="two">
          <div>
            <h3 class="h3">Included</h3>
            ${makeList(data.included)}
          </div>
          <div>
            <h3 class="h3">Not included</h3>
            ${makeList(data.notIncluded)}
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
            <div class="rating-summary__value">${data.score.toFixed(1)}</div>
            <div class="rating-summary__label">${escapeHtml(data.ratingLabel)}</div>
            <div class="rating-summary__bubbles" aria-hidden="true">
              ${bubbles(data.score, true)}
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
