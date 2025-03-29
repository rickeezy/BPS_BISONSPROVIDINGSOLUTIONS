import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const locations = {
  washingtonDC: {
    name: "WHUT-TV",
    lat: 38.9072,
    lng: -77.0369,
    zoom: 8,
    country: "United States",
    locality: "Washington DC, US",
    zip: "20059",
    street: "2441 6th St NW",
  },
  baltimore: {
    name: "WNUV",
    lat: 39.2904,
    lng: -76.6122,
    zoom: 8,
    country: "United States",
    locality: "Baltimore, MD, US",
    zip: "21201",
    street: "801 E Fayette St",
  },
  colorado: {
    name: "KWGN-TV",
    lat: 39.7289,
    lng: -105.7431,
    zoom: 8,
    country: "United States",
    locality: "Fort Collins, CO, US",
    zip: "80521",
    street: "200 W Mountain Ave",
  },
  lasVegas: {
    name: "KVCW-CD",
    lat: 36.134623,
    lng: -115.157213,
    zoom: 8,
    country: "United States",
    locality: "Las Vegas, NV, US",
    zip: "89101",
    street: "Convention Center",
  },
  stationX: {
    name: "WIAV-CD",
    lng: -77.060, 
    lat: 38.92, 
    zoom: 8,
    country: "United States",
    locality: "Washington, DC, US",
    zip: "20500",
    street: "1600 Pennsylvania Avenue NW",
  },
};

function App() {
  // State declarations
  const [theme, setTheme] = useState("power");
  const [failoverMode, setFailoverMode] = useState("normal");
  const [masterClock, setMasterClock] = useState("");
  const [activeTab, setActiveTab] = useState("bps");
  const [darkMode, setDarkMode] = useState(false);
  const [gpsUnsyncedTime, setGpsUnsyncedTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDelayGraph, setShowDelayGraph] = useState(false);
  const [bpsOffset, setBpsOffset] = useState(1);
  const [eloranOffset, setEloranOffset] = useState(2);
  const [bpsLocation, setBpsLocation] = useState(locations.washingtonDC);
  const [scenario, setScenario] = useState(null);
  
  // Chart data states
  const [chartData, setChartData] = useState(
    Array.from({length: 20}, () => Math.floor(Math.random() * 100))
  );
  const [chartLabels, setChartLabels] = useState(
    Array.from({length: 20}, (_,i) => `${i+1}s`)
  );

  // Refs
  const bpsMapRef = useRef(null);
  const chartRef = useRef(null);
  const chartContainerRef = useRef(null);

  const scenarioAlerts = {
    urban: "🏙️ Urban Canyon: GPS signals may bounce or weaken — BPS is more stable.",
    underground: "🚇 Underground/Tunnel: GPS unavailable — BPS and eLoran operational.",
    solar: "🌞 Solar Storm: GPS disrupted by space weather — BPS unaffected.",
    military: "🛡️ Military GPS Denial Zone: GPS restricted — BPS fallback activated.",
    disaster: "🌪️ Natural Disaster: Satellite communication may fail — BPS maintains local sync.",
  };

  // Initialize chart
  useEffect(() => {
    const ctx = document.getElementById('delayGraph');
    if (ctx && !chartRef.current) {
      // Ensure canvas is properly sized
      ctx.style.width = '100%';
      ctx.style.height = '100%';
      
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Delay (ns)',
            data: chartData,
            borderColor: 'rgb(74, 255, 160)',
            backgroundColor: 'rgba(74, 255, 160, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 0 // disable animations for better performance
          },
          scales: {
            y: {
              beginAtZero: false,
              grid: { color: 'rgba(74, 255, 160, 0.1)' },
              ticks: { color: 'var(--text-green)' }
            },
            x: {
              grid: { color: 'rgba(74, 255, 160, 0.1)' },
              ticks: { color: 'var(--text-green)' }
            }
          }
        }
      });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart data
  useEffect(() => {
    const interval = setInterval(() => {
      if (chartRef.current) {
        const newValue = Math.floor(10 + Math.random() * 90);
        const newLabel = `${chartLabels.length + 1}s`;
        
        // Create new arrays instead of mutating
        const newData = [...chartData.slice(1), newValue];
        const newLabels = [...chartLabels.slice(1), newLabel];
        
        // Update state
        setChartData(newData);
        setChartLabels(newLabels);
        
        // Directly update chart
        chartRef.current.data.datasets[0].data = newData;
        chartRef.current.data.labels = newLabels;
        chartRef.current.update();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chartData, chartLabels]);

  // Update currentTime every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Update offsets dynamically
  useEffect(() => {
    const offsetInterval = setInterval(() => {
      // Base values between 2-22ns
      setBpsOffset(Math.floor(2 + Math.random() * 20));
      setEloranOffset(Math.floor(2 + Math.random() * 20));
      
      // Different ranges per station
      if (bpsLocation.name === "WHUT-TV") {
        setBpsOffset(Math.floor(2 + Math.random() * 20));
      } else if (bpsLocation.name === "KWGN-TV") {
        setBpsOffset(Math.floor(10 + Math.random() * 15)); // 10-25ns
      } else {
        setBpsOffset(Math.floor(12 + Math.random() * 18)); // 12-30ns
      }
    }, 1000);
    
    return () => clearInterval(offsetInterval);
  }, [bpsLocation]);

  // Initialize Leaflet maps
  useEffect(() => {
    const initMaps = () => {
      const bpsContainer = document.getElementById("bps-map");
      if (bpsContainer && !bpsMapRef.current) {
        bpsMapRef.current = L.map("bps-map").setView(
          [bpsLocation.lat, bpsLocation.lng],
          bpsLocation.zoom
        );
        
        function getTileLayerByTheme(theme) {
          switch (theme) {
            case "power":
              return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
            case "finance":
              return "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
            case "normal":
              return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
            case "military":
            default:
              return "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
          }
        }
        
        L.tileLayer(getTileLayerByTheme(theme), {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(bpsMapRef.current);
        
        // Add markers for each BPS station
        Object.values(locations).forEach(location => {
          const isCurrent = location.name === bpsLocation.name;
          
          L.marker([location.lat, location.lng], {
            icon: L.divIcon({
              className: `bps-marker ${isCurrent ? 'active' : ''}`,
              html: `<div>${location.name}</div>`,
              iconSize: [30, 30]
            })
          })
          .bindPopup(`
            <strong>${location.name}</strong><br>
            ${location.street}<br>
            ${location.locality}<br>
            Typical offset: ${location.name === "WHUT-TV" ? "2-22ns" : 
                            location.name === "KWGN-TV" ? "10-25ns" : "12-30ns"}
          `)
          .addTo(bpsMapRef.current);
        });
        
        addBpsPolygonCoverage(bpsMapRef.current);
      }
    };
    initMaps();
    
    return () => {
      if (bpsMapRef.current) {
        bpsMapRef.current.remove();
        bpsMapRef.current = null;
      }
    };
  }, [theme, bpsLocation]);

  // Update the master clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const gmt = `${String(now.getUTCHours()).padStart(2, "0")}:${String(
        now.getUTCMinutes()
      ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")} GMT`;
      setMasterClock(gmt);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Theme persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setDarkMode(true);
  }, []);
  
  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Helper functions
  function addBpsPolygonCoverage(map) {
    fetch("/bpsStations.geojson")
      .then((response) => response.json())
      .then((geoData) => {
        L.geoJSON(geoData, {
          style: {
            color: "blue",
            fillColor: "rgba(0, 0, 255, 0.2)",
            fillOpacity: 0.4,
            weight: 1,
          },
          onEachFeature: (feature, layer) => {
            const stationName = feature.properties?.name || "BPS Station";
            layer.bindPopup(`BPS Station: ${stationName}`);
          },
        }).addTo(map);
      })
      .catch((err) => console.error("Error loading BPS GeoJSON:", err));
  }

  function changeLocation(locationKey, system) {
    const loc = locations[locationKey];
    if (!loc) return;

    if (system === "bps") {
      setBpsLocation(loc);
      if (bpsMapRef.current) {
        bpsMapRef.current.setView([loc.lat, loc.lng], loc.zoom);
      }
    }
  }

  function getSecondsSince(date) {
    if (!date) return 0;
    return Math.floor((currentTime - date) / 1000);
  }

  // Failover mode handlers
  function activateJammingMode() {
    setFailoverMode("jamming");
    setGpsUnsyncedTime(new Date());
  }
  
  function activateUnavailableMode() {
    setFailoverMode("unavailable");
    setGpsUnsyncedTime(new Date());
  }
  
  function restoreNormalMode() {
    setFailoverMode("normal");
    setGpsUnsyncedTime(null);
  }

  function handleScenario(type) {
    setScenario(type === "normal" ? null : type);
    if (type === "urban") activateJammingMode();
    else if (["underground", "solar", "military", "disaster"].includes(type)) activateUnavailableMode();
    else restoreNormalMode();
  }

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setTimeout(() => {
      if (bpsMapRef.current) bpsMapRef.current.invalidateSize();
      if (chartRef.current) chartRef.current.update();
    }, 100);
  };

  // Sector-Specific Panels
  const MilitaryPanel = () => (
    <div className="sector-panel military-panel">
      <div className="tactical-alerts">
        <h3>Tactical GPS Status</h3>
        <p>Threat Level: {failoverMode === "normal" ? "LOW" : "HIGH"}</p>
        <p>Zone: Active GPS Denial Watch</p>
        <div className="threat-indicators">
          <div className={`indicator ${failoverMode !== "normal" ? "alert" : ""}`}>
            Jamming Detection: {failoverMode !== "normal" ? "ACTIVE" : "CLEAR"}
          </div>
          <div className="communication-status">
            Encrypted Comms: {failoverMode === "normal" ? "SECURE" : "REROUTING"}
          </div>
        </div>
      </div>
    </div>
  );

  const PowerGridPanel = () => (
    <div className="sector-panel power-grid-panel">
      <div className="grid-diagnostics">
        <h3>Grid Synchronization</h3>
        <div className="sync-metrics">
          <p>Substation Drift: {failoverMode === "normal" ? "↓ 1.2ns" : "↑ Critical"}</p>
          <p>Blackout Risk: {failoverMode === "normal" ? "None" : "Elevated"}</p>
          <div className="power-status">
            <div className={`status-indicator ${failoverMode !== "normal" ? "warning" : "normal"}`}>
              Network Stability: {failoverMode === "normal" ? "STABLE" : "POTENTIAL DISRUPTION"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const FinancePanel = () => (
    <div className="sector-panel finance-panel">
      <div className="finance-info">
        <h3>Transaction Synchronization</h3>
        <div className="sync-details">
          <p>GPS-BPS Offset: {failoverMode === "normal" ? "0.9ns" : "CRITICAL"}</p>
          <p>Sync Confidence: {failoverMode === "normal" ? "99.9%" : "92.3%"}</p>
          <div className="transaction-risk">
            <div className={`risk-indicator ${failoverMode !== "normal" ? "high-risk" : "low-risk"}`}>
              Transaction Risk: {failoverMode !== "normal" ? "ELEVATED" : "LOW"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const StakeholderPanel = () => (
    <div className="sector-panel stakeholder-panel">
      <div className="simple-overview">
        <h3>System Status</h3>
        <p>Status: {failoverMode === "normal" ? "Operational" : "Failover Active"}</p>
        <p>Redundancy: {bpsSyncText}</p>
      </div>
    </div>
  );

  // Derived UI text based on failover mode
  let gpsSyncText = "ACTIVE";
  let gpsSyncColor = "green";
  let bpsSyncText = "ACTIVE";
  let bpsSyncColor = "green";
  let failoverAlertText = "";
  let showFailoverAlert = false;
  
  if (failoverMode === "jamming") {
    failoverAlertText = "⚠️ GPS Jamming Detected: Failover Mode Active";
    showFailoverAlert = true;
    const secondsUnsynced = getSecondsSince(gpsUnsyncedTime);
    gpsSyncText = `JAMMED (${secondsUnsynced}s ago)`;
    gpsSyncColor = "red";
    bpsSyncText = "ACTIVE (Failover)";
    bpsSyncColor = "green";
  } else if (failoverMode === "unavailable") {
    failoverAlertText = "⚠️ GPS Unavailable: BPS Taking Over";
    showFailoverAlert = true;
    const secondsUnsynced = getSecondsSince(gpsUnsyncedTime);
    gpsSyncText = `OFFLINE (${secondsUnsynced}s ago)`;
    gpsSyncColor = "red";
    bpsSyncText = "ACTIVE (Failover)";
    bpsSyncColor = "green";
  }

  return (
    <div className={`App ${darkMode ? "dark-mode" : ""} theme-${theme}`}>
      {/* Theme Switcher Buttons */}
      <div className="theme-switcher" style={{ marginBottom: "15px" }}>
        <button onClick={() => setTheme("military")}>🎖️ Military</button>
        <button onClick={() => setTheme("power")}>⚡ Power Grid</button>
        <button onClick={() => setTheme("finance")}>💰 Finance</button>
        <button onClick={() => setTheme("normal")}>👥 Normal</button>
      </div>

      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>
            {theme === "military" && " Military Command Dashboard"}
            {theme === "power" && " Power Grid Synchronization"}
            {theme === "finance" && " Financial Sync Control Center"}
            {theme === "normal" && " Standard Stakeholder Dashboard"}
          </h1>
          <p>
            {theme === "military" && "Optimized for tactical field operations."}
            {theme === "power" && "Monitoring grid-wide time synchronization and reliability."}
            {theme === "finance" && "Tracking time-critical transactions and network trust."}
            {theme === "normal" && "Real-time visualization for all stakeholders."}
          </p>
        </div>

        {/* Alerts */}
        {showFailoverAlert && (
          <div id="failover-alert" className="failover-alert">
            <p>{failoverAlertText}</p>
          </div>
        )}

        {scenario && (
          <div className="scenario-alert">
            <p>{scenarioAlerts[scenario]}</p>
          </div>
        )}

        {/* Main Card */}
        <div className="card">
          {theme === "military" && <MilitaryPanel />}
          {theme === "power" && <PowerGridPanel />}
          {theme === "finance" && <FinancePanel />}
          {theme === "normal" && <StakeholderPanel />}
          
          <div className="dashboard-row">
            {/* Master Clock Section */}
            <div className="master-clock">
              <p id="master-clock-time">{masterClock || "Loading..."}</p>
            </div>

            <div className="sync-details">
              <p>
                GPS:{" "}
                <span style={{ color: gpsSyncColor, fontWeight: "bold" }}>
                  {gpsSyncText}
                </span>
              </p>
              <p>
                BPS:{" "}
                <span style={{ color: bpsSyncColor, fontWeight: "bold" }}>
                  {bpsSyncText}
                </span>
                {"    Sync: "}
                <span 
                  className="clickable-sync"
                  onClick={() => setShowDelayGraph(!showDelayGraph)}
                >
                  {bpsOffset}ns
                </span>
              </p>
              <p>
                eLoran:{" "}
                <span className="status-active">ACTIVE</span>
                {"     Sync: "}
                <span 
                  className="clickable-sync"
                  onClick={() => setShowDelayGraph(!showDelayGraph)}
                >
                  {eloranOffset}ns
                </span>
              </p>
            </div>

            {/* Location Details Section */}
            <div className="location-details">
              <p>Locality: {bpsLocation.locality}</p>
              <p>Zip: {bpsLocation.zip}</p>
              <p>Street: {bpsLocation.street}</p>
            </div>
          </div>
          
          <div className="failover-readiness">
            <p></p>
            <span className={`readiness-bubble ${failoverMode === "normal" ? "stable" : "active"}`}>
              {failoverMode === "normal" ? "Stable" : "Failover Active"}
            </span>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className="tab large-tab" onClick={() => handleTabClick("bps")}>
              BPS
            </button>
          </div>

          {/* BPS Tab */}
          <div
            id="bps"
            className="tab-content"
            style={{ display: activeTab === "bps" ? "block" : "none" }}
          >
            <p>Country: {bpsLocation.country}</p>
            <p>Locality: {bpsLocation.locality}</p>
            <p>Zip: {bpsLocation.zip}</p>
            <p>Street: {bpsLocation.street}</p>

            <div className="map-controls">
              <button onClick={() => changeLocation("washingtonDC", "bps")}>
                {locations.washingtonDC.name}
              </button>
              <button onClick={() => changeLocation("colorado", "bps")}>
                {locations.colorado.name}
              </button>
              <button onClick={() => changeLocation("baltimore", "bps")}>
                {locations.baltimore.name}
              </button>
              <button onClick={() => changeLocation("lasVegas", "bps")}>
                {locations.lasVegas.name}
              </button>
              <button onClick={() => changeLocation("stationX", "bps")}>
                {locations.stationX.name}
              </button>
            </div>
            <div id="bps-map" style={{ width: "100%", height: "300px" }}></div>
          </div>

          {/* Delay Graph */}
          {showDelayGraph && (
            <div className="delay-card">
              <h2>DELAY ANALYSIS (LAST HOUR)</h2>
              <div className="chart-container" ref={chartContainerRef}>
                <canvas 
                  id="delayGraph"
                  width="400" 
                  height="400"
                ></canvas>
              </div>
            </div>
          )}

          {/* Failover Buttons */}
          <div className="failover-buttons">
            <button onClick={activateJammingMode}>🔴 Simulate GPS Jamming</button>
            <button onClick={activateUnavailableMode}>⚠️ Simulate GPS Unavailable</button>
          
            {/* Scenario Simulation Buttons */}
            <div className="failover-buttons scenario-buttons" style={{ marginTop: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <button onClick={() => handleScenario('urban')}>🏙️ Urban Canyon</button>
              <button onClick={() => handleScenario('underground')}>🚇 Underground Tunnel</button>
              <button onClick={() => handleScenario('solar')}>🌞 Solar Storm</button>
              <button onClick={() => handleScenario('military')}>🛡️ Military Denial</button>
              <button onClick={() => handleScenario('disaster')}>🌪️ Natural Disaster</button>
              <button onClick={() => handleScenario('normal')}>✅ Restore Normal Mode</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;