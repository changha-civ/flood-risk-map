import "./App.css";
import { useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;

function App() {
  const [keyword, setKeyword] = useState("");
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);

  const getRiskLevel = (score) => {
    if (score >= 70) return "위험";
    if (score >= 40) return "주의";
    return "낮음";
  };

  const getRiskClass = (level) => {
    if (level === "위험") return "danger";
    if (level === "주의") return "warning";
    return "safe";
  };

  const analyzeRisk = (data) => {
    const humidity = data.main.humidity;
    const wind = data.wind.speed;
    const rain = data.rain?.["1h"] || 0;
    const weatherMain = data.weather[0].main;

    let puddleScore = humidity * 0.35 + rain * 20;
    let sewerScore = humidity * 0.25 + rain * 25;

    if (weatherMain === "Rain") {
      puddleScore += 20;
      sewerScore += 25;
    }

    if (wind < 2) puddleScore += 10;

    const totalScore = Math.round((puddleScore + sewerScore) / 2);

    return {
      puddleScore: Math.min(Math.round(puddleScore), 100),
      sewerScore: Math.min(Math.round(sewerScore), 100),
      totalScore: Math.min(totalScore, 100),

      puddleLevel: getRiskLevel(puddleScore),
      sewerLevel: getRiskLevel(sewerScore),
      totalLevel: getRiskLevel(totalScore),

      rain,
      humidity,
      wind,
      temp: Math.round(data.main.temp),
      condition: data.weather[0].description,
    };
  };

  const searchLocation = async () => {
    if (!keyword.trim()) {
      alert("지역명을 입력해줘!");
      return;
    }

    setLoading(true);

    try {
      const kakaoRes = await axios.get(
        "https://dapi.kakao.com/v2/local/search/keyword.json",
        {
          params: { query: keyword },
          headers: {
            Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        }
      );

      if (!kakaoRes.data.documents.length) {
        alert("지역을 찾을 수 없어!");
        return;
      }

      const selected = kakaoRes.data.documents[0];
      setPlace(selected);

      const weatherRes = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            lat: selected.y,
            lon: selected.x,
            appid: OPENWEATHER_API_KEY,
            units: "metric",
            lang: "kr",
          },
        }
      );

      setWeather(weatherRes.data);
      setRisk(analyzeRisk(weatherRes.data));
    } catch (err) {
      console.error(err);
      alert("API 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const riskTrendData = useMemo(() => {
    const base = risk?.totalScore || 20;

    return [
      { time: "현재", score: base },
      { time: "1h", score: base + 5 },
      { time: "2h", score: base + 15 },
      { time: "3h", score: base + 10 },
      { time: "4h", score: base - 5 },
    ];
  }, [risk]);

  const factorData = useMemo(() => {
    if (!risk) return [];

    return [
      { name: "강수", value: risk.rain * 20 },
      { name: "습도", value: risk.humidity },
      { name: "풍속", value: Math.max(0, 40 - risk.wind * 10) },
      { name: "배수", value: risk.sewerScore },
    ];
  }, [risk]);

  const actionGuide = risk
    ? risk.totalLevel === "위험"
      ? [
          "저지대 이동 금지",
          "침수 지역 우회",
          "지하 공간 주의",
        ]
      : risk.totalLevel === "주의"
      ? [
          "우산 준비",
          "배수구 주변 주의",
          "저지대 조심",
        ]
      : [
          "현재 안정 상태",
          "기상 변화만 체크",
        ]
    : [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoBox">
          <div className="logoIcon">W</div>
          <div>
            <strong>Water Risk</strong>
            <span>Drainage System</span>
          </div>
        </div>

        <nav>
          <a href="#search">검색</a>
          <a href="#risk">위험도</a>
          <a href="#chart">그래프</a>
          <a href="#guide">가이드</a>
        </nav>

        <div className="sideNote">
          <span>API</span>
          <p>OpenWeather / Kakao</p>
        </div>
      </aside>

      <main className="content">
        <section className="topPanel" id="search">
          <div>
            <span className="eyebrow">Smart Monitoring</span>
            <h1>물웅덩이·역류 위험 분석 시스템</h1>
            <p>실시간 기상 기반 도시 배수 위험 분석</p>
          </div>

          <div className="searchPanel">
            <label>지역 입력</label>
            <div className="searchRow">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                placeholder="예: 서울 강남구"
              />
              <button onClick={searchLocation}>
                {loading ? "분석중" : "분석"}
              </button>
            </div>
          </div>
        </section>

        {!risk && (
          <section className="emptyState">
            <h2>지역을 입력하세요</h2>
            <p>기상 기반 위험 분석 시작</p>
          </section>
        )}

        {risk && (
          <>
            <section className="summaryGrid">
              <div className="summaryCard dark">
                <span>위치</span>
                <strong>{place.place_name}</strong>
              </div>

              <div className="summaryCard">
                <span>기온</span>
                <strong>{risk.temp}°C</strong>
              </div>

              <div className="summaryCard">
                <span>습도</span>
                <strong>{risk.humidity}%</strong>
              </div>

              <div className="summaryCard">
                <span>강수</span>
                <strong>{risk.rain}mm</strong>
              </div>
            </section>

            <section className="controlPanel">
              <div className={`totalRisk ${getRiskClass(risk.totalLevel)}`}>
                <span>종합 위험</span>
                <strong>{risk.totalLevel}</strong>
              </div>

              <div className="riskCards">
                <div className={`riskBox ${getRiskClass(risk.puddleLevel)}`}>
                  <h2>물웅덩이</h2>
                  <strong>{risk.puddleLevel}</strong>
                </div>

                <div className={`riskBox ${getRiskClass(risk.sewerLevel)}`}>
                  <h2>역류</h2>
                  <strong>{risk.sewerLevel}</strong>
                </div>
              </div>
            </section>

            <section className="chartSection">
              <div className="chartCard">
                <h2>위험 변화</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={riskTrendData}>
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area dataKey="score" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chartCard">
                <h2>요인 분석</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={factorData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="guideSection">
              <div className="guideCard">
                <h2>대응 가이드</h2>
                <ul>
                  {actionGuide.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}

        <footer>
          <p>Water Risk Project</p>
          <span>React + API</span>
        </footer>
      </main>
    </div>
  );
}

export default App;