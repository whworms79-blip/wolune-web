"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSajuInput, chartUrl, type SajuInput } from "../lib/sajuInput";
import {
  getMoodEntry,
  saveMoodEntry,
  listMoodEntries,
  type MoodEntry,
} from "../lib/moodJournal";
import {
  LinkAccountCard,
  LinkInsightCard,
  shouldShowJournalCard,
  shouldShowInsightCard,
} from "../lib/LinkAccount";
import {
  fetchInsight,
  insightEntries,
  INSIGHT_THRESHOLD,
  type Insight,
} from "../lib/insight";
import { pad } from "../lib/time";
import { useConsent } from "../lib/ConsentGate";
import "./journal.css";

/* ---------- 아이콘 ---------- */
const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const MoonNav = Moon;
const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
const User = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);

function MoodFace({ level }: { level: number }) {
  const mouth = [
    "M9 16 Q12 13 15 16",
    "M9 15.4 Q12 14.2 15 15.4",
    "M9 15 H15",
    "M9 14 Q12 16.6 15 14",
    "M8.5 13.6 Q12 17.8 15.5 13.6",
  ][Math.max(1, Math.min(5, level)) - 1];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 10.5h.01M14.8 10.5h.01" />
      <path d={mouth} />
    </svg>
  );
}

/* ---------- 상수 ---------- */
/// 통찰 안내(1회)를 이미 봤는가 — 기기 로컬로 충분하다.
const INSIGHT_NOTICE_KEY = "wl_insight_notice_seen_v1";

const MOOD_LABEL = ["많이 가라앉음", "조금 가라앉음", "평온", "좋음", "아주 좋음"];
const MOOD_COLOR = ["#6e9bc9", "#8a86c4", "#c9b6f0", "#6fb98f", "#e8c06a"];
const EMOTION_TAGS = ["평온", "설렘", "불안", "지침", "감사", "피곤", "외로움", "벅참"];
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

interface Chart {
  daily_fortune?: {
    overall_score: number;
    tone_line: string;
    matched_field?: string;
    day_ganzhi?: string;
  };
}

function weatherOf(score: number): { label: string; desc: string } {
  if (score >= 65) return { label: "맑게 트이는 하루", desc: "마음이 가볍게 열리기 좋은 흐름이에요." };
  if (score >= 55) return { label: "잔잔히 맑은 하루", desc: "잔잔하게 마음을 고르기 좋은 흐름이에요." };
  if (score >= 45) return { label: "포근한 흐림", desc: "포근하게 머무르기 좋은 흐름이에요." };
  return { label: "고요한 흐림", desc: "마음을 안으로 쉬어주기 좋은 흐름이에요." };
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function headerDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${WEEKDAY[dt.getDay()]})`;
}
function weekKeys(todayKey: string): string[] {
  const [y, m, d] = todayKey.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // 이번 주 월요일
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return dateKey(x);
  });
}

export default function JournalPage() {
  const { requestConsent } = useConsent();
  const [status, setStatus] = useState<"loading" | "no-saju" | "ready">("loading");
  const [chart, setChart] = useState<Chart | null>(null);
  const [input, setInput] = useState<SajuInput | null>(null);
  const [today, setToday] = useState("");
  const [existed, setExisted] = useState(false);

  const [mood, setMood] = useState(0); // 0=미선택, 1~5
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  // 통찰은 엔진(POST /v1/insight)이 계산한다 → 비동기. 받기 전엔 잠긴 상태로 그린다.
  const [insight, setInsight] = useState<Insight | null>(null);
  // 통찰이 처음 열릴 때 "계산은 서버에서, 메모는 안 보냄"을 한 번만 알린다.
  const [notice, setNotice] = useState(false);
  const [showLinkCard, setShowLinkCard] = useState(false);
  const [showInsightLink, setShowInsightLink] = useState(false);

  useEffect(() => {
    const now = new Date();
    const t = dateKey(now);
    setToday(t);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let cancelled = false;

    (async () => {
      const inp = await loadSajuInput();
      if (cancelled) return;
      if (!inp) {
        clearTimeout(timer);
        setStatus("no-saju");
        return;
      }
      setInput(inp);

      const existing = await getMoodEntry(t);
      if (cancelled) return;
      if (existing) {
        setMood(existing.mood);
        setTags(existing.tags);
        setNote(existing.note);
        setExisted(true);
      }
      const list = await listMoodEntries();
      if (cancelled) return;
      setEntries(list);
      // 기록이 쌓였는데 아직 익명 → 계정 연결 유도 카드

      fetch(chartUrl(inp, { target_date: t }), { cache: "no-store", signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((c: Chart | null) => { if (!cancelled) setChart(c); })
        .catch(() => { if (!cancelled) setChart(null); })
        .finally(() => {
          clearTimeout(timer);
          if (!cancelled) setStatus("ready");
        });
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  function toggleTag(tag: string) {
    setSaved(false);
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  async function handleSave() {
    if (mood === 0) return;
    const df = chart?.daily_fortune;
    const entry: MoodEntry = {
      date: today,
      mood,
      tags,
      note: note.trim(),
      fortune: df
        ? { score: df.overall_score, toneLine: df.tone_line, matchedField: df.matched_field, dayGanzhi: df.day_ganzhi }
        : undefined,
      updatedAt: new Date().toISOString(),
    };
    // 새 데이터를 저장하는 시점 — 동의가 없으면 시트를 띄우고, 동의해야 저장한다.
    if (!(await requestConsent())) return;

    setExisted(true);
    setSaved(true);
    await saveMoodEntry(entry);
    const list = await listMoodEntries();
    setEntries(list);
  }

  // 통찰 — 기록이 바뀔 때마다(최초 로드·저장 후) 엔진에 다시 묻는다.
  // 임계 미만이면 fetchInsight 가 엔진을 부르지도 않는다(무드를 내보낼 이유가 없다).
  useEffect(() => {
    let alive = true;
    (async () => {
      const got = await fetchInsight(entries);
      if (!alive) return;
      setInsight(got);
      // 통찰이 처음 열리는 순간, 계산이 어디서 이뤄지는지 한 번만 담백하게 알린다.
      if (got.unlocked && localStorage.getItem(INSIGHT_NOTICE_KEY) !== "1") {
        localStorage.setItem(INSIGHT_NOTICE_KEY, "1");
        setNotice(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [entries]);

  // 계정 연결 유도 — 기록 수와 통찰 상태에 따라 어느 카드를 보일지 정한다.
  //   · 통찰이 열렸으면(③) 그쪽이 진짜 유도 → ②는 뜨지 않는다(중복 방지).
  //   · 익명이 아니거나 이미 "나중에"로 닫았으면 둘 다 뜨지 않는다.
  useEffect(() => {
    const unlockedNow = insight?.unlocked ?? false;
    setShowLinkCard(shouldShowJournalCard(entries.length, unlockedNow));
    setShowInsightLink(shouldShowInsightCard(unlockedNow));
  }, [entries, insight]);

  // ── 로딩 ──
  if (status === "loading") {
    return (
      <main className="screen">
        <div className="journal-state">
          <div className="loader" aria-hidden="true">
            <span className="loader__ring" />
            <span className="loader__mark"><Moon /></span>
          </div>
          <p className="wl-body-s wl-text-secondary">오늘의 기록을 준비하는 중…</p>
        </div>
      </main>
    );
  }

  // ── 저장된 사주 없음 ──
  if (status === "no-saju") {
    return (
      <main className="screen">
        <div className="journal-state">
          <span className="journal-state__mark" aria-hidden="true"><Notebook /></span>
          <h2 className="wl-title-m">먼저 사주를 확인해주세요</h2>
          <p className="wl-body wl-text-secondary">
            생년월일을 한 번 알려주시면, 매일의 감정을 그날의 사주 흐름과 함께 기록할 수 있어요.
          </p>
          <Link className="wl-btn wl-btn--primary journal-state__cta" href="/saju">
            내 사주 확인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  // ── 정상 ──
  const df = chart?.daily_fortune;
  const weather = df ? weatherOf(df.overall_score) : null;
  // 파라미터 없이 이동 — 결과 페이지가 Firestore 에서 읽는다(개인정보를 URL·기록에 안 남김).
  const resultHref = input ? "/saju/result" : "/saju";
  const entryMap = Object.fromEntries(entries.map((e) => [e.date, e]));
  const week = weekKeys(today);
  // 오늘까지 연속 기록 일수(streak) — 이미 불러온 entries로 계산.
  const streak = (() => {
    const dates = new Set(entries.map((e) => e.date));
    let n = 0;
    const d = new Date(`${today}T00:00:00`);
    if (today && !dates.has(today)) d.setDate(d.getDate() - 1);
    while (dates.has(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)) {
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  })();
  // 통찰 진척은 **연속일이 아니라 기록 수** 기준이다.
  // 통계가 필요로 하는 건 연속성이 아니라 표본 수이고, 하루 빠뜨렸다고 진척이 0으로
  // 돌아가는 건 무드저널에서 특히 가혹하다. streak 는 위에 '몇 일째 기록 중'으로 남긴다.
  const insightCount = insight?.count ?? insightEntries(entries).length;
  const insightNeeded = insight?.needed ?? INSIGHT_THRESHOLD;
  const insightRemaining = Math.max(0, insightNeeded - insightCount);
  const progress = Math.min(
    100,
    Math.round((Math.min(insightCount, insightNeeded) / insightNeeded) * 100),
  );
  const unlocked = insight?.unlocked ?? false;

  return (
    <main className="screen">
      <div className="screen__scroll">
        {/* 헤더 */}
        <header className="journal-head">
          <h1 className="wl-title-l">오늘의 기록</h1>
          <span className="wl-body-s wl-text-secondary">{headerDate(today)}</span>
        </header>

        <div className="wl-card-list">
          {/* 오늘의 감정 날씨 (그날 사주 흐름과 연결) */}
          <section className="wl-card wl-card--gold" aria-labelledby="weather-label">
            <span className="wl-section-label" id="weather-label">
              오늘의 감정 날씨{weather ? ` · ${weather.label}` : ""}
            </span>
            <div className="weather">
              <span className="weather__icon" aria-hidden="true"><MoodFace level={3} /></span>
              <p className="wl-body wl-text-secondary weather__text">
                {weather
                  ? `${weather.desc}${df?.tone_line ? ` ${df.tone_line}.` : ""}`
                  : "오늘의 사주 흐름은 잠시 후 다시 불러올게요. 기록은 지금도 남길 수 있어요."}
              </p>
            </div>
          </section>

          {/* 무드 기록 */}
          <section className="wl-card" aria-labelledby="mood-q">
            <h2 className="wl-title-m" id="mood-q">지금 기분은 어때요?</h2>

            <div className="mood-block">
              <div className="wl-mood-scale" role="radiogroup" aria-label="지금 기분">
                {[1, 2, 3, 4, 5].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    className={`wl-mood-scale__item${mood === lv ? " wl-mood-scale__item--selected" : ""}`}
                    role="radio"
                    aria-checked={mood === lv}
                    aria-label={MOOD_LABEL[lv - 1]}
                    onClick={() => { setMood(lv); setSaved(false); }}
                  >
                    <MoodFace level={lv} />
                  </button>
                ))}
              </div>
              <div className="mood-scale-ends">
                <span className="wl-micro wl-text-tertiary">가라앉음</span>
                <span className="wl-micro wl-text-tertiary">활기참</span>
              </div>
            </div>

            {/* 감정 태그 */}
            <div className="emotion-tags">
              {EMOTION_TAGS.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`wl-chip${on ? " wl-chip--selected" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* 메모 */}
            <div className="note-field">
              <textarea
                className="note-field__area"
                placeholder="오늘의 마음을 한 줄로 남겨보세요 (선택)"
                value={note}
                onChange={(e) => { setNote(e.target.value); setSaved(false); }}
                maxLength={300}
              />
            </div>

            {/* 저장 */}
            <div className="save-row">
              <button
                type="button"
                className="wl-btn wl-btn--primary"
                onClick={handleSave}
                disabled={mood === 0}
              >
                {existed ? "오늘 기록 수정하기" : "오늘 기록 저장하기"}
              </button>
              {mood === 0 && (
                <p className="save-hint wl-caption">먼저 지금 기분을 골라주세요</p>
              )}
            </div>

            {saved && (
              <div className="wl-reflection wl-reflection--feedback" style={{ marginTop: 16 }} aria-live="polite">
                오늘의 마음을 남겼어요{df ? " — 그날의 사주 흐름과 함께 차곡차곡 쌓여요." : "."}
              </div>
            )}
          </section>

          {/* 당신만의 패턴 (B3 개인화 통찰 — 계산은 엔진) */}
          <section
            className={`wl-card${unlocked ? " wl-card--lavender" : ""}`}
            aria-labelledby="pattern-label"
          >
            <div className="pattern__head">
              {/* ⚠ 제목은 패턴 유무와 무관하게 참이어야 한다. 예전엔 "당신만의 패턴"이라
                  단언해 놓고 본문에서 "아직 뚜렷한 패턴은 보이지 않아요"라고 말했다 —
                  10건 중 상당수가 그 상태다(엔진의 노이즈 검사 이후 더 늘었다).
                  10번의 기록은 답이 나오는 지점이 아니라 '보기 시작하는 지점'이다. */}
              <span className="wl-section-label" id="pattern-label">
                {unlocked ? "당신의 결 들여다보기" : "당신의 결을 모으는 중"}
              </span>
              <span className="wl-body-s wl-text-gold">
                {streak > 0 ? `${streak}일째 기록 중` : "오늘부터 시작해요"}
              </span>
            </div>

            {unlocked ? (
              <>
                <p className="wl-body">{insight!.headline}</p>
                {insight!.support && (
                  <p className="wl-body-s wl-text-tertiary pattern__support">
                    {insight!.support}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="wl-progress pattern__progress">
                  <div className="wl-progress__fill" style={{ width: `${progress}%` }} />
                </div>
                {/* "패턴이 보여요"는 지킬 수 없는 약속이다 — 안 보일 수도 있다.
                    약속하는 건 '나란히 볼 수 있게 된다'는 것뿐이다. */}
                <p className="wl-body-s wl-text-secondary">
                  {`${insightRemaining}번 더 기록하면, 마음과 기운을 나란히 볼 수 있어요.`}
                </p>
              </>
            )}

            {notice && (
              // 변명이 아니라 약속이다 — 담백하게 한 줄, 한 번만.
              <p className="wl-body-s wl-text-tertiary pattern__notice">
                패턴은 계산 서버에서 찾아요. 기분 점수만 보내고 적어두신 메모는 보내지
                않아요 — 저장도 하지 않고요.
              </p>
            )}

            <div className="week" role="img" aria-label="이번 주 기록">
              {week.map((key, i) => {
                const e = entryMap[key];
                const isToday = key === today;
                return (
                  <div key={key} className={`week__day${isToday ? " week__day--today" : ""}`}>
                    <span className="week__label">{WEEK_LABELS[i]}</span>
                    {e ? (
                      <span className="wl-mood-dot" style={{ background: MOOD_COLOR[e.mood - 1] }} />
                    ) : (
                      <span className="wl-mood-dot wl-mood-dot--empty" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ③ 통찰이 처음 열린 순간 — 이번 유도의 핵심.
              통찰 카드 바로 아래 이어 붙여 '축하의 연장선'처럼 읽히게 한다. */}
          {showInsightLink && (
            <LinkInsightCard onDone={() => setShowInsightLink(false)} />
          )}
        </div>

        {/* ② 기록이 쌓였을 때(7건~, 통찰 전) — 통찰이 열리면 뜨지 않는다 */}
        {showLinkCard && (
          <div className="section-gap">
            <LinkAccountCard
              days={entries.length}
              onDone={() => setShowLinkCard(false)}
            />
          </div>
        )}

        {/* 지난 기록 */}
        <div className="section-gap">
          <span className="wl-section-label journal__section-label">지난 기록</span>
          {entries.length === 0 ? (
            <div className="log-empty wl-body-s">
              아직 기록이 없어요. 오늘의 첫 기분을 남겨보세요.
            </div>
          ) : (
            <div className="log-list">
              {entries.map((e) => (
                <div className="log-item" key={e.date}>
                  <span className="log-item__mood" style={{ color: MOOD_COLOR[e.mood - 1] }} aria-hidden="true">
                    <MoodFace level={e.mood} />
                  </span>
                  <div className="log-item__body">
                    <div className="log-item__top">
                      <span className="wl-body-l log-item__date">
                        {headerDate(e.date)}{e.date === today ? " · 오늘" : ""}
                      </span>
                      {e.fortune && (
                        <span className="wl-caption wl-text-gold log-item__score">운세 {e.fortune.score}</span>
                      )}
                    </div>
                    {e.tags.length > 0 && (
                      <div className="log-item__tags">
                        {e.tags.map((t) => (
                          <span key={t} className="wl-chip wl-chip--info">{t}</span>
                        ))}
                      </div>
                    )}
                    {e.note && <p className="wl-body-s log-item__note">{e.note}</p>}
                    {e.fortune?.toneLine && (
                      <p className="wl-caption wl-text-tertiary">그날의 흐름 · {e.fortune.toneLine}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 4탭 */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <Link className="wl-bottom-nav__tab" href="/home"><MoonNav /><span>오늘</span></Link>
        <button className="wl-bottom-nav__tab wl-bottom-nav__tab--active" type="button" aria-current="page">
          <Notebook /><span>기록</span>
        </button>
        <Link className="wl-bottom-nav__tab" href={resultHref}><LayoutGrid /><span>사주</span></Link>
        <Link className="wl-bottom-nav__tab" href="/my"><User /><span>마이</span></Link>
      </nav>
    </main>
  );
}
