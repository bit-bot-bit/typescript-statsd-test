import express from "express";
import { StatsD } from "hot-shots";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const port = Number(process.env.APP_PORT) || 3000;

// Configure StatsD from environment variables
const statsd = new StatsD({
  host: process.env.STATSD_HOST || "localhost",
  port: Number(process.env.STATSD_PORT) || 9125,
  prefix: process.env.STATSD_PREFIX || "app.metrics."
});

// Track load test settings
let metricsPerSecond = 1;
let intervalId: NodeJS.Timeout | null = null;

// Serve HTML page to configure load test
app.get("/", (req, res) => {
  res.send(`
    <h1>StatsD Load Test</h1>
    <label>StatsD Host: ${process.env.STATSD_HOST}</label> <br>
    <label>StatsD Port: ${process.env.STATSD_PORT}</label> <br><br>

    <label for="rate">Metrics per second:</label>
    <input type="number" id="rate" value="${metricsPerSecond}" min="1" max="1000">
    <button onclick="startTest()">Start</button>
    <button onclick="stopTest()">Stop</button>
    <p id="status">Status: Stopped</p>

    <script>
      function startTest() {
        const rate = document.getElementById('rate').value;
        fetch('/start-test?rate=' + rate, { method: 'POST' })
          .then(response => response.text())
          .then(message => document.getElementById('status').innerText = "Status: " + message);
      }
      
      function stopTest() {
        fetch('/stop-test', { method: 'POST' })
          .then(response => response.text())
          .then(message => document.getElementById('status').innerText = "Status: " + message);
      }
    </script>
  `);
});

// Start sending metrics at a user-defined rate
app.post("/start-test", (req, res) => {
  const rate = parseInt(req.query.rate as string) || 1;
  if (intervalId) clearInterval(intervalId);

  metricsPerSecond = rate;
  intervalId = setInterval(() => {
    for (let i = 0; i < metricsPerSecond; i++) {
      statsd.increment("loadtest.metric");
    }
    console.log(`Sent ${metricsPerSecond} metrics`);
  }, 1000);

  res.send(`Sending ${metricsPerSecond} metrics per second`);
});

// Stop sending metrics
app.post("/stop-test", (req, res) => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  res.send("Stopped sending metrics");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Using StatsD Server: ${process.env.STATSD_HOST}:${process.env.STATSD_PORT}`);
});
