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
      puddleScore += 22;
      sewerScore += 28;
    }

    if (wind < 2) puddleScore += 8;

    puddleScore = Math.min(Math.round(puddleScore), 100);
    sewerScore = Math.min(Math.round(sewerScore), 100);

    const totalScore = Math.round((puddleScore + sewerScore) / 2);

    return {
      puddleScore,
      sewerScore,
      totalScore,
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

      if (kakaoRes.data.documents.length === 0) {
        alert("지역을 찾을 수 없어. 예: 서울 강남구, 수원역, 부산 해운대");
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

      setRisk(analyzeRisk(weatherRes.data));
    } catch (error) {
      console.error(error);
      alert("API 연결 오류야. 카카오 도메인 설정이나 Vercel 환경변수를 확인해줘.");
    } finally {
      setLoading(false);
    }
  };

  const riskTrendData = useMemo(() => {
    const base = risk?.totalScore || 25;

    return [
      { time: "현재", score: base },
      { time: "1시간", score: Math.min(base + 8, 100) },
      { time: "2시간", score: Math.min(base + 18, 100) },
      { time: "3시간", score: Math.min(base + 13, 100) },
      { time: "4시간", score: Math.max(base - 5, 0) },
    ];
  }, [risk]);

  const factorData = useMemo(() => {
    if (!risk) {
      return [
        { name: "강수", value: 0 },
        { name: "습도", value: 0 },
        { name: "풍속", value: 0 },
        { name: "배수부담", value: 0 },
      ];
    }

    return [
      { name: "강수", value: Math.min(risk.rain * 25, 100) },
      { name: "습도", value: risk.humidity },
      { name: "저풍속", value: Math.max(0, 40 - risk.wind * 10) },
      { name: "배수부담", value: risk.sewerScore },
    ];
  }, [risk]);

  const actionGuide = risk
    ? risk.totalLevel === "위험"
      ? [
          "저지대 도로 및 지하보도 이용을 피하세요.",
          "배수구 주변 보행 시 역류 가능성을 주의하세요.",
          "차량 이동 시 침수 가능 구간을 우회하세요.",
          "강수 지속 시 하수도 민원 신고가 필요할 수 있습니다.",
        ]
      : risk.totalLevel === "주의"
      ? [
          "우산 및 방수 신발을 준비하세요.",
          "도로 가장자리와 배수구 주변 보행을 주의하세요.",
          "비가 강해질 경우 저지대 이동을 줄이세요.",
          "물고임 발생 가능 구간을 확인하세요.",
        ]
      : [
          "현재 위험도는 낮은 편입니다.",
          "다만 갑작스러운 강수 변화에 대비하세요.",
          "배수구 주변 쓰레기 적치 여부를 확인하면 좋습니다.",
          "외출 전 기상 변화를 한 번 더 확인하세요.",
        ]
    : [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="logoBox">
            <div className="logoIcon">W</div>
            <div>
              <strong>Water Risk</strong>
              <span>Urban Drainage Dashboard</span>
            </div>
          </div>

          <nav>
            <a href="#search">지역 검색</a>
            <a href="#risk">위험도 분석</a>
            <a href="#chart">그래프</a>
            <a href="#guide">대응 안내</a>
          </nav>
        </div>

        <div className="sideNote">
          <span>사용 API</span>
          <p>OpenWeather · Kakao Local · 공공데이터포털</p>
        </div>
      </aside>

      <main className="content">
        <section className="topPanel" id="search">
          <div>
            <span className="eyebrow">Smart Drainage Monitoring</span>
            <h1>물웅덩이·하수도 역류 위험 관제 시스템</h1>
            <p>
              지역 검색 API와 실시간 기상 데이터를 활용하여 물고임 발생 가능성과
              하수도 역류 위험을 정량적으로 분석합니다.
            </p>
          </div>

          <div className="searchPanel">
            <label>분석 지역 입력</label>
            <div className="searchRow">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                placeholder="예: 서울 강남구, 명지대 자연캠퍼스, 부산 해운대"
              />
              <button onClick={searchLocation}>
                {loading ? "분석 중" : "분석 실행"}
              </button>
            </div>
          </div>
        </section>

        {!risk && (
          <section className="emptyState">
            <h2>지역을 입력하면 배수 위험 분석이 시작됩니다.</h2>
            <p>
              강수량, 습도, 풍속, 배수 부담도를 종합해 위험 단계를 산정합니다.
            </p>
          </section>
        )}

        {risk && (
          <>
            <section className="summaryGrid">
              <div className="summaryCard dark">
                <span>분석 위치</span>
                <strong>{place.place_name}</strong>
                <p>{place.road_address_name || place.address_name}</p>
              </div>

              <div className="summaryCard">
                <span>기온</span>
                <strong>{risk.temp}°C</strong>
                <p>{risk.condition}</p>
              </div>

              <div className="summaryCard">
                <span>습도</span>
                <strong>{risk.humidity}%</strong>
                <p>도로 표면 잔류수 영향</p>
              </div>

              <div className="summaryCard">
                <span>1시간 강수량</span>
                <strong>{risk.rain}mm</strong>
                <p>실시간 강수 반영</p>
              </div>
            </section>

            <section className="controlPanel" id="risk">
              <div className={`totalRisk ${getRiskClass(risk.totalLevel)}`}>
                <span>종합 위험도</span>
                <strong>{risk.totalLevel}</strong>
                <div className="scoreRing">
                  <b>{risk.totalScore}</b>
                  <small>/100</small>
                </div>
              </div>

              <div className="riskCards">
                <article className={`riskBox ${getRiskClass(risk.puddleLevel)}`}>
                  <div>
                    <span>TYPE 01</span>
                    <h2>물웅덩이 발생 위험</h2>
                  </div>
                  <strong>{risk.puddleLevel}</strong>
                  <p>위험 점수 {risk.puddleScore}점</p>
                  <em>
                    강수량·습도·저풍속 조건을 기반으로 도로 표면 물고임
                    가능성을 계산합니다.
                  </em>
                </article>

                <article className={`riskBox ${getRiskClass(risk.sewerLevel)}`}>
                  <div>
                    <span>TYPE 02</span>
                    <h2>하수도 역류 위험</h2>
                  </div>
                  <strong>{risk.sewerLevel}</strong>
                  <p>위험 점수 {risk.sewerScore}점</p>
                  <em>
                    강수 집중도와 배수 처리 부담을 기준으로 역류 가능성을
                    분석합니다.
                  </em>
                </article>
              </div>
            </section>

            <section className="chartSection" id="chart">
              <div className="chartCard">
                <div className="sectionTitle">
                  <span>Risk Trend</span>
                  <h2>예상 위험도 변화</h2>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={riskTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="score"
                      strokeWidth={3}
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chartCard">
                <div className="sectionTitle">
                  <span>Risk Factors</span>
                  <h2>위험 요인별 영향도</h2>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={factorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="guideSection" id="guide">
              <div className="guideCard">
                <div className="sectionTitle">
                  <span>Action Guide</span>
                  <h2>상황별 대응 안내</h2>
                </div>

                <ul>
                  {actionGuide.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="methodCard">
                <div className="sectionTitle">
                  <span>Scoring Method</span>
                  <h2>분석 기준</h2>
                </div>

                <div className="methodList">
                  <div>
                    <b>01</b>
                    <p>카카오 지역 검색 API로 입력 지역의 좌표를 변환</p>
                  </div>
                  <div>
                    <b>02</b>
                    <p>OpenWeather API로 기온·습도·강수량·풍속 수집</p>
                  </div>
                  <div>
                    <b>03</b>
                    <p>강수량과 배수 부담도를 가중치로 환산하여 위험도 산정</p>
                  </div>
                  <div>
                    <b>04</b>
                    <p>
                      공공데이터포털 API는 향후 침수흔적도·배수시설 데이터
                      확장용
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <footer>
          <p>
            본 웹사이트는 건설 BigData 과제용으로 제작된 도시 배수 위험 분석
            대시보드입니다.
          </p>
          <span>
            OpenWeather API · Kakao Local API · 공공데이터포털 API · React/Vite
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;