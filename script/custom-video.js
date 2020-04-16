// Helpers
const zeroPad = (num, places) => String(num).padStart(places, "0");
const sec2time = (time) => {
  const date = new Date(time * 1000);
  const minutes = date.getUTCMinutes();
  const seconds = date.getSeconds();
  return `${zeroPad(minutes, 2)}:${zeroPad(seconds, 2)}`;
};
const debounce = (callback, delay) => {
  let timer;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...args);
      timer = null;
    }, delay);
  };
};
function throttle(callback, wait, immediate = false) {
  let timeout = null;
  let initialCall = true;
  return function () {
    const callNow = immediate && initialCall;
    const next = () => {
      callback.apply(this, arguments);
      timeout = null;
    };
    if (callNow) {
      initialCall = false;
      next();
    }
    if (!timeout) timeout = setTimeout(next, wait);
  };
}
const HMSToSeconds = (str) => {
  let p = str.split(":");
  let s = 0;
  let m = 1;
  while (p.length > 0) {
    s += m * parseFloat(p.pop(), 10);
    m *= 60;
  }
  s = Math.floor(s * 1000) / 1000;
  return s;
};

async function loadImages() {
  const images = [
    "./video/thumbs/thumb-0.jpg",
    "./video/thumbs/thumb-1.jpg",
    "./video/thumbs/thumb-2.jpg",
    "./video/thumbs/thumb-3.jpg",
  ];
  const imgPromisses = images.map((image, i) => {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open("GET", image, true);
      req.responseType = "blob";
      req.onload = function () {
        if (this.status === 200) {
          const img = URL.createObjectURL(this.response);
          resolve([i, img]);
        }
      };
      req.send();
    });
  });
  const array = await Promise.all(imgPromisses);
  const event = new CustomEvent("thumbloaded", { detail: array });
  document.dispatchEvent(event);
  return array;
}

// VideoPlayer
class VideoPlayer {
  constructor(video) {
    this.video = document.getElementById(video);
    this.videoWrapper = document.querySelector(".v-wrapper");
    this.videoContainer = document.querySelector(".v-container");
    this.controls = document.querySelector(".v-controls");
    this.requestVideo();
    this.video.addEventListener("loadedmetadata", () => {
      this.videoWrapper.classList.add("active");
      this.afterVideoLoad();
    });
    this.video.addEventListener("ended", () => {
      const customEvent = new CustomEvent("videoEnded");
      window.parent.document.dispatchEvent(customEvent);
    });
  }
  afterVideoLoad() {
    this.ProgressBar = new VideoProgressBar(this.video, this.controls);
    this.VideoButtons = new VideoButtons(this.video, this.controls);

    const control = new URLSearchParams(window.location.search).get("p");

    if (control !== "b") {
      this.VideoInteractiveClipboard = new VideoInteractiveClipboard(
        this.video,
      );
    }
  }
  addLoading() {
    this.loading = document.createElement("div");
    this.loading.classList.add("loading");
    this.videoContainer.appendChild(this.loading);
    return this.loading;
  }
  requestVideo() {
    const video = this.video;
    const req = new XMLHttpRequest();
    req.open("GET", video.dataset.file, true);
    req.responseType = "blob";
    const loading = this.addLoading();
    req.onload = function () {
      if (this.status === 200) {
        var vid = URL.createObjectURL(this.response);
        video.src = vid;
        loading.remove();
      }
    };
    req.onerror = function () {
      console.log("err", arguments);
    };
    req.onprogress = function (e) {
      if (e.lengthComputable) {
        const percentComplete = ((e.loaded / e.total) * 300) | 0;
        loading.style.borderLeft = `${percentComplete}px solid black`;
        loading.dataset.load = `${Math.floor(percentComplete / 3)}%`;
      }
    };
    req.send();
  }
}

class VideoProgressBar {
  constructor(video, controls) {
    this.video = video;
    this.controls = controls;
    this.progressBar = this.controls.querySelector(".v-progress");
    this.progressTotal = this.controls.querySelector(".v-progress-total");
    this.progressMax = this.controls.querySelector(".v-progress-max");

    this.setProgressBarSizes();

    this.thumbArray = loadImages();
    document.addEventListener("thumbloaded", (event) =>
      this.addTimeTooltip(event),
    );

    this.bindFunctions();
    this.addEventListeners();
  }
  setProgressBarSizes() {
    let { left, width } = this.progressMax.getBoundingClientRect();
    this.progressBarSizes = {
      left,
      width,
    };
  }
  calculateMove(event) {
    let move;
    if (event.type === "touchmove") {
      move = event.changedTouches[0].pageX;
    } else {
      event.preventDefault();
      move = event.pageX - this.progressBarSizes.left;
    }
    if (move >= 0 && move <= this.progressBarSizes.width) {
      return (move / this.progressBarSizes.width) * 100;
    } else if (move > this.progressBarSizes.width) {
      return 100;
    } else {
      return 0;
    }
  }
  onMouseMove(event) {
    const total = this.calculateMove(event);
    this.video.currentTime = this.video.duration * (total / 100);
    this.progressTotal.style.width = total + "%";
  }
  onMouseDown(event) {
    this.onMouseMove(event);
    document.addEventListener("touchmove", this.onMouseMove);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("touchend", this.onMouseUp);
    document.addEventListener("mouseup", this.onMouseUp);
  }
  onMouseUp() {
    document.removeEventListener("touchmove", this.onMouseMove);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("touchend", this.onMouseUp);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
  updateProgress(event) {
    this.currentTime = this.video.currentTime;
    this.duration = this.video.duration;
    const progress = (this.currentTime / this.duration) * 100;
    this.progressTotal.style.width = progress + "%";
  }
  addEventListeners() {
    this.video.addEventListener("timeupdate", this.updateProgress, false);
    this.video.addEventListener("canplay", this.updateProgress);
    this.progressBar.addEventListener("touchstart", this.onMouseDown);
    this.progressBar.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("resize", this.setProgressBarSizes);
  }
  addThumbnailPreview(imgs) {
    const thumbMap = [];
    let matrix = [];
    const firstRow = [];
    for (let i = 0; i < 5; i++) {
      firstRow[i] = [160 * i, 0];
    }
    for (let i = 0; i < 5; i++) {
      matrix[i] = firstRow.map((arr) => [arr[0], 90 * i]);
    }
    // mesma coisa que arr.flat();
    matrix = [].concat.apply([], matrix);
    matrix = [...matrix, ...matrix, ...matrix, ...matrix];

    for (let i = 0; i < 100; i++) {
      const img = imgs[Math.floor(i / 25)];
      thumbMap.push(
        `url("${img[1]}") no-repeat -${matrix[i][0]}px -${matrix[i][1]}px`,
      );
    }
    return thumbMap;
  }
  addTimeTooltip() {
    this.thumbMap = this.addThumbnailPreview(event.detail);
    this.progressTime = this.controls.querySelector(".v-progress-time");
    this.progressThumbnail = this.controls.querySelector(
      ".v-progress-thumbnail",
    );
    this.progressThumbnailImg = this.controls.querySelector(
      ".v-progress-thumbnail-img",
    );

    const showTooltip = throttle((event) => {
      const move = this.calculateMove(event);
      const barWidth = this.progressBarSizes.width;
      const maxRight = barWidth - 135;
      const minLeft = 10;
      const time = (move / 100) * this.video.duration;
      const tooltipMove = (move / 100) * barWidth - 60;
      this.progressTime.textContent = sec2time(time);

      if (tooltipMove < maxRight && tooltipMove > minLeft) {
        this.progressThumbnail.style.left = tooltipMove + "px";
      } else if (tooltipMove > maxRight) {
        this.progressThumbnail.style.left = maxRight + "px";
      } else if (tooltipMove < minLeft) {
        this.progressThumbnail.style.left = minLeft + "px";
      }

      this.progressThumbnailImg.style.background = this.thumbMap[
        Math.floor(move)
      ];
    }, 20);

    const addTooltip = (event) => {
      this.progressBar.addEventListener("mousemove", showTooltip);
      setTimeout(() => {
        this.progressThumbnail.classList.add("active");
      }, 10);
    };
    const removeTooltip = (event) => {
      this.progressBar.removeEventListener("mousemove", showTooltip);
      setTimeout(() => {
        this.progressThumbnail.classList.remove("active");
      }, 10);
    };
    this.progressBar.addEventListener("mouseover", addTooltip);
    this.progressBar.addEventListener("mouseout", removeTooltip);
  }
  bindFunctions() {
    this.updateProgress = this.updateProgress.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.setProgressBarSizes = debounce(
      this.setProgressBarSizes.bind(this),
      100,
    );
  }
}

class VideoButtons {
  constructor(video, controls) {
    this.video = video;
    this.controls = controls;
    this.videoWrapper = document.querySelector(".v-wrapper");
    this.videoContainer = document.querySelector(".v-container");

    this.addPlayPause();
    this.addRewindForward();
    this.addPlaybackBtn([0.75, 1, 1.25, 1.5, 2]);
    this.addCurrentTime();
    // this.addFullScreen();
    this.addVolume();
    this.activateControls();
    this.addNotification();
    this.addLabels();

    // Subtitles
    new VideoSubtitles(this.video);
  }

  addPlayPause() {
    const playBtn = this.controls.querySelector(".v-play");
    const playVideo = () => this.video.play();
    const pauseVideo = () => this.video.pause();
    playBtn.addEventListener("click", playVideo);

    this.video.addEventListener("playing", () => {
      playBtn.textContent = "Pause";
      playBtn.setAttribute("aria-label", "Pause");
      playBtn.classList.add("v-pause");
      playBtn.addEventListener("click", pauseVideo);
      playBtn.removeEventListener("click", playVideo);
    });

    this.video.addEventListener("pause", () => {
      playBtn.textContent = "Play";
      playBtn.setAttribute("aria-label", "Play");
      playBtn.classList.remove("v-pause");
      playBtn.addEventListener("click", playVideo);
      playBtn.removeEventListener("click", pauseVideo);
    });

    this.video.addEventListener("click", () => {
      playBtn.click();
    });

    document.addEventListener("keypress", ({ code }) => {
      if (code === "KeyK" || code === "Space") playBtn.click();
    });
  }

  addRewindForward() {
    this.rewindBtn = this.controls.querySelector(".v-rewind");
    this.forwardBtn = this.controls.querySelector(".v-forward");
    const changeVideoTime = (time) => (this.video.currentTime += time);

    this.rewindBtn.addEventListener("click", () => changeVideoTime(-5));
    this.forwardBtn.addEventListener("click", () => changeVideoTime(5));

    document.addEventListener("keydown", ({ code }) => {
      if (code === "ArrowLeft") this.rewindBtn.click();
      if (code === "ArrowRight") this.forwardBtn.click();
    });
  }

  addPlaybackBtn(rates) {
    this.playbackBtn = this.controls.querySelector(".v-playback-btn");
    this.playbackMenu = this.controls.querySelector(".v-playback-menu");
    this.playbackSpeed = this.controls.querySelector(".v-playback-speed");
    this.currentRate = Number(window.localStorage.videoSpeed) || 1;

    const changeVideoPlayback = (rate) => {
      this.video.playbackRate = rate;
      this.playbackSpeed.textContent = rate;
      window.localStorage.videoSpeed = rate;
      this.currentRate = rate;
    };
    changeVideoPlayback(this.currentRate);

    // Add Buttons based on the rates
    rates.forEach(
      (rate) =>
        (this.playbackMenu.innerHTML += `<button id="playback-${rate}" data-playbackrate="${rate}">${rate}x</button>`),
    );
    this.playbackBtns = this.playbackMenu.querySelectorAll("button");
    this.playbackBtns.forEach((btn) => {
      const rate = Number(btn.dataset.playbackrate);
      btn.addEventListener("click", () => {
        changeVideoPlayback(rate);
      });
    });

    // Loop per each rate
    this.playbackBtn.addEventListener("click", () => {
      const index = rates.indexOf(this.currentRate);
      if (rates.length === index + 1) {
        changeVideoPlayback(rates[0]);
      } else {
        changeVideoPlayback(rates[index + 1]);
      }
    });
  }

  addCurrentTime() {
    this.timePassed = this.controls.querySelector(".v-time-passed");
    this.timeTotal = this.controls.querySelector(".v-time-total");
    this.timeTotal.textContent = sec2time(this.video.duration);
    this.timePassed.textContent = sec2time(this.video.currentTime);
    this.video.addEventListener("timeupdate", () => {
      this.timePassed.textContent = sec2time(this.video.currentTime);
    });
  }

  addFullScreen() {
    this.fullscreenBtn = this.controls.querySelector(".v-fullscreen");
    const enterFullscreen = () => this.videoContainer.requestFullscreen();
    const exitFullscreen = () => document.exitFullscreen();
    let fullscreen = false;

    this.fullscreenBtn.addEventListener("click", () => {
      if (!fullscreen) {
        enterFullscreen();
        fullscreen = true;
      } else if (fullscreen) {
        exitFullscreen();
        fullscreen = false;
      }
    });

    document.addEventListener("keypress", ({ code }) => {
      if (code === "KeyF") this.fullscreenBtn.click();
    });
  }

  addVolume() {
    this.volumeBtn = this.controls.querySelector(".v-volume-btn");
    this.volumeLevel = this.controls.querySelector(".v-volume-level");
    this.volumeCurrentLevel = this.controls.querySelector(
      ".v-volume-current-level",
    );

    const setCurrentSizes = () => {
      const { width, left } = this.volumeLevel.getBoundingClientRect();
      this.volumeLevelSizes = {
        min: 0,
        max: width,
        width: width,
        left: left,
      };
    };

    const changeVolumeIcon = (volume) => {
      if (volume === 0) {
        this.volumeBtn.dataset.volume = "0";
      } else if (volume <= 0.5) {
        this.volumeBtn.dataset.volume = "1";
      } else {
        this.volumeBtn.dataset.volume = "";
      }
    };

    const changeVolume = (volume) => {
      changeVolumeIcon(volume);
      this.video.volume = Number(volume.toFixed(1));
      window.localStorage.videoVolume = this.video.volume;
      this.volumeCurrentLevel.style.width = volume * 100 + "%";
    };

    let volume;
    if (window.localStorage.videoVolume === undefined) {
      volume = 1;
    } else {
      volume = Number(window.localStorage.videoVolume);
    }
    changeVolume(volume);

    const onMouseMove = (event) => {
      let move;
      if (event.type === "touchmove") {
        move = event.changedTouches[0].pageX;
      } else {
        event.preventDefault();
        move = event.pageX - this.volumeLevelSizes.left;
      }
      if (
        move >= this.volumeLevelSizes.min &&
        move <= this.volumeLevelSizes.max
      ) {
        changeVolume(move / this.volumeLevelSizes.width);
      }
    };

    const onMouseDown = (event) => {
      setCurrentSizes();
      onMouseMove(event);
      document.addEventListener("touchmove", onMouseMove);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("touchend", onMouseUp);
      document.addEventListener("mouseup", onMouseUp);
    };

    const onMouseUp = () => {
      document.removeEventListener("touchmove", onMouseMove);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchend", onMouseUp);
      document.removeEventListener("mouseup", onMouseUp);
    };

    this.volumeLevel.addEventListener("mousedown", onMouseDown);
    this.volumeBtn.addEventListener("click", () => {
      this.currentVolume = this.currentVolume ? this.currentVolume : 1;
      if (this.video.volume != 0) {
        this.currentVolume = this.video.volume;
        changeVolume(0);
      } else {
        changeVolume(this.currentVolume);
      }
    });
  }
  activateControls() {
    let timeout;
    let videoStatus = "pause";
    const addActive = () => {
      this.controls.classList.add("v-active");
      this.video.style.cursor = "initial";
      clearTimeout(timeout);
    };
    addActive();
    const removeActive = () => {
      this.controls.classList.remove("v-active");
      this.video.style.cursor = "none";
      clearTimeout(timeout);
    };
    const lateRemoveActive = () => {
      timeout = setTimeout(removeActive, 2500);
    };
    this.video.addEventListener("playing", () => {
      videoStatus = "playing";
      lateRemoveActive();
    });
    this.video.addEventListener("pause", () => {
      videoStatus = "pause";
      addActive();
    });
    let handleMouseMove = () => {
      if (videoStatus === "playing") {
        addActive();
        lateRemoveActive();
      } else if (videoStatus === "pause") {
        addActive();
      }
    };
    handleMouseMove = throttle(handleMouseMove, 120);
    this.controls.addEventListener("mousemove", handleMouseMove);
    this.video.addEventListener("mousemove", handleMouseMove);
  }

  addNotification() {
    const el = document.createElement("div");
    el.classList.add("v-notification");
    this.videoWrapper.appendChild(el);
    let animating = false;
    let timeout;

    document.addEventListener("click", ({ target }) => {
      const controls = [
        "v-play",
        "v-pause",
        "v-rewind",
        "v-forward",
        // "v-clipboard"
      ];
      const contains = controls
        .map((e) => target.classList.contains(e))
        .filter(Boolean);
      if (contains.length) {
        if (animating) {
          clearTimeout(timeout);
          el.classList.remove("active");
        }
        const bg = getComputedStyle(target).backgroundImage.replace(
          "copy",
          "copyw",
        );
        el.style.backgroundImage = bg;
        el.classList.add("active");
        animating = true;
        timeout = setTimeout(() => {
          el.classList.remove("active");
          animating = false;
        }, 1000);
      }
    });
  }
  addLabels() {
    const labels = document.querySelectorAll("[aria-label]");
    const labelEl = document.createElement("div");
    labelEl.classList.add("v-label");
    this.videoContainer.appendChild(labelEl);

    labels.forEach((label) => {
      label.addEventListener("mouseenter", () => {
        const { left } = label.getBoundingClientRect();
        const offset =
          (window.innerWidth - this.video.getBoundingClientRect().width) / 2;
        labelEl.style.left =
          left - offset < 920 ? left - offset + "px" : 930 + "px";

        const labelText = label.getAttribute("aria-label");
        labelEl.innerText = labelText;

        labelEl.classList.add("active");
      });
      label.addEventListener("mouseleave", () => {
        labelEl.classList.remove("active");
        labelEl.innerText = "";
      });
    });
  }
}

class VideoInteractive {
  constructor(video) {
    this.video = video;
    this.data = {};
    this.fetchRichMedia(this.video.dataset.file.replace("mp4", "txt"));
  }
  fetchRichMedia(src) {
    fetch(src)
      .then((data) => data.text())
      .then((data) => this.handleRichMedia(data));
  }
  dispatchEvent(eventName) {
    const event = new Event(eventName);
    this.video.dispatchEvent(event);
  }
  handleRichMedia(data) {
    this.data = this.parseData(data);
    this.dispatchEvent("dataparsed");
    this.createTimelineSections();
  }
  parseData(data) {
    const regex = /\d{2}:\d{2}-\d{2}:\d{2}|\d{2}:\d{2}/g;
    const time = data.match(regex);
    const content = data
      .split(regex)
      .map((item) => item.trim())
      .filter((item) => item.length);
    const dataObject = time.map((time, index) => {
      return {
        time,
        content: content[index],
      };
    });
    return dataObject;
  }
  createTimelineSections() {
    const timeline = document.querySelector(".v-progress-max");
    const timelineTitle = document.querySelector(".v-progress-title");
    const sections = this.data.filter(
      (item) => item.content.indexOf("```") === -1,
    );

    sections.forEach((item, i) => {
      const time = HMSToSeconds(item.time);
      const sectionStart = (time / this.video.duration) * 100;
      let width = 100 - sectionStart;

      const nextElement = item.nextElementSibling;
      if (nextElement) {
        const nextTime = HMSToSeconds(nextElement.dataset.time);
        const nextSectionStart = (nextTime / this.video.duration) * 100;
        width = nextSectionStart - sectionStart;
      }

      const section = document.createElement("div");
      section.classList.add("int-section-progress");
      section.id = "progress-" + i;
      section.style.width = `${width}%`;
      section.style.left = `${sectionStart}%`;

      // Add name to tooltip
      const itemName = item.content;
      section.dataset.after = itemName;

      section.addEventListener("mouseenter", () => {
        timelineTitle.innerText = itemName;
        timelineTitle.classList.remove("active");
        setTimeout(() => timelineTitle.classList.add("active"), 50);
        section.classList.add("active");
      });
      section.addEventListener("mouseleave", () => {
        timelineTitle.innerText = "";
        timelineTitle.classList.remove("active");
        section.classList.remove("active");
      });
      timeline.appendChild(section);
    });
  }
}

class VideoInteractiveClipboard extends VideoInteractive {
  constructor(video) {
    super(video);
    this.videoWrapper = document.querySelector(".v-wrapper");
    this.handleClipboardData();
    // O timer serve para limparmos o cancelamento do hover
    this.timers = {};
  }
  handleClipboardData() {
    const addEventForEach = (item, index) => {
      if (item.content.indexOf("```") > -1) {
        const timers = item.time.split("-");
        const start = HMSToSeconds(timers[0]);
        const stop = timers[1] ? HMSToSeconds(timers[1]) : start + 30;

        const el = addTextEl(item.content);
        el.id = "copy" + index;

        const activeEl = () => {
          const activate =
            this.video.currentTime > start &&
            this.video.currentTime < stop &&
            !el.classList.contains("active");
          const deactivate =
            (this.video.currentTime < start || this.video.currentTime > stop) &&
            el.classList.contains("active");
          if (activate) {
            el.classList.add("active");
            expandElement({ currentTarget: el });
            this.timers.activate = setTimeout(
              () => collapseElement({ currentTarget: el }),
              3500,
            );
          } else if (deactivate) {
            el.classList.remove("active");
          }
        };
        el.addEventListener("mouseout", collapseElement);
        el.addEventListener("mouseover", expandElement);
        this.video.addEventListener("timeupdate", activeEl, false);
      }
    };

    const expandElement = ({ currentTarget }) => {
      clearTimeout(this.timers.activate);
      clearTimeout(this.timers.collapse);
      currentTarget.classList.add("expand");
      setTimeout(() => currentTarget.classList.add("expanded"), 300);
    };

    const collapseElement = ({ currentTarget }) => {
      this.timers.collapse = setTimeout(() => {
        currentTarget.classList.remove("expanded");
        currentTarget.classList.remove("expand");
      }, 300);
    };

    const addTextEl = (content) => {
      const el = document.createElement("pre");
      const cleanContent = content.replace(/```(\w?){1,}/g, "").trim();
      el.classList.add("v-popup-text", "v-clipboard");
      el.dataset.clipboardText = cleanContent;
      el.dataset.clipboardText = cleanContent;
      el.innerText = cleanContent;
      this.videoWrapper.appendChild(el);
      return el;
    };

    this.video.addEventListener("dataparsed", () =>
      this.data.forEach(addEventForEach),
    );
    if (window.ClipboardJS) {
      const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
      const pasteCMD = isMacLike ? "CMD" : "CTRL";

      const clipboard = new ClipboardJS(".v-clipboard");
      clipboard.on("success", (event) => {
        const innerHTML = event.trigger.innerHTML;
        const span = document.createElement("span");
        span.innerHTML = `Copied <b>${pasteCMD} + V</b>`;
        event.trigger.appendChild(span);

        event.trigger.classList.add("copied");
        setTimeout(() => {
          event.trigger.classList.remove("copied");
          span.classList.add("active");
        }, 100);
        setTimeout(() => {
          span.classList.remove("active");
        }, 1700);
        setTimeout(() => {
          span.remove();
        }, 2000);
      });
    }
  }
}

class VideoSubtitles {
  constructor(video) {
    this.video = video;
    this.subtitleList = this.video.dataset.subtitle.split(" ");
    this.subtitleButton = document.querySelector(".v-subtitle-btn");
    this.subtitleText = document.querySelector(".v-subtitle-text");
    this.subtitleMenu = document.querySelector(".v-subtitle-menu");

    this.handleVideoUpdate = this.handleVideoUpdate.bind(this);
    this.removeSubtitle = this.removeSubtitle.bind(this);

    if (this.subtitleList) {
      this.addSubtitlesMenu();
      this.removeSubtitle();
    }
  }
  loadSubtitle(url) {
    return fetch(url)
      .then((r) => r.text())
      .then((r) => {
        this.subtitle = this.parseVtt(r);
      });
  }
  parseVtt(vtt) {
    const time = vtt.match(/\d{2}:\d{2}:\d{2}\.\d{3}/g);
    const content = vtt
      .split(/[\n][\d]{1,}/g)
      .map((item) => item.substring(29))
      .filter((item) => item)
      .map((item) => {
        const start = HMSToSeconds(time.shift());
        const end = HMSToSeconds(time.shift());
        return [start, end, item];
      });
    return content;
  }
  handleVideoUpdate() {
    const sub = this.subtitle;
    if (sub) {
      const ct = this.video.currentTime;
      for (let i = 0; i < sub.length; i++) {
        if (ct > sub[i][0] && ct < sub[i][1]) {
          this.subtitleText.innerText = sub[i][2];
        }
      }
    }
  }
  async activateSubtitle(url) {
    await this.loadSubtitle(url);
    this.video.addEventListener("timeupdate", this.handleVideoUpdate);
    this.buttons.forEach((btn) => btn.classList.remove("active"));
    document
      .querySelector(`[data-subtitlesrc="${url}"]`)
      .classList.add("active");
  }
  removeSubtitle() {
    this.video.removeEventListener("timeupdate", this.handleVideoUpdate);
    this.buttons.forEach((btn) => btn.classList.remove("active"));
    this.subtitleText.innerText = "";
    this.subtitle = "";
    document.querySelector("[data-subtitlesrc='off']").classList.add("active");
  }
  addOffButton() {
    const el = document.createElement("button");
    el.innerText = "Off";
    el.dataset.subtitlesrc = "off";
    el.id = "subtitle-" + "off";
    el.addEventListener("click", this.removeSubtitle);
    this.subtitleMenu.append(el);
  }
  addSubtitlesMenu() {
    this.addOffButton();
    this.subtitleList.forEach((url) => {
      const el = document.createElement("button");
      if (url.match("ptbr")) el.innerText = "Português";
      if (url.match("en")) el.innerText = "English";
      el.dataset.subtitlesrc = url;
      el.id = "subtitle-" + el.innerText.toLowerCase();
      el.addEventListener("click", () => this.activateSubtitle(url));
      this.subtitleMenu.appendChild(el);
    });
    this.buttons = document.querySelectorAll(".v-subtitle-menu button");
  }
}

// Travar a saída da página
// window.onbeforeunload = () => "";
new VideoPlayer("video");
