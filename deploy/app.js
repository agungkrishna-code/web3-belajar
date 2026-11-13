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
  window.setTimeout(() => {
    button.textContent = original;
  }, 1600);
});

/* ---------- Sorotan kode ---------- */

const SOL_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d[\d_]*)\b|\b(pragma|solidity|contract|interface|library|abstract|is|using|function|modifier|event|error|struct|enum|mapping|constructor|receive|fallback|returns|return|if|else|for|while|do|break|continue|emit|revert|require|assert|try|catch|new|delete|import|from|as|unchecked|assembly|virtual|override|super|constant|immutable|public|private|internal|external|pure|view|payable|memory|storage|calldata|true|false|type|this|msg|block|tx)\b|\b(address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?)\b/g;

const JS_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(0x[0-9a-fA-F]+|\d[\d_]*(?:\.\d+)?n?)\b|\b(import|from|export|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|implements|type|interface|enum|as|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false|this|super|static|public|private|protected|readonly|declare|module|namespace|satisfies|keyof|useState|useEffect|useMemo|useCallback|useRef|useAccount|useReadContract|useWriteContract|useWaitForTransactionReceipt|useSimulateContract|useChainId|useSwitchChain|useWalletClient|createConfig|injected|http|sepolia)\b/g;

const BASH_TOKEN_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^|\s)(\$)(?=[A-Za-z_{])|\b(forge|cast|anvil|chisel|foundryup|curl|git|cd|mkdir|ls|echo|source|export|npm|npx|node|jq|Get-Content|Set-Item|if|else)\b/gm;

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
  if (lang === "bash" || lang === "sh" || lang === "shell" || lang === "powershell" || lang === "toml") return highlightBash(code);
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

function setCode(id, code, lang) {
  const block = document.getElementById(id);
  if (!block) return;
  block.innerHTML = highlightCode(code, lang || block.dataset.lang || "text");
}

/* ---------- Lab 01: pilih jaringan ---------- */

(function initNetworkLab() {
  const tasks = $$("[data-pick]");
  const check = $("#network-check");
  const reset = $("#network-reset");
  const status = $("#network-status");
  if (!tasks.length || !check || !status) return;

  const evaluate = () => {
    let correct = 0;
    tasks.forEach((task) => {
      const select = $("select", task);
      const ok = select && select.value === task.dataset.answer;
      task.classList.toggle("is-ok", Boolean(ok));
      task.classList.toggle("is-bad", Boolean(select && select.value && !ok));
      if (ok) correct += 1;
    });
    return correct;
  };

  check.addEventListener("click", () => {
    const correct = evaluate();
    const filler = status.closest(".lab-body").querySelector(".lab-note");
    if (correct === tasks.length) {
      status.textContent = "Semua tepat. Kamu memilih berdasarkan konteks, bukan peringkat jaringan.";
      status.className = "status is-good";
    } else {
      status.textContent = correct + " dari " + tasks.length + " tepat. Periksa kartu yang ditandai merah: konteks pekerjaannya berbeda.";
      status.className = "status is-bad";
    }
    if (filler) filler.classList.remove("is-hidden");
  });

  if (reset) {
    reset.addEventListener("click", () => {
      tasks.forEach((task) => {
        const select = $("select", task);
        if (select) select.value = "";
        task.classList.remove("is-ok", "is-bad");
      });
      status.textContent = "Belum ada pilihan.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 02: RPC bench ---------- */

(function initRpcLab() {
  const method = $("#rpc-method");
  const endpoint = $("#rpc-endpoint");
  const request = $("#rpc-request");
  const response = $("#rpc-response");
  const hint = $("#rpc-hint");
  const chain = $("#rpc-chain");
  const chainId = $("#rpc-chainid");
  const source = $("#rpc-source");
  const note = $("#rpc-note");
  if (!method || !endpoint || !request || !response) return;

  const address = "0x2222222222222222222222222222222222222222";
  const txHash = "0x8f3c5a1d2b7e4f6a9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a21";

  const data = {
    chainId: {
      params: [],
      sepolia: "0xaa36a7",
      anvil: "0x7a69",
      note: "Chain ID harus cocok dengan 11155111 untuk Sepolia."
    },
    blockNumber: {
      params: [],
      sepolia: "0x7a1b3c",
      anvil: "0x1",
      note: "Nomor blok selalu bertambah. Nilai ini ilustrasi."
    },
    balance: {
      params: [address],
      sepolia: "0xb1a2bc2ec50000",
      anvil: "0x21e19e0c9bab2400000",
      note: "Saldo dalam wei. 0xb1a2bc2ec50000 sama dengan 0,05 ETH."
    },
    code: {
      params: [address],
      sepolia: "0x6080604052348015600f57600080fd5b50",
      anvil: "0x6080604052348015600f57600080fd5b50",
      note: "Jika hasilnya 0x, tidak ada kontrak di alamat itu."
    },
    receipt: {
      params: [txHash],
      sepolia: {
        status: "0x1",
        blockNumber: "0x7a1b3c",
        gasUsed: "0x4c4b40",
        contractAddress: address
      },
      anvil: {
        status: "0x1",
        blockNumber: "0x1",
        gasUsed: "0x4c4b40",
        contractAddress: address
      },
      note: "status 0x1 sukses, 0x0 revert. contractAddress hanya ada pada deploy."
    },
    estimate: {
      params: [{ from: address, to: null, data: "0x6080604052..." }],
      sepolia: "0x4c4b40",
      anvil: "0x4c4b40",
      note: "Hasil estimasi bukan jaminan. Tambahkan buffer dan baca receipt."
    }
  };

  const render = () => {
    const key = method.value;
    const ep = endpoint.value;
    const entry = data[key];
    const params = entry.params;

    const req = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_" + key,
      params
    };
    req.method = key === "chainId" ? "eth_chainId" : key === "blockNumber" ? "eth_blockNumber" : key === "balance" ? "eth_getBalance" : key === "code" ? "eth_getCode" : key === "receipt" ? "eth_getTransactionReceipt" : "eth_estimateGas";

    const res = {
      jsonrpc: "2.0",
      id: 1,
      result: ep === "anvil" ? entry.anvil : entry.sepolia
    };

    setCode("rpc-request", JSON.stringify(req, null, 2), "json");
    setCode("rpc-response", JSON.stringify(res, null, 2), "json");

    const isAnvil = ep === "anvil";
    const isAlchemy = ep === "alchemy";
    chain.textContent = isAnvil ? "Anvil" : "Sepolia";
    chainId.textContent = isAnvil ? "31337" : "11155111";
    source.textContent = isAnvil ? "node lokal (ilustrasi)" : isAlchemy ? "provider (key disamarkan)" : "endpoint publik (ilustrasi)";
    note.textContent = entry.note;
    if (hint) {
      hint.textContent = isAlchemy
        ? "URL provider berisi API key. Jangan menaruh key itu di frontend publik atau repositori."
        : isAnvil
          ? "Anvil hanya ada di komputermu. Chain ID 31337 tidak sama dengan Sepolia."
          : "Endpoint publik cocok untuk latihan. Untuk aplikasi, pakai provider dengan kuota dan key yang dikelola.";
    }
  };

  method.addEventListener("change", render);
  endpoint.addEventListener("change", render);
  render();
})();

/* ---------- Lab 03: faucet ---------- */

(function initFaucetLab() {
  const input = $("#faucet-address");
  const profile = $("#faucet-profile");
  const activity = $("#faucet-activity");
  const low = $("#faucet-low");
  const sepolia = $("#faucet-sepolia");
  const check = $("#faucet-check");
  const reset = $("#faucet-reset");
  const status = $("#faucet-status");
  const format = $("#faucet-format");
  const risk = $("#faucet-risk");
  const next = $("#faucet-next");
  if (!input || !check || !status) return;

  const zeros = /^0x0{40}$/i;

  const evaluate = () => {
    const value = input.value.trim();
    const valid = /^0x[a-fA-F0-9]{40}$/.test(value);
    const zero = zeros.test(value);
    const isDev = profile.value === "dev";
    const conditions = [valid && !zero, isDev, activity.checked, low.checked, sepolia.checked];
    const missing = [];

    if (!valid) missing.push("format alamat belum valid");
    else if (zero) missing.push("alamat nol tidak bisa menerima klaim");

    if (!isDev) missing.push(profile.value === "main" ? "jangan memakai wallet utama" : "status wallet belum jelas");
    if (!activity.checked) missing.push("syarat aktivitas mainnet belum dipenuhi");
    if (!low.checked) missing.push("saldo testnet mungkin terlalu tinggi");
    if (!sepolia.checked) missing.push("faucet belum dipastikan menargetkan Sepolia");

    format.textContent = valid ? (zero ? "valid tetapi alamat nol" : "valid, 42 karakter") : "belum valid";
    risk.textContent = zero ? "tinggi" : isDev ? "rendah" : "perlu diperbaiki";
    next.textContent = conditions.every(Boolean)
      ? "buka faucet resmi, tempel alamat, selesaikan verifikasi"
      : missing[0];

    if (conditions.every(Boolean)) {
      status.textContent = "Siap klaim (simulasi). Alamat boleh dikirim, kunci tidak.";
      status.className = "status is-good";
    } else {
      status.textContent = "Belum siap: " + missing.join("; ") + ".";
      status.className = "status is-bad";
    }
  };

  check.addEventListener("click", evaluate);

  [activity, low, sepolia, profile].forEach((el) => {
    el.addEventListener("change", () => {
      if (status.textContent !== "Belum ada pemeriksaan.") evaluate();
    });
  });

  input.addEventListener("input", () => {
    if (status.textContent !== "Belum ada pemeriksaan.") evaluate();
  });

  if (reset) {
    reset.addEventListener("click", () => {
      input.value = "";
      profile.value = "dev";
      activity.checked = false;
      low.checked = false;
      sepolia.checked = false;
      status.textContent = "Belum ada pemeriksaan.";
      status.className = "status";
      format.textContent = "belum diperiksa";
      risk.textContent = "belum diperiksa";
      next.textContent = "isi data di atas";
      input.focus();
    });
  }
})();

/* ---------- Lab 04: env builder ---------- */

(function initEnvLab() {
  const fields = {
    rpc: $("#env-rpc"),
    key: $("#env-key"),
    gitignore: $("#env-gitignore"),
    keystore: $("#env-keystore"),
    chain: $("#env-chain"),
    publicKey: $("#env-public")
  };
  const preview = $("#env-preview");
  const status = $("#env-status");
  const reset = $("#env-reset");
  if (!preview || !status) return;

  const render = () => {
    const missing = [];
    if (!fields.rpc.checked) missing.push("RPC URL belum dibaca dari environment");
    if (!fields.key.checked) missing.push("API key verifikasi masih berisiko");
    if (!fields.gitignore.checked) missing.push(".env belum masuk .gitignore");
    if (!fields.keystore.checked) missing.push("akun deploy belum memakai keystore");
    if (!fields.chain.checked) missing.push("chain ID belum diperiksa");
    if (!fields.publicKey.checked) missing.push("secret di frontend belum diperiksa");

    const lines = [
      "# .env (contoh, jangan di-commit)",
      "SEPOLIA_RPC_URL=" + (fields.rpc.checked ? "${SEPOLIA_RPC_URL}" : "https://ethereum-sepolia-rpc.publicnode.com"),
      "ETHERSCAN_API_KEY=" + (fields.key.checked ? "${ETHERSCAN_API_KEY}" : "GANTI_DENGAN_KEY"),
      "DEV_ADDRESS=0x2222222222222222222222222222222222222222",
      "# PRIVATE_KEY tidak ditulis di file ini",
      "",
      "# foundry.toml",
      "[rpc_endpoints]",
      "sepolia = " + (fields.rpc.checked ? '"${SEPOLIA_RPC_URL}"' : '"https://..."'),
      "",
      "[etherscan]",
      "sepolia = { key = " + (fields.key.checked ? '"${ETHERSCAN_API_KEY}"' : '"GANTI_DENGAN_KEY"') + ", chain = 11155111 }",
      "",
      "# catatan",
      "- deploy memakai: " + (fields.keystore.checked ? "cast wallet / --account" : "private key mentah (tidak disarankan)"),
      "- chain check: " + (fields.chain.checked ? "cast chain-id == 11155111" : "belum dijalankan"),
      "- .env di gitignore: " + (fields.gitignore.checked ? "ya" : "tidak")
    ];

    if (missing.length) {
      lines.push("");
      lines.push("# PERINGATAN");
      missing.forEach((item) => lines.push("- " + item));
    }

    preview.textContent = lines.join("\n");
    if (missing.length) {
      status.textContent = missing.length + " praktik belum aman: " + missing[0] + ".";
      status.className = "status is-bad";
    } else {
      status.textContent = "Konfigurasi aman untuk latihan. Secret tetap tidak boleh masuk frontend.";
      status.className = "status is-good";
    }
  };

  Object.values(fields).forEach((el) => {
    if (el) el.addEventListener("change", render);
  });

  if (reset) {
    reset.addEventListener("click", () => {
      Object.values(fields).forEach((el) => {
        if (el) el.checked = true;
      });
      render();
    });
  }

  render();
})();

/* ---------- Lab 05: deploy pipeline ---------- */

(function initDeployLab() {
  const run = $("#deploy-run");
  const reset = $("#deploy-reset");
  const term = $("#deploy-term");
  const pipeline = $("#deploy-pipeline");
  const status = $("#deploy-status");
  const address = $("#deploy-address");
  const hash = $("#deploy-hash");
  const block = $("#deploy-block");
  const tool = $("#deploy-tool");
  const owner = $("#deploy-owner");
  const checks = ["#deploy-chain", "#deploy-balance", "#deploy-dry", "#deploy-verify", "#deploy-clean"].map((sel) => $(sel));
  if (!run || !pipeline || !term) return;

  let token = 0;

  const step = (name, state, label) => {
    const el = $('[data-deploy-step="' + name + '"]', pipeline);
    if (!el) return;
    el.classList.remove("is-idle", "is-active", "is-ok", "is-bad");
    el.classList.add(state);
    const stateEl = $(".pipe-state", el);
    if (stateEl && label) stateEl.textContent = label;
  };

  const resetSteps = () => {
    $$("[data-deploy-step]", pipeline).forEach((el) => {
      el.classList.remove("is-idle", "is-active", "is-ok", "is-bad");
      el.classList.add("is-idle");
      const stateEl = $(".pipe-state", el);
      if (stateEl) stateEl.textContent = "menunggu";
    });
    term.textContent = "Menunggu perintah.";
    if (status) status.textContent = "belum dijalankan";
    if (address) address.textContent = "belum ada";
    if (hash) hash.textContent = "belum ada";
    if (block) block.textContent = "belum ada";
  };

  const fakeHex = (bytes) => {
    const arr = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
    else for (let i = 0; i < arr.length; i += 1) arr[i] = Math.floor(Math.random() * 256);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const append = (line) => {
    term.textContent = term.textContent === "Menunggu perintah." ? line : term.textContent + "\n" + line;
  };

  run.addEventListener("click", async () => {
    if (run.disabled) return;
    token += 1;
    const current = token;
    resetSteps();
    run.disabled = true;

    const missing = [];
    if (checks.some((el) => el && !el.checked)) missing.push("preflight belum lengkap");
    if (owner.value === "zero") missing.push("owner tidak boleh alamat nol");
    if (owner.value === "unknown") missing.push("owner belum ditentukan");

    step("check", "is-active", "memeriksa");
    append("$ preflight --network sepolia");
    await wait(500);
    if (current !== token) return;

    if (missing.length) {
      step("check", "is-bad", "gagal");
      append("✗ " + missing.join("; "));
      append("Deploy dibatalkan sebelum tanda tangan. Tidak ada transaksi.");
      if (status) status.textContent = "dibatalkan: " + missing.join("; ");
      run.disabled = false;
      return;
    }

    step("check", "is-ok", "lulus");
    append("✓ chain 11155111, saldo cukup, dry run lulus, verifikasi siap");

    step("sign", "is-active", "menunggu wallet");
    append("→ menandatangani dengan akun deployer-dev...");
    await wait(550);
    if (current !== token) return;
    step("sign", "is-ok", "ditandatangani");
    append("✓ transaksi ditandatangani (simulasi)");

    step("send", "is-active", "mengirim");
    const txHash = "0x" + fakeHex(32);
    if (hash) hash.textContent = txHash;
    append("→ broadcast ke RPC Sepolia");
    await wait(650);
    if (current !== token) return;
    step("send", "is-ok", "terkirim");
    append("✓ tx " + txHash.slice(0, 12) + "...");

    step("mine", "is-active", "menunggu blok");
    append("… menunggu receipt");
    await wait(750);
    if (current !== token) return;
    const contract = "0x" + fakeHex(20);
    const blockNumber = 7842000 + Math.floor(Math.random() * 20000);
    if (address) address.textContent = contract;
    if (block) block.textContent = String(blockNumber);
    if (status) status.textContent = "mined, menunggu verifikasi";
    step("mine", "is-ok", "mined");
    append("✓ blok " + blockNumber + ", status 0x1");
    append("✓ contract " + contract);

    step("verify", "is-active", "mengirim source");
    append("→ verifikasi source dan constructor args");
    await wait(700);
    if (current !== token) return;
    step("verify", "is-ok", "terverifikasi");
    if (status) status.textContent = "sukses (simulasi)";
    append("✓ source cocok, kontrak terverifikasi");
    append("Selesai. Salin alamat dari receipt, bukan dari tebakan.");
    run.disabled = false;
    toast("Deploy simulasi selesai.");
  });

  if (reset) {
    reset.addEventListener("click", () => {
      token += 1;
      resetSteps();
      run.disabled = false;
      $$("input[type=checkbox]", $("#lab-deploy")).forEach((el) => { el.checked = true; });
      tool.value = "forge";
      owner.value = "dev";
    });
  }

  resetSteps();
})();

/* ---------- Lab 06: gas estimator ---------- */

(function initGasLab() {
  const limit = $("#gas-limit");
  const base = $("#gas-base");
  const priority = $("#gas-priority");
  const used = $("#gas-used");
  const buffer = $("#gas-buffer");
  const maxFee = $("#gas-maxfee");
  const maxCost = $("#gas-maxcost");
  const effCost = $("#gas-effcost");
  const buffered = $("#gas-buffered");
  const refund = $("#gas-refund");
  const status = $("#gas-status");
  if (!limit || !base || !priority || !used || !buffer || !maxFee) return;

  const ethFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 8 });
  const numFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

  const calculate = () => {
    const gasLimit = Number(limit.value);
    const baseFee = Number(base.value);
    const tip = Number(priority.value);
    const gasUsed = Number(used.value);
    const factor = Number(buffer.value);

    const problems = [];
    if (!Number.isFinite(gasLimit) || gasLimit < 21000) problems.push("gas limit minimal 21.000");
    if (!Number.isFinite(baseFee) || baseFee < 0) problems.push("base fee tidak boleh negatif");
    if (!Number.isFinite(tip) || tip < 0) problems.push("priority fee tidak boleh negatif");
    if (!Number.isFinite(gasUsed) || gasUsed < 21000) problems.push("gas used minimal 21.000");

    const limitBuffered = Math.ceil(gasLimit * factor);
    if (Number.isFinite(gasUsed) && Number.isFinite(limitBuffered) && gasUsed > limitBuffered) {
      problems.push("gas used melebihi gas limit setelah buffer");
    }

    if (problems.length) {
      status.textContent = problems.join("; ") + ".";
      status.className = "status is-bad";
      return;
    }

    const fee = baseFee + tip;
    const maxCostEth = (limitBuffered * fee) / 1e9;
    const effCostEth = (Math.min(gasUsed, limitBuffered) * fee) / 1e9;
    const refundEth = Math.max(0, (limitBuffered - gasUsed) * fee) / 1e9;

    maxFee.textContent = fee.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " gwei";
    maxCost.textContent = ethFmt.format(maxCostEth) + " ETH";
    effCost.textContent = ethFmt.format(effCostEth) + " ETH";
    buffered.textContent = numFmt.format(limitBuffered) + " gas";
    refund.textContent = ethFmt.format(refundEth) + " ETH";
    status.textContent = "Dihitung dari asumsi input. Base fee jaringan bisa berubah setiap blok.";
    status.className = "status";
  };

  [limit, base, priority, used, buffer].forEach((el) => {
    if (el) el.addEventListener("input", calculate);
    if (el) el.addEventListener("change", calculate);
  });

  $$("[data-gas-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.gasPreset;
      if (preset === "slow") {
        base.value = "1.5";
        priority.value = "0.2";
      } else if (preset === "standard") {
        base.value = "2";
        priority.value = "1";
      } else {
        base.value = "3";
        priority.value = "2";
      }
      $$("[data-gas-preset]").forEach((el) => el.setAttribute("aria-pressed", el === button ? "true" : "false"));
      calculate();
    });
  });

  calculate();
})();

/* ---------- Lab 07: konfirmasi transaksi ---------- */

(function initConfirmLab() {
  const outcome = $("#conf-outcome");
  const speed = $("#conf-speed");
  const track = $("#conf-track");
  const run = $("#conf-run");
  const reset = $("#conf-reset");
  const status = $("#conf-status");
  const hashEl = $("#conf-hash");
  const blockEl = $("#conf-block");
  const stateEl = $("#conf-state");
  const countEl = $("#conf-count");
  if (!outcome || !track || !run) return;

  let token = 0;

  const setStep = (name, state, label) => {
    const el = $('[data-conf-step="' + name + '"]', track);
    if (!el) return;
    el.classList.remove("is-ok", "is-bad", "is-wait");
    if (state) el.classList.add(state);
    const text = $("span:last-child", el);
    if (text && label) text.textContent = label;
  };

  const resetSteps = () => {
    ["sign", "pending", "mined", "receipt", "confirm", "final"].forEach((name) => {
      const el = $('[data-conf-step="' + name + '"]', track);
      if (el) {
        el.classList.remove("is-ok", "is-bad", "is-wait");
        const text = $("span:last-child", el);
        if (text) text.textContent = { sign: "Tanda tangan", pending: "Pending", mined: "Mined", receipt: "Receipt", confirm: "Konfirmasi", final: "Final" }[name];
      }
    });
    if (hashEl) hashEl.textContent = "belum ada";
    if (blockEl) blockEl.textContent = "belum ada";
    if (stateEl) stateEl.textContent = "idle";
    if (countEl) countEl.textContent = "0";
  };

  const fakeHash = () => {
    const arr = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
    else for (let i = 0; i < arr.length; i += 1) arr[i] = Math.floor(Math.random() * 256);
    return "0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const stepWait = () => (speed && speed.value === "fast" ? 180 : 620);

  run.addEventListener("click", async () => {
    if (run.disabled) return;
    token += 1;
    const current = token;
    resetSteps();
    run.disabled = true;
    const type = outcome.value;
    const txHash = fakeHash();
    const blockNumber = 7842100 + Math.floor(Math.random() * 1000);

    setStep("sign", "is-wait", "Menunggu wallet");
    if (status) {
      status.textContent = "Menunggu persetujuan di wallet...";
      status.className = "status is-wait";
    }
    await wait(stepWait());
    if (current !== token) return;

    if (type === "reject") {
      setStep("sign", "is-bad", "Ditolak");
      if (hashEl) hashEl.textContent = "tidak ada";
      if (stateEl) stateEl.textContent = "ditolak";
      if (status) {
        status.textContent = "Wallet menolak. Tidak ada transaksi, tidak ada hash, dan tidak ada gas.";
        status.className = "status is-bad";
      }
      run.disabled = false;
      return;
    }

    setStep("sign", "is-ok", "Ditandatangani");
    if (hashEl) hashEl.textContent = txHash;
    if (stateEl) stateEl.textContent = "pending";
    if (status) {
      status.textContent = "Transaksi terkirim. Hash ada, tetapi belum tentu masuk blok.";
      status.className = "status is-wait";
    }

    setStep("pending", "is-wait", "Di mempool");
    await wait(stepWait());
    if (current !== token) return;

    if (type === "drop") {
      setStep("pending", "is-bad", "Hilang");
      if (hashEl) hashEl.textContent = "tidak ditemukan";
      if (stateEl) stateEl.textContent = "dropped";
      if (status) {
        status.textContent = "Transaksi hilang dari mempool. Cek nonce sebelum mengirim ulang.";
        status.className = "status is-bad";
      }
      run.disabled = false;
      return;
    }

    setStep("pending", "is-ok", "Masuk antrean");
    setStep("mined", "is-wait", "Menunggu blok");
    if (blockEl) blockEl.textContent = String(blockNumber);
    await wait(stepWait());
    if (current !== token) return;

    if (type === "replace") {
      setStep("mined", "is-bad", "Diganti");
      if (stateEl) stateEl.textContent = "replaced";
      if (status) {
        status.textContent = "Transaksi lain memakai nonce yang sama. Hanya satu yang akhirnya masuk. Periksa hash baru.";
        status.className = "status is-bad";
      }
      run.disabled = false;
      return;
    }

    setStep("mined", "is-ok", "Mined");
    setStep("receipt", "is-wait", "Membaca receipt");
    await wait(stepWait());
    if (current !== token) return;

    if (type === "revert") {
      setStep("receipt", "is-bad", "Revert");
      if (stateEl) stateEl.textContent = "reverted";
      if (countEl) countEl.textContent = "1";
      if (status) {
        status.textContent = "Transaksi masuk blok tetapi revert. Gas tetap dibayar; state tidak berubah.";
        status.className = "status is-bad";
      }
      run.disabled = false;
      return;
    }

    setStep("receipt", "is-ok", "Status 1");
    setStep("confirm", "is-wait", "Menambah konfirmasi");
    if (countEl) countEl.textContent = "1";
    if (stateEl) stateEl.textContent = "mined";
    await wait(stepWait());
    if (current !== token) return;

    setStep("confirm", "is-ok", "2 konfirmasi");
    if (countEl) countEl.textContent = "2";
    setStep("final", "is-wait", "Menunggu finality");
    await wait(stepWait());
    if (current !== token) return;

    setStep("final", "is-ok", "Final");
    if (countEl) countEl.textContent = "final";
    if (stateEl) stateEl.textContent = "final";
    if (status) {
      status.textContent = "Sukses sampai final. UI boleh menampilkan hasil setelah receipt, tetapi sebutkan batas finality.";
      status.className = "status is-good";
    }
    run.disabled = false;
  });

  if (reset) {
    reset.addEventListener("click", () => {
      token += 1;
      resetSteps();
      run.disabled = false;
      if (status) {
        status.textContent = "Belum ada transaksi.";
        status.className = "status";
      }
      outcome.value = "success";
    });
  }

  resetSteps();
})();

/* ---------- Lab 08: verifikasi ---------- */

(function initVerifyLab() {
  const compiler = $("#verify-compiler");
  const optimizer = $("#verify-optimizer");
  const args = $("#verify-args");
  const source = $("#verify-source");
  const run = $("#verify-run");
  const reset = $("#verify-reset");
  const list = $("#verify-list");
  const status = $("#verify-status");
  if (!compiler || !run || !list) return;

  const baseline = { compiler: "0.8.24", optimizer: "200", args: "none", source: "same" };

  const evaluate = () => {
    const checks = [
      {
        name: "Compiler",
        ok: compiler.value === baseline.compiler,
        detail: compiler.value === baseline.compiler ? "0.8.24 cocok" : compiler.value + " tidak cocok dengan 0.8.24"
      },
      {
        name: "Optimizer",
        ok: optimizer.value === baseline.optimizer,
        detail: optimizer.value === baseline.optimizer ? "aktif, runs 200" : optimizer.value === "off" ? "optimizer nonaktif" : "runs " + optimizer.value + " tidak cocok"
      },
      {
        name: "Constructor args",
        ok: args.value === baseline.args,
        detail: args.value === baseline.args ? "tidak ada argumen, cocok" : args.value === "wrong" ? "argumen tertukar" : "argumen tidak dikirim"
      },
      {
        name: "Source",
        ok: source.value === baseline.source,
        detail: source.value === baseline.source ? "file dan import sama" : source.value === "edited" ? "file diedit setelah deploy" : "file kontrak lain"
      }
    ];

    list.innerHTML = checks.map((check) => {
      return '<li class="' + (check.ok ? "is-ok" : "is-bad") + '"><span class="v-mark">' + (check.ok ? "✓" : "✗") + '</span><span><strong>' + check.name + '</strong><br>' + escapeHtml(check.detail) + '</span><span class="v-state">' + (check.ok ? "cocok" : "tidak cocok") + "</span></li>";
    }).join("");

    const passed = checks.every((check) => check.ok);
    status.textContent = passed
      ? "Semua cocok. Verifikasi bisa mencocokkan bytecode (simulasi)."
      : "Verifikasi akan gagal. Perbaiki bagian yang ditandai sebelum mengirim request.";
    status.className = "status " + (passed ? "is-good" : "is-bad");
  };

  run.addEventListener("click", evaluate);

  if (reset) {
    reset.addEventListener("click", () => {
      compiler.value = "0.8.24";
      optimizer.value = "200";
      args.value = "none";
      source.value = "same";
      list.innerHTML = '<li><span class="v-mark">-</span><span>Tekan tombol untuk membandingkan.</span><span class="v-state">menunggu</span></li>';
      status.textContent = "Belum ada pemeriksaan.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 09: explorer ---------- */

(function initExplorerLab() {
  const buttons = $$("[data-exp-tab]");
  const panels = $$("[data-exp-panel]");
  if (!buttons.length || !panels.length) return;

  const show = (name) => {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.expTab === name ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.expPanel !== name;
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => show(button.dataset.expTab));
  });
})();

/* ---------- Lab 10: chain guard ---------- */

(function initChainLab() {
  const wallet = $("#wallet-chain");
  const app = $("#app-chain");
  const walletCard = $("#wallet-chain-card");
  const appCard = $("#app-chain-card");
  const check = $("#chain-check");
  const switchBtn = $("#chain-switch");
  const status = $("#chain-status");
  if (!wallet || !app || !walletCard || !appCard || !status) return;

  const info = {
    "11155111": { name: "Sepolia", note: "Jaringan latihan yang diharapkan aplikasi ini." },
    "1": { name: "Ethereum Mainnet", note: "Dana nyata. Jangan dipakai untuk latihan." },
    "31337": { name: "Anvil", note: "Hanya ada di komputermu dan tidak sama dengan Sepolia." }
  };

  const renderCards = () => {
    const w = info[wallet.value];
    const a = info[app.value];
    walletCard.innerHTML = "<strong>Wallet</strong><span>" + escapeHtml(w.name) + ", chain " + wallet.value + ". " + escapeHtml(w.note) + "</span>";
    appCard.innerHTML = "<strong>Aplikasi</strong><span>" + escapeHtml(a.name) + ", chain " + app.value + ". " + escapeHtml(a.note) + "</span>";
    walletCard.classList.toggle("is-bad", wallet.value !== app.value);
    walletCard.classList.toggle("is-ok", wallet.value === app.value);
    appCard.classList.toggle("is-ok", wallet.value === app.value);
  };

  const evaluate = (announce) => {
    const equal = wallet.value === app.value;
    renderCards();
    if (equal) {
      status.textContent = "Chain cocok. Transaksi boleh disusun untuk " + info[app.value].name + " (simulasi).";
      status.className = "status is-good";
    } else {
      status.textContent = "Chain tidak cocok. Jangan kirim transaksi. Minta wallet pindah ke " + info[app.value].name + " dan tangani penolakan.";
      status.className = "status is-bad";
    }
    if (announce) toast(equal ? "Chain cocok." : "Chain tidak cocok.");
  };

  check.addEventListener("click", () => evaluate(true));

  [wallet, app].forEach((el) => {
    el.addEventListener("change", () => evaluate(false));
  });

  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      wallet.value = app.value;
      evaluate(false);
      status.textContent = "Chain cocok. Wallet dipindah ke " + info[app.value].name + " (simulasi). Di aplikasi nyata, wallet bisa menolak.";
      status.className = "status is-good";
    });
  }

  renderCards();
})();

/* ---------- Lab 11: call builder ---------- */

(function initCallLab() {
  const fn = $("#call-function");
  const arg = $("#call-arg");
  const argHint = $("#call-arg-hint");
  const value = $("#call-value");
  const kind = $("#call-kind");
  const data = $("#call-data");
  const selector = $("#call-selector");
  const encoded = $("#call-encoded");
  const gas = $("#call-gas");
  const sign = $("#call-sign");
  const status = $("#call-status");
  if (!fn || !arg || !data || !status) return;

  const functions = {
    owner: { selector: "0x8da5cb5b", kind: "read", arg: "none", gas: "tidak perlu gas", sign: "tidak perlu" },
    balanceOf: { selector: "0x70a08231", kind: "read", arg: "address", gas: "tidak perlu gas", sign: "tidak perlu" },
    deposit: { selector: "0xd0e30db0", kind: "write", arg: "none", gas: "sekitar 45.000 - 90.000 (ilustrasi)", sign: "wallet", payable: true },
    withdraw: { selector: "0x2e1a7d4d", kind: "write", arg: "uint", gas: "sekitar 30.000 - 60.000 (ilustrasi)", sign: "wallet" },
    pause: { selector: "0x8456cb59", kind: "write", arg: "none", gas: "sekitar 25.000 - 35.000 (ilustrasi)", sign: "wallet" },
    unpause: { selector: "0x3f4ba83a", kind: "write", arg: "none", gas: "sekitar 25.000 - 35.000 (ilustrasi)", sign: "wallet" }
  };

  const update = () => {
    const item = functions[fn.value];
    const isRead = item.kind === "read";
    data.textContent = item.selector;
    selector.textContent = item.selector;
    gas.textContent = item.gas;
    sign.textContent = item.sign;
    kind.innerHTML = "<strong>" + (isRead ? "Read" : "Write") + "</strong> " + (isRead ? "memakai eth_call, tanpa gas dan tanda tangan." : "memakai transaksi, gas, dan tanda tangan wallet.");
    arg.disabled = item.arg === "none";
    arg.value = item.arg === "none" ? "" : arg.value;
    argHint.textContent = item.arg === "none" ? "Fungsi ini tidak membutuhkan argumen." : item.arg === "address" ? "Alamat 0x diikuti 40 karakter hex." : "Jumlah dalam wei, bilangan bulat.";
    encoded.textContent = "-";

    if (item.arg === "none") {
      status.textContent = isRead ? "Read tanpa argumen. Calldata hanya selector." : "Write tanpa argumen. Calldata hanya selector.";
      status.className = "status";
      return;
    }

    const raw = arg.value.trim();
    let encodedArg = "";
    if (item.arg === "address") {
      if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
        data.textContent = item.selector + " + argumen tidak valid";
        status.textContent = "Alamat belum valid. Perlu 0x dan 40 karakter hex.";
        status.className = "status is-bad";
        return;
      }
      encodedArg = raw.slice(2).toLowerCase().padStart(64, "0");
    } else {
      if (!/^\d+$/.test(raw)) {
        data.textContent = item.selector + " + argumen tidak valid";
        status.textContent = "Jumlah harus bilangan bulat dalam wei, tanpa desimal.";
        status.className = "status is-bad";
        return;
      }
      try {
        encodedArg = BigInt(raw).toString(16).padStart(64, "0");
      } catch (error) {
        data.textContent = item.selector + " + argumen tidak valid";
        status.textContent = "Jumlah terlalu besar atau tidak valid.";
        status.className = "status is-bad";
        return;
      }
    }

    data.textContent = item.selector + encodedArg;
    encoded.textContent = "0x" + encodedArg;
    status.textContent = isRead ? "Read tidak memakai gas. Panggilan tetap bisa revert jika alamat atau chain salah." : "Write membutuhkan tanda tangan dan gas. Simulasikan dulu sebelum mengirim.";
    status.className = "status " + (isRead ? "" : "is-wait");
  };

  [fn, arg, value].forEach((el) => {
    if (el) el.addEventListener("input", update);
    if (el) el.addEventListener("change", update);
  });

  update();
})();

/* ---------- Lab 12: triage ---------- */

(function initTriageLab() {
  const cases = $$("[data-triage]");
  const check = $("#triage-check");
  const reset = $("#triage-reset");
  const status = $("#triage-status");
  if (!cases.length || !check || !status) return;

  check.addEventListener("click", () => {
    let correct = 0;
    let answered = 0;
    cases.forEach((card) => {
      const select = $("select", card);
      const ok = select && select.value === card.dataset.answer;
      if (select && select.value) answered += 1;
      card.classList.remove("answer-ok", "answer-bad");
      if (select && select.value) card.classList.add(ok ? "answer-ok" : "answer-bad");
      if (ok) correct += 1;
    });

    if (answered < cases.length) {
      status.textContent = "Masih ada " + (cases.length - answered) + " kartu tanpa jawaban. Lengkapi dulu.";
      status.className = "status is-bad";
      return;
    }

    status.textContent = correct === cases.length
      ? "Semua tepat. Kamu memisahkan lapisan error sebelum mengambil tindakan."
      : correct + " dari " + cases.length + " tepat. Periksa kartu merah dan pikirkan lapisan error-nya.";
    status.className = "status " + (correct === cases.length ? "is-good" : "is-bad");
  });

  if (reset) {
    reset.addEventListener("click", () => {
      cases.forEach((card) => {
        const select = $("select", card);
        if (select) select.value = "";
        card.classList.remove("answer-ok", "answer-bad");
      });
      status.textContent = "Belum ada jawaban.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 13: release gate ---------- */

(function initGateLab() {
  const run = $("#gate-run");
  const reset = $("#gate-reset");
  const report = $("#gate-report");
  const status = $("#gate-status");
  const name = $("#gate-name");
  const address = $("#gate-address");
  if (!run || !report || !status) return;

  const boxes = $$('input[type="checkbox"][id^="gate-"]').filter((el) => el.id !== "gate-run");
  const key = "dermaga.gate.v1";

  const labels = {
    "gate-tests": "Semua test lulus",
    "gate-build": "Build reproducible",
    "gate-owner": "Owner dan constructor args benar",
    "gate-dry": "Dry run Sepolia selesai",
    "gate-chain": "Chain ID 11155111 terverifikasi",
    "gate-balance": "Saldo cukup",
    "gate-verify": "Rencana verifikasi siap",
    "gate-receipt": "Receipt sukses dan alamat tercatat",
    "gate-code": "Code ada di alamat",
    "gate-owner-read": "Owner dan state awal benar",
    "gate-verified": "Source terverifikasi",
    "gate-frontend": "Frontend memakai alamat dan chain benar",
    "gate-smoke": "Smoke test lulus",
    "gate-explorer-link": "Tautan explorer berfungsi",
    "gate-docs": "README dan manifest diperbarui",
    "gate-tag": "Commit atau tag rilis dibuat"
  };

  const restore = () => {
    const saved = store.get(key, null);
    if (!saved || typeof saved !== "object") return;
    if (saved.name && name) name.value = saved.name;
    if (saved.address && address) address.value = saved.address;
    if (Array.isArray(saved.checks)) {
      boxes.forEach((box) => {
        box.checked = saved.checks.includes(box.id);
      });
    }
  };

  const save = () => {
    const checks = boxes.filter((box) => box.checked).map((box) => box.id);
    store.set(key, {
      name: name ? name.value : "",
      address: address ? address.value : "",
      checks
    });
  };

  const build = () => {
    const validAddress = /^0x[a-fA-F0-9]{40}$/.test(address ? address.value.trim() : "");
    const checked = boxes.filter((box) => box.checked);
    const missing = boxes.filter((box) => !box.checked).map((box) => labels[box.id] || box.id);
    const blockers = missing.slice();
    if (!validAddress) blockers.push("alamat kontrak belum valid");

    const ready = blockers.length === 0;
    const lines = [
      "LAPORAN RILIS TESTNET",
      "Nama       : " + (name && name.value.trim() ? name.value.trim() : "belum diisi"),
      "Kontrak    : " + (validAddress ? address.value.trim() : "belum valid"),
      "Dibuat     : " + new Date().toLocaleString("id-ID"),
      "Checklist  : " + checked.length + " dari " + boxes.length + " butir",
      ""
    ];

    if (ready) {
      lines.push("Status     : SIAP UNTUK DIBAGIKAN");
      lines.push("");
      lines.push("Bukti yang harus dilampirkan:");
      lines.push("- alamat kontrak dan chain ID 11155111");
      lines.push("- hash transaksi deploy dan receipt");
      lines.push("- tautan verifikasi Etherscan atau Sourcify");
      lines.push("- URL frontend dan commit rilis");
      lines.push("- catatan smoke test baca, tulis, event, dan error");
    } else {
      lines.push("Status     : BELUM SIAP");
      lines.push("");
      lines.push("Blocker:");
      blockers.forEach((item) => lines.push("- " + item));
      lines.push("");
      lines.push("Jangan menyebut rilis selesai sebelum semua blocker punya bukti.");
    }

    report.textContent = lines.join("\n");
    report.classList.toggle("is-ready", ready);
    report.classList.toggle("is-blocked", !ready);
    status.textContent = ready
      ? "Gate lulus. Simpan laporan ini bersama manifest deploy."
      : "Gate belum lulus. Masih ada " + blockers.length + " blocker.";
    status.className = "status " + (ready ? "is-good" : "is-bad");
  };

  run.addEventListener("click", build);

  boxes.forEach((box) => {
    box.addEventListener("change", save);
  });
  if (name) name.addEventListener("input", save);
  if (address) address.addEventListener("input", save);

  if (reset) {
    reset.addEventListener("click", () => {
      boxes.forEach((box) => { box.checked = false; });
      if (name) name.value = "minivault-sepolia-01";
      if (address) address.value = "";
      store.remove(key);
      report.textContent = "Laporan akan muncul di sini setelah kamu menekan tombol.";
      report.classList.remove("is-ready", "is-blocked");
      status.textContent = "Belum ada laporan.";
      status.className = "status";
      if (name) name.focus();
    });
  }

  restore();
})();

/* ---------- Uji kompetensi ---------- */

const quizQuestions = [
  {
    q: "Berapa chain ID Sepolia?",
    options: ["1", "11155111", "31337", "421614"],
    answer: 1,
    explain: "Sepolia memakai 11155111, atau 0xaa36a7 dalam heksadesimal. Mainnet 1, Anvil 31337, Arbitrum Sepolia 421614."
  },
  {
    q: "Testnet mana yang direkomendasikan ethereum.org untuk pengembangan aplikasi?",
    options: ["Hoodi", "Sepolia", "Holesky", "Ropsten"],
    answer: 1,
    explain: "Sepolia adalah rekomendasi default untuk kontrak dan aplikasi. Hoodi dipakai untuk pengujian validator dan upgrade protokol. Holesky sudah dipensiunkan pada 2025."
  },
  {
    q: "Apa yang dikirim saat men-deploy kontrak?",
    options: [
      "Folder proyek dan package.json",
      "Transaksi dengan init code dan argumen constructor",
      "File Solidity ke explorer",
      "Private key ke RPC"
    ],
    answer: 1,
    explain: "Deploy adalah transaksi dengan to kosong dan data berisi init code serta argumen constructor. Source tidak ikut kecuali kamu mengirimnya saat verifikasi."
  },
  {
    q: "Dengan CREATE, alamat kontrak bergantung pada apa?",
    options: [
      "Nama kontrak dan compiler",
      "Alamat deployer dan nonce",
      "Saldo wallet dan chain ID",
      "Hash source dan ABI"
    ],
    answer: 1,
    explain: "CREATE menghitung alamat dari alamat pengirim dan nonce. Karena itu transaksi lain sebelum deploy bisa mengubah alamat."
  },
  {
    q: "Data apa yang boleh dimasukkan ke halaman faucet?",
    options: ["Seed phrase", "Private key", "Alamat wallet", "Password keystore"],
    answer: 2,
    explain: "Faucet hanya membutuhkan alamat. Situs yang meminta seed atau private key adalah penipuan."
  },
  {
    q: "Apa pekerjaan utama RPC provider?",
    options: [
      "Menyimpan private key pengguna",
      "Menyediakan endpoint ke node yang membaca dan mengirim transaksi",
      "Menjamin kontrak bebas bug",
      "Menggantikan wallet"
    ],
    answer: 1,
    explain: "Provider menjalankan atau meneruskan request ke node. Ia tidak memegang kunci pengguna dan tidak menjamin keamanan kontrak."
  },
  {
    q: "Mengapa API key RPC tidak boleh memakai prefix NEXT_PUBLIC_?",
    options: [
      "Agar build lebih cepat",
      "Karena nilai itu masuk ke bundle browser dan bisa dibaca siapa saja",
      "Karena Next.js tidak mendukung https",
      "Karena API key tidak dibutuhkan di frontend"
    ],
    answer: 1,
    explain: "Variabel NEXT_PUBLIC_ dikirim ke browser. API key berkuota harus tetap di server, diproksikan, atau dibatasi ketat."
  },
  {
    q: "Apa yang harus dilakukan jika file .env pernah masuk commit?",
    options: [
      "Cukup hapus filenya di commit berikutnya",
      "Anggap secret bocor, buat akun baru, dan putar key",
      "Ganti nama file menjadi .env.local",
      "Abaikan karena testnet"
    ],
    answer: 1,
    explain: "Riwayat git masih menyimpan secret. Hapus file saja tidak cukup. Buat key baru dan hentikan pemakaian yang lama."
  },
  {
    q: "cast chain-id mengembalikan 1 saat kamu memakai alias sepolia. Apa artinya?",
    options: [
      "Sepolia sedang down",
      "Endpoint atau alias menunjuk mainnet, bukan Sepolia",
      "Wallet belum terhubung",
      "Kontrak belum terverifikasi"
    ],
    answer: 1,
    explain: "Chain ID adalah bukti endpoint. Jika hasilnya 1, kamu terhubung ke mainnet. Jangan broadcast sebelum memperbaikinya."
  },
  {
    q: "Mengapa dry run sebelum --broadcast penting?",
    options: [
      "Agar gas menjadi nol",
      "Untuk melihat dampak script terhadap state tanpa mengirim transaksi",
      "Untuk menandatangani tanpa wallet",
      "Untuk menghapus kebutuhan verifikasi"
    ],
    answer: 1,
    explain: "Dry run mengeksekusi script terhadap state terkini tanpa mengirim transaksi. Kamu bisa menemukan constructor atau argumen yang salah lebih awal."
  },
  {
    q: "Apa bedanya gas limit dan gas used?",
    options: [
      "Keduanya selalu sama",
      "Gas limit adalah batas, gas used adalah pemakaian nyata",
      "Gas used adalah harga per gas",
      "Gas limit hanya ada di mainnet"
    ],
    answer: 1,
    explain: "Gas limit adalah batas maksimum. Gas used adalah yang benar-benar dipakai. Sisa gas dikembalikan."
  },
  {
    q: "Dengan gas limit 250.000 dan max fee 3 gwei, berapa biaya maksimum?",
    options: ["0,000075 ETH", "0,00075 ETH", "0,0075 ETH", "0,075 ETH"],
    answer: 1,
    explain: "250.000 x 3 gwei = 750.000 gwei = 0,00075 ETH. Ini biaya maksimum, bukan selalu biaya yang dibayar."
  },
  {
    q: "Receipt dengan status 0x0 berarti apa?",
    options: [
      "Transaksi belum dikirim",
      "Wallet menolak tanda tangan",
      "Transaksi masuk blok tetapi eksekusi gagal; gas tetap dibayar",
      "Kontrak belum terverifikasi"
    ],
    answer: 2,
    explain: "Status 0x0 adalah revert. Transaksi ada di blok, state tidak berubah, tetapi gas sudah dikonsumsi."
  },
  {
    q: "Apa bedanya mined dan finalized?",
    options: [
      "Mined berarti sudah final",
      "Mined masuk blok; finalized berarti sudah melewati finality dan kecil kemungkinan diganti",
      "Finalized hanya berlaku di testnet",
      "Keduanya sama saja"
    ],
    answer: 1,
    explain: "Mined berarti masuk blok. Finality protokol datang setelah checkpoint, sekitar dua epoch pada kondisi normal. Reorg bisa terjadi sebelum final."
  },
  {
    q: "Apa yang dicocokkan saat verifikasi kontrak?",
    options: [
      "Nama token dan harga",
      "Source, compiler, optimizer, constructor args, dan pengaturan lain dengan bytecode",
      "Saldo wallet deployer",
      "Jumlah transaksi di mempool"
    ],
    answer: 1,
    explain: "Verifier mengompilasi source dengan pengaturan yang dikirim, lalu membandingkan bytecode. Satu perbedaan bisa membuat verifikasi gagal."
  },
  {
    q: "Apakah kontrak terverifikasi otomatis aman?",
    options: [
      "Ya, karena source sudah dibaca publik",
      "Tidak; source bisa tetap memiliki bug atau hak admin berbahaya",
      "Ya, jika memakai OpenZeppelin",
      "Ya, jika sudah ada di Sepolia"
    ],
    answer: 1,
    explain: "Verifikasi hanya membuktikan kecocokan source dan bytecode. Ia tidak melakukan audit dan tidak menghilangkan kekuatan owner."
  },
  {
    q: "Pada Etherscan API V2, parameter apa yang memilih chain?",
    options: ["network", "chainid", "rpc", "explorer"],
    answer: 1,
    explain: "Etherscan V2 memakai satu API key dan parameter chainid. Sepolia memakai 11155111."
  },
  {
    q: "Wallet berada di mainnet, aplikasi mengharapkan Sepolia. Apa yang harus dilakukan?",
    options: [
      "Kirim transaksi karena alamat sama",
      "Bandingkan chain ID, tampilkan peringatan, dan minta switch",
      "Ganti alamat kontrak otomatis",
      "Matikan validasi agar transaksi lewat"
    ],
    answer: 1,
    explain: "Transaksi harus dikirim di chain yang benar. Tampilkan peringatan dan gunakan useSwitchChain, lalu tangani penolakan."
  },
  {
    q: "Pesan User rejected the request berarti apa?",
    options: [
      "Transaksi revert dan gas dibayar",
      "Pengguna menolak di wallet; tidak ada transaksi dan tidak ada gas",
      "RPC kehabisan kuota",
      "Kontrak belum diverifikasi"
    ],
    answer: 1,
    explain: "Penolakan terjadi sebelum transaksi dikirim. Tidak ada hash dan tidak ada biaya. UI cukup berhenti dan menawarkan coba lagi."
  },
  {
    q: "Pesan nonce too low paling mungkin disebabkan oleh apa?",
    options: [
      "Saldo test ETH kurang",
      "Transaksi lain sudah memakai nonce tersebut",
      "ABI salah",
      "Verifikasi Etherscan gagal"
    ],
    answer: 1,
    explain: "Nonce adalah urutan transaksi. Jika sudah dipakai, transaksi baru dengan nonce itu ditolak. Cek hash dan nonce on-chain."
  }
];

(function initQuiz() {
  const form = $("#quiz-form");
  if (!form) return;

  const submit = $("#quiz-submit");
  const retry = $("#quiz-retry");
  const status = $("#quiz-status");
  const result = $("#quiz-result");
  const bestEl = $("#quiz-best");

  const best = Number(store.get("dermaga.quiz.v1", 0)) || 0;
  if (bestEl) bestEl.textContent = best + " dari 20";

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

    $$("input", fieldset).forEach((input) => {
      input.disabled = true;
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = new FormData(form);
    const missing = [];

    quizQuestions.forEach((item, index) => {
      if (!answers.get("q" + (index + 1))) missing.push(index + 1);
    });

    if (missing.length) {
      status.textContent = "Masih ada " + missing.length + " soal tanpa jawaban. Lengkapi dulu.";
      status.className = "status is-bad";
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

    const bestScore = Math.max(score, Number(store.get("dermaga.quiz.v1", 0)) || 0);
    store.set("dermaga.quiz.v1", bestScore);
    if (bestEl) bestEl.textContent = bestScore + " dari 20";

    const passed = score >= 16;
    if (passed && window.setProgressDone) window.setProgressDone("uji", true, false);

    if (result) {
      result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
        "<h3>" + (passed ? "Lulus." : "Belum lulus.") + "</h3>" +
        "<p>Skor " + score + " dari 20. Skor terbaikmu " + bestScore + " dari 20. " +
        (passed
          ? "Kamu memahami alur deploy, bukti verifikasi, dan batas transaksi. Lanjutkan dengan rilis testnet nyata."
          : "Baca ulang penjelasan di bawah, lalu coba lagi. Minimal 16 benar untuk lulus.") +
        "</p></div>";
    }

    status.textContent = passed ? "Ujian lulus. Progres ujian ditandai." : "Ujian belum lulus. Periksa penjelasan tiap soal.";
    status.className = "status " + (passed ? "is-good" : "is-bad");
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
      $$("input", form).forEach((input) => {
        input.disabled = false;
      });
      if (result) result.innerHTML = "";
      if (submit) submit.disabled = false;
      status.textContent = "Belum ada jawaban yang diperiksa.";
      status.className = "status";
      const first = $("input", form);
      if (first) first.focus();
    });
  }
})();

/* ---------- Blok kode yang bisa digulir ---------- */

function markScrollableCode() {
  $$(".code-block pre").forEach((pre) => {
    if (pre.scrollWidth > pre.clientWidth + 2) {
      pre.tabIndex = 0;
      pre.setAttribute("aria-label", "Blok kode, dapat digulir horizontal");
    } else {
      pre.removeAttribute("tabindex");
      pre.removeAttribute("aria-label");
    }
  });
}

window.addEventListener("resize", markScrollableCode);

/* ---------- Deep link setelah konten dinamis selesai ---------- */

(function initDeepLink() {
  if (!window.location.hash) return;
  const id = window.location.hash.slice(1);
  if (!document.getElementById(id)) return;

  let cancelled = false;
  const cancel = () => { cancelled = true; };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((eventName) => {
    window.addEventListener(eventName, cancel, { passive: true, once: true });
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#" + id) cancelled = true;
  });

  const jump = () => {
    if (cancelled) return;
    const target = document.getElementById(id);
    if (!target) return;
    const header = $(".site-header");
    const offset = (header ? header.offsetHeight : 0) + 20;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    if (Math.abs(window.scrollY - top) > 2) {
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
  };

  jump();
  [120, 450, 1200, 2400].forEach((delay) => window.setTimeout(jump, delay));
  window.addEventListener("load", jump);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(jump);
  }
})();

/* ---------- Mulai sorotan setelah DOM siap ---------- */

initHighlight();
window.requestAnimationFrame(markScrollableCode);

