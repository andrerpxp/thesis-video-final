fetch("./data/a.json")
  .then(r => r.json())
  .then(r => {
    console.log(r.map(r => r.session).flat());
    const session = r
      .map(r => {
        const start = r.questions.data.start;
        // const q1 = r.questions.data.answers[0].time;
        const end = start + r.questions.data.answers[0].time;

        // Tem que tirar - do start se tiver na segunda ou terceira pergunta
        let session;
        if (r.session && r.questions) {
          r.session.shift();
          session = r.session.filter(item => {
            return item[0] > start && item[0] < end;
          });
        }
        return session;
      })
      // .map(r => r.session)
      .filter(session => session)
      // .filter(session => {
      //   session.shift();
      //   return session;
      // })
      .flat();
    // console.log(session);
    console.log(session);
    video.addEventListener("loadedmetadata", () => {
      paintMoveStream(session);
      // calculateClicksNearPoints(session);
      // paintClickStream(session);
    });
  });

function countElementsClicks(data) {
  const mouseClicks = data.filter(
    ([t, x, y, id, type]) => type === "mousedown",
  );
  let count = {};
  mouseClicks.forEach(item => {
    let id = item[3];
    const progress = id === "" && item[2] < 480 && item[2] > 440;
    if (id.startsWith("prog")) {
      id = "progress";
    } else if (progress) {
      id = "progress";
    } else if (id === "" && !progress) {
      id = "others";
    }
    if (count[id]) {
      count[id].push(item);
    } else {
      count[id] = [];
      count[id].push(item);
    }
  });
  console.log(count.progress);
  paintMoveStream(count.progress);
  paintClickStream(count.progress);
  // calculateClicksNearPoints(count.progress);
  for (key in count) {
    const el = key !== "" ? document.getElementById(key) : null;
    if (el) {
      const showClicks = document.createElement("div");
      showClicks.classList.add("total-clicks");
      showClicks.innerText = key + " - clicks: " + count[key].length;
      document.documentElement.appendChild(showClicks);
    }
  }
}

function calculateClicksNearPoints(data) {
  const points = document.querySelectorAll(".int-section-progress");
  let filterData = [];
  points.forEach(point => {
    const { x } = point.getBoundingClientRect();
    // const el = document.createElement("div");
    // el.classList.add("focal-area");
    // el.style.left = x + "px";
    // document.documentElement.appendChild(el);

    const filter = data.filter(item => item[1] > x - 15 && item[1] < x + 30);
    filterData.push(filter);
  });
  // const progressBar = document
  //   .querySelector(".v-progress-max")
  //   .getBoundingClientRect();
  // console.log((4 * 50) / progressBar.width);
  const finalData = filterData.flat();
}

function paintMoveStream(data) {
  // Limpa se já existir algum criado
  const actualCanvas = document.querySelector(".heatmap-canvas");
  if (actualCanvas) actualCanvas.remove();

  const heatmap = h337.create({
    container: document.querySelector(".v-container"),
  });
  const finalData = data.map(([time, x, y]) => ({
    x,
    y,
    value: 1,
  }));
  window.finalData = finalData;
  heatmap.configure({
    radius: 1,
    maxOpacity: 0.8,
    minOpacity: 0,
    blur: 0.75,
  });
  heatmap.setData({
    max: data.length * 0.01,
    data: finalData,
  });
}

function paintClickStream(data, color = "white") {
  const finalData = data.filter(([t, x, y, id, type]) => type === "mousedown");

  // Make Circle
  const canvas = document.querySelector(".heatmap-canvas");
  const context = canvas.getContext("2d");
  finalData.forEach(([t, x, y]) => {
    context.beginPath();
    context.arc(x - 4, y, 4, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.fill();
  });
}
