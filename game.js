const SAVE_KEY = "storyGameSave";

let story = null;
let state = null;

const textEl = document.getElementById("story-text");
const choicesEl = document.getElementById("choices");
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const restartBtn = document.getElementById("restart-btn");
const fileInput = document.getElementById("file-input");

async function init() {
  const res = await fetch("story.json");
  story = await res.json();

  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    state = JSON.parse(saved);
  } else {
    state = { currentNode: story.start, flags: {} };
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

  textEl.textContent = node.text;
  choicesEl.innerHTML = "";

  if (node.isEnding) {
    const endDiv = document.createElement("div");
    endDiv.className = "ending-label";
    endDiv.textContent = "— Ende erreicht —";
    choicesEl.appendChild(endDiv);
    localStorage.removeItem(SAVE_KEY);
    return;
  }

  node.choices.forEach((choice) => {
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
  state.currentNode = choice.goto;
  render();
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
  saveState();
  render();
}

saveBtn.addEventListener("click", exportSave);
loadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) importSave(e.target.files[0]);
});
restartBtn.addEventListener("click", restart);

init();