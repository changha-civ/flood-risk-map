import "./App.css";
import { useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const OPENWEATHER_API_KEY =
  import.meta.env.VITE_OPENWEATHER_API_KEY;

const KAKAO_REST_API_KEY =
  import.meta.env.VITE_KAKAO_REST_API_KEY;

function App() {
  const [keyword, setKeyword] = useState("");
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);

  const chartData = [
    { time: "현재", risk: 20 },
    { time: "1시간 후", risk: 35 },
    { time: "2시간 후", risk: 48 },
    { time: "3시간 후", risk: 64 },
    { time: "4시간 후", risk: 52 },
  ];

  const getRiskLevel = (score) => {
    if (score >= 70) return "위험";
    if (score >= 40) return "주의";
    return "낮음";
  };

  const analyzeRisk = (data) => {
    const humidity = data.main.humidity;
    const wind = data.wind.speed;
    const rain = data.rain?.["1h"] || 0;
    const weatherMain = data.weather[0].main;

    let puddleScore = humidity * 0.35 + rain * 18;
    let sewerScore = humidity * 0.25 + rain * 22;

    if (weatherMain === "Rain") {
      puddleScore += 20;
      sewerScore += 25;
    }

    if (wind < 2) {
      puddleScore += 8;
    }

    puddleScore = Math.min(Math.round(puddleScore), 100);
    sewerScore = Math.min(Math.round(sewerScore), 100);

    return {
      puddleScore,
      sewerScore,
      puddleLevel: getRiskLevel(puddleScore),
      sewerLevel: getRiskLevel(sewerScore),
      rain,
      humidity,
      wind,
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
          params: {
            query: keyword,
          },
          headers: {
            Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
        }
      );

      if (kakaoRes.data.documents.length === 0) {
        alert(
          "지역을 찾을 수 없어. 예: 서울 강남구, 수원역, 부산 해운대"
        );
        setLoading(false);
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
    } catch (error) {
      console.error(error);

      alert(
        "API 연결 중 오류가 발생했어. API 키나 카카오 도메인 설정을 확인해줘."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <h1>물웅덩이 & 하수도 역류 위험 예측 시스템</h1>

        <p>
          지역 검색과 실시간 기상 데이터를 활용해 도시 배수 위험도를
          분석합니다.
        </p>

        <div className="search-box">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && searchLocation()
            }
            placeholder="지역 입력 예: 서울 강남구, 수원역, 부산 해운대"
          />

          <button onClick={searchLocation}>
            {loading ? "분석 중..." : "위험도 분석"}
          </button>
        </div>
      </header>

      {weather && risk && (
        <main className="dashboard">
          <section className="weather-card">
            <h2>검색 지역 정보</h2>

            <div className="weather-grid">
              <div>
                <span>📍 위치</span>
                <h3>{place.place_name}</h3>
              </div>

              <div>
                <span>🌡 기온</span>
                <h3>{Math.round(weather.main.temp)}°C</h3>
              </div>

              <div>
                <span>💧 습도</span>
                <h3>{weather.main.humidity}%</h3>
              </div>

              <div>
                <span>🌧 1시간 강수량</span>
                <h3>{risk.rain}mm</h3>
              </div>
            </div>
          </section>

          <section className="risk-section">
            <div className="risk-card puddle">
              <h2>물웅덩이 발생 위험</h2>

              <h1>{risk.puddleLevel}</h1>

              <p>위험 점수: {risk.puddleScore}점</p>

              <p>
                강수량, 습도, 풍속을 바탕으로 도로 표면에
                물이 고일 가능성을 분석했습니다.
              </p>
            </div>

            <div className="risk-card sewer">
              <h2>하수도 역류 위험</h2>

              <h1>{risk.sewerLevel}</h1>

              <p>위험 점수: {risk.sewerScore}점</p>

              <p>
                강수량과 배수 처리 부담을 기준으로 하수도
                역류 가능성을 예측했습니다.
              </p>
            </div>
          </section>

          <section className="chart-card">
            <h2>예상 위험도 변화 그래프</h2>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="time" />

                <YAxis domain={[0, 100]} />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="risk"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="info-card">
            <h2>분석 기준</h2>

            <div className="analysis-list">
              <div>✔ 실시간 기상 데이터 활용</div>
              <div>✔ 카카오 지역 검색 API 연동</div>
              <div>✔ 물웅덩이 발생 위험도 계산</div>
              <div>✔ 하수도 역류 위험도 계산</div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;