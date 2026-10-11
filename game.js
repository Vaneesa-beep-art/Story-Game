const SAVE_KEY = "storyGameSave";
const ENDINGS_KEY = "storyGameEndings";

let story = null;
let state = null;

const textEl = document.getElementById("story-text");
const choicesEl = document.getElementById("choices");
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const restartBtn = document.getElementById("restart-btn");
const fileInput = document.getElementById("file-input");

function matches(cond) {
  if (!cond) return true;
  return Object.entries(cond).every(([flag, wanted]) => !!state.flags[flag] === wanted);
}

function resolveGoto(goto) {
  if (typeof goto === "string") return goto;
  const hit = goto.find((b) => matches(b.if));
  return hit ? hit.goto : null;
}

function getEndingsSeen() {
  try {
    return JSON.parse(localStorage.getItem(ENDINGS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function totalEndings() {
  return Object.values(story.nodes).filter((n) => n.isEnding).length;
}

async function init() {
  const res = await fetch("story.json");
  story = await res.json();

  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    state = JSON.parse(saved);
    if (!state.flags) state.flags = {};
  } else {
    state = { currentNode: story.start, flags: {} };
  }

  enterNode(state.currentNode, false);
}

function enterNode(nodeId, applyFlags = true) {
  const node = story.nodes[nodeId];
  state.currentNode = nodeId;
  if (node && applyFlags && node.setFlags) {
    Object.assign(state.flags, node.setFlags);
  }
  render();
}

function render() {
  const node = story.nodes[state.currentNode];
  if (!node) {
    textEl.textContent = "Fehler: Node '" + state.currentNode + "' nicht gefunden.";
    choicesEl.innerHTML = "";
    return;
  }

  const parts = [node.text];
  (node.textIf || []).forEach((t) => {
    if (matches(t.if)) parts.push(t.text);
  });
  textEl.textContent = parts.join("\n\n");
  textEl.style.whiteSpace = "pre-line";
  choicesEl.innerHTML = "";

  if (node.isEnding) {
    const seen = getEndingsSeen();
    if (!seen.includes(node.endingId)) {
      seen.push(node.endingId);
      localStorage.setItem(ENDINGS_KEY, JSON.stringify(seen));
    }
    const endDiv = document.createElement("div");
    endDiv.className = "ending-label";
    endDiv.textContent =
      "~ " + (node.title || "Ende erreicht") + " ~  (Enden gefunden: " +
      seen.length + " von " + totalEndings() + ")";
    choicesEl.appendChild(endDiv);
    localStorage.removeItem(SAVE_KEY);
    return;
  }

  node.choices
    .filter((choice) => matches(choice.requires))
    .forEach((choice) => {
      const btn = document.createElement("button");
      btn.textContent = choice.text;
      btn.className = "choice-btn";
      btn.addEventListener("click", () => selectChoice(choice));
      choicesEl.appendChild(btn);
    });

  saveState();
}

function selectChoice(choice) {
  if (choice.setFlags) {
    Object.assign(state.flags, choice.setFlags);
  }
  const target = resolveGoto(choice.goto);
  if (!target) return;
  enterNode(target);
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function exportSave() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "spielstand.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importSave(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      state = JSON.parse(e.target.result);
      if (!state.flags) state.flags = {};
      saveState();
      render();
    } catch (err) {
      alert("Diese Datei konnte nicht gelesen werden.");
    }
  };
  reader.readAsText(file);
}

function restart() {
  state = { currentNode: story.start, flags: {} };
  enterNode(story.start, false);
}

saveBtn.addEventListener("click", exportSave);
loadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) importSave(e.target.files[0]);
});
restartBtn.addEventListener("click", restart);

init();