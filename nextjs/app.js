"use strict";

/* ---------- Utilities ---------- */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : ms));

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-target]");
  if (!button) return;
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;

  const original = button.textContent;
  const ok = await copyText(target.innerText || target.textContent || "");
  button.textContent = ok ? "Tersalin" : "Gagal";
  toast(ok ? "Kode disalin." : "Gagal menyalin.");
  window.setTimeout(() => { button.textContent = original; }, 1600);
});

/* ---------- Sorotan kode ---------- */

const SOL_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d[\d_]*)\b|\b(pragma|solidity|contract|interface|library|abstract|is|using|function|modifier|event|error|struct|enum|mapping|constructor|receive|fallback|returns|return|if|else|for|while|do|break|continue|emit|revert|require|assert|try|catch|new|delete|import|from|as|unchecked|assembly|virtual|override|super|constant|immutable|public|private|internal|external|pure|view|payable|memory|storage|calldata|true|false|type|this|msg|block|tx)\b|\b(address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?)\b/g;

const JS_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(0x[0-9a-fA-F]+|\d[\d_]*(?:\.\d+)?n?)\b|\b(import|from|export|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|implements|type|interface|enum|as|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false|this|super|static|public|private|protected|readonly|declare|module|namespace|satisfies|keyof|useState|useEffect|useMemo|useCallback|useRef)\b/g;

const BASH_TOKEN_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^|\s)(\$)(?=\s)|\b(forge|cast|anvil|chisel|foundryup|curl|git|cd|mkdir|ls|echo|source|npm|npx|node|export)\b/gm;

const JSON_TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;

function tokenize(code, regex, classify) {
  let out = "";
  let last = 0;

  for (const match of code.matchAll(regex)) {
    out += escapeHtml(code.slice(last, match.index));
    out += '<span class="' + classify(match) + '">' + escapeHtml(match[0]) + "</span>";
    last = match.index + match[0].length;
  }

  return out + escapeHtml(code.slice(last));
}

function highlightSolidity(code) {
  return tokenize(code, SOL_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[3]) return "tok-n";
    return "tok-k";
  });
}

function highlightJs(code) {
  return tokenize(code, JS_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[3]) return "tok-n";
    return "tok-k";
  });
}

function highlightBash(code) {
  return tokenize(code, BASH_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[4]) return "tok-t";
    return "tok-k";
  });
}

function highlightJson(code) {
  return tokenize(code, JSON_TOKEN_RE, (match) => {
    if (match[1]) return match[2] ? "tok-t" : "tok-s";
    if (match[3]) return "tok-k";
    return "tok-n";
  });
}

function highlightCode(code, lang) {
  if (lang === "bash" || lang === "sh" || lang === "shell") return highlightBash(code);
  if (lang === "json") return highlightJson(code);
  if (lang === "ts" || lang === "tsx" || lang === "js" || lang === "jsx") return highlightJs(code);
  if (lang === "text" || lang === "plain") return escapeHtml(code);
  return highlightSolidity(code);
}

function initHighlight() {
  $$(".code-block pre code").forEach((block) => {
    const source = block.textContent;
    if (!source.trim()) return;
    if (block.querySelector("span")) return;
    const lang = (block.dataset.lang || "solidity").toLowerCase();
    block.innerHTML = highlightCode(source, lang);
  });
}

function renderCodeBlock(id, code, lang) {
  const block = document.getElementById(id);
  if (!block) return;
  block.innerHTML = highlightCode(code, lang || block.dataset.lang || "ts");
}

/* ---------- State simulasi wallet ---------- */

const CHAINS = {
  11155111: { name: "Sepolia", short: "Sepolia" },
  31337: { name: "Anvil", short: "Anvil" },
  1: { name: "Ethereum", short: "Ethereum" }
};

let hashCounter = 0;

function makeHash(seed) {
  hashCounter += 1;
  let x = 2166136261 ^ hashCounter ^ String(seed).length;
  let out = "";
  for (let i = 0; i < 64; i += 1) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out += ((x >>> 0) & 15).toString(16);
  }
  return "0x" + out;
}

function formatEth(wei, digits = 4) {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / 1000000000000000000n;
  const fraction = (abs % 1000000000000000000n).toString().padStart(18, "0");
  let frac = fraction.slice(0, digits);
  frac = frac.replace(/0+$/, "");
  return (negative ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}

function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function parseEthInput(value) {
  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,18})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 1000000000000000000n + BigInt((fraction + "000000000000000000").slice(0, 18));
}

const sim = {
  accounts: [
    {
      id: "acc1",
      name: "Akun uji 1",
      address: "0x7a9fdc34a0b1c2d3e4f5a6b7c8d9e0f1a2b34c21",
      balanceWei: 1842000000000000000n,
      vaultWei: 250000000000000000n
    },
    {
      id: "acc2",
      name: "Akun uji 2",
      address: "0x3b2c5d6e7f8091a2b3c4d5e6f708192a3b4c9e80",
      balanceWei: 640000000000000000n,
      vaultWei: 100000000000000000n
    }
  ],
  connectedId: null,
  chainId: 11155111,
  block: 8124340n,
  events: [],
  listeners: new Set(),
  milestones: new Set(),
  gasUsed: 48312n,
  gasPrice: 12000000000n,

  get feeWei() {
    return this.gasUsed * this.gasPrice;
  },

  get totalDepositsWei() {
    return this.accounts.reduce((sum, account) => sum + account.vaultWei, 0n);
  },

  get account() {
    return this.accounts.find((item) => item.id === this.connectedId) || null;
  },

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  notify() {
    for (const fn of Array.from(this.listeners)) fn(this);
  },

  mark(key) {
    if (this.milestones.has(key)) return;
    this.milestones.add(key);
    this.notify();
  },

  connect(id) {
    if (!this.accounts.some((item) => item.id === id)) return;
    this.connectedId = id;
    this.mark("connect");
    this.mark("address");
    this.mark("balance");
    this.mark("read");
    this.notify();
  },

  disconnect() {
    this.connectedId = null;
    this.notify();
  },

  setChain(chainId) {
    if (!CHAINS[chainId]) return;
    this.chainId = chainId;
    this.notify();
  },

  addEvent(name, user, amountWei, hash, block) {
    const event = {
      name,
      user,
      amountWei,
      hash: hash || makeHash("event"),
      block: block || this.block,
      removed: false
    };
    this.events.unshift(event);
    this.mark("event");
    this.notify();
    return event;
  },

  deposit(id, amountWei) {
    const account = this.accounts.find((item) => item.id === id);
    if (!account) throw new Error("Wallet belum terhubung.");
    if (this.chainId !== 11155111 && this.chainId !== 31337) {
      throw new Error("Chain tidak sesuai. Pindah ke Sepolia atau Anvil.");
    }
    if (amountWei <= 0n) throw new Error("ZeroAmount: nominal harus lebih dari 0.");
    if (this.chainId === 31337 && !CHAINS[31337]) throw new Error("Chain tidak dikenal.");
    if (amountWei + this.feeWei > account.balanceWei) {
      throw new Error("Insufficient funds: saldo tidak menutup nominal dan gas.");
    }

    account.balanceWei -= amountWei + this.feeWei;
    account.vaultWei += amountWei;
    this.block += 1n;
    const hash = makeHash(account.address + amountWei.toString() + this.block.toString());
    const event = this.addEvent("Deposited", account.address, amountWei, hash, this.block);
    this.mark("write");
    this.mark("status");
    this.mark("event");
    this.notify();
    return { hash, event, block: this.block, gasUsed: this.gasUsed, feeWei: this.feeWei };
  },

  externalDeposit(amountWei) {
    const account = this.accounts[1];
    account.vaultWei += amountWei;
    this.block += 1n;
    const hash = makeHash("external" + this.block.toString());
    return this.addEvent("Deposited", account.address, amountWei, hash, this.block);
  }
};

sim.events = [
  {
    name: "Deposited",
    user: sim.accounts[0].address,
    amountWei: 100000000000000000n,
    hash: makeHash("seed-1"),
    block: 8124301n,
    removed: false
  },
  {
    name: "Deposited",
    user: sim.accounts[1].address,
    amountWei: 100000000000000000n,
    hash: makeHash("seed-2"),
    block: 8124318n,
    removed: false
  },
  {
    name: "Deposited",
    user: sim.accounts[0].address,
    amountWei: 150000000000000000n,
    hash: makeHash("seed-3"),
    block: 8124340n,
    removed: false
  }
];

/* ---------- Hero wallet ---------- */

(function initHero() {
  const connectBtn = $("#hero-connect");
  const sendBtn = $("#hero-send");
  if (!connectBtn || !sendBtn) return;

  const els = {
    chip: $("#hero-chip"),
    avatar: $("#hero-avatar"),
    account: $("#hero-account"),
    address: $("#hero-address"),
    network: $("#hero-network"),
    eth: $("#hero-eth"),
    vault: $("#hero-vault"),
    note: $("#hero-note")
  };

  let busy = false;
  let note = "Simulasi. Tidak ada wallet nyata yang diminta.";

  const targets = {
    connect: $("#hero-target-connect"),
    address: $("#hero-target-address"),
    balance: $("#hero-target-balance"),
    read: $("#hero-target-read"),
    write: $("#hero-target-write"),
    sign: $("#hero-target-sign"),
    status: $("#hero-target-status"),
    event: $("#hero-target-event")
  };

  function render() {
    const account = sim.account;
    const chain = CHAINS[sim.chainId];

    if (account) {
      els.chip.textContent = "terhubung";
      els.chip.className = "wallet-chip is-on";
      els.avatar.textContent = account.id === "acc1" ? "A1" : "A2";
      els.account.textContent = account.name;
      els.address.textContent = shortAddress(account.address);
      els.eth.textContent = formatEth(account.balanceWei, 4);
      els.vault.textContent = formatEth(account.vaultWei, 4);
      connectBtn.textContent = "Ganti akun";
    } else {
      els.chip.textContent = "belum terhubung";
      els.chip.className = "wallet-chip";
      els.avatar.textContent = "--";
      els.account.textContent = "Belum ada akun";
      els.address.textContent = "Klik hubungkan untuk memulai";
      els.eth.textContent = "0.0000";
      els.vault.textContent = "0.0000";
      connectBtn.textContent = "Hubungkan";
    }

    els.network.textContent = chain ? chain.name : "Chain ?";
    els.network.className = "wallet-chip" + (sim.chainId === 1 ? " is-warn" : " is-on");

    for (const [key, el] of Object.entries(targets)) {
      if (el) el.classList.toggle("is-done", sim.milestones.has(key));
    }

    sendBtn.textContent = busy ? "Menunggu..." : "Kirim 0.01 ETH";
    sendBtn.disabled = busy || !account || sim.chainId === 1;
    connectBtn.disabled = busy;
    els.note.textContent = note;
  }

  connectBtn.addEventListener("click", async () => {
    if (busy) return;
    busy = true;

    if (!sim.account) {
      note = "Menunggu persetujuan wallet (simulasi)...";
      render();
      await wait(800);
      sim.connect("acc1");
      note = "Akun uji 1 terhubung. Saldo dan saldo vault dibaca dari state simulasi.";
      busy = false;
      render();
      return;
    }

    const next = sim.connectedId === "acc1" ? "acc2" : "acc1";
    const account = sim.accounts.find((item) => item.id === next);
    sim.connect(next);
    note = "Akun berganti ke " + account.name + ". Perhatikan semua angka ikut berubah.";
    busy = false;
    render();
  });

  sendBtn.addEventListener("click", async () => {
    if (busy) return;
    const account = sim.account;
    if (!account) {
      note = "Hubungkan wallet dulu sebelum mengirim transaksi.";
      render();
      return;
    }
    if (sim.chainId === 1) {
      note = "Wallet berada di Ethereum mainnet. Lab ini hanya mengizinkan Sepolia atau Anvil.";
      render();
      return;
    }

    busy = true;
    note = "Menunggu wallet menandatangani deposit 0.01 ETH (simulasi)...";
    render();
    await wait(900);
    note = "Transaksi dikirim. Menunggu receipt...";
    render();
    await wait(1100);

    try {
      const result = sim.deposit(account.id, parseEthInput("0.01"));
      note = "Berhasil di blok " + result.block.toString() + ". Hash " + result.hash.slice(0, 18) + "... dan event baru ditambahkan.";
    } catch (error) {
      note = toSimMessage(error);
    }

    busy = false;
    render();
  });

  function toSimMessage(error) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  sim.on(render);
  render();
})();

/* ---------- Lab 01: stack ---------- */

(function initStackLab() {
  const host = $("#lab-stack");
  if (!host) return;

  const status = $("#stack-status");
  const tasks = $$(".stack-task", host);

  $("#stack-check").addEventListener("click", () => {
    let correct = 0;
    let missing = 0;

    tasks.forEach((task) => {
      const select = $("select", task);
      const value = select.value;
      task.classList.remove("is-ok", "is-bad");
      if (!value) {
        missing += 1;
        return;
      }
      if (value === task.dataset.answer) {
        correct += 1;
        task.classList.add("is-ok");
      } else {
        task.classList.add("is-bad");
      }
    });

    if (missing) {
      setStatus(status, "Masih ada " + missing + " tugas tanpa pilihan. Lengkapi dulu.", "is-bad");
      return;
    }

    if (correct === tasks.length) {
      setStatus(status, "Semua tepat. Kamu bisa membedakan lapisan React, wallet, encoding, aturan kontrak, dan cache.", "is-good");
    } else {
      setStatus(status, correct + " dari " + tasks.length + " tepat. Periksa tugas yang ditandai merah: di situlah sumber kebenaran seharusnya berada.", "is-bad");
    }
  });

  $("#stack-reset").addEventListener("click", () => {
    tasks.forEach((task) => {
      task.classList.remove("is-ok", "is-bad");
      $("select", task).value = "";
    });
    setStatus(status, "Belum ada jawaban yang diperiksa.", "");
  });
})();

/* ---------- Lab 02: batas server dan client ---------- */

(function initBoundaryLab() {
  const host = $("#lab-boundary");
  if (!host) return;

  const status = $("#boundary-status");
  const cards = $$(".boundary-card", host);

  cards.forEach((card) => {
    $$("[data-value]", card).forEach((button) => {
      button.addEventListener("click", () => {
        $$("[data-value]", card).forEach((item) => {
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        card.classList.remove("is-ok", "is-bad");
      });
    });
  });

  $("#boundary-check").addEventListener("click", () => {
    let correct = 0;
    let missing = 0;

    cards.forEach((card) => {
      const chosen = $('[data-value][aria-pressed="true"]', card);
      card.classList.remove("is-ok", "is-bad");
      if (!chosen) {
        missing += 1;
        return;
      }
      if (chosen.dataset.value === card.dataset.answer) {
        correct += 1;
        card.classList.add("is-ok");
      } else {
        card.classList.add("is-bad");
      }
    });

    if (missing) {
      setStatus(status, "Masih ada " + missing + " file tanpa pilihan. Pilih server atau client untuk semuanya.", "is-bad");
      return;
    }

    if (correct === cards.length) {
      setStatus(status, "Tepat. Provider dan komponen yang memakai hook harus client. Layout dan route API tetap server.", "is-good");
    } else {
      setStatus(status, correct + " dari " + cards.length + " tepat. File yang memakai hook atau API browser tidak bisa dirender sebagai server component.", "is-bad");
    }
  });

  $("#boundary-reset").addEventListener("click", () => {
    cards.forEach((card) => {
      card.classList.remove("is-ok", "is-bad");
      $$("[data-value]", card).forEach((button) => button.setAttribute("aria-pressed", "false"));
    });
    setStatus(status, "Belum ada pilihan.", "");
  });
})();

/* ---------- Lab 03: config builder ---------- */

(function initConfigLab() {
  const chainSelect = $("#cfg-chain");
  const transportSelect = $("#cfg-transport");
  const connectorSelect = $("#cfg-connector");
  const ssrInput = $("#cfg-ssr");
  if (!chainSelect || !transportSelect || !connectorSelect || !ssrInput) return;

  const status = $("#cfg-status");

  const chains = {
    sepolia: { variable: "sepolia", label: "Sepolia", env: "SEPOLIA_RPC", id: "11155111" },
    anvil: { variable: "anvil", label: "Anvil", env: "ANVIL_RPC", id: "31337" },
    mainnet: { variable: "mainnet", label: "Ethereum", env: "MAINNET_RPC", id: "1" }
  };

  function build() {
    const chain = chains[chainSelect.value];
    const transport = transportSelect.value;
    const connector = connectorSelect.value;
    const ssr = ssrInput.checked;

    const wagmiImports = ["createConfig", "http"];
    if (transport === "fallback") wagmiImports.push("fallback");

    const connectorImports = [];
    let connectorCode = "injected()";

    if (connector === "metamask") {
      connectorImports.push("metaMask");
      connectorCode = "metaMask()";
    } else if (connector === "walletconnect") {
      connectorImports.push("walletConnect");
      connectorCode = 'walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! })';
    } else {
      connectorImports.push("injected");
    }

    let transportCode = "http()";
    if (chainSelect.value === "anvil" && transport === "default") {
      transportCode = 'http("http://127.0.0.1:8545")';
    } else if (transport === "custom") {
      transportCode = "http(process.env.NEXT_PUBLIC_" + chain.env + ")";
    } else if (transport === "fallback") {
      transportCode = "fallback([http(process.env.NEXT_PUBLIC_" + chain.env + "), http()])";
    }

    const lines = [
      'import { ' + wagmiImports.join(", ") + ' } from "wagmi";',
      'import { ' + chain.variable + ' } from "wagmi/chains";',
      'import { ' + connectorImports.join(", ") + ' } from "wagmi/connectors";',
      "",
      "export const config = createConfig({",
      "  chains: [" + chain.variable + "],",
      "  connectors: [" + connectorCode + "],",
      "  transports: {",
      "    [" + chain.variable + ".id]: " + transportCode + ",",
      "  },",
      ssr ? "  ssr: true," : "",
      "});",
      "",
      'declare module "wagmi" {',
      "  interface Register {",
      "    config: typeof config;",
      "  }",
      "}"
    ].filter((line) => line !== "");

    return {
      code: lines.join("\n"),
      notes: configNotes(chain, transport, connector)
    };
  }

  function configNotes(chain, transport, connector) {
    const notes = [];
    if (chainSelect.value === "anvil") {
      notes.push("Anvil cocok untuk latihan lokal. Jangan dipakai di produksi dan jangan kirim aset nyata ke akun uji.");
    }
    if (chainSelect.value === "mainnet") {
      notes.push("Kamu memilih mainnet. Pastikan ini disengaja dan RPC-nya andal; kesalahan di sini memakai dana nyata.");
    }
    if (chainSelect.value === "sepolia" && (transport === "custom" || transport === "fallback")) {
      notes.push("Isi NEXT_PUBLIC_SEPOLIA_RPC. Tanpa nilai itu, fallback hanya mengandalkan RPC publik yang bisa dibatasi.");
    }
    if (connector === "walletconnect") {
      notes.push("WalletConnect membutuhkan project id dan paket tambahan. Jangan hardcode project id di kode yang di-commit.");
    }
    if (connector === "metamask") {
      notes.push("Connector metaMask memakai MetaMask SDK dan membantu tautan mobile; paket tambahannya harus terpasang.");
    }
    if (transport === "default" && chainSelect.value !== "anvil") {
      notes.push("http() tanpa argumen memakai RPC default chain. Untuk trafik nyata, siapkan endpoint sendiri.");
    }
    if (!notes.length) {
      notes.push("Config valid secara sintaks. Uji connect dan baca saldo sebelum menambah transaksi.");
    }
    return notes.join(" ");
  }

  function render() {
    const result = build();
    renderCodeBlock("cfg-code", result.code, "ts");
    setStatus(status, result.notes, "is-wait");
  }

  [chainSelect, transportSelect, connectorSelect].forEach((el) => el.addEventListener("change", render));
  ssrInput.addEventListener("change", render);

  render();
})();

/* ---------- Lab 04: connect wallet ---------- */

(function initConnectLab() {
  const host = $("#lab-connect");
  if (!host) return;

  const addressEl = $("#connect-address");
  const metaEl = $("#connect-meta");
  const connectBtn = $("#connect-btn");
  const picker = $("#connect-accounts");
  const disconnectBtn = $("#connect-disconnect");
  const accountBtn = $("#connect-account");
  const status = $("#connect-status");

  let busy = false;

  function render() {
    const account = sim.account;
    const chain = CHAINS[sim.chainId];

    addressEl.textContent = account ? shortAddress(account.address) : "Belum terhubung";
    metaEl.textContent = "Wallet: MetaMask (simulasi) \u00b7 Chain: " + (chain ? chain.name : "?") +
      (sim.chainId === 1 ? " \u00b7 aplikasi butuh Sepolia" : "");

    disconnectBtn.disabled = busy || !account;
    accountBtn.disabled = busy || !account;
    connectBtn.disabled = busy || Boolean(account);
    connectBtn.textContent = busy ? "Menunggu wallet..." : account ? "Terhubung" : "Hubungkan wallet";

    $$("[data-connect-chain]", host).forEach((button) => {
      button.setAttribute("aria-pressed", Number(button.dataset.connectChain) === sim.chainId ? "true" : "false");
    });

    $$("[data-account]", picker).forEach((button) => {
      const item = sim.accounts.find((candidate) => candidate.id === button.dataset.account);
      const label = button.querySelector("span");
      if (item && label) {
        label.textContent = shortAddress(item.address) + " \u00b7 " + formatEth(item.balanceWei, 3) + " ETH";
      }
    });
  }

  function openPicker() {
    picker.hidden = false;
    setStatus(status, "Popup MetaMask (simulasi) terbuka. Pilih akun yang ingin dihubungkan.", "is-wait");
  }

  connectBtn.addEventListener("click", () => {
    if (busy || sim.account) return;
    openPicker();
  });

  accountBtn.addEventListener("click", () => {
    if (busy || !sim.account) return;
    openPicker();
  });

  $$("[data-account]", picker).forEach((button) => {
    button.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      picker.hidden = true;
      setStatus(status, "Menunggu persetujuan wallet (simulasi)...", "is-wait");
      render();
      await wait(850);
      sim.connect(button.dataset.account);
      const account = sim.account;
      setStatus(status, "Terhubung ke " + account.name + " (" + shortAddress(account.address) + "). Lab lain memakai akun yang sama.", "is-good");
      busy = false;
      render();
    });
  });

  disconnectBtn.addEventListener("click", () => {
    sim.disconnect();
    picker.hidden = true;
    setStatus(status, "Koneksi diputuskan dari sisi aplikasi. Wallet tetap ada; aplikasi berhenti meminta data.", "");
    render();
  });

  $$("[data-connect-chain]", host).forEach((button) => {
    button.addEventListener("click", () => {
      const chainId = Number(button.dataset.connectChain);
      sim.setChain(chainId);
      if (chainId === 1) {
        setStatus(status, "Wallet berpindah ke Ethereum mainnet. Aplikasi ini hanya mengizinkan Sepolia dan Anvil untuk transaksi.", "is-bad");
      } else {
        setStatus(status, "Wallet berpindah ke " + CHAINS[chainId].name + ". Saldo dan kontrak mengikuti chain yang sama.", "is-good");
      }
      render();
    });
  });

  sim.on(render);
  render();
})();

/* ---------- Lab 05: balance ---------- */

(function initBalanceLab() {
  const host = $("#lab-balance");
  if (!host) return;

  const owner = $("#balance-owner");
  const meta = $("#balance-meta");
  const refresh = $("#balance-refresh");
  const ethEl = $("#balance-eth");
  const weiEl = $("#balance-wei");
  const blockEl = $("#balance-block");
  const status = $("#balance-status");

  let hasRead = false;
  let lastAccount = null;
  let busy = false;

  function render() {
    const account = sim.account;
    const chain = CHAINS[sim.chainId];

    owner.textContent = account ? account.name + " \u00b7 " + shortAddress(account.address) : "Belum terhubung";
    meta.textContent = account
      ? "Chain: " + (chain ? chain.name : "?") + " \u00b7 sumber: RPC simulasi"
      : "Hubungkan wallet di Lab 04 untuk memulai.";

    if (lastAccount !== sim.connectedId) {
      hasRead = false;
      lastAccount = sim.connectedId;
      ethEl.textContent = "--";
      weiEl.textContent = "--";
      blockEl.textContent = "--";
      if (account) setStatus(status, "Akun aktif berubah. Baca saldo untuk memperbarui.", "");
    } else if (hasRead && account) {
      ethEl.textContent = formatEth(account.balanceWei, 6);
      weiEl.textContent = account.balanceWei.toString();
      blockEl.textContent = sim.block.toString();
    }
  }

  refresh.addEventListener("click", async () => {
    const account = sim.account;
    if (!account) {
      setStatus(status, "Hubungkan wallet dulu. Tanpa address, tidak ada saldo yang bisa dibaca.", "is-bad");
      return;
    }
    if (busy) return;

    busy = true;
    refresh.disabled = true;
    setStatus(status, "Mengirim eth_getBalance ke RPC simulasi...", "is-wait");
    await wait(600);

    hasRead = true;
    ethEl.textContent = formatEth(account.balanceWei, 6);
    weiEl.textContent = account.balanceWei.toString();
    blockEl.textContent = sim.block.toString();
    setStatus(status, "Saldo dibaca dari state simulasi. Nilai wei dan ETH berasal dari angka yang sama.", "is-good");
    sim.mark("balance");
    busy = false;
    refresh.disabled = false;
    render();
  });

  sim.on(render);
  render();
})();

/* ---------- Lab 06: read contract ---------- */

(function initReadLab() {
  const host = $("#lab-read");
  if (!host) return;

  const fnSelect = $("#read-function");
  const argInput = $("#read-arg");
  const callBtn = $("#read-call");
  const rawEl = $("#read-raw");
  const formattedEl = $("#read-formatted");
  const blockEl = $("#read-block");
  const status = $("#read-status");

  let hasRead = false;
  let lastAccount = null;
  let busy = false;

  function syncArg() {
    if (fnSelect.value === "balanceOf") {
      const account = sim.account;
      argInput.disabled = false;
      argInput.value = account ? shortAddress(account.address) : "hubungkan wallet dulu";
    } else {
      argInput.value = "tidak perlu argumen";
      argInput.disabled = true;
    }
  }

  function render() {
    syncArg();
    if (lastAccount !== sim.connectedId) {
      lastAccount = sim.connectedId;
      hasRead = false;
      rawEl.textContent = "--";
      formattedEl.textContent = "--";
      blockEl.textContent = "--";
    }
  }

  fnSelect.addEventListener("change", () => {
    hasRead = false;
    rawEl.textContent = "--";
    formattedEl.textContent = "--";
    blockEl.textContent = "--";
    setStatus(status, "Fungsi berubah. Jalankan panggilan baru.", "");
    syncArg();
  });

  callBtn.addEventListener("click", async () => {
    if (busy) return;
    const fn = fnSelect.value;

    if (fn === "balanceOf" && !sim.account) {
      setStatus(status, "balanceOf membutuhkan address. Hubungkan wallet dulu di Lab 04.", "is-bad");
      return;
    }

    busy = true;
    callBtn.disabled = true;
    setStatus(status, fn === "balanceOf" ? "Memanggil balanceOf(address) sebagai view..." : "Memanggil totalDeposits() sebagai view...", "is-wait");
    await wait(650);

    const value = fn === "balanceOf" ? sim.account.vaultWei : sim.totalDepositsWei;
    rawEl.textContent = value.toString();
    formattedEl.textContent = formatEth(value, 6) + " ETH";
    blockEl.textContent = sim.block.toString();
    hasRead = true;
    setStatus(status, "Panggilan view selesai. Tidak ada transaksi, tidak ada gas, dan tidak ada perubahan state.", "is-good");
    sim.mark("read");
    busy = false;
    callBtn.disabled = false;
  });

  sim.on(render);
  render();
})();

/* ---------- Lab 07: write transaction ---------- */

(function initWriteLab() {
  const host = $("#lab-write");
  if (!host) return;

  const amountInput = $("#write-amount");
  const ownerEl = $("#write-owner");
  const chainEl = $("#write-chain");
  const calldataEl = $("#write-calldata");
  const gasRow = $("#write-gas");
  const simulateBtn = $("#write-simulate");
  const sendBtn = $("#write-send");
  const resetBtn = $("#write-reset");
  const status = $("#write-status");
  const hashEl = $("#write-hash");
  const txStatusEl = $("#write-txstatus");
  const blockEl = $("#write-block");

  let simulation = null;
  let busy = false;
  let lastAccount = null;
  let lastChain = sim.chainId;

  function resetResult() {
    hashEl.textContent = "--";
    txStatusEl.textContent = "--";
    blockEl.textContent = "--";
  }

  function resetAll() {
    simulation = null;
    amountInput.value = "0.01";
    calldataEl.textContent = "Pilih nominal lalu simulasikan.";
    gasRow.innerHTML = '<span>Estimasi gas: <strong>--</strong></span><span>Biaya maksimum: <strong>--</strong></span><span>Chain: <strong id="write-chain">' +
      (CHAINS[sim.chainId] ? CHAINS[sim.chainId].name : "?") + "</strong></span>";
    sendBtn.disabled = true;
    resetResult();
    setStatus(status, "Belum ada simulasi.", "");
    render();
  }

  function render() {
    const account = sim.account;
    ownerEl.textContent = account ? account.name + " \u00b7 " + shortAddress(account.address) : "Belum terhubung";
    if (chainEl) chainEl.textContent = CHAINS[sim.chainId] ? CHAINS[sim.chainId].name : "?";
    const currentChain = $("#write-chain");
    if (currentChain) currentChain.textContent = CHAINS[sim.chainId] ? CHAINS[sim.chainId].name : "?";

    if (lastAccount !== sim.connectedId) {
      lastAccount = sim.connectedId;
      simulation = null;
      sendBtn.disabled = true;
      resetResult();
      setStatus(status, account ? "Akun berubah. Simulasikan ulang sebelum mengirim." : "Hubungkan wallet dulu di Lab 04.", "");
    }

    if (lastChain !== sim.chainId) {
      lastChain = sim.chainId;
      simulation = null;
      sendBtn.disabled = true;
      resetResult();
      if (sim.chainId === 1) {
        setStatus(status, "Wallet berada di Ethereum mainnet. Pindah ke Sepolia atau Anvil untuk mengirim transaksi latihan.", "is-bad");
      } else {
        setStatus(status, "Chain berubah ke " + CHAINS[sim.chainId].name + ". Simulasikan ulang.", "");
      }
    }
  }

  function checkAmount() {
    if (!sim.account) return { error: "Hubungkan wallet dulu. Tanpa akun, tidak ada pengirim." };
    if (sim.chainId === 1) return { error: "Pindah ke Sepolia atau Anvil. Lab tidak mengirim transaksi di mainnet." };

    const amountWei = parseEthInput(amountInput.value);
    if (amountWei === null) return { error: "Nominal tidak valid. Gunakan angka dengan titik desimal, maksimal 18 angka di belakang koma." };
    if (amountWei === 0n) return { error: "ZeroAmount: kontrak menolak deposit 0 ETH." };
    if (amountWei + sim.feeWei > sim.account.balanceWei) {
      return { error: "Insufficient funds: saldo " + formatEth(sim.account.balanceWei, 6) + " ETH tidak menutup nominal dan gas." };
    }
    return { amountWei };
  }

  simulateBtn.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    simulation = null;
    sendBtn.disabled = true;
    resetResult();
    calldataEl.textContent = "0xd0e30db0  \u2190 selector deposit()";
    setStatus(status, "Menjalankan simulasi eth_call dan estimasi gas...", "is-wait");
    await wait(500);

    const result = checkAmount();
    if (result.error) {
      gasRow.innerHTML = '<span>Estimasi gas: <strong>--</strong></span><span>Biaya maksimum: <strong>--</strong></span><span>Chain: <strong id="write-chain">' +
        (CHAINS[sim.chainId] ? CHAINS[sim.chainId].name : "?") + "</strong></span>";
      setStatus(status, result.error, "is-bad");
      busy = false;
      return;
    }

    simulation = { amountWei: result.amountWei };
    gasRow.innerHTML = '<span>Estimasi gas: <strong>' + sim.gasUsed.toString() + "</strong></span><span>Biaya maksimum: <strong>" +
      formatEth(sim.feeWei, 6) + " ETH</strong></span><span>Chain: <strong id=\"write-chain\">" +
      (CHAINS[sim.chainId] ? CHAINS[sim.chainId].name : "?") + "</strong></span>";
    sendBtn.disabled = false;
    setStatus(status, "Simulasi lolos. Kontrak tidak revert. Periksa nominal dan biaya sebelum menandatangani.", "is-good");
    busy = false;
  });

  sendBtn.addEventListener("click", async () => {
    if (busy) return;
    if (!simulation) {
      setStatus(status, "Simulasikan dulu sebelum mengirim.", "is-wait");
      return;
    }

    const account = sim.account;
    const amountWei = simulation.amountWei;
    busy = true;
    sendBtn.disabled = true;
    simulateBtn.disabled = true;
    setStatus(status, "Menunggu wallet menandatangani transaksi (simulasi)...", "is-wait");
    await wait(900);

    setStatus(status, "Transaksi dikirim. Menunggu konfirmasi di blok...", "is-wait");
    await wait(1200);

    try {
      const result = sim.deposit(account.id, amountWei);
      hashEl.textContent = result.hash;
      hashEl.title = result.hash;
      txStatusEl.textContent = "success";
      blockEl.textContent = result.block.toString();
      simulation = null;
      setStatus(status, "Receipt sukses di blok " + result.block.toString() + ". Gas " + result.gasUsed.toString() +
        " dipakai; saldo wallet turun, saldo vault naik, dan event Deposited dibuat.", "is-good");
    } catch (error) {
      txStatusEl.textContent = "reverted";
      setStatus(status, error instanceof Error ? error.message : String(error), "is-bad");
    }

    busy = false;
    simulateBtn.disabled = false;
    render();
  });

  resetBtn.addEventListener("click", resetAll);

  sim.on(render);
  render();
})();

/* ---------- Helper status ---------- */

function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

/* ---------- Lab 08: signature ---------- */

(function initSignLab() {
  const host = $("#lab-sign");
  if (!host) return;

  const messageInput = $("#sign-message");
  const preview = $("#sign-preview");
  const signBtn = $("#sign-btn");
  const verifyBtn = $("#sign-verify");
  const tamperBtn = $("#sign-tamper");
  const status = $("#sign-status");
  const output = $("#sign-output");
  const signedEl = $("#sign-signed-message");
  const digestEl = $("#sign-digest");
  const sigEl = $("#sign-signature");

  const state = {
    signedMessage: null,
    signature: null,
    digest: null,
    keyPair: null,
    accountId: null,
    signedAddress: null
  };

  let lastAccount = sim.connectedId;

  const encoder = new TextEncoder();

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function fromHex(hex) {
    const clean = hex.replace(/^0x/, "");
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  function simpleHash(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x1000193;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 16777619);
      h2 = Math.imul(h2 ^ code, 2246822519);
    }
    let out = "";
    for (let i = 0; i < 8; i += 1) {
      h1 = Math.imul(h1 ^ (h1 >>> 13), 1274126177);
      h2 = Math.imul(h2 ^ (h2 >>> 15), 3266489917);
      out += (h1 >>> 0).toString(16).padStart(8, "0");
      out += (h2 >>> 0).toString(16).padStart(8, "0");
    }
    return out.slice(0, 64);
  }

  async function getKey(account) {
    if (account._signKey) return account._signKey;
    if (!window.crypto || !window.crypto.subtle) return null;
    account._signKey = await window.crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    return account._signKey;
  }

  function updatePreview() {
    preview.textContent = messageInput.value.trim() ? messageInput.value : "(pesan kosong)";
  }

  function render() {
    updatePreview();
    if (lastAccount !== sim.connectedId) {
      lastAccount = sim.connectedId;
      state.signedMessage = null;
      state.signature = null;
      state.digest = null;
      state.signedAddress = null;
      output.hidden = true;
      verifyBtn.disabled = true;
      tamperBtn.disabled = true;
      setStatus(status, sim.account ? "Akun aktif berubah. Tanda tangani pesan baru." : "Hubungkan wallet dulu untuk menandatangani.", "");
    }
  }

  messageInput.addEventListener("input", () => {
    updatePreview();
    if (state.signature) {
      setStatus(status, "Isi pesan berubah. Signature lama tidak lagi cocok dengan isi ini.", "is-wait");
    }
  });

  signBtn.addEventListener("click", async () => {
    const account = sim.account;
    if (!account) {
      setStatus(status, "Hubungkan wallet dulu di Lab 04. Signature membutuhkan akun.", "is-bad");
      return;
    }
    const message = messageInput.value;
    if (!message.trim()) {
      setStatus(status, "Pesan kosong. Tulis sesuatu yang ingin ditandatangani.", "is-bad");
      return;
    }

    signBtn.disabled = true;
    setStatus(status, "Menunggu wallet menandatangani pesan (simulasi)...", "is-wait");
    await wait(700);

    try {
      const key = await getKey(account);
      if (key && window.crypto && window.crypto.subtle) {
        const data = encoder.encode(message);
        const digest = await window.crypto.subtle.digest("SHA-256", data);
        const signature = await window.crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          key.privateKey,
          data
        );
        state.digest = "0x" + toHex(digest);
        state.signature = "0x" + toHex(signature);
        state.keyPair = key;
      } else {
        state.digest = "0x" + simpleHash(message);
        state.signature = "0x" + simpleHash(account.address + ":" + message);
        state.keyPair = null;
      }

      state.signedMessage = message;
      state.signedAddress = account.address;
      state.accountId = account.id;

      signedEl.textContent = message;
      digestEl.textContent = state.digest;
      sigEl.textContent = state.signature;
      output.hidden = false;
      verifyBtn.disabled = false;
      tamperBtn.disabled = false;
      setStatus(status, "Signature dibuat. Tidak ada transaksi dan tidak ada gas. Verifikasi untuk memeriksa kecocokan.", "is-good");
      sim.mark("sign");
    } catch (error) {
      setStatus(status, "Signature gagal dibuat: " + (error instanceof Error ? error.message : String(error)), "is-bad");
    }

    signBtn.disabled = false;
  });

  verifyBtn.addEventListener("click", async () => {
    if (!state.signature || !state.signedAddress) {
      setStatus(status, "Belum ada signature untuk diverifikasi.", "is-bad");
      return;
    }

    setStatus(status, "Memverifikasi signature terhadap isi pesan saat ini...", "is-wait");
    await wait(350);

    let valid = false;
    try {
      if (state.keyPair && window.crypto && window.crypto.subtle) {
        valid = await window.crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          state.keyPair.publicKey,
          fromHex(state.signature),
          encoder.encode(messageInput.value)
        );
      } else {
        valid = "0x" + simpleHash(state.signedAddress + ":" + messageInput.value) === state.signature;
      }
    } catch (error) {
      valid = false;
    }

    if (valid) {
      setStatus(status, "Valid. Pesan saat ini sama dengan pesan yang ditandatangani, dan signature cocok dengan address " + shortAddress(state.signedAddress) + ".", "is-good");
    } else {
      setStatus(status, "Tidak valid. Isi pesan berubah setelah ditandatangani, jadi signature tidak lagi membuktikan persetujuan atas isi ini.", "is-bad");
    }
  });

  tamperBtn.addEventListener("click", () => {
    if (!state.signedMessage) return;
    messageInput.value = state.signedMessage + "\nNominal transfer: 1 ETH";
    updatePreview();
    setStatus(status, "Pesan diubah setelah tanda tangan. Klik verifikasi: signature lama tidak akan valid untuk isi baru.", "is-wait");
  });

  sim.on(render);
  render();
})();

/* ---------- Lab 09: status transaksi ---------- */

(function initStatusLab() {
  const host = $("#lab-status");
  if (!host) return;

  const timeline = $("#status-timeline");
  const detail = $("#status-detail");
  if (!timeline) return;

  const scenarios = {
    success: {
      detail: "Transaksi sukses. Hash tersedia sejak dikirim, tetapi bukti akhir adalah receipt dengan status success. Setelah itu saldo, total deposit, dan event diperbarui.",
      steps: [
        ["Wallet diminta", "Pengguna melihat fungsi, nominal, dan biaya.", "selesai", "ok"],
        ["Ditandatangani", "Wallet mengembalikan hash; transaksi masuk mempool.", "pending", "wait"],
        ["Masuk blok", "Receipt berstatus success. Gas dibayar.", "sukses", "ok"],
        ["State diperbarui", "Saldo, total deposit, dan event mengikuti.", "selesai", "ok"]
      ]
    },
    revert: {
      detail: "Transaksi masuk blok tetapi eksekusinya revert. State tidak berubah, tetapi gas tetap dibayar. Jangan menyamakan revert dengan penolakan wallet.",
      steps: [
        ["Wallet diminta", "Simulasi bisa saja lolos; state dapat berubah sebelum transaksi masuk.", "selesai", "ok"],
        ["Ditandatangani", "Hash tersedia dan transaksi dikirim.", "pending", "wait"],
        ["Masuk blok", "Receipt berstatus reverted.", "revert", "bad"],
        ["Tidak ada perubahan state", "Pengguna tetap membayar gas.", "selesai", "bad"]
      ]
    },
    replaced: {
      detail: "Transaksi dengan nonce yang sama digantikan transaksi lain, biasanya karena biaya lebih tinggi. Hash lama tidak akan selesai; UI harus memantau hash pengganti jika pengguna memberikannya.",
      steps: [
        ["Ditandatangani", "Hash lama tersedia dan masuk mempool.", "pending", "wait"],
        ["Transaksi pengganti", "Nonce sama, biaya lebih tinggi, hash baru.", "replaced", "wait"],
        ["Receipt baru", "Hanya hash baru yang punya receipt.", "sukses", "ok"],
        ["Hash lama", "Tidak akan pernah selesai.", "diabaikan", "bad"]
      ]
    },
    dropped: {
      detail: "Transaksi hilang dari mempool dan tidak masuk blok. Bisa karena biaya terlalu rendah, node restart, atau kapasitas. Jangan mengulang otomatis; tawarkan kirim ulang dengan biaya yang sesuai.",
      steps: [
        ["Ditandatangani", "Hash tersedia, tetapi belum tentu diteruskan.", "pending", "wait"],
        ["Menunggu lama", "Tidak ada receipt setelah waktu yang wajar.", "menunggu", "wait"],
        ["Hilang dari mempool", "Transaksi tidak ditemukan; nonce masih bisa dipakai.", "dropped", "bad"],
        ["Kirim ulang", "Pengguna memutuskan sendiri, dengan biaya baru.", "opsional", "ok"]
      ]
    }
  };

  function render(key) {
    const scenario = scenarios[key] || scenarios.success;
    timeline.innerHTML = scenario.steps.map((step, index) => {
      return '<li class="is-' + step[3] + '">' +
        '<span class="tl-dot" aria-hidden="true">' + (index + 1) + "</span>" +
        '<span class="tl-main"><strong>' + escapeHtml(step[0]) + "</strong><span>" + escapeHtml(step[1]) + "</span></span>" +
        '<span class="tl-state">' + escapeHtml(step[2]) + "</span>" +
        "</li>";
    }).join("");

    setStatus(detail, scenario.detail, key === "success" ? "is-good" : key === "dropped" || key === "revert" ? "is-bad" : "is-wait");

    $$("[data-status-scenario]", host).forEach((button) => {
      const active = button.dataset.statusScenario === key;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-quiet", !active);
    });
  }

  $$("[data-status-scenario]", host).forEach((button) => {
    button.addEventListener("click", () => render(button.dataset.statusScenario));
  });

  render("success");
})();

/* ---------- Lab 10: event feed ---------- */

(function initEventLab() {
  const host = $("#lab-events");
  if (!host) return;

  const feed = $("#events-feed");
  const filter = $("#events-filter");
  const toggle = $("#events-toggle");
  const emit = $("#events-emit");
  const watchState = $("#events-watch-state");
  const status = $("#events-status");
  if (!feed || !filter || !toggle || !emit) return;

  let paused = false;
  let pending = 0;
  let lastCount = sim.events.length;

  function renderFeed(freshHash) {
    const selected = filter.value;
    const events = sim.events.filter((event) => selected === "all" || event.name === selected);

    if (!events.length) {
      feed.innerHTML = '<li class="event-empty">Belum ada event yang cocok dengan filter ini.</li>';
      return;
    }

    feed.innerHTML = events.map((event) => {
      const fresh = event.hash === freshHash;
      return '<li class="' + (fresh ? "is-fresh" : "") + '">' +
        '<span class="ev-name">' + escapeHtml(event.name) + "</span>" +
        '<span class="ev-meta">blok <span class="ev-block">' + event.block.toString() + "</span><br>" +
        escapeHtml(event.hash.slice(0, 10)) + "..." + "</span>" +
        '<span class="ev-args">user ' + escapeHtml(shortAddress(event.user)) + " \u00b7 amount " +
        formatEth(event.amountWei, 4) + " ETH</span>" +
        "</li>";
    }).join("");
  }

  function renderWatchState() {
    toggle.textContent = paused ? "Lanjutkan" : "Jeda";
    toggle.setAttribute("aria-pressed", paused ? "false" : "true");
    watchState.textContent = paused
      ? "Langganan dijeda. Event baru dihitung, tetapi belum ditampilkan."
      : "useWatchContractEvent aktif (simulasi).";
  }

  toggle.addEventListener("click", () => {
    paused = !paused;
    renderWatchState();
    if (!paused) {
      renderFeed();
      if (pending > 0) {
        setStatus(status, pending + " event yang masuk saat jeda sekarang ditampilkan.", "is-good");
        pending = 0;
      } else {
        setStatus(status, "Langganan dilanjutkan. Menunggu event baru.", "");
      }
    } else {
      setStatus(status, "Langganan dijeda. Event baru tidak akan muncul sampai dilanjutkan.", "is-wait");
    }
  });

  filter.addEventListener("change", () => {
    if (!paused) renderFeed();
    setStatus(status, "Filter diubah. " + (paused ? "Feed akan diperbarui saat langganan dilanjutkan." : "Hanya event yang cocok yang ditampilkan."), "");
  });

  emit.addEventListener("click", () => {
    const event = sim.externalDeposit(parseEthInput("0.005"));
    if (!paused) {
      renderFeed(event.hash);
      setStatus(status, "Deposited diterima: " + formatEth(event.amountWei, 4) + " ETH dari " + shortAddress(event.user) + " di blok " + event.block.toString() + ".", "is-good");
    } else {
      setStatus(status, "Event baru masuk saat jeda. Lanjutkan langganan untuk menampilkannya.", "is-wait");
    }
  });

  sim.on(() => {
    if (paused) {
      if (sim.events.length > lastCount) {
        pending += sim.events.length - lastCount;
        lastCount = sim.events.length;
      }
      return;
    }

    if (sim.events.length > lastCount) {
      const fresh = sim.events[0];
      lastCount = sim.events.length;
      renderFeed(fresh ? fresh.hash : null);
      setStatus(status, "Event " + fresh.name + " diterima di blok " + fresh.block.toString() + ".", "is-good");
    }
  });

  renderWatchState();
  renderFeed();
})();

/* ---------- Lab 11: pesan error ---------- */

(function initErrorLab() {
  const host = $("#lab-errors");
  if (!host) return;

  const status = $("#ux-status");
  const tasks = $$("[data-ux-task]", host);

  $("#ux-check").addEventListener("click", () => {
    let correct = 0;
    let missing = 0;

    tasks.forEach((task) => {
      const select = $("select", task);
      task.classList.remove("is-ok", "is-bad");
      if (!select.value) {
        missing += 1;
        return;
      }
      if (select.value === task.dataset.answer) {
        correct += 1;
        task.classList.add("is-ok");
      } else {
        task.classList.add("is-bad");
      }
    });

    if (missing) {
      setStatus(status, "Masih ada " + missing + " skenario tanpa pilihan.", "is-bad");
      return;
    }

    if (correct === tasks.length) {
      setStatus(status, "Semua pesan tepat. Kamu membedakan penolakan, chain salah, revert kontrak, gas, dan RPC.", "is-good");
    } else {
      setStatus(status, correct + " dari " + tasks.length + " tepat. Pesan yang benar menyebut apa yang terjadi dan langkah berikutnya.", "is-bad");
    }
  });

  $("#ux-reset").addEventListener("click", () => {
    tasks.forEach((task) => {
      task.classList.remove("is-ok", "is-bad");
      $("select", task).value = "";
    });
    setStatus(status, "Belum ada pilihan.", "");
  });
})();

/* ---------- Lab 12: checklist ---------- */

(function initChecklist() {
  const list = $("#checklist");
  if (!list) return;

  const status = $("#checklist-status");
  const boxes = $$("input[data-check]", list);
  const key = "jembatan.checklist.v1";
  const saved = store.get(key, []);
  const done = new Set(Array.isArray(saved) ? saved.map(String) : []);

  const render = () => {
    const count = boxes.filter((box) => box.checked).length;
    setStatus(status, count + " dari 8 target dicentang." + (count === 8 ? " Semua target punya bukti di proyekmu." : " Lengkapi dengan mencoba di proyek sendiri."), count === 8 ? "is-good" : "");
  };

  boxes.forEach((box) => {
    box.checked = done.has(box.dataset.check);
    box.addEventListener("change", () => {
      if (box.checked) done.add(box.dataset.check);
      else done.delete(box.dataset.check);
      store.set(key, Array.from(done));
      render();
    });
  });

  render();
})();

/* ---------- Uji kompetensi ---------- */

const quizQuestions = [
  {
    q: "Mengapa provider Wagmi harus berada di client component?",
    options: [
      "Agar SEO halaman lebih baik",
      "Karena memakai hook React dan API browser",
      "Agar ukuran bundle lebih kecil",
      "Karena kontrak membutuhkannya"
    ],
    answer: 1,
    explain: "WagmiProvider memakai context dan hook React, serta bergantung pada wallet browser. Layout dan route API tetap bisa server component."
  },
  {
    q: "Hook Wagmi mana yang dipakai untuk membaca fungsi view kontrak?",
    options: ["useBalance", "useReadContract", "useWriteContract", "useSignMessage"],
    answer: 1,
    explain: "useReadContract memanggil fungsi view atau pure dengan ABI dan argumen. useWriteContract untuk transaksi yang mengubah state."
  },
  {
    q: "Apa arti hash yang dikembalikan writeContract?",
    options: [
      "Transaksi pasti berhasil",
      "Wallet sudah menandatangani dan transaksi dikirim, tetapi belum tentu masuk blok",
      "Dana sudah berpindah",
      "Kontrak sudah diverifikasi"
    ],
    answer: 1,
    explain: "Hash berarti transaksi disusun dan dikirim. Bukti akhir adalah receipt. Transaksi bisa pending, reverted, replaced, atau dropped."
  },
  {
    q: "Apa arti receipt.status === \"reverted\"?",
    options: [
      "Transaksi belum dikirim",
      "Transaksi masuk blok tetapi eksekusi gagal; gas tetap dibayar",
      "Wallet menolak tanda tangan",
      "RPC timeout"
    ],
    answer: 1,
    explain: "Revert terjadi saat eksekusi gagal setelah transaksi masuk blok. State tidak berubah, tetapi gas sudah dikonsumsi."
  },
  {
    q: "useWaitForTransactionReceipt menunggu apa?",
    options: [
      "Popup wallet ditutup",
      "Receipt setelah transaksi masuk blok",
      "Signature pesan",
      "Event historis"
    ],
    answer: 1,
    explain: "Hook ini memantau hash sampai receipt tersedia. Menunggu wallet adalah isPending dari useWriteContract."
  },
  {
    q: "personal_sign membuktikan apa?",
    options: [
      "Saldo wallet cukup",
      "Kontrol private key atas address untuk pesan tersebut",
      "Kontrak bebas bug",
      "Transaksi sudah final"
    ],
    answer: 1,
    explain: "Signature membuktikan kontrol kunci pada saat menandatangani pesan tertentu. Ia tidak otomatis berarti pengguna ingin melakukan transaksi."
  },
  {
    q: "Mengapa pesan login membutuhkan nonce?",
    options: [
      "Menambah biaya gas",
      "Mencegah signature yang sama dipakai ulang",
      "Mengganti chain id",
      "Mempercepat RPC"
    ],
    answer: 1,
    explain: "Nonce sekali pakai membuat signature lama tidak bisa diulang di sesi lain. Server harus menyimpan dan menghapus nonce setelah dipakai."
  },
  {
    q: "Variable environment mana yang terlihat di browser?",
    options: ["NEXT_PUBLIC_", "SECRET_", "PRIVATE_", "SERVER_ONLY_"],
    answer: 0,
    explain: "Next.js mengekspos variable berprefix NEXT_PUBLIC_ ke bundle klien. Jangan menaruh private key atau API key rahasia di sana."
  },
  {
    q: "Membaca balanceOf(address) membutuhkan gas?",
    options: [
      "Ya, selalu",
      "Tidak, karena fungsi view dibaca tanpa transaksi",
      "Hanya di mainnet",
      "Hanya jika wallet terhubung"
    ],
    answer: 1,
    explain: "Fungsi view dan pure dieksekusi oleh node untuk mengembalikan data. Tidak ada transaksi, tanda tangan, atau biaya gas."
  },
  {
    q: "Apa hasil parseEther(\"0.01\")?",
    options: [
      "1000000000000000n",
      "10000000000000000n",
      "100000000000000000n",
      "0.01n"
    ],
    answer: 1,
    explain: "1 ETH = 10^18 wei. 0.01 ETH = 10^16 wei = 10000000000000000n."
  },
  {
    q: "Viem mengembalikan uint256 sebagai tipe apa?",
    options: ["number", "string", "bigint", "boolean"],
    answer: 2,
    explain: "Nilai uint256 bisa melebihi batas aman number. Viem mengembalikannya sebagai bigint agar presisi tidak hilang."
  },
  {
    q: "Cara paling tepat mencegah dua transaksi untuk satu klik?",
    options: [
      "Hanya menyembunyikan tombol dengan CSS",
      "Nonaktifkan tombol selama pending dan confirming, serta cek guard di handler",
      "Menghapus form setelah klik",
      "Memakai setTimeout sebelum mengirim"
    ],
    answer: 1,
    explain: "Nonaktifkan tombol dan lindungi handler dari pemanggilan ganda. Jangan mengandalkan tampilan saja."
  },
  {
    q: "Berapa chain id Sepolia?",
    options: ["1", "11155111", "31337", "137"],
    answer: 1,
    explain: "Sepolia memakai 11155111. Ethereum mainnet 1, Anvil 31337, Polygon 137."
  },
  {
    q: "injected connector memakai apa?",
    options: [
      "ABI kontrak",
      "Provider wallet yang disuntikkan ke window.ethereum",
      "Private key di localStorage",
      "Indexer event"
    ],
    answer: 1,
    explain: "Injected connector berbicara dengan provider yang dipasang wallet di browser, biasanya window.ethereum."
  },
  {
    q: "Parameter event yang diberi indexed akan ...",
    options: [
      "Disimpan di storage kontrak",
      "Masuk ke topik dan bisa difilter",
      "Tidak bisa dibaca sama sekali",
      "Selalu dihapus saat reorg"
    ],
    answer: 1,
    explain: "Parameter indexed di-encode ke topik log. Parameter non-indexed berada di data dan tidak bisa difilter langsung."
  },
  {
    q: "Apa perbedaan useWatchContractEvent dan getLogs?",
    options: [
      "Keduanya hanya membaca event historis",
      "Watch untuk event baru, getLogs untuk riwayat",
      "getLogs hanya untuk event baru",
      "Watch menyimpan event selamanya"
    ],
    answer: 1,
    explain: "useWatchContractEvent berlangganan event baru selama komponen aktif. getLogs membaca rentang blok historis."
  },
  {
    q: "Apa yang harus dilakukan jika chain wallet tidak sesuai?",
    options: [
      "Abaikan dan kirim transaksi",
      "Bandingkan chainId dan minta pengguna switch ke chain yang didukung",
      "Ganti alamat kontrak otomatis",
      "Kirim ke chain mana pun yang tersedia"
    ],
    answer: 1,
    explain: "Transaksi harus dikirim ke chain yang benar. Tampilkan peringatan dan tombol useSwitchChain, lalu tangani penolakan."
  },
  {
    q: "Apakah validasi di frontend cukup untuk menegakkan aturan?",
    options: [
      "Ya, jika memakai TypeScript",
      "Tidak; kontrak harus tetap menolak input yang tidak sah",
      "Ya, karena wallet memvalidasi",
      "Ya, jika ada CAPTCHA"
    ],
    answer: 1,
    explain: "Frontend bisa dilewati. Kontrak adalah penjaga terakhir dan harus menegakkan aturan, misalnya menolak deposit nol."
  },
  {
    q: "Di mana signature login harus diverifikasi?",
    options: [
      "Di browser, lalu kirim boolean true ke server",
      "Di server dengan verifyMessage dan nonce yang dikelola server",
      "Cukup dengan mengecek address di localStorage",
      "Cukup percaya wallet"
    ],
    answer: 1,
    explain: "Server harus memverifikasi signature, nonce, domain, dan masa berlaku. Boolean dari klien tidak bisa dipercaya."
  },
  {
    q: "Apa arti log dengan removed: true?",
    options: [
      "Event baru",
      "Blok dibatalkan oleh reorg, jadi log tidak lagi final",
      "Transaksi sukses",
      "Signature valid"
    ],
    answer: 1,
    explain: "removed menandai log yang hilang karena reorganisasi blok. Indexer dan UI harus menanganinya, bukan menampilkannya sebagai final."
  }
];

(function initQuiz() {
  const form = $("#quiz-form");
  if (!form) return;

  const submit = $("#quiz-submit");
  const retry = $("#quiz-retry");
  const status = $("#quiz-status");
  const result = $("#quiz-result");

  form.innerHTML = quizQuestions.map((item, index) => {
    const options = item.options.map((option, optionIndex) => {
      const id = "q" + (index + 1) + "-o" + (optionIndex + 1);
      return '<label class="option" for="' + id + '"><input id="' + id + '" type="radio" name="q' + (index + 1) + '" value="' + optionIndex + '"><span>' + escapeHtml(option) + "</span></label>";
    }).join("");

    return '<fieldset class="quiz-q"><legend><span class="q-num">' + String(index + 1).padStart(2, "0") + "</span>" + escapeHtml(item.q) + "</legend>" + options + "</fieldset>";
  }).join("");

  const mark = (index) => {
    const fieldset = form.querySelectorAll(".quiz-q")[index];
    if (!fieldset) return;
    const options = $$(".option", fieldset);
    const selected = $("input:checked", fieldset);

    options.forEach((label, optionIndex) => {
      label.classList.remove("is-correct", "is-wrong");
      const old = $(".mark", label);
      if (old) old.remove();

      if (optionIndex === quizQuestions[index].answer) {
        label.classList.add("is-correct");
        const badge = document.createElement("span");
        badge.className = "mark";
        badge.textContent = "benar";
        label.appendChild(badge);
      } else if (selected && Number(selected.value) === optionIndex) {
        label.classList.add("is-wrong");
        const badge = document.createElement("span");
        badge.className = "mark";
        badge.textContent = "pilihanmu";
        label.appendChild(badge);
      }
    });

    const explain = document.createElement("p");
    explain.className = "quiz-explain";
    explain.textContent = quizQuestions[index].explain;
    fieldset.appendChild(explain);

    $$("input", fieldset).forEach((input) => { input.disabled = true; });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = new FormData(form);
    const missing = [];

    quizQuestions.forEach((item, index) => {
      if (!answers.get("q" + (index + 1))) missing.push(index + 1);
    });

    if (missing.length) {
      setStatus(status, "Masih ada " + missing.length + " soal tanpa jawaban. Lengkapi dulu.", "is-bad");
      const first = form.querySelector('input[name="q' + missing[0] + '"]');
      if (first) first.focus();
      return;
    }

    let score = 0;
    quizQuestions.forEach((item, index) => {
      const value = Number(answers.get("q" + (index + 1)));
      if (value === item.answer) score += 1;
      mark(index);
    });

    const best = Math.max(score, Number(store.get("jembatan.quiz.v1", 0)) || 0);
    store.set("jembatan.quiz.v1", best);

    const passed = score >= 16;
    if (passed && window.setProgressDone) window.setProgressDone("uji", true, false);

    if (result) {
      result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
        "<h3>" + (passed ? "Lulus." : "Belum lulus.") + "</h3>" +
        "<p>Skor " + score + " dari 20. Skor terbaikmu " + best + " dari 20. " +
        (passed
          ? "Kamu memahami alur frontend Web3 dan batasnya. Lanjutkan dengan proyek nyata di testnet."
          : "Baca ulang penjelasan di bawah, lalu coba lagi. Minimal 16 benar untuk lulus.") +
        "</p></div>";
    }

    setStatus(status, passed ? "Ujian lulus. Progres ujian ditandai." : "Ujian belum lulus. Periksa penjelasan tiap soal.", passed ? "is-good" : "is-bad");
    if (submit) submit.disabled = true;
  });

  if (retry) {
    retry.addEventListener("click", () => {
      form.reset();
      $$(".option", form).forEach((label) => {
        label.classList.remove("is-correct", "is-wrong");
        const badge = $(".mark", label);
        if (badge) badge.remove();
      });
      $$(".quiz-explain", form).forEach((el) => el.remove());
      $$("input", form).forEach((input) => { input.disabled = false; });
      if (result) result.innerHTML = "";
      if (submit) submit.disabled = false;
      setStatus(status, "Belum ada jawaban yang diperiksa.", "");
      const first = $("input", form);
      if (first) first.focus();
    });
  }
})();

/* ---------- Mulai sorotan setelah DOM siap ---------- */

initHighlight();

