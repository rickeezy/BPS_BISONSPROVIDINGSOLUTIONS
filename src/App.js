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
  const [easternClock, setEasternClock] = useState('');
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
    Array.from({ length: 3600 }, () => Math.floor(Math.random() * 100))
  );
  const formatTime = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  
  const now = new Date();
  const [chartLabels, setChartLabels] = useState(
    Array.from({ length: 3600 }, (_, i) => {
      const past = new Date(now.getTime() - (3600 - i) * 1000);
      return formatTime(past);
    })
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

  useEffect(() => {
    const ctx = document.getElementById('delayGraph');
    if (ctx && !chartRef.current) {
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Delay (ns)',
            data: chartData,
            borderColor: getThemeBorderColor(theme),
            backgroundColor: getThemeFillColor(theme),
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          scales: {
            y: {
              beginAtZero: false,
              grid: { color: 'rgba(74, 255, 160, 0.1)' },
              ticks: { color: 'var(--text-green)' }
            },
            x: {
              grid: { color: 'rgba(74, 255, 160, 0.1)' },
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)',
                autoSkip: true,
                maxTicksLimit: 10,
                callback: function (value, index) {
                  return index % 50 === 0 ? this.getLabelForValue(value) : '';
                }
              }
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
  
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (chartRef.current) {
        const newValue = Math.floor(10 + Math.random() * 90);
        const now = new Date();
        const newLabel = formatTime(now);
  
        const updatedData = [...chartRef.current.data.datasets[0].data, newValue].slice(-3600);
        const updatedLabels = [...chartRef.current.data.labels, newLabel].slice(-3600);
  
        chartRef.current.data.datasets[0].data = updatedData;
        chartRef.current.data.labels = updatedLabels;
        chartRef.current.update();
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data.datasets[0].borderColor = getThemeBorderColor(theme);
      chartRef.current.data.datasets[0].backgroundColor = getThemeFillColor(theme);
      chartRef.current.update();
    }
  }, [theme]);
  
  
  

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
        setBpsOffset(Math.floor(10 + Math.random() * 22)); // 10-25ns
      } else {
        setBpsOffset(Math.floor(12 + Math.random() * 25)); // 12-30ns
      }
    }, 500);
    
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
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright"></a> ',
        }).addTo(bpsMapRef.current);
        
        // Add markers for each BPS station
        Object.values(locations).forEach(location => {
          const isCurrent = location.name === bpsLocation.name;
          
          L.marker([location.lat, location.lng], {
            icon: L.divIcon({
              className: `bps-marker ${isCurrent ? 'active' : ''}`,
              html: `<div>${location.name}</div>`,
              iconSize: [20, 20]
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

      // GMT time string
      const gmt = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
        now.getUTCMinutes()
      ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')} GMT`;
      setMasterClock(gmt);

      // Eastern Time (ET) string
      const eastern = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/New_York',
      });
      setEasternClock(eastern);
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
  function getThemeBorderColor(theme) {
    switch (theme) {
      case "military": return "#4aff70";
      case "power": return "#00e5ff";
      case "finance": return "#d38217";
      case "normal": return "#1a1a1a";
      default: return "#4aff70";
    }
  }
  
  function getThemeFillColor(theme) {
    switch (theme) {
      case "military": return "rgba(74, 255, 160, 0.1)";
      case "power": return "rgba(0, 229, 255, 0.2)";
      case "finance": return "rgba(211, 130, 23, 0.2)";
      case "normal": return "rgba(0, 0, 0, 0.1)";
      default: return "rgba(74, 255, 160, 0.1)";
    }
  }
  function getChartColors(failoverMode) { 
  }
  
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
  else if (failoverMode === "normal") {
    failoverAlertText = "✅ GPS Operational: All Systems Normal";
    showFailoverAlert = false;
    gpsSyncText = "ACTIVE";
    gpsSyncColor = "green";
    bpsSyncText = "ACTIVE";
    bpsSyncColor = "green";
  }
  else if (failoverMode === "military") {
    failoverAlertText = "⚠️ Military Mode: Tactical Operations Active";
    showFailoverAlert = true;
    gpsSyncText = "ACTIVE (Military)";
    gpsSyncColor = "orange";
    bpsSyncText = "ACTIVE (Military)";
    bpsSyncColor = "orange";
  }
  else if (failoverMode === "Solar") {
    failoverAlertText = "⚠️ Solar Storm: GPS Signals Disrupted";
    showFailoverAlert = true;
    gpsSyncText = "DISRUPTED";
    gpsSyncColor = "yellow";
    bpsSyncText = "ACTIVE (Solar)";
    bpsSyncColor = "yellow";
  }
  else if (failoverMode === "disaster") {
    failoverAlertText = "⚠️ Natural Disaster: GPS Signals Unstable";
    showFailoverAlert = true;
    gpsSyncText = "UNSTABLE";
    gpsSyncColor = "orange";
    bpsSyncText = "ACTIVE (Disaster)";
    bpsSyncColor = "orange";
  }
  else if (failoverMode === "urban") {
    failoverAlertText = "⚠️ Urban Canyon: GPS Signals Weak";
    showFailoverAlert = true;
    gpsSyncText = "WEAK";
    gpsSyncColor = "orange";
    bpsSyncText = "ACTIVE (Urban)";
    bpsSyncColor = "orange";
  }
  else if (failoverMode === "underground") {
    failoverAlertText = "⚠️ Underground: GPS Signals Unavailable";
    showFailoverAlert = true;
    gpsSyncText = "UNAVAILABLE";
    gpsSyncColor = "red";
    bpsSyncText = "ACTIVE (Underground)";
    bpsSyncColor = "red";
  }
  
  // Sector-Specific Panels
  
  const MilitaryPanel = () => (
    <div className="sector-panel military-panel">
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
  );
  
  const PowerGridPanel = () => (
    <div className="sector-panel power-grid-panel">
      <div className="grid-diagnostics">
        <h3>Grid Synchronization</h3>
        <div className="sync-metrics">
          <p>
            Substation Drift:{" "}
            {failoverMode === "normal" ? "↓ 1.2ns" : "↑ Critical"}
          </p>
          <p>
            Blackout Risk: {failoverMode === "normal" ? "None" : "Elevated"}
          </p>
          <div className="power-status">
            <div
              className={`status-indicator ${
                failoverMode !== "normal" ? "warning" : "normal"
              }`}
            >
              Network Stability:{" "}
              {failoverMode === "normal"
                ? "STABLE"
                : "POTENTIAL DISRUPTION"}
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
          <p>
            GPS-BPS Offset:{" "}
            {failoverMode === "normal" ? "0.9ns" : "CRITICAL"}
          </p>
          <p>
            Sync Confidence:{" "}
            {failoverMode === "normal" ? "99.9%" : "92.3%"}
          </p>
          <div className="transaction-risk">
            <div
              className={`risk-indicator ${
                failoverMode !== "normal" ? "high-risk" : "low-risk"
              }`}
            >
              Transaction Risk:{" "}
              {failoverMode !== "normal" ? "ELEVATED" : "LOW"}
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
        <p>
          Status: {failoverMode === "normal" ? "Operational" : "Failover Active"}
        </p>
        <p>Redundancy: {bpsSyncText}</p>
        
        
      </div>
    </div>
  );
  
   
    
  

  return (

    
    <div className={`App ${darkMode ? "dark-mode" : ""} theme-${theme}`}>
      {/* Theme Switcher Buttons */}
      <div className="theme-switcher" style={{ marginBottom: "15px" }}>
        <button onClick={() => setTheme("military")}>Military</button>
        <button onClick={() => setTheme("power")}>Power Grid</button>
        <button onClick={() => setTheme("finance")}>Finance</button>
        <button onClick={() => setTheme("normal")}>Standard</button>
      </div>

      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>
            {theme === "military" && " Military Command Dashboard"}
            {theme === "power" && " Power Grid Synchronization"}
            {theme === "finance" && " Financial Sync Control Center"}
            {theme === "normal" && " Standard BPS Dashboard"}
          </h1>
          <p>
            {theme === "military" && "Optimized for tactical field operations."}
            {theme === "power" && "Monitoring grid-wide time synchronization and reliability."}
            {theme === "finance" && "Tracking time-critical transactions and network trust."}
            {theme === "normal" && "Real-time visualization for all."}
          </p>
        </div>



          
        {/* Top Status Block Wrapper */}
        <div className="top-status-center">

        <div className="delay-card">
          <h2>DELAY ANALYSIS (LAST HOUR)</h2>
          <div className="chart-container" ref={chartContainerRef}>
            <canvas id="delayGraph"></canvas>
          </div>
        </div>

         {/* LEFT COLUMN */}
         <div className="system-location">

         <div className="failover-readiness">

          
            
            <span
              className={`readiness-bubble ${failoverMode === "normal" ? "stable" : "active"} clickable-sync`}
              onClick={() => setShowDelayGraph(prev => !prev)}
              title="Click to toggle delay graph"
            >
              {failoverMode === "normal" ? "Stable" : "Failover Active"}
            </span>
          </div>

          <div className="system-metrics">
            <p>
              GPS: <span style={{ color: gpsSyncColor, fontWeight: "bold" }}>{gpsSyncText}</span>
            </p>
            <p>
              BPS: <span style={{ color: bpsSyncColor, fontWeight: "bold" }}>{bpsSyncText}</span>
              {" Sync: "}
              <span>{bpsOffset}ns</span>
            </p>
            <p>
            eLoran: <span style={{ color: "green" , fontWeight: "bold" }}>ACTIVE</span>
              {" Sync: "}
              <span>
                {eloranOffset}ns
              </span>
            </p>
          </div>


            
                    {/* LEFT COLUMN */}
        <div className="system-location">

            <div className="sync-label">

            {theme === "military" && <div className="sector-panel"><MilitaryPanel /></div>}
            {theme === "power" && <div className="sector-panel"><PowerGridPanel /></div>}
            {theme === "finance" && <div className="sector-panel"><FinancePanel /></div>}
            {theme === "normal" && <div className="sector-panel"><StakeholderPanel /></div>}


            <p><strong></strong></p>

            <div className="clock-row">
              <p><strong></strong></p>
              <p className="gmt-clock" id="eastern-clock">
                {easternClock || 'Loading...'}
              </p>
            </div>
            <div className="clock-row">
              <p><strong></strong></p>
              <p className="gmt-clock" id="master-clock-time">
                {masterClock || 'Loading...'}
              </p>
            </div>
                          
              <p><strong></strong></p>
              <strong>Convention Center</strong> 
              
              <p><strong>Las Vegas, NV, US</strong>
              <strong>89101</strong></p>
            </div>
          </div>
       

       

        </div>

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
        {/* RIGHT COLUMN */}
        <div className="sync-status-panel">
          

          

          
              </div>

        






          {/* BPS Tab */}
          <div
            id="bps"
            className="tab-content bps-tab-content"
            style={{ display: activeTab === "bps" ? "block" : "none" }}
          >

     
            <div className=" bps-tab-inner">

              

              {/* BPS Station Info */}
              <div className="station-details">
                <h2>BPS Station: {bpsLocation.name}</h2>
                <p>Locality: {bpsLocation.locality}</p>
                <p>Zip: {bpsLocation.zip}</p>
                <p>Street: {bpsLocation.street}</p>
              </div>
              

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

              <div id="bps-map" className="bps-map"></div>
            </div>
          </div>


          

          {/* Failover Buttons */}
          <div className="failover-buttons">
            <button onClick={activateJammingMode}>🔴 Simulate GPS Jamming</button>
            <button onClick={activateUnavailableMode}>⚠️ Simulate GPS Unavailable</button>
            <button onClick={() => handleScenario('normal')}>✅ Restore Normal Mode</button>
            <button onClick={() => handleScenario('urban')}> Urban Canyon</button>
            <button onClick={() => handleScenario('underground')}> Underground Tunnel</button>
            <button onClick={() => handleScenario('solar')}> Solar Storm</button>
            <button onClick={() => handleScenario('military')}> Military Denial</button>
            <button onClick={() => handleScenario('disaster')}> Natural Disaster</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
