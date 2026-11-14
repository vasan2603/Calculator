const display = document.getElementById("display");
const historyDisplay = document.getElementById("history");
const keys = document.querySelector(".keys");

let expression = "";
let justCalculated = false;

function updateDisplay() {
  display.value = expression
    ? expression.replaceAll("*", "×").replaceAll("/", "÷").replaceAll("-", "−").replaceAll("sqrt(", "√(")
    : "0";
}

function addValue(value) {
  if (justCalculated && /[0-9.(]/.test(value)) {
    expression = "";
    historyDisplay.textContent = "";
  }
  justCalculated = false;

  if (value === ".") {
    const currentNumber = expression.split(/[+\-*/^()%()]/).pop();
    if (currentNumber.includes(".")) return;
    if (!currentNumber) expression += "0";
  }

  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = "";
  historyDisplay.textContent = "";
  justCalculated = false;
  updateDisplay();
}

function deleteLast() {
  if (justCalculated) {
    clearAll();
    return;
  }
  if (expression.endsWith("sqrt(")) {
    expression = expression.slice(0, -5);
  } else {
    expression = expression.slice(0, -1);
  }
  updateDisplay();
}

function changeSign() {
  if (!expression) {
    expression = "-";
    updateDisplay();
    return;
  }

  // Find the final number and toggle its sign.
  const match = expression.match(/(\d*\.?\d+)(?!.*\d)/);
  if (!match) {
    expression += "-";
  } else {
    const start = match.index;
    const before = expression.slice(0, start);
    const number = match[0];
    if (before.endsWith("-") && (before.length === 1 || /[+*/^(]/.test(before.at(-2)))) {
      expression = before.slice(0, -1) + number + expression.slice(start + number.length);
    } else {
      expression = before + "(-" + number + ")" + expression.slice(start + number.length);
    }
  }
  justCalculated = false;
  updateDisplay();
}

// A small expression parser. It avoids eval() and supports brackets,
// +, -, *, /, ^, postfix percentage, and sqrt(...).
function calculate(source) {
  const tokens = source.match(/sqrt|(?:\d+\.?\d*|\.\d+)|[()+\-*/^%]/g);
  if (!tokens || tokens.join("") !== source.replace(/\s+/g, "")) {
    throw new Error("Invalid expression");
  }

  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpression() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parsePower();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const right = parsePower();
      if (op === "/" && right === 0) throw new Error("Cannot divide by zero");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }

  function parsePower() {
    let value = parseUnary();
    if (peek() === "^") {
      take();
      value = Math.pow(value, parsePower());
    }
    return value;
  }

  function parseUnary() {
    if (peek() === "+") {
      take();
      return parseUnary();
    }
    if (peek() === "-") {
      take();
      return -parseUnary();
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() === "%") {
      take();
      value /= 100;
    }
    return value;
  }

  function parsePrimary() {
    if (peek() === "sqrt") {
      take();
      if (take() !== "(") throw new Error("Use √ with brackets");
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing bracket");
      if (value < 0) throw new Error("Square root of a negative number");
      return Math.sqrt(value);
    }

    if (peek() === "(") {
      take();
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing bracket");
      return value;
    }

    const token = take();
    if (token === undefined || !/^(?:\d+\.?\d*|\.\d+)$/.test(token)) {
      throw new Error("Invalid expression");
    }
    return Number(token);
  }

  const result = parseExpression();
  if (position !== tokens.length || !Number.isFinite(result)) {
    throw new Error("Invalid expression");
  }
  return result;
}

function showResult() {
  if (!expression) return;
  try {
    const original = expression;
    const result = calculate(expression);
    historyDisplay.textContent = original.replaceAll("*", "×").replaceAll("/", "÷") + " =";
    expression = String(Number(result.toPrecision(12)));
    justCalculated = true;
    updateDisplay();
  } catch (error) {
    display.value = error.message || "Error";
    expression = "";
    justCalculated = true;
  }
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "clear") clearAll();
  else if (action === "delete") deleteLast();
  else if (action === "sign") changeSign();
  else if (action === "equals") showResult();
  else if (value) addValue(value);
});

document.addEventListener("keydown", (event) => {
  if (/^[0-9.]$/.test(event.key)) addValue(event.key);
  else if (["+", "-", "*", "/", "^", "%", "(", ")"].includes(event.key)) addValue(event.key);
  else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    showResult();
  } else if (event.key === "Backspace") deleteLast();
  else if (event.key === "Escape") clearAll();
});

updateDisplay();
