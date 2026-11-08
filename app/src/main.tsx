import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/study.css";
import { FIXTURES } from "./mock/fixtures";
import { useStudy } from "./study/store";
import { StudyView } from "./study/StudyView";

function DevFixtures() {
  const id = useStudy((s) => s.fixture.id);
  const load = useStudy((s) => s.loadFixture);
  return (
    <label className="fixtures">
      <span className="label">Demo state</span>
      <select className="select" value={id} onChange={(e) => load(e.target.value)}>
        {FIXTURES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const params = new URLSearchParams(location.search);
const initial = params.get("fixture");
if (initial) useStudy.getState().loadFixture(initial);
const theme = params.get("theme");
if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StudyView />
      {import.meta.env.DEV && params.get("chrome") !== "0" && <DevFixtures />}
    </StrictMode>,
  );
}
