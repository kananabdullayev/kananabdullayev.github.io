document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }

  const menuButton = document.querySelector(".topbar__menu");
  const nav = document.querySelector(".topbar__nav");
  const topbar = document.querySelector(".topbar");

  let isTopbarHidden = false;
  let lastScrollY = window.scrollY;
  let scrollTicking = false;
  const SCROLL_THRESHOLD = 12;
  const MIN_SCROLL_DEPTH = 80;

  const setTopbarHeight = () => {
    if (!topbar) {
      return;
    }
    const height = topbar.offsetHeight;
    document.documentElement.style.setProperty("--topbar-height", `${height}px`);
  };

  const showTopbar = () => {
    if (!topbar) {
      return;
    }
    topbar.classList.remove("topbar--hidden");
    document.body.classList.remove("topbar-hidden");
    isTopbarHidden = false;
  };

  const hideTopbar = () => {
    if (!topbar) {
      return;
    }
    topbar.classList.add("topbar--hidden");
    document.body.classList.add("topbar-hidden");
    isTopbarHidden = true;
  };

  const evaluateScroll = () => {
    if (!topbar) {
      return;
    }
    const currentY = window.scrollY;
    const menuOpen = menuButton && menuButton.getAttribute("aria-expanded") === "true";

    if (currentY <= 0 || menuOpen) {
      showTopbar();
      lastScrollY = currentY;
      return;
    }

    if (currentY > lastScrollY + SCROLL_THRESHOLD && currentY > MIN_SCROLL_DEPTH) {
      if (!isTopbarHidden) {
        hideTopbar();
      }
    } else if (lastScrollY - currentY > SCROLL_THRESHOLD) {
      if (isTopbarHidden || currentY < MIN_SCROLL_DEPTH) {
        showTopbar();
      }
    }

    lastScrollY = currentY;
  };

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
      const nextState = !isExpanded;
      menuButton.setAttribute("aria-expanded", nextState.toString());
      nav.classList.toggle("is-open", nextState);
      showTopbar();
      window.requestAnimationFrame(() => {
        setTopbarHeight();
        evaluateScroll();
      });
    });
  }

  const ensureTopbarHeight = () => {
    setTopbarHeight();
    evaluateScroll();
  };

  ensureTopbarHeight();
  window.addEventListener("load", ensureTopbarHeight);
  window.addEventListener("resize", setTopbarHeight);

  window.addEventListener(
    "scroll",
    () => {
      if (scrollTicking) {
        return;
      }
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        evaluateScroll();
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  const arduinoItem = document.querySelector(".timeline__item--arduino");
  if (!arduinoItem) {
    return;
  }

  const videos = Array.from(arduinoItem.querySelectorAll(".timeline__media-item"));
  const slider = arduinoItem.querySelector(".timeline__media-slider");
  const dotsContainer = arduinoItem.querySelector(".timeline__media-dots");
  const muteButton = slider ? slider.querySelector(".timeline__mute") : null;

  if (!videos.length || !slider) {
    return;
  }

  let currentIndex = 0;
  let intervalId = null;
  let isMuted = true;

  const determineOrientation = (video) => {
    if (!video.videoWidth || !video.videoHeight) {
      return null;
    }
    if (video.videoWidth === video.videoHeight) {
      return "square";
    }
    return video.videoWidth > video.videoHeight ? "landscape" : "portrait";
  };

  const updateSliderOrientation = () => {
    const activeVideo = videos[currentIndex];
    const orientation = activeVideo?.dataset.orientation || "landscape";
    slider.classList.toggle("timeline__media-slider--portrait", orientation === "portrait");
    slider.classList.toggle("timeline__media-slider--square", orientation === "square");
  };

  const ensureOrientation = (video) => {
    const applyOrientation = () => {
      const orientation = determineOrientation(video);
      if (orientation) {
        video.dataset.orientation = orientation;
        if (videos[currentIndex] === video) {
          updateSliderOrientation();
        }
      }
    };

    if (video.readyState >= 1) {
      applyOrientation();
    } else {
      video.addEventListener("loadedmetadata", applyOrientation, { once: true });
    }
  };

  videos.forEach(ensureOrientation);

  const updateDots = (activeIndex) => {
    if (!dotsContainer) {
      return;
    }
    const dots = dotsContainer.querySelectorAll(".timeline__media-dot");
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
    });
  };

  const applyMuteState = () => {
    videos.forEach((video) => {
      video.muted = isMuted;
      if (!isMuted) {
        video.volume = 1;
      }
    });
    if (muteButton) {
      muteButton.setAttribute("aria-pressed", (!isMuted).toString());
      muteButton.setAttribute("aria-label", isMuted ? "Unmute audio" : "Mute audio");
    }
  };

  const syncVideo = (video, shouldPlay) => {
    const startValue = Number(video.dataset.start || 0);
    const targetTime = Number.isFinite(startValue) && startValue > 0 ? startValue : 0;

    const apply = () => {
      try {
        if (Math.abs(video.currentTime - targetTime) > 0.25) {
          video.currentTime = targetTime;
        }
      } catch (error) {
        // ignore seek errors
      }

      if (shouldPlay) {
        video.muted = isMuted;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            /* ignore autoplay errors */
          });
        }
      } else {
        video.pause();
      }
    };

    if (video.readyState >= 1) {
      apply();
    } else {
      video.addEventListener("loadedmetadata", apply, { once: true });
      if (shouldPlay) {
        video.load();
      }
    }
  };

  const setActiveVideo = (index, shouldPlay = true) => {
    currentIndex = index;
    videos.forEach((video, videoIndex) => {
      const isActive = videoIndex === index;
      video.classList.toggle("is-active", isActive);
      syncVideo(video, isActive && shouldPlay);
    });
    updateDots(index);
    updateSliderOrientation();
  };

  const blurControls = () => {
    if (dotsContainer) {
      dotsContainer.querySelectorAll("button").forEach((dot) => dot.blur());
    }
    if (muteButton) {
      muteButton.blur();
    }
  };

  if (dotsContainer) {
    dotsContainer.innerHTML = "";
    videos.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "timeline__media-dot" + (index === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Show Arduino video ${index + 1}`);
      dot.addEventListener("click", (event) => {
        currentIndex = index;
        setActiveVideo(currentIndex);
        restartSlider();
        if (event.detail !== 0) {
          dot.blur();
        }
      });
      dotsContainer.appendChild(dot);
    });
  }

  if (muteButton) {
    muteButton.addEventListener("click", (event) => {
      isMuted = !isMuted;
      applyMuteState();
      const activeVideo = videos[currentIndex];
      if (activeVideo && !isMuted && activeVideo.paused) {
        const playPromise = activeVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            /* ignore autoplay errors */
          });
        }
      }
      if (event.detail !== 0) {
        muteButton.blur();
      }
    });
  }

  applyMuteState();
  setActiveVideo(currentIndex, false);
  updateSliderOrientation();

  const startSlider = () => {
    if (intervalId || videos.length <= 1) {
      return;
    }
    intervalId = window.setInterval(() => {
      const nextIndex = (currentIndex + 1) % videos.length;
      setActiveVideo(nextIndex);
    }, 21600);
  };

  const restartSlider = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    startSlider();
  };

  const stopSlider = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    setActiveVideo(0, false);
  };

  const handleEnter = () => {
    setActiveVideo(currentIndex);
    startSlider();
  };

  const handleLeave = () => {
    stopSlider();
    blurControls();
  };

  arduinoItem.addEventListener("mouseenter", handleEnter);
  arduinoItem.addEventListener("mouseleave", handleLeave);

  const mediaQuery = window.matchMedia("(max-width: 860px)");
  const syncMediaState = (mq) => {
    if (mq.matches) {
      handleEnter();
    } else {
      handleLeave();
    }
  };

  syncMediaState(mediaQuery);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", (event) => syncMediaState(event.target || event));
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(syncMediaState);
  }
});



