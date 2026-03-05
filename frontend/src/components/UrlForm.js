import { useState, useRef } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import html2pdf from "html2pdf.js";
import "../index.css";

function UrlForm() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [loading, setLoading] = useState(false);

  const [results1, setResults1] = useState(null);
  const [results2, setResults2] = useState(null);

  const reportRef = useRef();

  const fetchAuditData = async (rawUrl) => {
    let formattedUrl = rawUrl.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    const apiUrl = `https://AmnaMuzzammil.pythonanywhere.com/api/audit?url=${encodeURIComponent(formattedUrl)}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    const lighthouse = data.lighthouseResult.categories;
    const audits = data.lighthouseResult.audits;

    let screenshot = null;
    if (audits["final-screenshot"] && audits["final-screenshot"].details) {
      screenshot = audits["final-screenshot"].details.data;
    }

    const seoScore =
      lighthouse.seo?.score !== undefined
        ? Math.round(lighthouse.seo.score * 100)
        : null;
    const performanceScore =
      lighthouse.performance?.score !== undefined
        ? Math.round(lighthouse.performance.score * 100)
        : null;
    const accessibilityScore =
      lighthouse.accessibility?.score !== undefined
        ? Math.round(lighthouse.accessibility.score * 100)
        : null;
    const bestPracticesScore =
      lighthouse["best-practices"]?.score !== undefined
        ? Math.round(lighthouse["best-practices"].score * 100)
        : null;

    const uiuxScore =
      accessibilityScore !== null || bestPracticesScore !== null
        ? Math.round(
            ((accessibilityScore ?? 0) + (bestPracticesScore ?? 0)) / 2,
          )
        : null;
    const totalScore =
      seoScore !== null || performanceScore !== null || uiuxScore !== null
        ? Math.round(
            (seoScore ?? 0) * 0.4 +
              (performanceScore ?? 0) * 0.3 +
              (uiuxScore ?? 0) * 0.3,
          )
        : null;

    let insights = [];
    if (audits) {
      insights = Object.values(audits)
        .filter(
          (audit) =>
            audit.score !== null &&
            audit.score < 0.9 &&
            audit.details &&
            audit.details.type !== "opportunity",
        )
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map((audit) => audit.title);
    }

    return {
      url: formattedUrl,
      scores: { seoScore, performanceScore, uiuxScore, totalScore },
      screenshot,
      insights,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url1) {
      alert("Please enter a Main Website URL");
      return;
    }

    setLoading(true);
    setResults1(null);
    setResults2(null);

    try {
      const promises = [fetchAuditData(url1)];
      if (url2) promises.push(fetchAuditData(url2));

      const results = await Promise.allSettled(promises);

      if (results[0].status === "fulfilled") {
        setResults1(results[0].value);
      } else {
        alert(`Failed to audit ${url1}. Is your Python backend running?`);
      }

      if (url2 && results[1].status === "fulfilled") {
        setResults2(results[1].value);
      }
    } catch (error) {
      console.error("Critical error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 0.5,
      filename: url2
        ? `Battle_Report_${url1.replace(/^https?:\/\//, "")}_vs_${url2.replace(/^https?:\/\//, "")}.pdf`
        : `Audit_Report_${url1.replace(/^https?:\/\//, "")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: url2 ? "landscape" : "portrait",
      },
    };
    html2pdf().set(opt).from(element).save();
  };

  // 🔥 UPDATED: Dark Mode Glowing Gauges
  const CircularScore = ({ score, title }) => {
    if (score === null) return null;
    const pathColor =
      score >= 90 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
      <div className="gauge-item">
        <CircularProgressbar
          value={score}
          text={`${score}`}
          styles={buildStyles({
            pathColor: pathColor,
            textColor: "#ffffff", // Crisp white text for dark mode
            trailColor: "rgba(255,255,255,0.05)", // Dark glass trail
            textSize: "26px",
          })}
        />
        <p className="gauge-title">{title}</p>
      </div>
    );
  };

  const ResultColumn = ({ data, isCompetitor }) => {
    if (!data) return null;
    const scoreColor =
      data.scores.totalScore >= 80
        ? "#10b981"
        : data.scores.totalScore >= 50
          ? "#f59e0b"
          : "#ef4444";

    return (
      <div className={`result-col ${isCompetitor ? "col-comp" : "col-main"}`}>
        <h3 className="col-title">
          {isCompetitor ? "Competitor" : "Main Website"}
        </h3>
        <p className="col-url">{data.url.replace(/^https?:\/\//, "")}</p>

        {data.screenshot && (
          <div className="screenshot-box">
            <img
              src={data.screenshot}
              alt="Screenshot"
              className="screenshot-img"
              crossOrigin="anonymous"
            />
          </div>
        )}

        <div className="gauges-row">
          <CircularScore score={data.scores.seoScore} title="SEO" />
          <CircularScore score={data.scores.performanceScore} title="Perf." />
          <CircularScore score={data.scores.uiuxScore} title="UI/UX" />
        </div>

        <div className="health-card">
          <h4 className="health-title">Total Health Score</h4>
          <h2 className="health-score" style={{ color: scoreColor }}>
            {data.scores.totalScore}
          </h2>
        </div>

        {data.insights.length > 0 && (
          <div className="insights-box">
            <h5 className="insights-title">⚠️ Top Issues to Fix:</h5>
            <ul className="insights-list">
              {data.insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <h1 className="main-title">Website Auditor Pro</h1>
      <p className="sub-title">Advanced Performance & UX/UI Analysis</p>

      <form onSubmit={handleSubmit} className="form-container">
        <input
          type="text"
          className="input-field"
          placeholder="Main Website (e.g., apple.com)"
          value={url1}
          onChange={(e) => setUrl1(e.target.value)}
        />
        <input
          type="text"
          className="input-field"
          placeholder="Competitor Website (Optional)"
          value={url2}
          onChange={(e) => setUrl2(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Initializing Engines..." : "Run Audit"}
        </button>
      </form>

      {loading && (
        <p className="loading-text">Scanning architecture... (10-20 seconds)</p>
      )}

      {results1 && (
        <div className="report-wrapper">
          <button onClick={handleDownloadPDF} className="btn-secondary">
            📄 Download PDF Report
          </button>

          <div ref={reportRef} className="report-canvas">
            <h2 className="report-header">
              {results2 ? "Competitor Battle Report" : "Website Audit Report"}
            </h2>

            <div className="battle-row">
              <ResultColumn data={results1} isCompetitor={false} />
              {results2 && <ResultColumn data={results2} isCompetitor={true} />}
            </div>

            <p className="report-footer">
              © 2026 Amna Muzzammil. All Rights Reserved.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default UrlForm;
