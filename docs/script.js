const copyButton = document.querySelector('.copy-button');
const copyStatus = document.querySelector('#copy-status');
const diagramSource = document.querySelector('#diagram-source');
const diagramOutput = document.querySelector('#diagram-output');
const diagramStatus = document.querySelector('#diagram-status');
const resetDiagram = document.querySelector('#reset-diagram');
const exampleButtons = document.querySelectorAll('[data-diagram-example]');
const diagramExamples = {
  system: `flowchart LR
  Idea[Raw idea] --> Map[Mermaid map]
  Map --> Note[Working note]
  Note --> Decision{Keep?}
  Decision -->|yes| Ship[Ship it]
  Decision -->|not yet| Idea`,
  plan: `flowchart TB
  Brief[Project brief] --> Scope[Set the scope]
  Scope --> Build[Make the first pass]
  Build --> Review[Review together]
  Review -->|ship| Release[Release]
  Review -->|revise| Scope`,
  notes: `flowchart LR
  Question[Open question] --> Research[Research note]
  Research --> Evidence[Useful evidence]
  Evidence --> Decision[Decision]
  Decision --> Record[Keep the rationale]`,
};
const starterDiagram = diagramExamples.system;
const mermaid = window.mermaid;

if (mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      lineColor: '#5c6661',
      primaryBorderColor: '#2b61b6',
      primaryColor: '#e8eef9',
      primaryTextColor: '#152120',
      tertiaryColor: '#f6f3ec',
    },
  });
}
let renderCount = 0;
let renderTimer;

copyButton?.addEventListener('click', async () => {
  const command = document.querySelector('#docker-command')?.textContent?.trim();
  if (!command) return;

  try {
    await navigator.clipboard.writeText(command);
    copyButton.textContent = 'Copied';
    copyStatus.textContent = 'Docker command copied to clipboard.';
    window.setTimeout(() => {
      copyButton.textContent = 'Copy command';
    }, 1600);
  } catch {
    copyStatus.textContent = 'Copy failed. Select the command and copy it manually.';
  }
});

async function renderDiagram() {
  if (!diagramSource || !diagramOutput || !diagramStatus) return;

  diagramOutput.classList.add('is-rendering');
  diagramStatus.textContent = 'Rendering diagram...';

  try {
    if (!mermaid) throw new Error('Mermaid failed to load');

    const { svg } = await mermaid.render(`atlantis-demo-${renderCount++}`, diagramSource.value);
    diagramOutput.innerHTML = svg;
    diagramStatus.textContent = 'Live preview';
  } catch {
    diagramOutput.innerHTML =
      '<p class="diagram-error">Check the Mermaid syntax and try again.</p>';
    diagramStatus.textContent = 'Unable to render';
  } finally {
    diagramOutput.classList.remove('is-rendering');
  }
}

function selectExample(exampleName) {
  if (!diagramSource || !(exampleName in diagramExamples)) return;
  diagramSource.value = diagramExamples[exampleName];
  exampleButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.diagramExample === exampleName));
  });
  void renderDiagram();
}

diagramSource?.addEventListener('input', () => {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderDiagram, 300);
});

exampleButtons.forEach((button) => {
  button.addEventListener('click', () => selectExample(button.dataset.diagramExample));
});

resetDiagram?.addEventListener('click', () => selectExample('system'));

void renderDiagram();
