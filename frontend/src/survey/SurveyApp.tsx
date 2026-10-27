import { useEffect, useState, type FormEvent } from "react";
import { submitSurvey } from "../api";

const REGIONS = [
  { id: "kumamoto", label: "熊本県" },
  { id: "fukuoka", label: "福岡県" },
  { id: "saga", label: "佐賀県" },
  { id: "nagasaki", label: "長崎県" },
  { id: "oita", label: "大分県" },
  { id: "miyazaki", label: "宮崎県" },
  { id: "kagoshima", label: "鹿児島県" },
  { id: "okinawa", label: "沖縄県" },
  { id: "other", label: "九州外" },
] as const;

const FOOD_ITEMS = [
  { id: "soda_akane", label: "茜空クリームソーダ" },
  { id: "soda_blue", label: "碧空クリームソーダ" },
  { id: "soda_green", label: "新緑クリームソーダ" },
  { id: "soda_yugiri", label: "夕霧クリームソーダ" },
  { id: "other", label: "その他・覚えていない" },
] as const;

type RegionId = (typeof REGIONS)[number]["id"];
type FoodId = (typeof FOOD_ITEMS)[number]["id"];

export function SurveyApp() {
  const [region, setRegion] = useState<RegionId | "">("");
  const [regionOther, setRegionOther] = useState("");
  const [boughtFood, setBoughtFood] = useState(false);
  const [foodItem, setFoodItem] = useState<FoodId | "">("");
  const [foodRating, setFoodRating] = useState<number | "">("");
  const [foodComment, setFoodComment] = useState("");
  const [appRating, setAppRating] = useState<number | "">("");
  const [appComment, setAppComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("survey-doc");
    document.body.classList.add("survey-doc");
    return () => {
      document.documentElement.classList.remove("survey-doc");
      document.body.classList.remove("survey-doc");
    };
  }, []);

  const ready =
    region !== "" &&
    (region !== "other" || regionOther.trim().length > 0) &&
    (!boughtFood || foodItem !== "") &&
    !busy;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready || region === "") return;
    setBusy(true);
    setError("");
    const result = await submitSurvey({
      region,
      regionOther: region === "other" ? regionOther.trim() : "",
      boughtFood,
      foodItem: boughtFood ? foodItem : "",
      foodRating: boughtFood && foodRating !== "" ? foodRating : null,
      foodComment: boughtFood ? foodComment.trim() : "",
      appRating: appRating !== "" ? appRating : null,
      appComment: appComment.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error === "locked"
          ? "送信が続きすぎました。しばらくしてからお試しください。"
          : result.error === "invalid"
            ? "入力内容を確認してください。"
            : "通信できませんでした。もう一度お試しください。",
      );
      return;
    }
    setDone(true);
  }

  return (
    <main className="welcome welcome--scroll survey-page">
      <div className="welcome-card">
        <div className="welcome-lead">ご来場ありがとうございました</div>
        <h1 className="welcome-title">アンケート</h1>
        <p className="join-copy">
          氏名や連絡先は不要です。統計のために、差し支えのない範囲でご回答ください。
        </p>

        {done ? (
          <p className="survey-done">送信しました。ご協力ありがとうございました。</p>
        ) : (
          <form className="survey-form" onSubmit={(event) => void onSubmit(event)}>
            <fieldset className="survey-field">
              <legend>何県から来られましたか？（必須）</legend>
              <div className="survey-choices">
                {REGIONS.map((entry) => (
                  <label key={entry.id} className="survey-choice">
                    <input
                      type="radio"
                      name="region"
                      value={entry.id}
                      checked={region === entry.id}
                      onChange={() => setRegion(entry.id)}
                    />
                    <span>{entry.label}</span>
                  </label>
                ))}
              </div>
              {region === "other" && (
                <input
                  className="welcome-name"
                  type="text"
                  maxLength={20}
                  placeholder="都道府県名など（20文字以内）"
                  value={regionOther}
                  onChange={(event) => setRegionOther(event.target.value)}
                />
              )}
            </fieldset>

            <fieldset className="survey-field">
              <legend>お品書き（五高喫茶）について</legend>
              <label className="survey-choice">
                <input
                  type="checkbox"
                  checked={boughtFood}
                  onChange={(event) => {
                    setBoughtFood(event.target.checked);
                    if (!event.target.checked) {
                      setFoodItem("");
                      setFoodRating("");
                      setFoodComment("");
                    }
                  }}
                />
                <span>購入した方はチェック</span>
              </label>
              {boughtFood && (
                <>
                  <p className="survey-label">購入したメニュー</p>
                  <div className="survey-choices">
                    {FOOD_ITEMS.map((entry) => (
                      <label key={entry.id} className="survey-choice">
                        <input
                          type="radio"
                          name="food"
                          value={entry.id}
                          checked={foodItem === entry.id}
                          onChange={() => setFoodItem(entry.id)}
                        />
                        <span>{entry.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="survey-label">満足度（任意）</p>
                  <div className="survey-ratings">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="survey-choice">
                        <input
                          type="radio"
                          name="foodRating"
                          checked={foodRating === value}
                          onChange={() => setFoodRating(value)}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                  <label className="survey-label" htmlFor="food-comment">
                    感想（任意・400文字以内）
                  </label>
                  <textarea
                    id="food-comment"
                    className="survey-textarea"
                    maxLength={400}
                    rows={3}
                    value={foodComment}
                    onChange={(event) => setFoodComment(event.target.value)}
                  />
                </>
              )}
            </fieldset>

            <fieldset className="survey-field">
              <legend>アプリ「五高の囁き」について</legend>
              <p className="survey-label">満足度（任意）</p>
              <div className="survey-ratings">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="survey-choice">
                    <input
                      type="radio"
                      name="appRating"
                      checked={appRating === value}
                      onChange={() => setAppRating(value)}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
              <label className="survey-label" htmlFor="app-comment">
                感想（任意・400文字以内）
              </label>
              <textarea
                id="app-comment"
                className="survey-textarea"
                maxLength={400}
                rows={4}
                value={appComment}
                onChange={(event) => setAppComment(event.target.value)}
              />
            </fieldset>

            {error ? <p className="join-error">{error}</p> : null}
            <button className="welcome-start" type="submit" disabled={!ready}>
              {busy ? "送信しています…" : "送信する"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
