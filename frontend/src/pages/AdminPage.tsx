import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteStudent,
  fetchSummary,
  listStudents,
  redeemStudent,
  updateStamps,
  type OfficeError,
  type OfficeStudent,
  type Summary,
} from "../api";
import { TelegramIcon } from "../components/TelegramIcon";
import { telegramWords } from "../data/telegram";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const STAMPS = [
  ["spot1", "化学実験場"],
  ["spot2", "五高喫茶"],
  ["spot3", "五高記念館"],
] as const;

type RosterFilter = "all" | "waiting" | "redeemed";

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: string; size: string; text: string; width: number },
      ) => void;
    };
  };
};

function googleIdentity(): GoogleIdentity | null {
  return (window as Window & { google?: GoogleIdentity }).google ?? null;
}

function officeMessage(error: OfficeError): string {
  if (error === "unauthorized") return "ログインし直してください";
  if (error === "missing") return "記録が見つかりません";
  if (error === "no_token") return "引換コードが発行されていません";
  if (error === "invalid") return "入力を確認してください";
  if (error === "unavailable") return "運営管理の準備ができていません";
  return "通信が必要です";
}

function rowKey(student: OfficeStudent): string {
  return `${student.nickname}\n${student.telegramCode}`;
}

function registeredAt(createdAt: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
}

function clockAt(time: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);
}

function emailFromToken(token: string): string {
  try {
    const part = token.split(".")[1];
    if (!part) return "";
    const json = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { email?: unknown };
    return typeof json.email === "string" ? json.email : "";
  } catch {
    return "";
  }
}

function fold(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/ー/g, "う")
    .toLocaleLowerCase("ja");
}

function wordsOf(student: OfficeStudent): string[] | null {
  return telegramWords(student.telegramCode);
}

function deskWord(word: string): string {
  return word === "喫茶の給仕" ? "喫茶給仕" : word;
}

function deskLabel(student: OfficeStudent): string {
  const words = wordsOf(student);
  if (!words) return student.telegramCode;
  return words.map(deskWord).join("・");
}

function DeskWords({ student }: { student: OfficeStudent }) {
  const words = wordsOf(student);
  if (!words) return student.telegramCode;
  return (
    <span className="admin-telegram">
      {words.map((word) => (
        <span key={word} className="admin-telegram__item">
          <TelegramIcon word={word} />
          <span>{deskWord(word)}</span>
        </span>
      ))}
    </span>
  );
}

function stampCount(student: OfficeStudent): number {
  const done = new Set(student.stamps);
  return STAMPS.filter(([id]) => done.has(id)).length;
}

function matches(student: OfficeStudent, query: string): boolean {
  if (!query) return true;
  const needle = fold(query);
  const words = wordsOf(student) ?? [];
  const haystack = [student.nickname, student.telegramCode, ...words, ...words.map(deskWord)].map(fold);
  return haystack.some((item) => item.includes(needle));
}

function passesFilter(student: OfficeStudent, roster: RosterFilter): boolean {
  if (roster === "waiting") return waitingForPrize(student);
  if (roster === "redeemed") return student.redeemed;
  return true;
}

function waitingForPrize(student: OfficeStudent): boolean {
  return stampCount(student) === 3 && !student.redeemed;
}

function PrizeStatus({ student }: { student: OfficeStudent }) {
  if (student.redeemed) return <span className="admin-badge admin-badge--done">受取済</span>;
  if (waitingForPrize(student)) return <span className="admin-badge admin-badge--wait">引換待ち</span>;
  return <span className="admin-badge">未達成</span>;
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

function EditButton({
  expanded,
  disabled,
  onClick,
}: {
  expanded: boolean;
  disabled: boolean;
  onClick: (button: HTMLButtonElement) => void;
}) {
  return (
    <button
      className="admin-menu-button"
      type="button"
      aria-label="編集"
      aria-haspopup="menu"
      aria-expanded={expanded}
      disabled={disabled}
      onClick={(event) => onClick(event.currentTarget)}
    >
      <svg className="admin-mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
        <path d="M13.5 6.5l3 3" />
      </svg>
    </button>
  );
}

function StampDots({ student }: { student: OfficeStudent }) {
  const done = new Set(student.stamps);
  const count = stampCount(student);
  return (
    <span className="admin-dots" aria-label={`印 ${count}/3`}>
      {STAMPS.map(([id, label]) => (
        <span
          key={id}
          className={done.has(id) ? `admin-dot is-on is-${id}` : "admin-dot"}
          title={`${label} ${done.has(id) ? "済" : "未"}`}
        />
      ))}
      <span>{count}/3</span>
    </span>
  );
}

type DeskDialog =
  | { kind: "delete"; student: OfficeStudent }
  | { kind: "redeem"; student: OfficeStudent }
  | { kind: "stamps"; student: OfficeStudent };

type MenuState = {
  key: string;
  student: OfficeStudent;
  top: number;
  right: number;
};

export function AdminPage() {
  const [idToken, setIdToken] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [students, setStudents] = useState<OfficeStudent[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeOk, setNoticeOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [roster, setRoster] = useState<RosterFilter>("all");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingKey, setPendingKey] = useState("");
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DeskDialog | null>(null);
  const [stampDraft, setStampDraft] = useState<string[]>([]);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!CLIENT_ID || idToken) return;
    let cancelled = false;
    const render = () => {
      const google = googleIdentity();
      const parent = buttonRef.current;
      if (cancelled || !google || !parent) return;
      parent.replaceChildren();
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          setLoading(true);
          setNotice("");
          setIdToken(response.credential);
        },
      });
      google.accounts.id.renderButton(parent, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 280,
      });
    };
    const google = googleIdentity();
    if (google) {
      render();
      return () => {
        cancelled = true;
      };
    }
    const src = "https://accounts.google.com/gsi/client";
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", render);
    if (!existing) document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.removeEventListener("load", render);
    };
  }, [idToken]);

  useEffect(() => {
    if (!idToken) return;
    let cancelled = false;
    void (async () => {
      const [summaryResult, listResult] = await Promise.all([
        fetchSummary(idToken),
        listStudents(idToken),
      ]);
      if (cancelled) return;
      setLoading(false);
      const error = !summaryResult.ok
        ? summaryResult.error
        : !listResult.ok
          ? listResult.error
          : null;
      if (error) {
        setSummary(null);
        setStudents(null);
        if (error === "unauthorized") setIdToken("");
        setNoticeOk(false);
        setNotice(officeMessage(error));
        return;
      }
      if (!summaryResult.ok || !listResult.ok) return;
      setSummary(summaryResult.summary);
      setStudents(listResult.students);
      setTruncated(listResult.truncated);
      setUpdatedAt(Date.now());
    })();
    return () => {
      cancelled = true;
    };
  }, [idToken, reloadKey]);

  useEffect(() => {
    if (!idToken) return;
    const onKey = (event: KeyboardEvent) => {
      if (dialog || menu) {
        if (event.key === "Escape" && menu && !dialog) setMenu(null);
        return;
      }
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const command = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (command) {
        event.preventDefault();
        filterRef.current?.focus();
        return;
      }
      if (!typing && event.key === "/" && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        filterRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idToken, dialog, menu]);

  useEffect(() => {
    if (!dialog) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingKey) setDialog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, pendingKey]);

  const shown = useMemo(() => {
    const query = filter.trim();
    return (students ?? []).filter(
      (student) => passesFilter(student, roster) && matches(student, query),
    );
  }, [students, filter, roster]);

  const finished = useMemo(
    () => (students ?? []).filter((student) => stampCount(student) === 3).length,
    [students],
  );

  const rosterCounts = useMemo(() => {
    const list = students ?? [];
    return {
      all: list.length,
      waiting: list.filter((student) => waitingForPrize(student)).length,
      redeemed: list.filter((student) => student.redeemed).length,
    };
  }, [students]);

  const logout = () => {
    setIdToken("");
    setSummary(null);
    setStudents(null);
    setTruncated(false);
    setFilter("");
    setRoster("all");
    setNotice("");
    setNoticeOk(false);
    setMenu(null);
    setDialog(null);
    setUpdatedAt(null);
  };

  const refresh = () => {
    setLoading(true);
    setNotice("");
    setNoticeOk(false);
    setReloadKey((value) => value + 1);
  };

  const finishOffice = (error: OfficeError) => {
    setPendingKey("");
    setNoticeOk(false);
    if (error === "unauthorized") {
      setIdToken("");
      setDialog(null);
      setMenu(null);
    }
    setNotice(officeMessage(error));
  };

  const reloadAfter = (message: string) => {
    setPendingKey("");
    setDialog(null);
    setMenu(null);
    setLoading(true);
    setNoticeOk(true);
    setNotice(message);
    setReloadKey((value) => value + 1);
  };

  const openMenu = (student: OfficeStudent, button: HTMLButtonElement) => {
    const key = rowKey(student);
    if (menu?.key === key) {
      setMenu(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    setMenu({
      key,
      student,
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const openStamps = (student: OfficeStudent) => {
    setMenu(null);
    setStampDraft(student.stamps);
    setDialog({ kind: "stamps", student });
  };

  const saveStamps = async () => {
    if (!dialog || dialog.kind !== "stamps") return;
    const stamps = STAMPS.map(([id]) => id).filter((id) => stampDraft.includes(id));
    setPendingKey(rowKey(dialog.student));
    const result = await updateStamps(
      idToken,
      dialog.student.nickname,
      dialog.student.telegramCode,
      stamps,
    );
    if (!result.ok) {
      finishOffice(result.error);
      return;
    }
    reloadAfter("印を更新しました");
  };

  const confirmDelete = async () => {
    if (!dialog || dialog.kind !== "delete") return;
    setPendingKey(rowKey(dialog.student));
    const result = await deleteStudent(idToken, dialog.student.nickname, dialog.student.telegramCode);
    if (!result.ok) {
      finishOffice(result.error);
      return;
    }
    reloadAfter("削除しました");
  };

  const confirmRedeem = async () => {
    if (!dialog || dialog.kind !== "redeem") return;
    setPendingKey(rowKey(dialog.student));
    const result = await redeemStudent(idToken, dialog.student.nickname, dialog.student.telegramCode);
    if (!result.ok) {
      finishOffice(result.error);
      return;
    }
    reloadAfter("引換済みにしました");
  };

  if (!idToken) {
    return (
      <div className="admin-login">
        <h1>
          <span className="admin-brand">五高の囁き</span> 運営管理
        </h1>
        <p className="admin-kicker">（関係者専用・事務室）</p>
        {notice && <p className="err">{notice}</p>}
        {CLIENT_ID ? <div ref={buttonRef} /> : <p className="err">運営管理の設定がありません</p>}
      </div>
    );
  }

  const lowStock =
    summary !== null &&
    (summary.remaining <= 20 || (summary.limit > 0 && summary.remaining / summary.limit <= 0.1));
  const pendingIssue = summary ? Math.max(0, summary.issued - summary.redeemed) : 0;
  const used = summary && summary.limit > 0 ? Math.min(100, (summary.issued / summary.limit) * 100) : 0;
  const mail = emailFromToken(idToken);

  return (
    <div className="admin-dash">
      <header className="admin-bar">
        <div className="admin-bar__title">
          <h1>
            <span className="admin-brand">五高の囁き</span> 運営管理
          </h1>
          <p className="admin-kicker">（関係者専用・事務室）</p>
        </div>
        <div className="admin-bar__meta">
          <span className="admin-status">
            <span className="admin-live" aria-hidden="true" />
            {updatedAt ? "稼働中" : "読み込み中"}
          </span>
          <span className="admin-updated">{updatedAt ? `最終更新 ${clockAt(updatedAt)}` : "取得しています"}</span>
          <button className="admin-refresh" type="button" onClick={refresh} disabled={loading} aria-label="更新">
            <svg className="admin-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.2-5.6" />
              <path d="M20 4.5V9h-4.5" />
            </svg>
          </button>
          {mail && (
            <span className="admin-mail" role="img" title={mail} aria-label={mail}>
              <svg className="admin-mark" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5.6 19.2c1.1-3.1 3.3-4.6 6.4-4.6s5.3 1.5 6.4 4.6" />
              </svg>
            </span>
          )}
          <button className="admin-logout" type="button" onClick={logout}>
            ログアウト
          </button>
        </div>
      </header>
      {notice && <p className={noticeOk ? "admin-done" : "err"}>{notice}</p>}
      {lowStock && <p className="admin-alert">景品の残数が少なくなっています。</p>}
      {summary && (
        <section className="admin-metrics" aria-label="景品・配布進捗">
          <h2>景品・配布進捗</h2>
          <div className="admin-metrics__grid">
            <article className={lowStock ? "admin-metric--remain admin-metric--low" : "admin-metric--remain"}>
              <span>景品残数</span>
              <strong>{summary.remaining}</strong>
              <small>
                / {summary.limit} 個 · 消化率 {percent(summary.issued, summary.limit)}
              </small>
              <div className="admin-bar-meter" aria-hidden="true">
                <span style={{ width: `${used}%` }} />
              </div>
            </article>
            <article>
              <span>配布上限</span>
              <strong>{summary.limit}</strong>
              <small>個 · 設定値</small>
            </article>
            <article>
              <span>引換チケット発行</span>
              <strong>{summary.issued}</strong>
              <small>件 · 未受取 {pendingIssue} 名</small>
            </article>
            <article>
              <span>窓口受取済</span>
              <strong>{summary.redeemed}</strong>
              <small>件 · 消込率 {percent(summary.redeemed, summary.issued)}</small>
            </article>
            <article>
              <span>総参加者</span>
              <strong>{students?.length ?? 0}</strong>
              <small>
                名 · 完走 {percent(finished, students?.length ?? 0)}
                {truncated ? "（表示分）" : ""}
              </small>
            </article>
          </div>
        </section>
      )}
      <section className="admin-roster" aria-label="参加者照会">
        <h2>参加者照会</h2>
        <div className="admin-search">
          <input
            ref={filterRef}
            aria-label="ニックネーム・符丁で絞り込む"
            placeholder="ニックネーム・符丁（例: けい、朝凪、書庫）で絞り込み"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <button className="admin-clear" type="button" onClick={() => setFilter("")}>
            クリア
          </button>
        </div>
        <div className="admin-filters">
          <div className="admin-seg" role="group" aria-label="名簿の絞り込み">
            {(
              [
                ["all", "すべて", rosterCounts.all],
                ["waiting", "引換待ち", rosterCounts.waiting],
                ["redeemed", "受取済", rosterCounts.redeemed],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                aria-pressed={roster === id}
                onClick={() => setRoster(id)}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <span className="admin-note">
            表示 {shown.length} / {students?.length ?? 0} 件
          </span>
        </div>
        <p className="admin-note">サーバーに残っている印だけを表示します。</p>
        <p className="admin-note">
          印の修正はサーバーの記録です。来場者のスマホには残り、次の読取りで足し戻ることがあります。
        </p>
        {truncated && <p className="admin-note">新しい順に500件まで表示しています。</p>}
        {students && shown.length === 0 && <p className="admin-note">該当する参加者はいません。</p>}
        <div className="admin-cards">
          {shown.map((student) => (
            <article
              key={`${student.nickname}-${student.telegramCode}-${student.createdAt}`}
              className={waitingForPrize(student) ? "admin-card admin-card--wait" : "admin-card"}
            >
              <h3>{student.nickname}</h3>
              <p>
                <DeskWords student={student} />
              </p>
              <p className="admin-time">登録 {registeredAt(student.createdAt)}</p>
              <p>
                <StampDots student={student} />
              </p>
              <p className="admin-card__actions">
                <PrizeStatus student={student} />
                <EditButton
                  expanded={menu?.key === rowKey(student)}
                  disabled={loading || pendingKey === rowKey(student)}
                  onClick={(button) => openMenu(student, button)}
                />
              </p>
            </article>
          ))}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>登録日時</th>
                <th>お名前</th>
                <th>符丁</th>
                <th>スタンプ進捗</th>
                <th>景品ステータス</th>
                <th>編集</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((student) => (
                <tr
                  key={`${student.nickname}-${student.telegramCode}-${student.createdAt}`}
                  className={waitingForPrize(student) ? "admin-row--wait" : undefined}
                >
                  <td className="admin-time">{registeredAt(student.createdAt)}</td>
                  <td className="admin-name">{student.nickname}</td>
                  <td className="admin-words">
                    <DeskWords student={student} />
                  </td>
                  <td>
                    <StampDots student={student} />
                  </td>
                  <td>
                    <PrizeStatus student={student} />
                  </td>
                  <td>
                    <EditButton
                      expanded={menu?.key === rowKey(student)}
                      disabled={loading || pendingKey === rowKey(student)}
                      onClick={(button) => openMenu(student, button)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {menu && (
        <>
          <button className="admin-menu-backdrop" type="button" aria-label="編集メニューを閉じる" onClick={() => setMenu(null)} />
          <div className="admin-menu" role="menu" style={{ top: menu.top, right: menu.right }}>
            <button type="button" role="menuitem" onClick={() => openStamps(menu.student)}>
              スタンプを手動変更
            </button>
            {menu.student.ticketIssued && !menu.student.redeemed && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDialog({ kind: "redeem", student: menu.student });
                  setMenu(null);
                }}
              >
                景品引換済みにする
              </button>
            )}
            <hr />
            <button
              className="is-danger"
              type="button"
              role="menuitem"
              onClick={() => {
                setDialog({ kind: "delete", student: menu.student });
                setMenu(null);
              }}
            >
              参加者を削除
            </button>
          </div>
        </>
      )}
      {dialog && (
        <div
          className="admin-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && pendingKey === "") setDialog(null);
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
          >
            {dialog.kind === "delete" && (
              <>
                <h2 id="admin-dialog-title">参加者データの削除</h2>
                <p>
                  「{dialog.student.nickname}」（符丁: {deskLabel(dialog.student)}
                  ）のデータを削除しますか？この操作は取り消せません。まだ受け取っていない引換コードも消えます。
                </p>
                <div className="admin-modal__actions">
                  <button
                    ref={cancelRef}
                    className="admin-modal__cancel"
                    type="button"
                    disabled={pendingKey !== ""}
                    onClick={() => setDialog(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    className="admin-modal__danger"
                    type="button"
                    disabled={pendingKey !== ""}
                    onClick={() => void confirmDelete()}
                  >
                    削除する
                  </button>
                </div>
              </>
            )}
            {dialog.kind === "redeem" && (
              <>
                <h2 id="admin-dialog-title">景品を引換済みにする</h2>
                <p>
                  「{dialog.student.nickname}」の景品を引換済みにします。6桁のコードは表示しません。この操作は取り消せません。
                </p>
                <div className="admin-modal__actions">
                  <button
                    ref={cancelRef}
                    className="admin-modal__cancel"
                    type="button"
                    disabled={pendingKey !== ""}
                    onClick={() => setDialog(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    className="admin-modal__danger"
                    type="button"
                    disabled={pendingKey !== ""}
                    onClick={() => void confirmRedeem()}
                  >
                    引換済みにする
                  </button>
                </div>
              </>
            )}
            {dialog.kind === "stamps" && (
              <>
                <h2 id="admin-dialog-title">スタンプを手動変更</h2>
                <p>「{dialog.student.nickname}」（符丁: {deskLabel(dialog.student)}）</p>
                <div className="admin-checks">
                  {STAMPS.map(([id, label]) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={stampDraft.includes(id)}
                        onChange={(event) => {
                          setStampDraft((current) =>
                            event.target.checked
                              ? [...current, id]
                              : current.filter((item) => item !== id),
                          );
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="admin-modal__actions">
                  <button
                    ref={cancelRef}
                    className="admin-modal__cancel"
                    type="button"
                    disabled={pendingKey !== ""}
                    onClick={() => setDialog(null)}
                  >
                    キャンセル
                  </button>
                  <button
                    className="admin-modal__save"
                    type="button"
                    disabled={pendingKey !== ""}
                    onClick={() => void saveStamps()}
                  >
                    保存
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
