// layout
const width = 400;
const height = 260;
const margin = { top: 30, right: 20, bottom: 45, left: 60 };

// measure info
const measureMeta = {
  gdp: {
    key: "gdp",
    label: "GDP per person",
    unit: "USD",
    decimals: 0
  },
  life: {
    key: "life",
    label: "Life expectancy",
    unit: "years",
    decimals: 1
  },
  child: {
    key: "child",
    label: "Under five mortality rate",
    unit: "per 1000 births",
    decimals: 1
  }
};

let currentX = "gdp";
let currentY = "life";

let worldData = [];
let geoData = null;

// set of selected country codes
let selectedCodes = new Set();

// helper for tooltips
function formatValue(fieldKey, value) {
  if (value == null || isNaN(value)) return "No data";
  const meta = measureMeta[fieldKey];
  return value.toFixed(meta.decimals) + " " + meta.unit;
}

// load data
Promise.all([
  d3.csv("data/world_data.csv", d => ({
    country: d.Entity,
    code: d.Code,
    gdp: +d.gdp_per_capita,
    life: +d.life_expectancy,
    child: d.child_mortality ? +d.child_mortality : NaN
  })),
  d3.json("data/world.geojson")
]).then(([data, geo]) => {
  worldData = data.filter(d => d.code && d.code.length === 3);
  geoData = geo;

  initControls();
  updateAllViews();

  // clicking on empty page clears selection
  d3.select("body").on("click", function (event) {
  // ignore clicks that happen inside the scatter svg or maps
  if (event.target.closest("svg")) return;
  selectedCodes = new Set();
  updateAllViews();
});
});

// dropdowns
function initControls() {
  const options = Object.values(measureMeta);

  const xSelect = d3.select("#xSelect");
  const ySelect = d3.select("#ySelect");

  xSelect.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .attr("value", d => d.key)
    .text(d => d.label);

  ySelect.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .attr("value", d => d.key)
    .text(d => d.label);

  xSelect.property("value", currentX);
  ySelect.property("value", currentY);

  xSelect.on("change", function () {
    currentX = this.value;
    updateAllViews();
  });

  ySelect.on("change", function () {
    currentY = this.value;
    updateAllViews();
  });
}

// redraw everything based on current state
function updateAllViews() {
  drawHistogram("#histGdp", worldData, currentX, measureMeta[currentX].label);
  drawHistogram("#histLife", worldData, currentY, measureMeta[currentY].label);

  drawScatter("#scatter", worldData, currentX, currentY);

  drawChoropleth("#mapGdp", worldData, currentX, measureMeta[currentX].label);
  drawChoropleth("#mapLife", worldData, currentY, measureMeta[currentY].label);

  updateInfoPanel();
}

// histogram with brushing
function drawHistogram(svgSelector, data, fieldKey, xLabel) {
  const svg = d3.select(svgSelector)
    .attr("width", width)
    .attr("height", height);

  svg.selectAll("*").remove();

  const tooltip = d3.select("#tooltip");

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const rows = data.filter(d => !isNaN(d[fieldKey]));
  const values = rows.map(d => d[fieldKey]);

  const x = d3.scaleLinear()
    .domain(d3.extent(values))
    .nice()
    .range([0, innerWidth]);

  const binGen = d3.bin()
    .domain(x.domain())
    .thresholds(20)
    .value(d => d[fieldKey]);

  const bins = binGen(rows);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, b => b.length)])
    .nice()
    .range([innerHeight, 0]);

  const hasSelection = selectedCodes.size > 0;

  const bar = g.selectAll("g.bar")
    .data(bins)
    .enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", b => `translate(${x(b.x0)},${y(b.length)})`);

  bar.append("rect")
    .attr("x", 1)
    .attr("width", b => {
      const w = x(b.x1) - x(b.x0) - 1;
      return w > 0 ? w : 0;
    })
    .attr("height", b => innerHeight - y(b.length))
    .attr("fill", b => {
      if (!hasSelection) return "steelblue";
      const selectedCount = b.filter(r => selectedCodes.has(r.code)).length;
      if (selectedCount === 0) return "#374151";
      if (selectedCount === b.length) return "steelblue";
      return "orange";
    })
    .on("mouseenter", (event, b) => {
      if (!b.length) return;
      const meta = measureMeta[fieldKey];
      const from = b.x0.toFixed(meta.decimals);
      const to = b.x1.toFixed(meta.decimals);

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${xLabel}</strong><br/>
           Range ${from} to ${to}<br/>
           Countries ${b.length}`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY + 12 + "px");
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 35)
    .attr("text-anchor", "middle")
    .text(xLabel);

  // brush horizontally to select value range
  const brush = d3.brushX()
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on("end", event => {
      if (!event.selection) return;

      const [x0, x1] = event.selection;
      const v0 = x.invert(x0);
      const v1 = x.invert(x1);

      const newSet = new Set();
      rows.forEach(d => {
        const v = d[fieldKey];
        if (!isNaN(v) && v >= v0 && v <= v1) {
          newSet.add(d.code);
        }
      });

      selectedCodes = newSet;
      updateAllViews();

      g.select(".histBrush").call(brush.move, null);
    });

  g.append("g")
    .attr("class", "histBrush")
    .call(brush);
}

// scatter with brushing and click
function drawScatter(svgSelector, data, xField, yField) {
  const svg = d3.select(svgSelector)
    .attr("width", width * 2 + 40)
    .attr("height", 320);

  svg.selectAll("*").remove();

  const tooltip = d3.select("#tooltip");

  const innerWidth = width * 2 + 1200 - margin.left - margin.right;
  const innerHeight = 320 - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const rows = data.filter(d => !isNaN(d[xField]) && !isNaN(d[yField]));

  const x = d3.scaleLinear()
    .domain(d3.extent(rows, d => d[xField]))
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(rows, d => d[yField]))
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  // brush: handles both drag select and single click
  const brush = d3.brush()
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on("end", function (event) {
      // if there is a brush rectangle, treat as multi select
      if (event.selection) {
        const [[x0, y0], [x1, y1]] = event.selection;

        const newSet = new Set();
        rows.forEach(d => {
          const cx = x(d[xField]);
          const cy = y(d[yField]);
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
            newSet.add(d.code);
          }
        });

        selectedCodes = newSet;
        updateAllViews();
        g.select(".scatterBrush").call(brush.move, null);
        return;
      }

      // if there is no rectangle, treat it as a click
      if (!event.sourceEvent) return; // ignore programmatic calls

      const [mx, my] = d3.pointer(event.sourceEvent, g.node());

      let bestCode = null;
      let bestDist = Infinity;

      rows.forEach(d => {
        const cx = x(d[xField]);
        const cy = y(d[yField]);
        const dx = cx - mx;
        const dy = cy - my;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestCode = d.code;
        }
      });

      if (bestCode) {
        selectedCodes = new Set([bestCode]);
        updateAllViews();
      }
    });

  g.append("g")
    .attr("class", "scatterBrush")
    .call(brush);

  const hasSelection = selectedCodes.size > 0;

  g.selectAll("circle")
    .data(rows)
    .enter()
    .append("circle")
    .attr("cx", d => x(d[xField]))
    .attr("cy", d => y(d[yField]))
    .attr("r", 3)
    .attr("fill", d => {
      if (!hasSelection) return "steelblue";
      return selectedCodes.has(d.code) ? "orange" : "#4b5563";
    })
    .attr("opacity", d => {
      if (!hasSelection) return 0.7;
      return selectedCodes.has(d.code) ? 0.95 : 0.3;
    })
    .attr("data-code", d => d.code)
    .on("mouseenter", (event, d) => {
      const metaX = measureMeta[xField];
      const metaY = measureMeta[yField];

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.country}</strong><br/>
           ${metaX.label}: ${formatValue(xField, d[xField])}<br/>
           ${metaY.label}: ${formatValue(yField, d[yField])}`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY + 12 + "px");
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text(measureMeta[xField].label);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text(measureMeta[yField].label);
}

// choropleth with click
function drawChoropleth(svgSelector, data, fieldKey, legendLabel) {
  const svg = d3.select(svgSelector)
    .attr("width", width)
    .attr("height", height);

  svg.selectAll("*").remove();

  const tooltip = d3.select("#tooltip");

  const projection = d3.geoNaturalEarth1()
    .scale(100)
    .translate([width / 1, height / 2
    ]);

  const path = d3.geoPath().projection(projection);

  const valueByCode = new Map(data.map(d => [d.code, d[fieldKey]]));

  const values = Array.from(valueByCode.values()).filter(v => !isNaN(v));

  const color = d3.scaleSequential()
    .domain(d3.extent(values))
    .interpolator(
      fieldKey === "child"
        ? d3.interpolateReds
        : fieldKey === "life"
        ? d3.interpolateGreens
        : d3.interpolateBlues
    );

  const hasSelection = selectedCodes.size > 0;

  svg.append("g")
    .selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "countryPath")
    .attr("data-code", d => d.id || d.properties.iso_a3)
    .attr("fill", d => {
      const code = d.id || d.properties.iso_a3;
      const v = valueByCode.get(code);
      return v != null && !isNaN(v) ? color(v) : "#1f2933";
    })
    .attr("stroke", d => {
      const code = d.id || d.properties.iso_a3;
      if (!hasSelection) return "#9ca3af";
      return selectedCodes.has(code) ? "#fbbf24" : "#6b7280";
    })
    .attr("stroke-width", d => {
      const code = d.id || d.properties.iso_a3;
      if (!hasSelection) return 0.4;
      return selectedCodes.has(code) ? 2 : 0.2;
    })
    .on("mouseenter", (event, d) => {
      const code = d.id || d.properties.iso_a3;
      const v = valueByCode.get(code);
      const name = d.properties.name;

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${name}</strong><br/>
           ${legendLabel}: ${formatValue(fieldKey, v)}`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY + 12 + "px");
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      const code = d.id || d.properties.iso_a3;
      if (!code) return;
      selectedCodes = new Set([code]);
      updateAllViews();
    });

  svg.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("font-size", 11)
    .text(legendLabel);
}

// info panel
function updateInfoPanel() {
  const info = d3.select("#infoText");

  if (selectedCodes.size === 0) {
    info.text("Click a point or country, or brush over any chart, to select one or more countries.");
    return;
  }

  const code = Array.from(selectedCodes)[0];
  const row = worldData.find(d => d.code === code);

  if (!row) {
    info.text("No data available for the selected region.");
    return;
  }

  info.html(
    `<strong>${row.country} (${row.code})</strong><br/>
     GDP per person: ${formatValue("gdp", row.gdp)}<br/>
     Life expectancy: ${formatValue("life", row.life)}<br/>
     Under five mortality: ${formatValue("child", row.child)}`
  );
}