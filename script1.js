/* =====================================================================
   JournalFlow - script.js (beginner-friendly version)

   Only basic JavaScript is used here:
   variables, functions, if/else, for loops, arrays and objects.

   HOW THE PROGRAM WORKS (read this first)
   1. All the user's journal entries are stored in ONE array called "entries".
   2. refreshAll() reads that array and rebuilds every report on the screen.
   3. Every time the user adds or deletes something, we save and call refreshAll().
   ===================================================================== */


/* =====================================================================
   PART 1: FIXED DATA (lists that never change while the app runs)
   ===================================================================== */

// Every account has a TYPE. The type decides which report shows it.
var accountTypes = {
  "Cash": "asset",
  "Bank": "asset",
  "Debtors": "asset",
  "Furniture": "asset",
  "Machinery": "asset",
  "Building": "asset",
  "Creditors": "liability",
  "Bank Loan": "liability",
  "Capital": "capital",
  "Drawings": "drawings",
  "Sales": "sales",
  "Purchases": "directExp",
  "Wages": "directExp",
  "Carriage Inwards": "directExp",
  "Rent": "indirectExp",
  "Salaries": "indirectExp",
  "Electricity": "indirectExp",
  "Interest Paid": "indirectExp",
  "Telephone": "indirectExp",
  "Insurance": "indirectExp",
  "Repairs": "indirectExp",
  "Travel": "indirectExp",
  "Groceries": "indirectExp",
  "Commission Received": "indirectInc",
  "Interest Received": "indirectInc",
  "Other Income": "indirectInc"
};

// Friendly names for each type (shown as small labels)
var typeNames = {
  asset: "Asset",
  liability: "Liability",
  capital: "Capital",
  drawings: "Drawings",
  sales: "Sales (income)",
  directExp: "Direct expense",
  indirectExp: "Indirect expense",
  indirectInc: "Other income"
};

// One-line help for each type (shown under the Debit/Credit boxes)
var typeHelp = {
  asset: "Something you own. Debit to increase. Shown on the Balance Sheet.",
  liability: "Something you owe. Credit to increase. Shown on the Balance Sheet.",
  capital: "Owner's investment in the business. Credit to increase.",
  drawings: "Owner's personal withdrawals. Debit to increase. Reduces capital.",
  sales: "Revenue from selling goods. Credit to increase. Goes to the Trading Account.",
  directExp: "Cost of making or buying what you sell. Debit to increase. Trading Account.",
  indirectExp: "Running costs. Debit to increase. Profit and Loss Account.",
  indirectInc: "Income apart from sales. Credit to increase. Profit and Loss Account."
};

// Quick templates: [label, debit account, credit account]
var templates = [
  ["Owner invests cash", "Cash", "Capital"],
  ["Buy goods for cash", "Purchases", "Cash"],
  ["Buy goods on credit", "Purchases", "Creditors"],
  ["Cash sale", "Cash", "Sales"],
  ["Credit sale", "Debtors", "Sales"],
  ["Pay rent", "Rent", "Cash"],
  ["Pay salary", "Salaries", "Cash"],
  ["Pay electricity bill", "Electricity", "Cash"],
  ["Buy furniture", "Furniture", "Cash"],
  ["Owner withdraws cash", "Drawings", "Cash"],
  ["Deposit cash in bank", "Bank", "Cash"],
  ["Take bank loan", "Bank", "Bank Loan"],
  ["Groceries (personal budget)", "Groceries", "Cash"]
];

// Colours used in the charts
var colors = ["#e6b450", "#4c8dff", "#3ecf8e", "#ff6b6b", "#b58cff", "#4dd0e1", "#f5a524", "#ff8fd0"];

// The names of all pages (must match the ids "page-xxx" in index.html)
var pageNames = ["dashboard", "entry", "journal", "ledger", "trial", "pl", "bs", "budget", "export", "guide"];


/* =====================================================================
   PART 2: THE DATA THE USER CREATES
   ===================================================================== */

var entries = [];   // each entry looks like: {date, debit, credit, amount, narration}
var budgets = {};   // looks like: {"Rent": 6000, "Wages": 4000}

// Load saved data from the browser (localStorage keeps text, so we use JSON)
function loadData() {
  try {
    var savedEntries = localStorage.getItem("journalflow");
    var savedBudgets = localStorage.getItem("journalflow_budgets");
    if (savedEntries) {
      entries = JSON.parse(savedEntries);
    }
    if (savedBudgets) {
      budgets = JSON.parse(savedBudgets);
    }
  } catch (error) {
    // If the browser blocks storage, we just start with empty data
    entries = [];
    budgets = {};
  }
}

// Save the data to the browser
function saveData() {
  try {
    localStorage.setItem("journalflow", JSON.stringify(entries));
    localStorage.setItem("journalflow_budgets", JSON.stringify(budgets));
  } catch (error) {
    // Nothing to do if saving is blocked
  }
}


/* =====================================================================
   PART 3: SMALL HELPER FUNCTIONS
   ===================================================================== */

// Shortcut: find an element on the page by its id
function getEl(id) {
  return document.getElementById(id);
}

// 1234.5 becomes "1,234.50" (Indian number style)
function formatNumber(number) {
  return number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Same as above but with the rupee sign
function formatMoney(number) {
  return "₹" + formatNumber(number);
}

// Makes user-typed text safe to show inside HTML (stops "<" and ">" tricks)
function safeText(text) {
  text = String(text);
  text = text.replace(/&/g, "&amp;");
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  text = text.replace(/"/g, "&quot;");
  return text;
}

// Today's date as YYYY-MM-DD
function today() {
  return new Date().toISOString().slice(0, 10);
}

// Shows a small popup message for 3 seconds
var messageTimer;
function showMessage(text, isError) {
  var box = getEl("toast");
  box.textContent = text;
  if (isError) {
    box.className = "toast show err";
  } else {
    box.className = "toast show";
  }
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () {
    box.className = "toast";
  }, 3000);
}


/* =====================================================================
   PART 4: THE ACCOUNTING ENGINE
   ===================================================================== */

// "ledgers" holds one ledger per account. Example:
// ledgers["Cash"] = { lines: [...], debit: 150000, credit: 60000 }
var ledgers = {};

// Makes an empty ledger for an account if it does not exist yet
function makeLedger(name) {
  if (!ledgers[name]) {
    ledgers[name] = { lines: [], debit: 0, credit: 0 };
  }
}

// STEP 1: Journal -> Ledger ("posting")
// Every entry goes into TWO ledgers: the debit account and the credit account.
function buildLedgers() {
  ledgers = {};
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];

    makeLedger(e.debit);
    ledgers[e.debit].debit += e.amount;
    ledgers[e.debit].lines.push({ date: e.date, other: e.credit, debit: e.amount, credit: 0 });

    makeLedger(e.credit);
    ledgers[e.credit].credit += e.amount;
    ledgers[e.credit].lines.push({ date: e.date, other: e.debit, debit: 0, credit: e.amount });
  }
}

// Balance of one account: debit minus credit
// Positive = debit balance, negative = credit balance
function balanceOf(name) {
  return ledgers[name].debit - ledgers[name].credit;
}

// Adds up all accounts of one type.
// direction = 1 for debit-type accounts (assets, expenses)
// direction = -1 for credit-type accounts (sales, income, liabilities, capital)
// so the answer is always a normal positive number.
function totalOfType(type, direction) {
  var total = 0;
  for (var name in ledgers) {
    if (accountTypes[name] === type) {
      total = total + direction * balanceOf(name);
    }
  }
  return total;
}

// Same idea, but returns a list like [{name:"Cash", value:90000}, ...]
function listOfType(type, direction) {
  var list = [];
  for (var name in ledgers) {
    if (accountTypes[name] === type) {
      list.push({ name: name, value: direction * balanceOf(name) });
    }
  }
  return list;
}

// Adds up the "value" of every item in a list
function sumList(list) {
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    total = total + list[i].value;
  }
  return total;
}

// STEP 2: Work out the important totals (these variables are used by the reports)
var salesTotal, directTotal, grossProfit, otherIncome, indirectTotal, netProfit;
var capitalTotal, assetList, liabilityList, totalAssets, totalLiabilities;

function calculateFigures() {
  salesTotal = totalOfType("sales", -1);
  directTotal = totalOfType("directExp", 1);
  grossProfit = salesTotal - directTotal;              // Gross profit = Sales - direct costs

  otherIncome = totalOfType("indirectInc", -1);
  indirectTotal = totalOfType("indirectExp", 1);
  netProfit = grossProfit + otherIncome - indirectTotal; // Net profit

  // Capital = Capital - Drawings + Net profit
  capitalTotal = totalOfType("capital", -1) - totalOfType("drawings", 1) + netProfit;

  assetList = listOfType("asset", 1);
  liabilityList = listOfType("liability", -1);
  totalAssets = sumList(assetList);
  totalLiabilities = capitalTotal + sumList(liabilityList);
}


/* =====================================================================
   PART 5: SHOWING THE REPORTS (each function fills one part of the page)
   We build a text string of HTML and put it inside an empty <div>.
   ===================================================================== */

// Builds table rows from a list. "prefix" is text like "Less: "
function rowsFromList(list, prefix) {
  var html = "";
  for (var i = 0; i < list.length; i++) {
    html += "<tr><td>" + prefix + safeText(list[i].name) + '</td><td class="num">' + formatNumber(list[i].value) + "</td></tr>";
  }
  return html;
}

// ---------- Journal Book ----------
function showJournal() {
  var search = getEl("jsearch").value.toLowerCase();
  var rows = "";
  var shown = 0;

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var narration = e.narration || "";
    var allText = (narration + " " + e.debit + " " + e.credit).toLowerCase();

    // skip this entry if the search box has text that is not found
    if (search !== "" && allText.indexOf(search) === -1) {
      continue;
    }
    shown = shown + 1;

    rows += "<tr>";
    rows += "<td>" + (i + 1) + "</td>";
    rows += "<td>" + safeText(e.date) + "</td>";
    rows += "<td>" + safeText(e.debit) + " A/c <b>Dr</b><br>&nbsp;&nbsp;&nbsp;&nbsp;To " + safeText(e.credit) + " A/c</td>";
    rows += '<td class="num">' + formatNumber(e.amount) + "<br>&nbsp;</td>";
    rows += '<td class="num">&nbsp;<br>' + formatNumber(e.amount) + "</td>";
    rows += "<td>" + safeText(narration) + "</td>";
    rows += '<td class="no-print"><button class="btn danger sm" onclick="deleteEntry(' + i + ')">Delete</button></td>';
    rows += "</tr>";
  }

  if (shown === 0) {
    if (entries.length === 0) {
      getEl("journalOut").innerHTML = '<p class="empty">No entries yet. Go to Add Entry or load the sample data.</p>';
    } else {
      getEl("journalOut").innerHTML = '<p class="empty">No entries match your search.</p>';
    }
    return;
  }

  getEl("journalOut").innerHTML =
    "<table><thead><tr><th>#</th><th>Date</th><th>Particulars</th>" +
    '<th class="num">Debit</th><th class="num">Credit</th><th>Narration</th><th class="no-print"></th></tr></thead>' +
    "<tbody>" + rows + "</tbody></table>";
}

// ---------- Ledger Accounts ----------
function showLedgers() {
  var filter = getEl("ledgerFilter");
  var chosen = filter.value;           // remember what the user selected

  // fill the dropdown with all account names
  var names = [];
  var options = '<option value="">All accounts</option>';
  for (var name in ledgers) {
    names.push(name);
    options += "<option>" + safeText(name) + "</option>";
  }
  filter.innerHTML = options;
  filter.value = chosen;

  if (names.length === 0) {
    getEl("ledgerOut").innerHTML = '<div class="card"><p class="empty">Ledgers appear here after your first entry.</p></div>';
    return;
  }

  var html = "";
  for (var i = 0; i < names.length; i++) {
    var accountName = names[i];
    if (chosen !== "" && chosen !== accountName) {
      continue;
    }

    var lines = ledgers[accountName].lines;
    var running = 0;                   // running balance
    var rows = "";
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      running = running + line.debit - line.credit;

      var side = "Cr";
      if (running >= 0) {
        side = "Dr";
      }
      var prefix = "By ";
      if (line.debit > 0) {
        prefix = "To ";
      }

      rows += "<tr><td>" + safeText(line.date) + "</td>";
      rows += "<td>" + prefix + safeText(line.other) + "</td>";
      rows += '<td class="num">' + (line.debit > 0 ? formatNumber(line.debit) : "") + "</td>";
      rows += '<td class="num">' + (line.credit > 0 ? formatNumber(line.credit) : "") + "</td>";
      rows += '<td class="num">' + formatNumber(Math.abs(running)) + " " + side + "</td></tr>";
    }

    html += '<div class="card ledger hover"><h3>' + safeText(accountName) + ' Account <span class="pill">' + typeNames[accountTypes[accountName]] + "</span></h3>";
    html += '<div class="scroll"><table><thead><tr><th>Date</th><th>Particulars</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>';
    html += "<tbody>" + rows + "</tbody></table></div></div>";
  }
  getEl("ledgerOut").innerHTML = html;
}

// ---------- Trial Balance ----------
function showTrial() {
  var totalDebit = 0;
  var totalCredit = 0;
  var rows = "";
  var count = 0;

  for (var name in ledgers) {
    count = count + 1;
    var balance = balanceOf(name);
    var debitCell = "";
    var creditCell = "";

    if (balance > 0) {                 // debit balance goes on the left
      debitCell = formatNumber(balance);
      totalDebit = totalDebit + balance;
    } else if (balance < 0) {          // credit balance goes on the right
      creditCell = formatNumber(-balance);
      totalCredit = totalCredit - balance;
    }
    rows += "<tr><td>" + safeText(name) + '</td><td class="num">' + debitCell + '</td><td class="num">' + creditCell + "</td></tr>";
  }

  if (count === 0) {
    getEl("trialOut").innerHTML = '<p class="empty">The trial balance appears after your first entry.</p>';
    return;
  }

  // Both totals must be equal. We allow a tiny difference for decimal rounding.
  var tallies = Math.abs(totalDebit - totalCredit) < 0.005;
  var statusBox;
  if (tallies) {
    statusBox = '<div class="status ok">✔ Trial balance tallies: debit equals credit.</div>';
  } else {
    statusBox = '<div class="status err">✖ Trial balance does not tally.</div>';
  }

  getEl("trialOut").innerHTML =
    '<table><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' + rows +
    '<tr class="total"><td>Total</td><td class="num">' + formatNumber(totalDebit) + '</td><td class="num">' + formatNumber(totalCredit) + "</td></tr></tbody></table>" +
    statusBox;
}

// ---------- Trading and Profit & Loss Account ----------
function showProfitLoss() {
  var gpLabel = "Gross profit";
  if (grossProfit < 0) {
    gpLabel = "Gross loss";
  }
  var npLabel = "Net profit";
  if (netProfit < 0) {
    npLabel = "Net loss";
  }

  var trading =
    '<div class="card hover"><h3>Trading Account</h3><div class="scroll"><table><tbody>' +
    rowsFromList(listOfType("sales", -1), "") +
    rowsFromList(listOfType("directExp", 1), "Less: ") +
    '<tr class="total"><td>' + gpLabel + '</td><td class="num">' + formatNumber(Math.abs(grossProfit)) + "</td></tr>" +
    "</tbody></table></div></div>";

  var profitLoss =
    '<div class="card hover"><h3>Profit &amp; Loss Account</h3><div class="scroll"><table><tbody>' +
    '<tr><td>Gross profit brought down</td><td class="num">' + formatNumber(grossProfit) + "</td></tr>" +
    rowsFromList(listOfType("indirectInc", -1), "Add: ") +
    rowsFromList(listOfType("indirectExp", 1), "Less: ") +
    '<tr class="total"><td>' + npLabel + '</td><td class="num">' + formatNumber(Math.abs(netProfit)) + "</td></tr>" +
    "</tbody></table></div></div>";

  getEl("plOut").innerHTML = '<div class="grid two">' + trading + profitLoss + "</div>";
}

// ---------- Balance Sheet ----------
function showBalanceSheet() {
  var tallies = Math.abs(totalLiabilities - totalAssets) < 0.005;
  var statusBox;
  if (tallies) {
    statusBox = '<div class="status ok">✔ Balance sheet tallies: assets equal liabilities plus capital.</div>';
  } else {
    statusBox = '<div class="status err">✖ Balance sheet does not tally. Check that each account is placed in the right type.</div>';
  }

  var left =
    '<div class="card hover"><h3>Liabilities &amp; Capital</h3><div class="scroll"><table><tbody>' +
    '<tr><td>Capital (after profit and drawings)</td><td class="num">' + formatNumber(capitalTotal) + "</td></tr>" +
    rowsFromList(liabilityList, "") +
    '<tr class="total"><td>Total</td><td class="num">' + formatNumber(totalLiabilities) + "</td></tr>" +
    "</tbody></table></div></div>";

  var right =
    '<div class="card hover"><h3>Assets</h3><div class="scroll"><table><tbody>' +
    rowsFromList(assetList, "") +
    '<tr class="total"><td>Total</td><td class="num">' + formatNumber(totalAssets) + "</td></tr>" +
    "</tbody></table></div></div>";

  getEl("bsOut").innerHTML = '<div class="grid two">' + left + right + "</div>" + statusBox;
}

// ---------- Dashboard ----------
// Makes one coloured progress bar row (used for expenses and assets)
function barRow(label, valueText, percent, color) {
  return '<div class="bud"><div class="top"><span>' + safeText(label) + "</span><b>" + valueText + "</b></div>" +
    '<div class="prog"><i style="width:' + percent + "%;background:" + color + '"></i></div></div>';
}

function showDashboard() {
  // ----- summary cards -----
  var cash = 0;
  for (var i = 0; i < assetList.length; i++) {
    if (assetList[i].name === "Cash" || assetList[i].name === "Bank") {
      cash = cash + assetList[i].value;
    }
  }

  var profitLabel = "Net profit";
  var profitClass = "pos";
  if (netProfit < 0) {
    profitLabel = "Net loss";
    profitClass = "neg";
  }

  // each card: [title, amount, icon, small note, colour class]
  var cards = [
    ["Total sales", salesTotal, "💰", "Revenue earned from sales", ""],
    [profitLabel, netProfit, "📈", "After all expenses", profitClass],
    ["Cash &amp; bank", cash, "💵", "Money you can use now", ""],
    ["Total assets", totalAssets, "🏢", "Everything you own", ""],
    ["Total liabilities", sumList(liabilityList), "📉", "Everything you owe", ""]
  ];
  var cardHtml = "";
  for (var c = 0; c < cards.length; c++) {
    cardHtml += '<div class="card hover kpi"><div class="lbl"><span>' + cards[c][0] + "</span><span>" + cards[c][2] + "</span></div>";
    cardHtml += '<div class="val ' + cards[c][4] + '">' + formatMoney(cards[c][1]) + "</div>";
    cardHtml += '<div class="sub">' + cards[c][3] + "</div></div>";
  }
  getEl("kpis").innerHTML = cardHtml;

  // ----- bar chart: income vs expenses -----
  if (entries.length === 0) {
    getEl("chartBars").innerHTML = '<p class="empty">Add entries to see this chart.</p>';
  } else {
    var items = [
      ["Sales", salesTotal, "#3ecf8e"],
      ["Other income", otherIncome, "#4c8dff"],
      ["Direct costs", directTotal, "#f5a524"],
      ["Other expenses", indirectTotal, "#ff6b6b"]
    ];
    var biggest = 1;
    for (var b = 0; b < items.length; b++) {
      if (Math.abs(items[b][1]) > biggest) {
        biggest = Math.abs(items[b][1]);
      }
    }
    var bars = "";
    var names = "";
    for (var k = 0; k < items.length; k++) {
      var height = Math.abs(items[k][1]) / biggest * 160;    // tallest bar = 160 pixels
      if (height < 2) {
        height = 2;
      }
      bars += '<div class="bar"><span>' + formatNumber(items[k][1]) + '</span><i style="height:' + height + "px;background:" + items[k][2] + '"></i></div>';
      names += "<div>" + items[k][0] + "</div>";
    }
    getEl("chartBars").innerHTML = '<div class="bars">' + bars + '</div><div class="bar-names">' + names + "</div>";
  }

  // ----- where the expenses go -----
  var expenses = listOfType("directExp", 1).concat(listOfType("indirectExp", 1));
  var expenseTotal = sumList(expenses);
  if (expenseTotal <= 0) {
    getEl("chartDonut").innerHTML = '<p class="empty">No expenses recorded yet.</p>';
  } else {
    var expenseHtml = "";
    for (var x = 0; x < expenses.length; x++) {
      var percent = expenses[x].value / expenseTotal * 100;
      expenseHtml += barRow(expenses[x].name, formatMoney(expenses[x].value) + " (" + percent.toFixed(0) + "%)", percent, colors[x % colors.length]);
    }
    getEl("chartDonut").innerHTML = expenseHtml;
  }

  // ----- assets -----
  var largest = 1;
  for (var a = 0; a < assetList.length; a++) {
    if (assetList[a].value > largest) {
      largest = assetList[a].value;
    }
  }
  var assetHtml = "";
  for (var d = 0; d < assetList.length; d++) {
    if (assetList[d].value > 0) {
      assetHtml += barRow(assetList[d].name, formatMoney(assetList[d].value), assetList[d].value / largest * 100, colors[d % colors.length]);
    }
  }
  if (assetHtml === "") {
    assetHtml = '<p class="empty">No assets yet.</p>';
  }
  getEl("chartAssets").innerHTML = assetHtml;

  // ----- last 5 entries (newest first) -----
  if (entries.length === 0) {
    getEl("recent").innerHTML = '<p class="empty">Nothing here yet.</p>';
  } else {
    var recentRows = "";
    var stop = entries.length - 5;
    if (stop < 0) {
      stop = 0;
    }
    for (var r = entries.length - 1; r >= stop; r--) {
      recentRows += "<tr><td>" + safeText(entries[r].date) + "</td><td>" + safeText(entries[r].debit) + " → " + safeText(entries[r].credit) +
        '</td><td class="num">' + formatNumber(entries[r].amount) + "</td></tr>";
    }
    getEl("recent").innerHTML = '<div class="scroll"><table><tbody>' + recentRows + "</tbody></table></div>";
  }
}

// ---------- Budget Planner ----------
function showBudget() {
  // fill the category dropdown only once (only expense accounts)
  var select = getEl("bAcc");
  if (select.options.length === 0) {
    var options = "";
    for (var name in accountTypes) {
      if (accountTypes[name] === "directExp" || accountTypes[name] === "indirectExp") {
        options += "<option>" + name + "</option>";
      }
    }
    select.innerHTML = options;
  }

  var month = getEl("bMonth").value;       // looks like "2026-11"
  if (month === "") {
    month = today().slice(0, 7);
  }

  var html = "";
  for (var budgetName in budgets) {
    var limit = budgets[budgetName];

    // add up what was spent on this account in the chosen month
    var spent = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].date.slice(0, 7) === month) {
        if (entries[i].debit === budgetName) {
          spent = spent + entries[i].amount;
        }
        if (entries[i].credit === budgetName) {
          spent = spent - entries[i].amount;
        }
      }
    }

    var percent = spent / limit * 100;
    var color = "var(--good)";             // green = safe
    if (percent >= 100) {
      color = "var(--bad)";                // red = over budget
    } else if (percent >= 80) {
      color = "var(--warn)";               // orange = nearly used up
    }

    var note;
    if (percent >= 100) {
      note = "Over budget by " + formatMoney(spent - limit);
    } else {
      note = "Remaining " + formatMoney(limit - spent);
    }

    var barWidth = percent;
    if (barWidth > 100) {
      barWidth = 100;
    }
    if (barWidth < 0) {
      barWidth = 0;
    }

    html += '<div class="bud"><div class="top"><b>' + safeText(budgetName) + "</b><span>" + formatMoney(spent) + " of " + formatMoney(limit) +
      ' <span style="color:' + color + '">(' + percent.toFixed(0) + "%)</span></span></div>";
    html += '<div class="prog"><i style="width:' + barWidth + "%;background:" + color + '"></i></div>';
    html += '<div class="row" style="justify-content:space-between;margin-top:6px"><span class="tip">' + note + "</span>";
    html += '<button class="btn danger sm no-print" onclick="removeBudget(\'' + budgetName + '\')">Remove</button></div></div>';
  }

  if (html === "") {
    html = '<p class="empty">No budgets yet. Set one on the left.</p>';
  }
  getEl("budgetOut").innerHTML = html;
}

// ---------- Redraw EVERYTHING ----------
// Called after every change, so all pages always match the entries array.
function refreshAll() {
  buildLedgers();
  calculateFigures();
  showJournal();
  showLedgers();
  showTrial();
  showProfitLoss();
  showBalanceSheet();
  showBudget();
  showDashboard();
}


/* =====================================================================
   PART 6: SWITCHING BETWEEN PAGES (the sidebar "tabs")
   Every page is a <section class="page">. Only the one with the extra
   class "active" is visible (the CSS does the hiding).
   ===================================================================== */

function showPage(name) {
  var sections = document.querySelectorAll(".page");
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].id === "page-" + name) {
      sections[i].classList.add("active");
    } else {
      sections[i].classList.remove("active");
    }
  }

  var links = document.querySelectorAll(".sidebar a");
  for (var j = 0; j < links.length; j++) {
    if (links[j].getAttribute("data-page") === name) {
      links[j].classList.add("active");
    } else {
      links[j].classList.remove("active");
    }
  }

  getEl("sidebar").classList.remove("open");   // close the mobile menu
  window.scrollTo(0, 0);
  showDashboard();                             // redraw so the chart bars animate again
}

// Runs when a sidebar link is clicked ("this" is the link that was clicked)
function onMenuClick(event) {
  event.preventDefault();
  showPage(this.getAttribute("data-page"));
}


/* =====================================================================
   PART 7: ADD ENTRY FORM
   ===================================================================== */

// Fills the Debit and Credit dropdowns, the template buttons and the guide
function fillDropdowns() {
  var options = "";
  for (var name in accountTypes) {
    options += "<option>" + name + "</option>";
  }
  getEl("debit").innerHTML = options;
  getEl("credit").innerHTML = options;
  getEl("credit").selectedIndex = 1;
  updateHints();

  var chips = "";
  for (var i = 0; i < templates.length; i++) {
    chips += '<button type="button" class="chip" onclick="useTemplate(' + i + ')">' + templates[i][0] + "</button>";
  }
  getEl("templates").innerHTML = chips;

  // Quick Guide page: list every account type with examples
  var guide = "";
  for (var type in typeNames) {
    var examples = "";
    for (var account in accountTypes) {
      if (accountTypes[account] === type) {
        examples += account + ", ";
      }
    }
    examples = examples.slice(0, examples.length - 2);   // remove the last ", "
    guide += "<dt>" + typeNames[type] + "</dt><dd>" + typeHelp[type] + '<br><span class="tip">Examples: ' + examples + "</span></dd>";
  }
  getEl("typeGlossary").innerHTML = guide;
}

// Shows the help sentence under the Debit and Credit dropdowns
function updateHints() {
  getEl("debitHint").textContent = typeHelp[accountTypes[getEl("debit").value]];
  getEl("creditHint").textContent = typeHelp[accountTypes[getEl("credit").value]];
}

// A template button fills the form for the user
function useTemplate(number) {
  getEl("debit").value = templates[number][1];
  getEl("credit").value = templates[number][2];
  getEl("narration").value = templates[number][0];
  updateHints();
  getEl("amount").focus();
}

// Runs when the form is submitted
function addEntry(event) {
  event.preventDefault();                      // stop the page from reloading

  var debit = getEl("debit").value;
  var credit = getEl("credit").value;
  var amount = parseFloat(getEl("amount").value);

  // simple checks
  if (debit === credit) {
    showMessage("Debit and credit accounts must be different.", true);
    return;
  }
  if (!(amount > 0)) {
    showMessage("Enter an amount greater than zero.", true);
    return;
  }

  // make a new entry object and add it to the array
  var newEntry = {
    date: getEl("date").value,
    debit: debit,
    credit: credit,
    amount: amount,
    narration: getEl("narration").value.trim()
  };
  entries.push(newEntry);

  saveData();
  refreshAll();
  getEl("amount").value = "";
  getEl("narration").value = "";
  showMessage("Entry saved. All reports updated.");
}

// Delete button in the journal
function deleteEntry(index) {
  entries.splice(index, 1);                    // remove 1 item at this position
  saveData();
  refreshAll();
  showMessage("Entry deleted.");
}

// Demo data button
function loadSample() {
  var d = today();
  entries = [
    { date: d, debit: "Cash", credit: "Capital", amount: 100000, narration: "Started business" },
    { date: d, debit: "Furniture", credit: "Cash", amount: 20000, narration: "Bought furniture" },
    { date: d, debit: "Purchases", credit: "Cash", amount: 30000, narration: "Bought goods" },
    { date: d, debit: "Cash", credit: "Sales", amount: 50000, narration: "Cash sales" },
    { date: d, debit: "Rent", credit: "Cash", amount: 5000, narration: "Paid shop rent" },
    { date: d, debit: "Wages", credit: "Cash", amount: 3000, narration: "Paid wages" },
    { date: d, debit: "Purchases", credit: "Creditors", amount: 10000, narration: "Goods on credit" },
    { date: d, debit: "Electricity", credit: "Cash", amount: 2000, narration: "Electricity bill" }
  ];
  budgets = { "Rent": 6000, "Electricity": 1500, "Wages": 4000 };
  saveData();
  refreshAll();
  showMessage("Sample data loaded.");
  showPage("dashboard");
}

// Clear everything (asks first)
function clearAll() {
  if (confirm("Delete all journal entries and budgets?")) {
    entries = [];
    budgets = {};
    saveData();
    refreshAll();
    showMessage("All data cleared.");
  }
}


/* =====================================================================
   PART 8: BUDGET FORM
   ===================================================================== */

function setBudget(event) {
  event.preventDefault();
  budgets[getEl("bAcc").value] = parseFloat(getEl("bAmt").value);
  saveData();
  getEl("bAmt").value = "";
  refreshAll();
  showMessage("Budget set.");
}

function removeBudget(name) {
  delete budgets[name];
  saveData();
  refreshAll();
}


/* =====================================================================
   PART 9: EXPORT, BACKUP AND PRINT
   ===================================================================== */

// Makes the browser download a text file
function downloadFile(fileName, text, fileType) {
  var blob = new Blob([text], { type: fileType });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}

// Puts quotes around text so commas inside it do not break the CSV columns
function csvText(text) {
  return '"' + String(text).replace(/"/g, '""') + '"';
}

function exportCsv() {
  if (entries.length === 0) {
    showMessage("No entries to export.", true);
    return;
  }
  var csv = "Date,Debit,Credit,Amount,Narration\n";
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    csv += e.date + "," + csvText(e.debit) + "," + csvText(e.credit) + "," + e.amount + "," + csvText(e.narration || "") + "\n";
  }
  downloadFile("journal.csv", csv, "text/csv");
  showMessage("CSV downloaded.");
}

function exportBackup() {
  var backup = { entries: entries, budgets: budgets };
  downloadFile("journalflow-backup.json", JSON.stringify(backup), "application/json");
  showMessage("Backup downloaded.");
}

function restoreBackup() {
  var file = getEl("impFile").files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      if (!Array.isArray(data.entries)) {
        throw new Error("not a backup");
      }
      entries = data.entries;
      budgets = data.budgets || {};
      saveData();
      refreshAll();
      showMessage("Backup restored.");
    } catch (error) {
      showMessage("That file is not a valid backup.", true);
    }
  };
  reader.readAsText(file);
  getEl("impFile").value = "";
}

// Print buttons: open the page, then open the print window
function printPage() {
  showPage(this.getAttribute("data-print"));
  setTimeout(function () {
    window.print();
  }, 400);
}


/* =====================================================================
   PART 10: START THE APP
   Connect every button/form to its function, then draw the screen.
   ===================================================================== */

function startApp() {
  loadData();

  // default values
  getEl("date").value = today();
  getEl("bMonth").value = today().slice(0, 7);
  fillDropdowns();

  // sidebar links
  var links = document.querySelectorAll(".sidebar a");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", onMenuClick);
  }

  // print buttons
  var printButtons = document.querySelectorAll("[data-print]");
  for (var j = 0; j < printButtons.length; j++) {
    printButtons[j].addEventListener("click", printPage);
  }

  // mobile menu button
  getEl("burger").addEventListener("click", function () {
    getEl("sidebar").classList.toggle("open");
  });

  // forms, buttons and boxes
  getEl("entryForm").addEventListener("submit", addEntry);
  getEl("budgetForm").addEventListener("submit", setBudget);
  getEl("debit").addEventListener("change", updateHints);
  getEl("credit").addEventListener("change", updateHints);
  getEl("sampleBtn").addEventListener("click", loadSample);
  getEl("clearBtn").addEventListener("click", clearAll);
  getEl("jsearch").addEventListener("input", showJournal);
  getEl("ledgerFilter").addEventListener("change", showLedgers);
  getEl("bMonth").addEventListener("change", showBudget);
  getEl("expCsv").addEventListener("click", exportCsv);
  getEl("expJson").addEventListener("click", exportBackup);
  getEl("impBtn").addEventListener("click", function () {
    getEl("impFile").click();
  });
  getEl("impFile").addEventListener("change", restoreBackup);

  refreshAll();
  showPage("dashboard");
}

startApp();