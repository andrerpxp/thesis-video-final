function startTracking() {
  const settings = {
    width: getBrowserWidth(),
    height: getBrowserHeight(),
    platform: navigator.platform,
    browser: whichBroswer(),
    start: new Date().getTime(),
    windowChange: [],
  };

  const data = [settings];

  function saveData() {
    fetch("https://andrerafael.com/post/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  window.parent.document.addEventListener("questionsFinished", saveData);
  // window.addEventListener("beforeunload", event => {
  //   event.returnValue = "Deseja desistir do teste?";
  //   saveData();
  // });

  function pushEventData(event) {
    data.push([
      new Date().getTime(),
      event.pageX,
      event.pageY,
      event.target.id,
      event.type,
      event.key,
    ]);
  }

  // Envia os dados ao mousemove e remove o evento.
  function onMouseMove(event) {
    pushEventData(event);
    document.body.removeEventListener("mousemove", onMouseMove, false);
  }

  // Cada Xms lista o mousemove
  setInterval(() => {
    document.body.addEventListener("mousemove", onMouseMove, false);
  }, 100);

  // Verifica o evento de click.
  document.documentElement.addEventListener("mousedown", pushEventData);
  document.documentElement.addEventListener("keydown", pushEventData);

  const video = document.querySelector("video");
  video.addEventListener("ended", pushEventData);
  video.addEventListener("pause", pushEventData);
  video.addEventListener("play", pushEventData);

  // Pega o mouseover nos textos de copy
  function addPopTextEvent() {
    setTimeout(() => {
      const popText = document.querySelectorAll(".v-popup-text");
      if (popText.length > 0) {
        popText.forEach(item => {
          item.addEventListener("mouseover", pushEventData);
        });
      }
    }, 3000);
  }
  video.addEventListener("loadedmetadata", addPopTextEvent);

  function whichBroswer() {
    if (
      (navigator.userAgent.indexOf("Opera") ||
        navigator.userAgent.indexOf("OPR")) != -1
    ) {
      return "Opera";
    } else if (navigator.userAgent.indexOf("Chrome") != -1) {
      return "Chrome";
    } else if (navigator.userAgent.indexOf("Safari") != -1) {
      return "Safari";
    } else if (navigator.userAgent.indexOf("Firefox") != -1) {
      return "Firefox";
    } else if (
      navigator.userAgent.indexOf("MSIE") != -1 ||
      !!document.documentMode == true
    ) {
      return "IE";
    } else {
      return "unknown";
    }
  }

  function getBrowserWidth() {
    return Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth,
    );
  }

  function getBrowserHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight,
    );
  }

  function addVisibilityChange() {
    let hidden;
    let visibilityChange;
    if (typeof document.hidden !== "undefined") {
      // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }

    function handleVisibilityChange() {
      data[0].windowChange.push([
        new Date().getTime(),
        document[hidden] ? "saiu" : "voltou",
      ]);
    }
    document.addEventListener(visibilityChange, handleVisibilityChange, false);
  }
  addVisibilityChange();

  document.querySelector("video").removeEventListener("play", startTracking);
}

document.querySelector("video").addEventListener("play", startTracking);
